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

    # 2. Update SpareMaster accounting WAC (Manufacturer DLP & MRP remain independent)
    old_wac = float(spare.accounting_wac or spare.base_cost or 0.0)
    spare.accounting_wac = new_cost
    spare.base_cost = new_cost

    gst_rate = float(spare.gst_rate or 18.0)
    current_mrp = float(spare.manufacturer_mrp or spare.base_mrp or 0.0)

    # 3. Evaluate profitability & record audit trail
    from app.modules.inventory.profitability_service import (
        calculate_profitability,
        evaluate_part_pricing_risk,
        record_price_change_audit,
    )

    profit_info = calculate_profitability(
        unit_selling_price=current_mrp,
        wac_cost=new_cost,
        quantity=1,
        gst_rate=gst_rate,
    )

    await record_price_change_audit(
        db=db,
        spare_id=spare.spare_id,
        part_code=spare.part_number or str(spare.spare_id),
        change_type="PURCHASE_COST",
        old_value=old_wac,
        new_value=new_cost,
        source_document=source_reference,
        reason="Purchase cost update",
    )
    await evaluate_part_pricing_risk(db, spare.spare_id)

    computed = {
        "new_cost": new_cost,
        "ex_showroom": float(spare.base_ex_showroom or 0.0),
        "gst_rate": gst_rate,
        "gst_amount": profit_info["output_gst_per_unit"],
        "customer_mrp": current_mrp,
        "profit_margin_percent": profit_info["gross_margin_percent"],
        "profit_per_unit": profit_info["expected_gross_profit"],
    }

    # 4. Update each compatible vehicle model pricing if model-specific margin exists
    vm_stmt = select(VehicleModel).where(VehicleModel.is_deleted.is_(False))
    vm_res = await db.execute(vm_stmt)
    vm_map = {vm.vehicle_model_id: vm.model_name for vm in vm_res.scalars().all()}

    updated_models = []
    for compat in spare.compatibilities:
        compat.ex_factory_price = new_cost
        compat.dlp = new_cost

        # Under canonical policy, manufacturer MRP is preserved from catalog and not recalculated from WAC
        model_name = vm_map.get(compat.vehicle_model_id, f"Model #{compat.vehicle_model_id}")
        updated_models.append(
            {
                "vehicle_model_id": compat.vehicle_model_id,
                "model_name": model_name,
                "ex_factory": new_cost,
                "customer_mrp": float(compat.customer_mrp or current_mrp),
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
