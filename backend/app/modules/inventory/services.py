import logging
from datetime import date, datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.modules.inventory.models import (
    VehicleStockMovement,
    SpareStockMovement,
    SpareMaster,
    SpareSerial,
    SparePartCode,
    SparePartVehicleCompatibility,
    SpareBatch,
    SpareStockBalance,
    SpareCostHistory,
)
from app.modules.inventory.contracts import (
    CheckSpareStockRequest,
    SpareStockAvailabilityResponse,
    SpareStockAvailabilityInfo,
    CheckVehicleAvailabilityRequest,
    VehicleAvailabilityResponse,
)
from app.db.mixins import utc_now_naive

logger = logging.getLogger(__name__)

_utc_now_naive = utc_now_naive


class InventoryError(Exception):
    pass


class VehicleNotAvailableError(InventoryError):
    pass


class DuplicateVehicleAllocationError(InventoryError):
    pass


class InsufficientSpareStockError(InventoryError):
    pass


class InvalidSpareMovementError(InventoryError):
    pass


async def get_latest_vehicle_movement(db: AsyncSession, chassis_no: str) -> VehicleStockMovement | None:
    stmt = (
        select(VehicleStockMovement)
        .filter(VehicleStockMovement.chassis_no == chassis_no)
        .order_by(VehicleStockMovement.movement_datetime.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def is_vehicle_available(db: AsyncSession, chassis_no: str) -> bool:
    last = await get_latest_vehicle_movement(db, chassis_no)

    if last is None:
        return False

    return last.movement_type in ("INWARD", "AVAILABLE")


async def add_vehicle_movement(
    db: AsyncSession,
    *,
    chassis_no: str,
    movement_type: str,
    reference_type: str | None = None,
    reference_id: int | None = None,
    from_location: str | None = None,
    to_location: str | None = None,
    remarks: str | None = None,
) -> VehicleStockMovement:

    last = await get_latest_vehicle_movement(db, chassis_no)

    # Prevent duplicate allocation
    if movement_type == "ALLOCATED":
        if last and last.movement_type == "ALLOCATED":
            raise DuplicateVehicleAllocationError(f"Vehicle {chassis_no} already allocated")

        if last and last.movement_type not in ("INWARD", "AVAILABLE"):
            raise VehicleNotAvailableError(f"Vehicle {chassis_no} not available for allocation")

    # Prevent double delivery
    if movement_type == "DELIVERED":
        if last and last.movement_type == "DELIVERED":
            raise InventoryError(f"Vehicle {chassis_no} already delivered")

    movement = VehicleStockMovement(
        chassis_no=chassis_no,
        movement_type=movement_type,
        reference_type=reference_type,
        reference_id=reference_id,
        from_location=from_location,
        to_location=to_location,
        movement_datetime=datetime.now(timezone.utc).replace(tzinfo=None),
        remarks=remarks,
    )

    db.add(movement)
    await db.flush()  # important for transaction integrity

    return movement


async def get_spare_stock(db: AsyncSession, spare_id: int) -> int:
    bal_stmt = select(func.coalesce(func.sum(SpareStockBalance.quantity), 0)).filter(
        SpareStockBalance.spare_id == spare_id
    )
    bal_res = await db.execute(bal_stmt)
    bal_qty = bal_res.scalar()
    if bal_qty is not None and int(bal_qty) > 0:
        return int(bal_qty)

    stmt = select(func.coalesce(func.sum(SpareStockMovement.quantity), 0)).filter(
        SpareStockMovement.spare_id == spare_id
    )
    result = await db.execute(stmt)
    qty = result.scalar()
    return int(qty or 0)


def _validate_spare_movement(
    spare: SpareMaster,
    quantity: int,
    serial_id: int | None,
):
    if spare.tracking_mode == "SERIALIZED":
        if serial_id is None:
            raise InvalidSpareMovementError("Serialized spare requires serial_id")
        if abs(quantity) != 1:
            raise InvalidSpareMovementError("Serialized spare quantity must be ±1")
    else:
        if serial_id is not None:
            raise InvalidSpareMovementError("Non-serialized spare cannot have serial_id")


async def add_spare_movement(
    db: AsyncSession,
    *,
    spare_id: int,
    quantity: int,
    movement_type: str,
    serial_id: int | None = None,
    from_location: str | None = None,
    to_location: str | None = None,
    unit_cost: float | None = None,
    total_cost: float | None = None,
    reference_type: str | None = None,
    reference_id: int | None = None,
    remarks: str | None = None,
) -> SpareStockMovement:

    spare = await db.get(SpareMaster, spare_id)
    if not spare or spare.is_deleted:
        raise InventoryError("Invalid spare_id")

    _validate_spare_movement(spare, quantity, serial_id)

    # Check for negative stock
    # Note: We need to check stock BEFORE adding movement for consumption
    # But for INWARD it's fine.
    # Logic: if quantity < 0 (consumption), check if current_stock + quantity < 0
    if quantity < 0:
        current_stock = await get_spare_stock(db, spare_id)
        if current_stock + quantity < 0:
            raise InsufficientSpareStockError(f"Insufficient stock for spare ID {spare.spare_id}")

    movement = SpareStockMovement(
        spare_id=spare_id,
        serial_id=serial_id,
        quantity=quantity,
        movement_type=movement_type,
        from_location=from_location,
        to_location=to_location,
        unit_cost=unit_cost,
        total_cost=total_cost,
        reference_type=reference_type,
        reference_id=reference_id,
        movement_datetime=datetime.now(timezone.utc).replace(tzinfo=None),
        remarks=remarks,
    )

    db.add(movement)
    await db.flush()

    return movement


async def list_spares(db: AsyncSession, include_deleted: bool = False) -> list[SpareMaster]:
    """List all spare master records."""
    stmt = select(SpareMaster).options(selectinload(SpareMaster.codes), selectinload(SpareMaster.compatibilities))
    if not include_deleted:
        stmt = stmt.filter(SpareMaster.is_deleted.is_(False))
    stmt = stmt.order_by(SpareMaster.spare_name)
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_spare(db: AsyncSession, spare_id: int) -> SpareMaster | None:
    stmt = (
        select(SpareMaster)
        .options(selectinload(SpareMaster.codes), selectinload(SpareMaster.compatibilities))
        .filter(SpareMaster.spare_id == spare_id, SpareMaster.is_deleted.is_(False))
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def create_spare(
    db: AsyncSession,
    *,
    spare_name: str,
    initial_code: str,
    tracking_mode: str = "QUANTITY",
    category: str | None = None,
    remarks: str | None = None,
) -> SpareMaster:
    # Validate duplicate code across all active codes
    existing_code_stmt = select(SparePartCode).filter(
        SparePartCode.code == initial_code, SparePartCode.is_deleted.is_(False)
    )
    existing_code = await db.execute(existing_code_stmt)
    if existing_code.scalars().first():
        raise InventoryError(f"Part code {initial_code} already exists.")

    spare = SpareMaster(
        spare_name=spare_name, category=category, tracking_mode=tracking_mode, status="ACTIVE", remarks=remarks
    )
    db.add(spare)
    await db.flush()

    code_record = SparePartCode(
        spare_id=spare.spare_id,
        code=initial_code,
        is_current=True,
        effective_from=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(code_record)
    await db.flush()

    return await get_spare(db, spare.spare_id)


async def update_spare(
    db: AsyncSession,
    spare_id: int,
    *,
    spare_name: str | None = None,
    category: str | None = None,
    remarks: str | None = None,
) -> SpareMaster:
    spare = await get_spare(db, spare_id)
    if not spare:
        raise InventoryError("Spare part not found")

    if spare_name is not None:
        spare.spare_name = spare_name
    if category is not None:
        spare.category = category
    if remarks is not None:
        spare.remarks = remarks

    await db.flush()
    return await get_spare(db, spare_id)


async def add_part_code(db: AsyncSession, spare_id: int, code: str, reason: str | None = None) -> SpareMaster:
    spare = await get_spare(db, spare_id)
    if not spare:
        raise InventoryError("Spare part not found")

    existing_code_stmt = select(SparePartCode).filter(SparePartCode.code == code, SparePartCode.is_deleted.is_(False))
    existing_code = await db.execute(existing_code_stmt)
    if existing_code.scalars().first():
        raise InventoryError(f"Part code {code} already exists.")

    code_record = SparePartCode(
        spare_id=spare.spare_id,
        code=code,
        is_current=True,
        effective_from=datetime.now(timezone.utc).replace(tzinfo=None),
        reason=reason,
    )
    db.add(code_record)
    spare.codes.append(code_record)
    await db.flush()
    return spare


async def retire_part_code(db: AsyncSession, spare_id: int, code_id: int) -> SpareMaster:
    spare = await get_spare(db, spare_id)
    if not spare:
        raise InventoryError("Spare part not found")

    code_record = next((c for c in spare.codes if c.code_id == code_id), None)
    if not code_record:
        raise InventoryError("Code not associated with this spare")

    code_record.is_current = False
    code_record.effective_to = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.flush()
    return await get_spare(db, spare_id)


async def add_compatibility(db: AsyncSession, spare_id: int, vehicle_model_id: int) -> SpareMaster:
    spare = await get_spare(db, spare_id)
    if not spare:
        raise InventoryError("Spare part not found")

    existing = next((c for c in spare.compatibilities if c.vehicle_model_id == vehicle_model_id), None)
    if existing:
        return spare

    compat = SparePartVehicleCompatibility(spare_id=spare_id, vehicle_model_id=vehicle_model_id)
    db.add(compat)
    spare.compatibilities.append(compat)
    await db.flush()
    return spare


async def remove_compatibility(db: AsyncSession, spare_id: int, compatibility_id: int) -> SpareMaster:
    spare = await get_spare(db, spare_id)
    if not spare:
        raise InventoryError("Spare part not found")

    compat = next((c for c in spare.compatibilities if c.compatibility_id == compatibility_id), None)
    if not compat:
        raise InventoryError("Compatibility not found")

    await db.delete(compat)
    spare.compatibilities.remove(compat)
    await db.flush()
    return spare


async def deactivate_spare(db: AsyncSession, spare_id: int) -> SpareMaster:
    """Soft-deletes a spare part and its associated part codes strictly without purging."""
    stmt = (
        select(SpareMaster)
        .options(selectinload(SpareMaster.codes), selectinload(SpareMaster.compatibilities))
        .filter(SpareMaster.spare_id == spare_id)
    )
    result = await db.execute(stmt)
    spare = result.scalars().first()
    if not spare:
        raise InventoryError("Spare part not found")

    spare.status = "INACTIVE"
    spare.is_deleted = True
    spare.deleted_at = datetime.now(timezone.utc).replace(tzinfo=None)
    for c in spare.codes or []:
        c.is_deleted = True
        c.is_current = False
    await db.flush()
    return spare


async def restore_spare(db: AsyncSession, spare_id: int) -> SpareMaster:
    """Restores a soft-deleted spare part and reactivates its codes."""
    stmt = (
        select(SpareMaster)
        .options(selectinload(SpareMaster.codes), selectinload(SpareMaster.compatibilities))
        .filter(SpareMaster.spare_id == spare_id)
    )
    result = await db.execute(stmt)
    spare = result.scalars().first()
    if not spare:
        raise InventoryError("Spare part not found")

    spare.status = "ACTIVE"
    spare.is_deleted = False
    spare.deleted_at = None
    spare.deleted_by = None
    for c in spare.codes or []:
        c.is_deleted = False
        c.is_current = True
    await db.flush()
    return spare


async def _process_purchase_receipt_items(db: AsyncSession, purchase, payload):
    # Idempotency check
    existing = await db.execute(
        select(SpareStockMovement).filter_by(reference_type="PROCUREMENT", reference_id=purchase.spare_purchase_id)
    )
    if existing.scalars().first():
        raise InventoryError("This purchase receipt has already been posted.")

    # Create mapping of purchase_item_id to items
    purchase_items = {item.purchase_item_id: item for item in purchase.items}

    default_location = getattr(payload, "location", None) or "MAIN_WAREHOUSE"

    for item_data in payload.items:
        if item_data.purchase_item_id not in purchase_items:
            raise InventoryError(f"Purchase item {item_data.purchase_item_id} not found in purchase")

        target_location = item_data.location or default_location
        p_item = purchase_items[item_data.purchase_item_id]
        spare = await get_spare(db, p_item.spare_id)

        batch_id = None
        if spare.tracking_mode == "BATCH":
            if not item_data.batch_number:
                raise InventoryError(f"Batch number required for part {spare.spare_name}")
            # Check or create batch
            batch_res = await db.execute(
                select(SpareBatch).filter_by(spare_id=spare.spare_id, batch_number=item_data.batch_number)
            )
            batch = batch_res.scalars().first()
            if not batch:
                batch = SpareBatch(
                    spare_id=spare.spare_id,
                    batch_number=item_data.batch_number,
                    expiry_date=None,  # Or parse if provided
                    unit_cost=p_item.unit_cost,
                    mrp=None,
                    status="ACTIVE",
                )
                db.add(batch)
                await db.flush()
            batch_id = batch.batch_id

        serial_ids = []
        if spare.tracking_mode == "SERIALIZED":
            if not item_data.serial_numbers or len(item_data.serial_numbers) != p_item.quantity:
                raise InventoryError(f"Required exactly {p_item.quantity} serial numbers for part {spare.spare_name}")

            for s_num in item_data.serial_numbers:
                # Check duplicate
                ser_res = await db.execute(select(SpareSerial).filter_by(spare_id=spare.spare_id, serial_number=s_num))
                if ser_res.scalars().first():
                    raise InventoryError(f"Serial number {s_num} already exists for part {spare.spare_name}")

                new_ser = SpareSerial(
                    spare_id=spare.spare_id,
                    serial_number=s_num,
                    status="IN_STOCK",
                    location=target_location,
                    unit_cost=p_item.unit_cost,
                )
                db.add(new_ser)
                await db.flush()
                serial_ids.append(new_ser.serial_id)

        qty = int(p_item.quantity or 0)
        unit_rate = float(p_item.unit_cost or 0.0)  # Eligible taxable purchase unit rate
        tax_amt = float(p_item.tax_amount or 0.0)
        gst_pct = float(p_item.gst_percentage or 0.0)
        if not tax_amt and gst_pct > 0 and qty > 0 and unit_rate > 0:
            tax_amt = round(qty * unit_rate * (gst_pct / 100.0), 2)

        # Inventory Carrying Cost excludes recoverable input GST
        eligible_inventory_cost = round(qty * unit_rate, 2)

        # For non-serialized, or individually for serialized
        if spare.tracking_mode == "SERIALIZED":
            for s_id in serial_ids:
                mov = SpareStockMovement(
                    spare_id=spare.spare_id,
                    serial_id=s_id,
                    batch_id=batch_id,
                    quantity=1,
                    movement_type="PURCHASE",
                    reference_type="PROCUREMENT",
                    reference_id=purchase.spare_purchase_id,
                    movement_datetime=datetime.now(timezone.utc).replace(tzinfo=None),
                    remarks="Posted from Procurement",
                    to_location=target_location,
                    unit_cost=unit_rate,
                    total_cost=unit_rate,
                )
                db.add(mov)
        else:
            mov = SpareStockMovement(
                spare_id=spare.spare_id,
                serial_id=None,
                batch_id=batch_id,
                quantity=p_item.quantity,
                movement_type="PURCHASE",
                reference_type="PROCUREMENT",
                reference_id=purchase.spare_purchase_id,
                movement_datetime=datetime.now(timezone.utc).replace(tzinfo=None),
                remarks="Posted from Procurement",
                to_location=target_location,
                unit_cost=unit_rate,
                total_cost=eligible_inventory_cost,
            )
            db.add(mov)

        # Determine prior stock on hand company-wide across all locations BEFORE this inward
        prior_bal_stmt = select(func.coalesce(func.sum(SpareStockBalance.quantity), 0)).filter(
            SpareStockBalance.spare_id == spare.spare_id
        )
        prior_stock = int((await db.execute(prior_bal_stmt)).scalar() or 0)
        if prior_stock == 0:
            mov_stmt = select(func.coalesce(func.sum(SpareStockMovement.quantity), 0)).filter(
                SpareStockMovement.spare_id == spare.spare_id
            )
            prior_stock = int((await db.execute(mov_stmt)).scalar() or 0)

        # Update Stock Balance
        bal_res = await db.execute(
            select(SpareStockBalance).filter_by(spare_id=spare.spare_id, location=target_location)
        )
        balance = bal_res.scalars().first()
        if not balance:
            balance = SpareStockBalance(spare_id=spare.spare_id, location=target_location, quantity=p_item.quantity)
            db.add(balance)
        else:
            balance.quantity += p_item.quantity

        # Perpetual WAC calculation (Company-wide, excluding recoverable ITC)
        cost_res = await db.execute(
            select(SpareCostHistory)
            .filter_by(spare_id=spare.spare_id, is_deleted=False)
            .order_by(SpareCostHistory.effective_date.desc(), SpareCostHistory.cost_id.desc())
        )
        last_cost = cost_res.scalars().first()

        # Prior WAC for existing on-hand inventory
        if spare.accounting_wac is not None and float(spare.accounting_wac) > 0:
            old_wac = float(spare.accounting_wac)
        elif last_cost and last_cost.wac_cost is not None and float(last_cost.wac_cost) > 0:
            old_wac = float(last_cost.wac_cost)
        elif spare.base_cost is not None and float(spare.base_cost) > 0:
            old_wac = float(spare.base_cost)
        elif spare.base_dlp is not None and float(spare.base_dlp) > 0:
            old_wac = float(spare.base_dlp)
        else:
            old_wac = unit_rate

        new_quantity = prior_stock + qty
        if new_quantity > 0:
            if prior_stock <= 0:
                new_wac = unit_rate
            else:
                new_wac = round(((prior_stock * old_wac) + eligible_inventory_cost) / new_quantity, 2)
        else:
            new_wac = unit_rate

        # Record in SpareCostHistory
        new_cost = SpareCostHistory(
            spare_id=spare.spare_id,
            quantity=p_item.quantity,
            billed_unit_price=unit_rate,
            additional_costs=0,
            landed_cost=unit_rate,
            wac_cost=new_wac,
            source_reference=f"PURCHASE-{purchase.spare_purchase_id}",
        )
        db.add(new_cost)

        # Update Master canonical accounting WAC (Manufacturer DLP & MRP remain independent)
        spare.accounting_wac = new_wac
        spare.base_cost = new_wac

        # Record purchase input GST in GST Ledger (recoverable ITC tracked separately)
        if tax_amt > 0:
            from app.modules.finance.gst_service import record_purchase_itc

            inv_num = getattr(purchase, "invoice_number", None) or f"PO-{purchase.spare_purchase_id}"
            inv_date = getattr(purchase, "purchase_date", None) or date.today()
            v_id = getattr(purchase, "vendor_id", None)

            # Half CGST + SGST or full IGST
            cgst_part = round(tax_amt / 2.0, 2)
            sgst_part = round(tax_amt - cgst_part, 2)

            await record_purchase_itc(
                db=db,
                purchase_id=purchase.spare_purchase_id,
                invoice_number=inv_num,
                invoice_date=inv_date,
                taxable_value=eligible_inventory_cost,
                cgst_amount=cgst_part,
                sgst_amount=sgst_part,
                igst_amount=0.0,
                vendor_id=v_id,
                vendor_name=getattr(purchase, "vendor_name", None),
                vendor_gstin=getattr(purchase, "vendor_gstin", None),
                eligibility_status="ELIGIBLE",
            )

        # Audit price/cost change and re-evaluate pricing risks
        from app.modules.inventory.profitability_service import (
            evaluate_part_pricing_risk,
            record_price_change_audit,
        )

        await record_price_change_audit(
            db=db,
            spare_id=spare.spare_id,
            part_code=spare.part_number or str(spare.spare_id),
            change_type="WAC_CHANGE",
            old_value=old_wac,
            new_value=new_wac,
            source_document=f"PURCHASE-{purchase.spare_purchase_id}",
            reason="Inward purchase receipt posted into inventory",
        )
        await evaluate_part_pricing_risk(db, spare.spare_id)

    await db.flush()


async def post_purchase_receipt(db: AsyncSession, purchase, payload):
    """Post procurement purchase receipt to inventory stock balance, batches, serials and WAC with transaction rollback protection."""
    try:
        await _process_purchase_receipt_items(db, purchase, payload)
    except Exception as exc:
        await db.rollback()
        logger.error(
            "Failed to post purchase receipt %s: %s",
            getattr(purchase, "spare_purchase_id", "unknown"),
            exc,
            exc_info=True,
        )
        raise


async def revert_purchase_receipt(db: AsyncSession, purchase, staff_id: int):
    """Revert inventory additions made by a posted purchase receipt when the PO is cancelled/deleted.

    Reverts only unsold inventory units and never drives inventory negative.
    """
    stmt = select(SpareStockMovement).filter_by(reference_type="PROCUREMENT", reference_id=purchase.spare_purchase_id)
    result = await db.execute(stmt)
    movements = result.scalars().all()

    if not movements:
        logger.info("No posted procurement movements found for PO #%s to revert.", purchase.spare_purchase_id)
        return

    now = _utc_now_naive()

    for mov in movements:
        if not mov.spare_id or mov.quantity <= 0:
            continue

        loc = mov.to_location or "MAIN_WAREHOUSE"

        bal_stmt = select(SpareStockBalance).filter_by(spare_id=mov.spare_id, location=loc)
        bal_res = await db.execute(bal_stmt)
        balance = bal_res.scalars().first()

        current_stock = balance.quantity if balance else 0
        posted_qty = mov.quantity

        # Only revert what is currently available (unsold). Never drive stock negative.
        revert_qty = min(current_stock, posted_qty) if current_stock > 0 else 0
        sold_qty = posted_qty - revert_qty

        if revert_qty > 0 and balance:
            balance.quantity -= revert_qty

            reversal_mov = SpareStockMovement(
                spare_id=mov.spare_id,
                serial_id=mov.serial_id,
                batch_id=mov.batch_id,
                quantity=-revert_qty,
                movement_type="ADJUSTMENT",
                reference_type="PROCUREMENT_REVERSAL",
                reference_id=purchase.spare_purchase_id,
                movement_datetime=now,
                remarks=(
                    f"Reversal on PO #{purchase.spare_purchase_id} cancellation/deletion. "
                    f"Reverted {revert_qty} unsold units. {sold_qty} units already sold/consumed."
                ),
                from_location=loc,
                unit_cost=mov.unit_cost,
                total_cost=(float(mov.unit_cost) * revert_qty) if mov.unit_cost else 0,
            )
            db.add(reversal_mov)

        # If serialized, mark in-stock serial as REVERSED
        if mov.serial_id:
            ser_stmt = select(SpareSerial).filter_by(serial_id=mov.serial_id)
            ser_res = await db.execute(ser_stmt)
            ser_obj = ser_res.scalars().first()
            if ser_obj and ser_obj.status == "IN_STOCK":
                ser_obj.status = "REVERSED"

    # Soft-delete associated cost history entries
    cost_stmt = select(SpareCostHistory).filter(
        SpareCostHistory.source_reference == f"PURCHASE-{purchase.spare_purchase_id}",
        SpareCostHistory.is_deleted.is_(False),
    )
    cost_res = await db.execute(cost_stmt)
    for cost in cost_res.scalars().all():
        cost.is_deleted = True
        cost.deleted_at = now
        cost.deleted_by = staff_id

    await db.flush()


# ==================== CROSS-MODULE CONTRACT SERVICES & TEMPORARY SPARES ====================


async def check_vehicle_availability(
    db: AsyncSession, req: CheckVehicleAvailabilityRequest
) -> VehicleAvailabilityResponse:
    """
    Synchronous cross-module read.
    Returns a contract (Pydantic model) rather than the raw database model.
    """
    last = await get_latest_vehicle_movement(db, req.chassis_no)

    if last is None:
        return VehicleAvailabilityResponse(chassis_no=req.chassis_no, is_available=False, current_status=None)

    is_available = last.movement_type in ("INWARD", "AVAILABLE")
    return VehicleAvailabilityResponse(
        chassis_no=req.chassis_no, is_available=is_available, current_status=last.movement_type
    )


async def check_spare_stock(db: AsyncSession, req: CheckSpareStockRequest) -> SpareStockAvailabilityResponse:
    """
    Synchronous cross-module read.
    Aggregates stock quantities for the requested spares and returns a contract.
    """
    results = []
    for spare_id in req.spare_ids:
        stmt = select(func.coalesce(func.sum(SpareStockMovement.quantity), 0)).filter(
            SpareStockMovement.spare_id == spare_id
        )
        result = await db.execute(stmt)
        qty = result.scalar() or 0

        results.append(SpareStockAvailabilityInfo(spare_id=spare_id, available_quantity=int(qty), is_available=qty > 0))

    return SpareStockAvailabilityResponse(results=results)


async def create_temporary_spare(
    db: AsyncSession,
    *,
    spare_code: str,
    spare_name: str,
    category: str | None = None,
    remarks: str | None = None,
) -> int:
    """
    Internal logic to create a temporary spare part.
    Returns the created spare_id to keep ORM objects internal.
    """
    existing_code_stmt = select(SparePartCode).filter(
        SparePartCode.code == spare_code, SparePartCode.is_deleted.is_(False)
    )
    existing_code = await db.execute(existing_code_stmt)
    if existing_code.scalars().first():
        raise InventoryError(f"Part code {spare_code} already exists.")

    spare = SpareMaster(
        spare_name=spare_name,
        category=category,
        tracking_mode="QUANTITY",
        status="ACTIVE",
        is_temporary=True,
        is_verified=False,
        remarks=remarks,
    )
    db.add(spare)
    await db.flush()

    code_record = SparePartCode(
        spare_id=spare.spare_id,
        code=spare_code,
        is_current=True,
        effective_from=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(code_record)
    await db.flush()
    return spare.spare_id


async def list_temporary_spares(db: AsyncSession) -> list[SpareMaster]:
    """List unverified temporary items (excludes soft-deleted)"""
    stmt = (
        select(SpareMaster)
        .options(selectinload(SpareMaster.codes))
        .filter(
            SpareMaster.is_temporary.is_(True),
            SpareMaster.is_verified.is_(False),
            SpareMaster.is_deleted.is_(False),
        )
    )
    result = await db.execute(stmt)
    return result.scalars().all()


async def approve_temporary_spare(db: AsyncSession, spare_id: int) -> SpareMaster | None:
    """Approve a temporary item"""
    stmt = select(SpareMaster).options(selectinload(SpareMaster.codes)).filter_by(spare_id=spare_id)
    result = await db.execute(stmt)
    item = result.scalars().first()
    if not item:
        return None
    item.is_verified = True
    item.is_temporary = False
    await db.commit()
    await db.refresh(item)
    return item
