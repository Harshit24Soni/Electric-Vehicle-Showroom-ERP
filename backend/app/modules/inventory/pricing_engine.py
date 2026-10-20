import logging
from typing import Any, Dict, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.mixins import utc_now_naive
from app.modules.inventory.models import (
    PriceListItem,
    SpareCostHistory,
    SpareMaster,
    SpareSellingPriceHistory,
)
from app.modules.master.models import VehicleModel

logger = logging.getLogger(__name__)


def calculate_observed_margin(cost: Optional[float], selling_price: Optional[float]) -> Optional[float]:
    """Calculates the observed profit margin / markup percentage.

    e.g. cost = 40, selling_price = 60 -> ((60 - 40) / 40) * 100 = 50.00%
    """
    if cost is None or selling_price is None or cost <= 0:
        return None
    margin = ((selling_price - cost) / cost) * 100.0
    return round(margin, 2)


def compute_prices_from_cost_and_margin(
    new_cost: float,
    profit_margin_percent: float,
    gst_rate: float = 18.0,
) -> Dict[str, float]:
    """Calculates updated prices automatically when purchase cost changes,

    preserving the observed profit margin.
    e.g. cost: 40 -> 50 with margin 50%:
      ex_showroom = 50 * 1.50 = 75.00
      mrp (with 18% GST) = 75 * 1.18 = 88.50
    """
    if new_cost <= 0:
        return {
            "new_cost": 0.0,
            "ex_showroom": 0.0,
            "gst_rate": gst_rate,
            "gst_amount": 0.0,
            "customer_mrp": 0.0,
            "profit_margin_percent": profit_margin_percent,
            "profit_per_unit": 0.0,
        }

    ex_showroom = round(new_cost * (1.0 + (profit_margin_percent / 100.0)), 2)
    gst_amount = round(ex_showroom * (gst_rate / 100.0), 2)
    customer_mrp = round(ex_showroom + gst_amount, 2)
    profit_per_unit = round(ex_showroom - new_cost, 2)

    return {
        "new_cost": round(new_cost, 2),
        "ex_showroom": ex_showroom,
        "gst_rate": gst_rate,
        "gst_amount": gst_amount,
        "customer_mrp": customer_mrp,
        "profit_margin_percent": profit_margin_percent,
        "profit_per_unit": profit_per_unit,
    }


async def apply_new_purchase_cost(
    spare_id: int,
    new_cost: float,
    source_reference: str = "Procurement Inward",
    db: AsyncSession = None,
) -> Dict[str, Any]:
    """Updates purchase cost for a spare, records cost history, and automatically

    recomputes base and model-specific selling prices based on their individual
    observed profit margins.
    """
    stmt = (
        select(SpareMaster)
        .options(
            selectinload(SpareMaster.codes),
            selectinload(SpareMaster.compatibilities),
        )
        .where(SpareMaster.spare_id == spare_id)
    )
    res = await db.execute(stmt)
    spare = res.scalar_one_or_none()
    if not spare:
        raise ValueError(f"Spare {spare_id} not found.")

    from app.modules.inventory.alteration_service import capture_spare_snapshot, record_alteration

    before_snap = capture_spare_snapshot(spare, spare.part_number)

    now = utc_now_naive()

    # 1. Record cost history
    cost_hist = SpareCostHistory(
        spare_id=spare.spare_id,
        quantity=0,
        billed_unit_price=new_cost,
        landed_cost=new_cost,
        source_reference=source_reference,
        effective_date=now,
    )
    db.add(cost_hist)

    # 2. Update SpareMaster base pricing
    spare.base_cost = new_cost
    spare.base_dlp = new_cost

    gst_rate = float(spare.gst_rate or 18.0)
    base_margin = float(spare.profit_margin_percent or 0.0)

    computed = compute_prices_from_cost_and_margin(new_cost, base_margin, gst_rate)
    spare.base_ex_showroom = computed["ex_showroom"]
    spare.base_mrp = computed["customer_mrp"]

    # Record selling price history for base price
    db.add(
        SpareSellingPriceHistory(
            spare_id=spare.spare_id,
            selling_price=computed["customer_mrp"],
            effective_from=now,
            reason=f"Auto Recomputed (Base Margin: {base_margin}% on Cost INR {new_cost})",
        )
    )

    # 3. Update PriceListItem for default version
    part_code = spare.part_number
    if part_code:
        pli_stmt = (
            select(PriceListItem)
            .where(PriceListItem.part_code == part_code, PriceListItem.is_deleted.is_(False))
            .order_by(PriceListItem.item_id.desc())
        )
        pli_res = await db.execute(pli_stmt)
        pli = pli_res.scalars().first()
        if pli:
            pli.mrp = computed["customer_mrp"]
            pli.dlp = new_cost

    # 4. Update each compatible vehicle model pricing if model-specific margin exists
    vm_stmt = select(VehicleModel).where(VehicleModel.is_deleted.is_(False))
    vm_res = await db.execute(vm_stmt)
    vm_map = {vm.vehicle_model_id: vm.model_name for vm in vm_res.scalars().all()}

    updated_models = []
    for compat in spare.compatibilities:
        compat_margin = float(compat.profit_margin_percent or base_margin)
        compat_gst = float(compat.gst_rate or gst_rate)
        model_computed = compute_prices_from_cost_and_margin(new_cost, compat_margin, compat_gst)

        compat.ex_factory_price = new_cost
        compat.dlp = new_cost
        compat.ex_showroom_price = model_computed["ex_showroom"]
        compat.customer_mrp = model_computed["customer_mrp"]

        model_name = vm_map.get(compat.vehicle_model_id, f"Model #{compat.vehicle_model_id}")
        db.add(
            SpareSellingPriceHistory(
                spare_id=spare.spare_id,
                selling_price=model_computed["customer_mrp"],
                effective_from=now,
                reason=f"Model: {model_name} (Auto Margin: {compat_margin}%)",
            )
        )
        updated_models.append(
            {
                "model_name": model_name,
                "new_price": model_computed["customer_mrp"],
                "margin_percent": compat_margin,
            }
        )

    # Record alteration audit trail entry
    after_snap = capture_spare_snapshot(spare, spare.part_number)
    record_alteration(
        db=db,
        spare_id=spare.spare_id,
        part_code=spare.part_number or "",
        action_type="COST_INWARD",
        source_reference=source_reference,
        snapshot_before=before_snap,
        snapshot_after=after_snap,
    )

    await db.commit()

    return {
        "spare_id": spare.spare_id,
        "part_code": part_code,
        "spare_name": spare.spare_name,
        "new_cost": new_cost,
        "profit_margin_percent": base_margin,
        "new_ex_showroom": computed["ex_showroom"],
        "new_customer_mrp": computed["customer_mrp"],
        "updated_models": updated_models,
    }
