from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta, timezone

from app.modules.inventory.models import (
    SpareStockBalance,
    SpareMaster,
    SpareBatch,
    SpareSerial,
    SpareStockMovement,
    SpareCostHistory,
)
from app.modules.inventory.schemas_stock import (
    InventoryDashboardResponse,
    StockByLocationResponse,
    StockItemResponse,
    StockListResponse,
    BatchItemResponse,
    BatchListResponse,
    SerialItemResponse,
    SerialListResponse,
    MovementHistoryItemResponse,
    MovementHistoryListResponse,
)


async def get_inventory_dashboard(db: AsyncSession) -> InventoryDashboardResponse:
    # total active spares
    active_spares = await db.scalar(
        select(func.count(SpareMaster.spare_id)).filter(
            SpareMaster.status == "ACTIVE",
            SpareMaster.is_deleted.is_(False),
        )
    )

    # 1. Accounting stock value (WAC * Qty, excluding recoverable ITC)
    acct_stock_value_stmt = (
        select(
            func.coalesce(
                func.sum(
                    SpareStockBalance.quantity * func.coalesce(SpareMaster.accounting_wac, SpareMaster.base_cost, 0.0)
                ),
                0.0,
            )
        )
        .join(SpareMaster, SpareStockBalance.spare_id == SpareMaster.spare_id)
        .filter(SpareMaster.status == "ACTIVE", SpareMaster.is_deleted.is_(False))
    )
    total_acct_val = float(await db.scalar(acct_stock_value_stmt) or 0.0)

    # 2. Operational GST-inclusive acquisition view
    gst_incl_stmt = (
        select(
            func.coalesce(
                func.sum(
                    SpareStockBalance.quantity
                    * func.coalesce(SpareMaster.accounting_wac, SpareMaster.base_cost, 0.0)
                    * (1.0 + (func.coalesce(SpareMaster.gst_rate, 18.0) / 100.0))
                ),
                0.0,
            )
        )
        .join(SpareMaster, SpareStockBalance.spare_id == SpareMaster.spare_id)
        .filter(SpareMaster.status == "ACTIVE", SpareMaster.is_deleted.is_(False))
    )
    total_gst_incl_val = float(await db.scalar(gst_incl_stmt) or 0.0)

    # movements last 30 days
    last_30d = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=30)
    movements_30d = await db.scalar(
        select(func.count(SpareStockMovement.movement_id)).filter(SpareStockMovement.movement_datetime >= last_30d)
    )

    # Open Alerts count
    from app.modules.inventory.models import PricingAlert, AlertSeverity, AlertStatus

    crit_count = (
        await db.scalar(
            select(func.count(PricingAlert.alert_id)).filter(
                PricingAlert.severity == AlertSeverity.CRITICAL.value,
                PricingAlert.status.in_([AlertStatus.OPEN.value, AlertStatus.ESCALATED.value]),
            )
        )
        or 0
    )
    high_count = (
        await db.scalar(
            select(func.count(PricingAlert.alert_id)).filter(
                PricingAlert.severity == AlertSeverity.HIGH.value,
                PricingAlert.status.in_([AlertStatus.OPEN.value, AlertStatus.ESCALATED.value]),
            )
        )
        or 0
    )
    # Check opening parts with on-hand quantity lacking traceable purchase records
    from app.modules.procurement.models import SparePurchaseItem

    unverified_opening_stmt = select(func.count(SpareStockBalance.spare_id.distinct())).filter(
        SpareStockBalance.quantity > 0,
        ~SpareStockBalance.spare_id.in_(
            select(SparePurchaseItem.spare_id.distinct()).filter(SparePurchaseItem.spare_id.isnot(None))
        ),
    )
    unverified_count = (await db.scalar(unverified_opening_stmt)) or 0
    is_estimated = unverified_count > 0

    return InventoryDashboardResponse(
        total_active_spares=active_spares or 0,
        total_stock_value=round(total_acct_val, 2),
        total_gst_inclusive_value=round(total_gst_incl_val, 2),
        gst_inclusive_valuation_label=(
            "Operational Acquisition View (Partially Estimated Opening Stock)"
            if is_estimated
            else "Operational Acquisition View (Invoice-Backed)"
        ),
        is_gst_inclusive_estimated=is_estimated,
        unverified_opening_stock_count=unverified_count,
        total_movements_last_30d=movements_30d or 0,
        critical_alerts_count=crit_count,
        high_alerts_count=high_count,
    )


