from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.dependencies import get_current_staff
from app.auth.roles import require_roles

from app.domains.inventory import services
from app.domains.inventory.schemas import (
    VehicleMovementCreate,
    SpareMovementCreate,
    VehicleMovementResponse,
    SpareMovementResponse,
    SpareStockResponse,
)

router = APIRouter(
    prefix="/inventory",
    tags=["Inventory"]
)


@router.post(
    "/vehicle/movement",
    status_code=status.HTTP_201_CREATED,
    response_model=VehicleMovementResponse,
)
async def create_vehicle_movement(
    data: VehicleMovementCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    try:
        movement = await services.add_vehicle_movement(
            db=db,
            chassis_no=data.chassis_no,
            movement_type=data.movement_type,
            reference_type=data.reference_type,
            reference_id=data.reference_id,
            from_location=data.from_location,
            to_location=data.to_location,
            remarks=data.remarks,
        )
        return movement
    except services.InventoryError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/vehicle/{chassis_no}/availability")
async def check_vehicle_availability(
    chassis_no: str,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    available = await services.is_vehicle_available(db, chassis_no)
    return {
        "chassis_no": chassis_no,
        "is_available": available,
    }


@router.post(
    "/spare/movement",
    status_code=status.HTTP_201_CREATED,
    response_model=SpareMovementResponse,
)
async def create_spare_movement(
    data: SpareMovementCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    try:
        movement = await services.add_spare_movement(
            db=db,
            spare_id=data.spare_id,
            quantity=data.quantity,
            movement_type=data.movement_type,
            serial_id=data.serial_id,
            reference_type=data.reference_type,
            reference_id=data.reference_id,
            remarks=data.remarks,
        )
        return movement
    except services.InventoryError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/spare/{spare_id}/stock", response_model=SpareStockResponse)
async def get_spare_stock(
    spare_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    stock = await services.get_spare_stock(db, spare_id)
    return {
        "spare_id": spare_id,
        "available_quantity": stock,
    }

