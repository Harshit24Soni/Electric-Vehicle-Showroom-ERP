from pydantic import BaseModel, Field
from typing import List, Dict
from sqlalchemy.ext.asyncio import AsyncSession

# Decoupling Strategy (DDD Phase 1):
# Contracts define the PUBLIC INTERFACE for this module.
# Other modules (like Sales or CRM) must use these schemas to interact with Inventory,
# rather than importing internal ORM models or database schemas directly.
# This ensures that internal schema changes don't break external dependencies.

class CheckSpareStockRequest(BaseModel):
    """Request payload to check if a specific list of spares are available."""
    spare_ids: List[int] = Field(..., description="List of internal spare IDs to check.")

class SpareStockAvailabilityInfo(BaseModel):
    spare_id: int
    available_quantity: int
    is_available: bool

class SpareStockAvailabilityResponse(BaseModel):
    """Response payload detailing availability of requested spares."""
    results: List[SpareStockAvailabilityInfo]

class CheckVehicleAvailabilityRequest(BaseModel):
    """Request payload to check if a vehicle is available for sale or allocation."""
    chassis_no: str = Field(..., description="The chassis number of the vehicle.")

class VehicleAvailabilityResponse(BaseModel):
    """Response payload detailing if the vehicle is in AVAILABLE status."""
    chassis_no: str
    is_available: bool
    current_status: str | None = None


# ==================== SYNCHRONOUS READ CONTRACT INTERFACES ====================

async def verify_vehicle_in_stock(db: "AsyncSession", chassis_no: str) -> VehicleAvailabilityResponse:
    """
    Synchronous cross-module read contract.
    Returns vehicle stock availability without exposing internal ORM models.
    """
    from sqlalchemy import select
    from app.modules.inventory.models import VehicleStockMovement

    stmt = (
        select(VehicleStockMovement)
        .filter(VehicleStockMovement.chassis_no == chassis_no)
        .order_by(VehicleStockMovement.movement_datetime.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    last = result.scalars().first()
    if last is None:
        return VehicleAvailabilityResponse(
            chassis_no=chassis_no,
            is_available=False,
            current_status=None,
        )
    is_available = last.movement_type in ("INWARD", "AVAILABLE")
    return VehicleAvailabilityResponse(
        chassis_no=chassis_no,
        is_available=is_available,
        current_status=last.movement_type,
    )


async def get_spare_stock_quantity(db: "AsyncSession", spare_id: int) -> int:
    """
    Synchronous cross-module read contract.
    Returns current stock balance quantity for a spare.
    """
    from sqlalchemy import select, func
    from app.modules.inventory.models import SpareStockMovement

    stmt = (
        select(func.coalesce(func.sum(SpareStockMovement.quantity), 0))
        .filter(SpareStockMovement.spare_id == spare_id)
    )
    result = await db.execute(stmt)
    return int(result.scalar() or 0)


async def check_spares_stock_availability(
    db: "AsyncSession", spare_ids: List[int]
) -> SpareStockAvailabilityResponse:
    """
    Synchronous cross-module read contract.
    Aggregates stock quantities for the requested spares and returns a contract response.
    """
    results = []
    for spare_id in spare_ids:
        qty = await get_spare_stock_quantity(db, spare_id)
        results.append(
            SpareStockAvailabilityInfo(
                spare_id=spare_id,
                available_quantity=qty,
                is_available=qty > 0,
            )
        )
    return SpareStockAvailabilityResponse(results=results)
