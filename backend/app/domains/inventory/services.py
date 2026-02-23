from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.domains.inventory.models import (
    VehicleStockMovement,
    SpareStockMovement,
    SpareMaster,
    SpareSerial,
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
        movement_datetime=datetime.utcnow(),
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
    if spare.is_serialized:
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
                f"Insufficient stock for spare {spare.spare_code}"
            )

    movement = SpareStockMovement(
        spare_id=spare_id,
        serial_id=serial_id,
        quantity=quantity,
        movement_type=movement_type,
        reference_type=reference_type,
        reference_id=reference_id,
        movement_datetime=datetime.utcnow(),
        remarks=remarks,
    )

    db.add(movement)
    await db.flush()

    return movement

