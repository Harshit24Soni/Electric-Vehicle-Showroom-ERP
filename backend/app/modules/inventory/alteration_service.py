import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.mixins import utc_now, utc_now_naive
from app.modules.inventory.models import (
    PriceListItem,
    PriceListVersion,
    SpareCostHistory,
    SpareMaster,
    SparePartAlteration,
    SparePartCode,
    SparePartVehicleCompatibility,
    SpareSellingPriceHistory,
    SpareStockBalance,
)

logger = logging.getLogger(__name__)


def capture_spare_snapshot(spare: SpareMaster, part_code: Optional[str] = None) -> Dict[str, Any]:
    """Captures a serializable dictionary snapshot of a spare part record's state."""
    pc = part_code or getattr(spare, "part_number", "") or ""

    # Model prices dictionary from vehicle compatibilities
    model_prices: Dict[str, Optional[float]] = {}
    if hasattr(spare, "compatibilities") and spare.compatibilities:
        for c in spare.compatibilities:
            mname = getattr(c, "model_name", None) or f"model_{c.vehicle_model_id}"
            val = c.customer_mrp if c.customer_mrp is not None else c.ex_showroom_price
            if val is not None:
                model_prices[mname] = float(val)

    # Total stock quantity
    stock = 0
    if hasattr(spare, "balances") and spare.balances:
        stock = sum(b.quantity for b in spare.balances)

    return {
        "part_code": pc,
        "description": spare.spare_name,
        "category": spare.category or "General",
        "tracking_mode": spare.tracking_mode or "QUANTITY",
        "status": spare.status or "ACTIVE",
        "hsn_code": spare.hsn_code,
        "gst_rate": float(spare.gst_rate) if spare.gst_rate is not None else None,
        "ex_factory": float(spare.base_cost) if spare.base_cost is not None else None,
        "dlp": float(spare.base_dlp) if spare.base_dlp is not None else None,
        "mrp": float(spare.base_mrp) if spare.base_mrp is not None else None,
        "ex_showroom": float(spare.base_ex_showroom) if spare.base_ex_showroom is not None else None,
        "profit_margin_percent": (
            float(spare.profit_margin_percent) if spare.profit_margin_percent is not None else None
        ),
        "stock_quantity": stock,
        "remarks": spare.remarks,
        "model_prices": model_prices,
    }


def _are_values_equal(val1: Any, val2: Any) -> bool:
    """Helper to compare two snapshot values handling float precision and None/empty."""
    if val1 is None and val2 is None:
        return True
    if val1 is None or val2 is None:
        return False

    if isinstance(val1, (int, float)) and isinstance(val2, (int, float)):
        return round(float(val1), 2) == round(float(val2), 2)

    if isinstance(val1, dict) and isinstance(val2, dict):
        if set(val1.keys()) != set(val2.keys()):
            return False
        return all(_are_values_equal(val1[k], val2[k]) for k in val1)

    return str(val1).strip() == str(val2).strip()


