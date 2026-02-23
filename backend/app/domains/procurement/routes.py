from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.dependencies import get_current_staff
from app.auth.roles import require_roles
from app.domains.procurement import schemas, services, models

router = APIRouter(prefix="/procurement", tags=["Procurement"])

@router.post("/purchases/spares", response_model=schemas.PurchaseResponse, status_code=status.HTTP_201_CREATED)
async def create_spare_purchase(
    data: schemas.SparePurchaseCreate,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(require_roles("DEALER", "ADMIN"))
):
    """Create a new Spare Purchase (Dealer/Admin)"""
    # Note: User requirements said Dealer Workflow. Admin can probably do it too.
    return await services.create_spare_purchase(db, data)


@router.post("/purchases/vehicles", response_model=schemas.PurchaseResponse, status_code=status.HTTP_201_CREATED)
async def create_vehicle_purchase(
    data: schemas.VehiclePurchaseCreate,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(require_roles("DEALER", "ADMIN"))
):
    """Create a new Vehicle Purchase (Dealer/Admin)"""
    return await services.create_vehicle_purchase(db, data)


@router.post(
    "/purchases/vehicles/intake",
    response_model=schemas.VehicleIntakeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def intake_vehicles(
    data: schemas.VehicleIntakePayload,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(require_roles("DEALER", "ADMIN")),
):
    """Bulk-register vehicles from an OEM invoice into inventory"""
    return await services.process_vehicle_intake(db, payload=data, current_user=current_staff)


@router.get("/purchases/spares", response_model=list[schemas.SparePurchaseResponse])
async def list_spare_purchases(
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(require_roles("DEALER", "ADMIN"))
):
    """List Spare Purchases"""
    return await services.list_spare_purchases(db)

@router.get("/purchases/vehicles", response_model=list[schemas.VehiclePurchaseResponse])
async def list_vehicle_purchases(
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(require_roles("DEALER", "ADMIN"))
):
    """List Vehicle Purchases"""
    return await services.list_vehicle_purchases(db)


@router.delete("/purchases/spares/{spare_purchase_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_spare_purchase(
    spare_purchase_id: int,
    hard_delete: bool = Query(False, description="Permanently delete (Admin/Dealer only)"),
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff)
):
    """Delete a spare purchase (soft delete by default)"""
    success = await services.delete_spare_purchase(db, spare_purchase_id, current_staff, hard_delete)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Spare purchase not found")
    return None


@router.delete("/purchases/vehicles/{vehicle_purchase_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vehicle_purchase(
    vehicle_purchase_id: int,
    hard_delete: bool = Query(False, description="Permanently delete (Admin/Dealer only)"),
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff)
):
    """Delete a vehicle purchase (soft delete by default)"""
    success = await services.delete_vehicle_purchase(db, vehicle_purchase_id, current_staff, hard_delete)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle purchase not found")
    return None


@router.post("/temporary-items", response_model=schemas.TemporaryItemResponse, status_code=status.HTTP_201_CREATED)
async def create_temporary_item(
    data: schemas.TemporaryItemCreate,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(require_roles("DEALER", "ADMIN"))
):
    """Create a temporary item (Dealer/Admin)"""
    return await services.create_temporary_item(db, data, current_staff.staff_id)

@router.get("/temporary-items", response_model=list[schemas.TemporaryItemResponse])
async def list_temporary_items(
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(require_roles("ADMIN"))
):
    """List pending temporary items (Admin only)"""
    return await services.list_temporary_items(db)

@router.put("/temporary-items/{spare_id}/approve", response_model=schemas.TemporaryItemResponse)
async def approve_temporary_item(
    spare_id: int,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(require_roles("ADMIN"))
):
    """Approve temporary item (Admin only)"""
    return await services.approve_temporary_item(db, spare_id)
