from datetime import datetime, timezone
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
    SpareCostHistory
)

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


async def get_latest_vehicle_movement(
    db: AsyncSession, chassis_no: str
) -> VehicleStockMovement | None:
    stmt = (
        select(VehicleStockMovement)
        .filter(VehicleStockMovement.chassis_no == chassis_no)
        .order_by(VehicleStockMovement.movement_datetime.desc())
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
            raise DuplicateVehicleAllocationError(
                f"Vehicle {chassis_no} already allocated"
            )

        if last and last.movement_type not in ("INWARD", "AVAILABLE"):
            raise VehicleNotAvailableError(
                f"Vehicle {chassis_no} not available for allocation"
            )

    # Prevent double delivery
    if movement_type == "DELIVERED":
        if last and last.movement_type == "DELIVERED":
            raise InventoryError(
                f"Vehicle {chassis_no} already delivered"
            )

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

async def get_spare_stock(
    db: AsyncSession, spare_id: int
) -> int:
    stmt = (
        select(func.coalesce(func.sum(SpareStockMovement.quantity), 0))
        .filter(SpareStockMovement.spare_id == spare_id)
    )
    result = await db.execute(stmt)
    qty = result.scalar()
    return int(qty)

def _validate_spare_movement(
    spare: SpareMaster,
    quantity: int,
    serial_id: int | None,
):
    if spare.tracking_mode == "SERIALIZED":
        if serial_id is None:
            raise InvalidSpareMovementError(
                "Serialized spare requires serial_id"
            )
        if abs(quantity) != 1:
            raise InvalidSpareMovementError(
                "Serialized spare quantity must be ±1"
            )
    else:
        if serial_id is not None:
            raise InvalidSpareMovementError(
                "Non-serialized spare cannot have serial_id"
            )

async def add_spare_movement(
    db: AsyncSession,
    *,
    spare_id: int,
    quantity: int,
    movement_type: str,
    serial_id: int | None = None,
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
             raise InsufficientSpareStockError(
                f"Insufficient stock for spare ID {spare.spare_id}"
            )

    movement = SpareStockMovement(
        spare_id=spare_id,
        serial_id=serial_id,
        quantity=quantity,
        movement_type=movement_type,
        reference_type=reference_type,
        reference_id=reference_id,
        movement_datetime=datetime.now(timezone.utc).replace(tzinfo=None),
        remarks=remarks,
    )

    db.add(movement)
    await db.flush()

    return movement


async def list_spares(
    db: AsyncSession, include_deleted: bool = False
) -> list[SpareMaster]:
    """List all spare master records."""
    stmt = select(SpareMaster).options(selectinload(SpareMaster.codes), selectinload(SpareMaster.compatibilities))
    if not include_deleted:
        stmt = stmt.filter(SpareMaster.is_deleted == False)
    stmt = stmt.order_by(SpareMaster.spare_name)
    result = await db.execute(stmt)
    return result.scalars().all()

async def get_spare(db: AsyncSession, spare_id: int) -> SpareMaster | None:
    stmt = select(SpareMaster).options(
        selectinload(SpareMaster.codes),
        selectinload(SpareMaster.compatibilities)
    ).filter(SpareMaster.spare_id == spare_id, SpareMaster.is_deleted == False)
    result = await db.execute(stmt)
    return result.scalars().first()

async def create_spare(
    db: AsyncSession,
    *,
    spare_name: str,
    initial_code: str,
    tracking_mode: str = "QUANTITY",
    category: str | None = None,
    remarks: str | None = None
) -> SpareMaster:
    # Validate duplicate code across all active codes
    existing_code_stmt = select(SparePartCode).filter(SparePartCode.code == initial_code, SparePartCode.is_deleted == False)
    existing_code = await db.execute(existing_code_stmt)
    if existing_code.scalars().first():
        raise InventoryError(f"Part code {initial_code} already exists.")

    spare = SpareMaster(
        spare_name=spare_name,
        category=category,
        tracking_mode=tracking_mode,
        status="ACTIVE",
        remarks=remarks
    )
    db.add(spare)
    await db.flush()
    
    code_record = SparePartCode(
        spare_id=spare.spare_id,
        code=initial_code,
        is_current=True,
        effective_from=datetime.now(timezone.utc).replace(tzinfo=None)
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
    remarks: str | None = None
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

async def add_part_code(
    db: AsyncSession,
    spare_id: int,
    code: str,
    reason: str | None = None
) -> SpareMaster:
    spare = await get_spare(db, spare_id)
    if not spare:
        raise InventoryError("Spare part not found")

    existing_code_stmt = select(SparePartCode).filter(SparePartCode.code == code, SparePartCode.is_deleted == False)
    existing_code = await db.execute(existing_code_stmt)
    if existing_code.scalars().first():
        raise InventoryError(f"Part code {code} already exists.")
        
    code_record = SparePartCode(
        spare_id=spare.spare_id,
        code=code,
        is_current=True,
        effective_from=datetime.now(timezone.utc).replace(tzinfo=None),
        reason=reason
    )
    db.add(code_record)
    spare.codes.append(code_record)
    await db.flush()
    return spare

async def retire_part_code(
    db: AsyncSession,
    spare_id: int,
    code_id: int
) -> SpareMaster:
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

async def add_compatibility(
    db: AsyncSession,
    spare_id: int,
    vehicle_model_id: int
) -> SpareMaster:
    spare = await get_spare(db, spare_id)
    if not spare:
        raise InventoryError("Spare part not found")
        
    existing = next((c for c in spare.compatibilities if c.vehicle_model_id == vehicle_model_id), None)
    if existing:
        return spare
        
    compat = SparePartVehicleCompatibility(
        spare_id=spare_id,
        vehicle_model_id=vehicle_model_id
    )
    db.add(compat)
    spare.compatibilities.append(compat)
    await db.flush()
    return spare

async def remove_compatibility(
    db: AsyncSession,
    spare_id: int,
    compatibility_id: int
) -> SpareMaster:
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
    spare = await get_spare(db, spare_id)
    if not spare:
        raise InventoryError("Spare part not found")
        
    spare.status = "INACTIVE"
    await db.flush()
    return await get_spare(db, spare_id)


async def post_purchase_receipt(
    db: AsyncSession,
    purchase,
    payload
):
    # Idempotency check
    existing = await db.execute(
        select(SpareStockMovement).filter_by(
            reference_type="PROCUREMENT",
            reference_id=purchase.spare_purchase_id
        )
    )
    if existing.scalars().first():
        raise InventoryError("This purchase receipt has already been posted.")

    # Create mapping of purchase_item_id to items
    purchase_items = {item.purchase_item_id: item for item in purchase.items}
    
    for item_data in payload.items:
        if item_data.purchase_item_id not in purchase_items:
            raise InventoryError(f"Purchase item {item_data.purchase_item_id} not found in purchase")
            
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
                    status="ACTIVE"
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
                    location=item_data.location,
                    unit_cost=p_item.unit_cost
                )
                db.add(new_ser)
                await db.flush()
                serial_ids.append(new_ser.serial_id)
                
        # For non-serialized, or individually for serialized
        if spare.tracking_mode == "SERIALIZED":
            for s_id in serial_ids:
                mov = SpareStockMovement(
                    spare_id=spare.spare_id,
                    serial_id=s_id,
                    batch_id=batch_id,
                    quantity=1,
                    movement_type="PURCHASE_RECEIPT",
                    reference_type="PROCUREMENT",
                    reference_id=purchase.spare_purchase_id,
                    movement_datetime=datetime.now(timezone.utc).replace(tzinfo=None),
                    remarks="Posted from Procurement",
                    to_location=item_data.location,
                    unit_cost=p_item.unit_cost,
                    total_cost=(float(p_item.total_cost) / p_item.quantity) if p_item.quantity and p_item.total_cost else 0
                )
                db.add(mov)
        else:
            mov = SpareStockMovement(
                spare_id=spare.spare_id,
                serial_id=None,
                batch_id=batch_id,
                quantity=p_item.quantity,
                movement_type="PURCHASE_RECEIPT",
                reference_type="PROCUREMENT",
                reference_id=purchase.spare_purchase_id,
                movement_datetime=datetime.now(timezone.utc).replace(tzinfo=None),
                remarks="Posted from Procurement",
                to_location=item_data.location,
                unit_cost=p_item.unit_cost,
                total_cost=float(p_item.total_cost) if p_item.total_cost else 0
            )
            db.add(mov)
            
        # Update Stock Balance
        bal_res = await db.execute(
            select(SpareStockBalance).filter_by(spare_id=spare.spare_id, location=item_data.location)
        )
        balance = bal_res.scalars().first()
        if not balance:
            balance = SpareStockBalance(spare_id=spare.spare_id, location=item_data.location, quantity=p_item.quantity)
            db.add(balance)
        else:
            balance.quantity += p_item.quantity
            
        # Update WAC
        current_stock = await get_spare_stock(db, spare.spare_id) # Stock BEFORE this posting
        
        cost_res = await db.execute(
            select(SpareCostHistory).filter_by(spare_id=spare.spare_id).order_by(SpareCostHistory.effective_date.desc())
        )
        last_cost = cost_res.scalars().first()
        old_wac = float(last_cost.wac_cost) if last_cost and last_cost.wac_cost is not None else 0.0
        
        new_quantity = current_stock + p_item.quantity
        p_total_cost = float(p_item.total_cost) if p_item.total_cost else 0.0
        if new_quantity > 0:
            new_wac = ((current_stock * old_wac) + p_total_cost) / new_quantity
        else:
            new_wac = float(p_item.unit_cost)
            
        new_cost = SpareCostHistory(
            spare_id=spare.spare_id,
            quantity=p_item.quantity,
            billed_unit_price=p_item.unit_cost,
            additional_costs=0,
            landed_cost=(p_total_cost / p_item.quantity) if p_item.quantity else 0,
            wac_cost=new_wac,
            source_reference=f"PURCHASE-{purchase.spare_purchase_id}"
        )
        db.add(new_cost)
        
    await db.flush()