def compute_snapshot_diff(before: Dict[str, Any], after: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """Compares before and after snapshots and produces a field-by-field diff of changes."""
    diff: Dict[str, Dict[str, Any]] = {}

    all_keys = set(before.keys()).union(set(after.keys()))
    for key in sorted(all_keys):
        # Ignore part_code itself from diff unless intentionally modified
        if key == "part_code":
            continue

        b_val = before.get(key)
        a_val = after.get(key)

        if not _are_values_equal(b_val, a_val):
            diff[key] = {
                "old": b_val,
                "new": a_val,
            }

    return diff


def record_alteration(
    db: AsyncSession,
    spare_id: int,
    part_code: str,
    action_type: str,
    source_reference: Optional[str],
    snapshot_before: Dict[str, Any],
    snapshot_after: Dict[str, Any],
    altered_by_id: Optional[int] = None,
    altered_by_name: Optional[str] = None,
) -> Optional[SparePartAlteration]:
    """Computes differences and records an append-only SparePartAlteration audit record."""
    diff = compute_snapshot_diff(snapshot_before, snapshot_after)
    if not diff:
        return None

    alteration = SparePartAlteration(
        spare_id=spare_id,
        part_code=part_code,
        timestamp=utc_now(),
        action_type=action_type,
        source_reference=source_reference,
        altered_by_id=altered_by_id,
        altered_by_name=altered_by_name,
        changes=diff,
        snapshot_before=snapshot_before,
        snapshot_after=snapshot_after,
        is_reverted=False,
    )
    db.add(alteration)
    return alteration


async def get_spare_alterations(db: AsyncSession, part_code: str) -> List[SparePartAlteration]:
    """Fetches full historical alteration records for a specific part code, newest first."""
    stmt = (
        select(SparePartAlteration)
        .where(SparePartAlteration.part_code == part_code.strip())
        .order_by(SparePartAlteration.timestamp.desc())
    )
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def revert_alteration(
    db: AsyncSession,
    alteration_id: int,
    fields_to_revert: Optional[List[str]] = None,
    reverted_by_id: Optional[int] = None,
    reverted_by_name: Optional[str] = None,
) -> Dict[str, Any]:
    """Reverts specific fields (or all changed fields) of an alteration back to its prior state.

    Maintains strict immutable audit integrity by appending a new REVERSION audit entry.
    """
    alt_stmt = select(SparePartAlteration).where(SparePartAlteration.alteration_id == alteration_id)
    alt_res = await db.execute(alt_stmt)
    alteration = alt_res.scalar_one_or_none()
    if not alteration:
        raise ValueError(f"Alteration with ID #{alteration_id} not found.")

    spare_stmt = (
        select(SpareMaster)
        .options(
            selectinload(SpareMaster.codes),
            selectinload(SpareMaster.compatibilities),
            selectinload(SpareMaster.balances),
        )
        .where(SpareMaster.spare_id == alteration.spare_id)
    )
    spare_res = await db.execute(spare_stmt)
    spare = spare_res.scalar_one_or_none()
    if not spare:
        raise ValueError(f"Spare record with ID #{alteration.spare_id} no longer exists.")

    part_code = alteration.part_code
    before_snap = capture_spare_snapshot(spare, part_code)

    # Determine fields to revert
    available_changes = alteration.changes or {}
    if fields_to_revert and len(fields_to_revert) > 0:
        target_fields = [f for f in fields_to_revert if f in available_changes]
    else:
        target_fields = list(available_changes.keys())

    if not target_fields:
        raise ValueError("No valid fields specified to revert.")

    snapshot_prior = alteration.snapshot_before

    # Apply previous values back to spare
    for field in target_fields:
        prior_val = snapshot_prior.get(field)

        if field == "description" and prior_val is not None:
            spare.spare_name = str(prior_val).strip()
        elif field == "category":
            spare.category = str(prior_val).strip() if prior_val else "General"
        elif field == "tracking_mode" and prior_val:
            spare.tracking_mode = str(prior_val)
        elif field == "status" and prior_val:
            spare.status = str(prior_val)
        elif field == "hsn_code":
            spare.hsn_code = str(prior_val).strip() if prior_val else None
        elif field == "gst_rate":
            spare.gst_rate = float(prior_val) if prior_val is not None else 18.0
        elif field == "ex_factory":
            spare.base_cost = float(prior_val) if prior_val is not None else None
        elif field == "dlp":
            spare.base_dlp = float(prior_val) if prior_val is not None else None
        elif field == "mrp":
            spare.base_mrp = float(prior_val) if prior_val is not None else None
        elif field == "ex_showroom":
            spare.base_ex_showroom = float(prior_val) if prior_val is not None else None
        elif field == "profit_margin_percent":
            spare.profit_margin_percent = float(prior_val) if prior_val is not None else None
        elif field == "remarks":
            spare.remarks = str(prior_val) if prior_val is not None else None
        elif field == "stock_quantity":
            if prior_val is not None:
                stock_int = int(prior_val)
                bal_found = False
                for bal in spare.balances:
                    if bal.location == "MAIN_SHOWROOM":
                        bal.quantity = stock_int
                        bal_found = True
                        break
                if not bal_found:
                    db.add(
                        SpareStockBalance(
                            spare_id=spare.spare_id,
                            location="MAIN_SHOWROOM",
                            quantity=stock_int,
                        )
                    )
        elif field == "model_prices":
            if isinstance(prior_val, dict) and spare.compatibilities:
                for compat in spare.compatibilities:
                    mname = getattr(compat, "model_name", None) or f"model_{compat.vehicle_model_id}"
                    if mname in prior_val:
                        pval = prior_val[mname]
                        compat.customer_mrp = float(pval) if pval is not None else None
                        compat.ex_showroom_price = float(pval) if pval is not None else None

    # Sync PriceListItem in default version if pricing or name was reverted
    sync_pli_fields = {"dlp", "mrp", "gst_rate", "description"}.intersection(target_fields)
    if sync_pli_fields:
        pli_stmt = select(PriceListItem).where(
            PriceListItem.part_code == part_code,
            PriceListItem.is_deleted.is_(False),
        )
        pli_res = await db.execute(pli_stmt)
        pli = pli_res.scalars().first()
        if pli:
            if "description" in target_fields:
                pli.part_name = spare.spare_name
            if "dlp" in target_fields:
                pli.dlp = spare.base_dlp
            if "mrp" in target_fields:
                pli.mrp = spare.base_mrp
            if "gst_rate" in target_fields:
                pli.gst_rate = spare.gst_rate

    # Pricing histories for audit consistency
    if "mrp" in target_fields and spare.base_mrp is not None:
        db.add(
            SpareSellingPriceHistory(
                spare_id=spare.spare_id,
                selling_price=float(spare.base_mrp),
                effective_from=utc_now_naive(),
                reason=f"Rollback of alteration #{alteration_id}",
            )
        )
    if ("dlp" in target_fields or "ex_factory" in target_fields) and (spare.base_dlp is not None or spare.base_cost is not None):
        cval = float(spare.base_dlp if spare.base_dlp is not None else spare.base_cost)
        db.add(
            SpareCostHistory(
                spare_id=spare.spare_id,
                quantity=0,
                billed_unit_price=float(spare.base_cost or cval),
                landed_cost=cval,
                source_reference=f"Rollback of alteration #{alteration_id}",
                effective_date=utc_now_naive(),
            )
        )

    spare.updated_at = utc_now_naive()

    # Capture state after reversion
    after_snap = capture_spare_snapshot(spare, part_code)

    # Mark the original alteration as reverted if all changed fields were reverted
    all_original_fields = set(available_changes.keys())
    if set(target_fields).issuperset(all_original_fields):
        alteration.is_reverted = True
        alteration.reverted_at = utc_now()
        alteration.reverted_by_id = reverted_by_id

    # Append new REVERSION audit record so complete history is preserved
    reversion_log = record_alteration(
        db=db,
        spare_id=spare.spare_id,
        part_code=part_code,
        action_type="REVERSION",
        source_reference=f"Reverted {len(target_fields)} field(s) from alteration #{alteration_id} ({alteration.action_type})",
        snapshot_before=before_snap,
        snapshot_after=after_snap,
        altered_by_id=reverted_by_id,
        altered_by_name=reverted_by_name or "Authorized Staff",
    )

    await db.commit()
    await db.refresh(spare, ["codes", "compatibilities", "balances"])

    return {
        "success": True,
        "alteration_id": alteration_id,
        "reverted_fields": target_fields,
        "reversion_alteration_id": reversion_log.alteration_id if reversion_log else None,
        "message": f"Successfully reverted {len(target_fields)} field(s) back to values prior to alteration #{alteration_id}.",
    }