async def get_stock_by_location(db: AsyncSession, location: str = None) -> list[StockByLocationResponse]:
    # Group by location
    query = select(SpareStockBalance.location, func.sum(SpareStockBalance.quantity).label("total_qty")).group_by(
        SpareStockBalance.location
    )

    if location:
        query = query.filter(SpareStockBalance.location == location)

    result = await db.execute(query)
    rows = result.all()

    out = []
    for row in rows:
        loc = row.location
        qty = row.total_qty
        out.append(StockByLocationResponse(location=loc, total_quantity=qty, total_value=0))
    return out


async def list_stock(db: AsyncSession, spare_id: int = None, location: str = None) -> StockListResponse:
    query = select(SpareStockBalance).options(selectinload(SpareStockBalance.spare).selectinload(SpareMaster.codes))
    if spare_id:
        query = query.filter_by(spare_id=spare_id)
    if location:
        query = query.filter_by(location=location)

    result = await db.execute(query)
    balances = result.scalars().all()

    spare_ids = list({bal.spare_id for bal in balances})
    wac_map: dict[int, float] = {}
    if spare_ids:
        cost_stmt = (
            select(SpareCostHistory)
            .filter(
                SpareCostHistory.spare_id.in_(spare_ids),
                SpareCostHistory.is_deleted.is_(False),
            )
            .order_by(SpareCostHistory.spare_id, desc(SpareCostHistory.effective_date))
        )
        cost_res = await db.execute(cost_stmt)
        cost_records = cost_res.scalars().all()
        for ch in cost_records:
            if ch.spare_id not in wac_map:
                if ch.wac_cost is not None and float(ch.wac_cost) > 0:
                    wac_map[ch.spare_id] = float(ch.wac_cost)
                elif ch.landed_cost is not None and float(ch.landed_cost) > 0:
                    wac_map[ch.spare_id] = float(ch.landed_cost)

        # Identify which spares have verified purchase items
        from app.modules.procurement.models import SparePurchaseItem

        purch_stmt = select(SparePurchaseItem.spare_id.distinct()).filter(
            SparePurchaseItem.spare_id.in_(spare_ids),
            SparePurchaseItem.spare_id.isnot(None),
        )
        purch_res = await db.execute(purch_stmt)
        purchased_spare_ids = set(purch_res.scalars().all())

    items = []
    for bal in balances:
        spare = bal.spare
        has_invoice = bal.spare_id in purchased_spare_ids if spare_ids else False
        cost_classification = "INVOICE_VERIFIED" if has_invoice else "ESTIMATED_OPENING"
        acquisition_tax_status = "TRACEABLE_INVOICE" if has_invoice else "CATALOG_ESTIMATE"
        has_unverified_tax = not has_invoice

        if spare.accounting_wac is not None and float(spare.accounting_wac) > 0:
            wac = float(spare.accounting_wac)
        elif bal.spare_id in wac_map:
            wac = wac_map[bal.spare_id]
        elif spare.base_cost is not None and float(spare.base_cost) > 0:
            wac = float(spare.base_cost)
        elif spare.base_dlp is not None and float(spare.base_dlp) > 0:
            wac = float(spare.base_dlp)
        else:
            wac = 0.0

        gst_rate = float(spare.gst_rate or 18.0)
        gst_factor = 1.0 + (gst_rate / 100.0)

        tot_val = round(wac * bal.quantity, 2)
        tot_gst_incl = round(tot_val * gst_factor, 2)

        mrp = float(spare.manufacturer_mrp or spare.base_mrp or 0.0)
        dlp = float(spare.manufacturer_dlp or spare.base_dlp or 0.0)

        if mrp > 0 and wac > 0:
            taxable_mrp = round(mrp / gst_factor, 2)
            exp_profit = round(taxable_mrp - wac, 2)
            margin_pct = round((exp_profit / taxable_mrp) * 100.0, 2) if taxable_mrp > 0 else 0.0
        else:
            exp_profit = None
            margin_pct = None

        part_code_str = spare.part_number

        items.append(
            StockItemResponse(
                spare_id=bal.spare_id,
                spare_name=spare.spare_name,
                part_code=part_code_str,
                tracking_mode=spare.tracking_mode,
                location=bal.location,
                quantity=bal.quantity,
                unit_cost=wac,
                total_value=tot_val,
                gst_inclusive_value=tot_gst_incl,
                cost_classification=cost_classification,
                acquisition_tax_status=acquisition_tax_status,
                has_unverified_historical_tax=has_unverified_tax,
                manufacturer_mrp=mrp if mrp > 0 else None,
                manufacturer_dlp=dlp if dlp > 0 else None,
                expected_gross_profit=exp_profit,
                gross_margin_percent=margin_pct,
            )
        )
    return StockListResponse(items=items)


