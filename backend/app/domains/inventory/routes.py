from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.auth.dependencies import get_current_staff
from app.auth.roles import require_roles

from app.domains.inventory import services
from app.domains.inventory.schemas import (
    VehicleMovementCreate,
    SpareMovementCreate,
)

router = APIRouter(
    prefix="/inventory",
    tags=["Inventory"]
)

@router.post(
    "/vehicle/movement",
    status_code=status.HTTP_201_CREATED,
)
def create_vehicle_movement(
    data: VehicleMovementCreate,
    db: Session = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    try:
        movement = services.add_vehicle_movement(
            db=db,
            chassis_no=data.chassis_no,
            movement_type=data.movement_type,
            reference_type=data.reference_type,
            reference_id=data.reference_id,
            from_location=data.from_location,
            to_location=data.to_location,
            remarks=data.remarks,
        )
        return {
            "message": "Vehicle movement recorded",
            "movement_id": movement.movement_id,
        }
    except services.InventoryError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

@router.get("/vehicle/{chassis_no}/availability")
def check_vehicle_availability(
    chassis_no: str,
    db: Session = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    available = services.is_vehicle_available(db, chassis_no)
    return {
        "chassis_no": chassis_no,
        "is_available": available,
    }

@router.post(
    "/spare/movement",
    status_code=status.HTTP_201_CREATED,
)
def create_spare_movement(
    data: SpareMovementCreate,
    db: Session = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    try:
        movement = services.add_spare_movement(
            db=db,
            spare_id=data.spare_id,
            quantity=data.quantity,
            movement_type=data.movement_type,
            serial_id=data.serial_id,
            reference_type=data.reference_type,
            reference_id=data.reference_id,
            remarks=data.remarks,
        )
        return {
            "message": "Spare movement recorded",
            "movement_id": movement.movement_id,
        }
    except services.InventoryError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

@router.get("/spare/{spare_id}/stock")
def get_spare_stock(
    spare_id: int,
    db: Session = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    stock = services.get_spare_stock(db, spare_id)
    return {
        "spare_id": spare_id,
        "available_quantity": stock,
    }

