from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime

from app.modules.inventory.models import (
    VehicleStockMovement, 
    SpareStockMovement, 
    SpareMaster
)
from app.modules.inventory.contracts import (
    CheckSpareStockRequest,
    SpareStockAvailabilityResponse,
    SpareStockAvailabilityInfo,
    CheckVehicleAvailabilityRequest,
    VehicleAvailabilityResponse
)

# Decoupling Strategy (DDD Phase 1):
# Services act as the internal API for the Inventory domain.
# They operate strictly on local models and do not query tables like 'master.vehicle'.
# Read operations that need to cross module boundaries will call the methods 
# returning Pydantic Contract responses instead of raw ORM objects.

class InventoryError(Exception):
    pass

class InsufficientSpareStockError(InventoryError):
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

async def check_vehicle_availability(
    db: AsyncSession, req: CheckVehicleAvailabilityRequest
) -> VehicleAvailabilityResponse:
    """
    Synchronous cross-module read.
    Returns a contract (Pydantic model) rather than the raw database model.
    """
    last = await get_latest_vehicle_movement(db, req.chassis_no)
    
    if last is None:
        return VehicleAvailabilityResponse(
            chassis_no=req.chassis_no,
            is_available=False,
            current_status=None
        )
        
    is_available = last.movement_type in ("INWARD", "AVAILABLE")
    return VehicleAvailabilityResponse(
        chassis_no=req.chassis_no,
        is_available=is_available,
        current_status=last.movement_type
    )

async def check_spare_stock(
    db: AsyncSession, req: CheckSpareStockRequest
) -> SpareStockAvailabilityResponse:
    """
    Synchronous cross-module read.
    Aggregates stock quantities for the requested spares and returns a contract.
    """
    results = []
    for spare_id in req.spare_ids:
        stmt = (
            select(func.coalesce(func.sum(SpareStockMovement.quantity), 0))
            .filter(SpareStockMovement.spare_id == spare_id)
        )
        result = await db.execute(stmt)
        qty = result.scalar() or 0
        
        results.append(
            SpareStockAvailabilityInfo(
                spare_id=spare_id,
                available_quantity=int(qty),
                is_available=qty > 0
            )
        )
        
    return SpareStockAvailabilityResponse(results=results)

async def add_spare_movement(
    db: AsyncSession,
    *,
    spare_id: int,
    quantity: int,
    movement_type: str,
    reference_type: str | None = None,
    reference_id: int | None = None,
    remarks: str | None = None,
) -> SpareStockMovement:
    """
    Internal business logic for adding or consuming stock.
    Typically invoked by internal APIs or Event Listeners reacting to cross-module events.
    """
    # If consuming stock, ensure sufficient quantity exists
    if quantity < 0:
        stmt = (
            select(func.coalesce(func.sum(SpareStockMovement.quantity), 0))
            .filter(SpareStockMovement.spare_id == spare_id)
        )
        result = await db.execute(stmt)
        current_stock = int(result.scalar() or 0)
        
        if current_stock + quantity < 0:
            raise InsufficientSpareStockError(
                f"Insufficient stock for spare_id {spare_id}. "
                f"Requested: {abs(quantity)}, Available: {current_stock}"
            )

    movement = SpareStockMovement(
        spare_id=spare_id,
        quantity=quantity,
        movement_type=movement_type,
        reference_type=reference_type,
        reference_id=reference_id,
        movement_datetime=datetime.utcnow(),
        remarks=remarks
    )
    
    db.add(movement)
    await db.flush()
    return movement

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
    """
    Internal business logic for adding a vehicle stock movement.
    """
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
    await db.flush()
    return movement

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
    spare = SpareMaster(
        spare_code=spare_code,
        spare_name=spare_name,
        category=category,
        is_serialized=False,
        is_temporary=True,
        is_verified=False,
        remarks=remarks,
    )
    db.add(spare)
    await db.flush()
    return spare.spare_id

async def list_temporary_spares(db: AsyncSession) -> list[SpareMaster]:
    """List unverified temporary items (excludes soft-deleted)"""
    stmt = select(SpareMaster).filter(
        SpareMaster.is_temporary == True,
        SpareMaster.is_verified == False,
        SpareMaster.is_deleted == False
    )
    result = await db.execute(stmt)
    return result.scalars().all()

async def approve_temporary_spare(db: AsyncSession, spare_id: int) -> SpareMaster | None:
    """Approve a temporary item"""
    item = await db.get(SpareMaster, spare_id)
    if not item:
        return None
    item.is_verified = True
    item.is_temporary = False
    await db.commit()
    await db.refresh(item)
    return item