async def list_batches(db: AsyncSession, spare_id: int = None, location: str = None) -> BatchListResponse:
    query = select(SpareBatch).options(selectinload(SpareBatch.spare))
    if spare_id:
        query = query.filter_by(spare_id=spare_id)

    result = await db.execute(query)
    batches = result.scalars().all()
    if not batches:
        return BatchListResponse(items=[])

    batch_ids = [b.batch_id for b in batches]
    move_stmt = (
        select(
            SpareStockMovement.batch_id,
            SpareStockMovement.to_location,
            func.sum(SpareStockMovement.quantity).label("qty"),
        )
        .filter(SpareStockMovement.batch_id.in_(batch_ids))
        .group_by(SpareStockMovement.batch_id, SpareStockMovement.to_location)
    )
    move_res = await db.execute(move_stmt)
    batch_moves: dict[int, list] = {}
    for row in move_res.all():
        batch_moves.setdefault(row.batch_id, []).append((row.to_location, row.qty))

    items = []
    for b in batches:
        moves = batch_moves.get(b.batch_id, [])
        for to_loc, qty in moves:
            if qty > 0:
                if location and to_loc != location:
                    continue
                items.append(
                    BatchItemResponse(
                        batch_id=b.batch_id,
                        spare_id=b.spare_id,
                        spare_name=b.spare.spare_name,
                        batch_number=b.batch_number,
                        location=to_loc,
                        quantity=qty,
                        unit_cost=b.unit_cost,
                        total_value=float(b.unit_cost) * qty,
                        expiry_date=b.expiry_date,
                    )
                )
    return BatchListResponse(items=items)


async def list_serials(
    db: AsyncSession, spare_id: int = None, location: str = None, serial_number: str = None
) -> SerialListResponse:
    query = select(SpareSerial).options(selectinload(SpareSerial.spare))
    if spare_id:
        query = query.filter_by(spare_id=spare_id)
    if location:
        query = query.filter_by(location=location)
    if serial_number:
        query = query.filter(SpareSerial.serial_number.ilike(f"%{serial_number}%"))

    result = await db.execute(query)
    serials = result.scalars().all()

    items = []
    for s in serials:
        items.append(
            SerialItemResponse(
                serial_id=s.serial_id,
                spare_id=s.spare_id,
                spare_name=s.spare.spare_name,
                serial_number=s.serial_number,
                location=s.location,
                status=s.status,
                unit_cost=s.unit_cost,
            )
        )
    return SerialListResponse(items=items)


async def list_movements(
    db: AsyncSession, page: int = 1, size: int = 50, spare_id: int = None
) -> MovementHistoryListResponse:
    query = select(SpareStockMovement).options(
        selectinload(SpareStockMovement.spare),
        selectinload(SpareStockMovement.batch),
        selectinload(SpareStockMovement.serial),
    )
    if spare_id:
        query = query.filter_by(spare_id=spare_id)

    total = await db.scalar(select(func.count()).select_from(query.subquery()))

    query = query.order_by(desc(SpareStockMovement.movement_datetime)).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    movements = result.scalars().all()

    items = []
    for m in movements:
        items.append(
            MovementHistoryItemResponse(
                movement_id=m.movement_id,
                movement_datetime=m.movement_datetime,
                movement_type=m.movement_type,
                spare_id=m.spare_id,
                spare_name=m.spare.spare_name,
                quantity=m.quantity,
                from_location=m.from_location,
                to_location=m.to_location,
                batch_number=m.batch.batch_number if m.batch else None,
                serial_number=m.serial.serial_number if m.serial else None,
                unit_cost=m.unit_cost,
                total_cost=m.total_cost,
                reference_type=m.reference_type,
                reference_id=str(m.reference_id) if m.reference_id is not None else None,
                remarks=m.remarks,
            )
        )

    return MovementHistoryListResponse(items=items, total=total, page=page, size=size)
