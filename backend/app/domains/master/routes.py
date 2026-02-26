from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.dependencies import get_current_staff
from app.auth.roles import require_roles
from app.domains.master import services, schemas


router = APIRouter(prefix="/master", tags=["Master"])


# ==================== CUSTOMER ENDPOINTS ====================

@router.post("/customers", response_model=schemas.CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    data: schemas.CustomerCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Create a new customer"""
    try:
        c = await services.create_customer(db, data)
        return c
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/customers", response_model=list[schemas.CustomerResponse])
async def list_customers(
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """List all customers"""
    return await services.list_customers(db)


@router.get("/customers/{customer_id}", response_model=schemas.CustomerDetailedResponse)
async def get_customer_detailed(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Get detailed customer information including nominees and vehicle count"""
    c = await services.get_customer_detailed(db, customer_id)
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return c


@router.put("/customers/{customer_id}", response_model=schemas.CustomerResponse)
async def update_customer(
    customer_id: int,
    data: schemas.CustomerUpdate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Update customer information"""
    c = await services.update_customer(db, customer_id, data)
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return c


@router.delete("/customers/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: int,
    hard_delete: bool = Query(False, description="Permanently delete (Admin/Dealer only)"),
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff)
):
    """Delete a customer (soft delete by default)"""
    success = await services.delete_customer(db, customer_id, current_staff, hard_delete)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return None


# ==================== NOMINEE ENDPOINTS ====================

@router.post("/customers/{customer_id}/nominees", response_model=schemas.NomineeResponse, status_code=status.HTTP_201_CREATED)
async def create_nominee(
    customer_id: int,
    data: schemas.NomineeCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Add a nominee for a customer"""
    nominee = await services.create_nominee(db, customer_id, data)
    if not nominee:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not create nominee")
    return nominee


@router.get("/customers/{customer_id}/nominees", response_model=list[schemas.NomineeResponse])
async def list_nominees(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """List all nominees for a customer"""
    nominees = await services.list_nominees(db, customer_id)
    return nominees


@router.get("/customers/{customer_id}/nominees/{nominee_id}", response_model=schemas.NomineeResponse)
async def get_nominee(
    customer_id: int,
    nominee_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Get a specific nominee"""
    nominee = await services.get_nominee(db, nominee_id, customer_id)
    if not nominee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nominee not found")
    return nominee


@router.put("/customers/{customer_id}/nominees/{nominee_id}", response_model=schemas.NomineeResponse)
async def update_nominee(
    customer_id: int,
    nominee_id: int,
    data: schemas.NomineeUpdate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Update nominee details"""
    nominee = await services.update_nominee(db, nominee_id, customer_id, data)
    if not nominee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nominee not found")
    return nominee


@router.delete("/customers/{customer_id}/nominees/{nominee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_nominee(
    customer_id: int,
    nominee_id: int,
    hard_delete: bool = Query(False, description="Permanently delete (Admin/Dealer only)"),
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff)
):
    """Delete a nominee (soft delete by default)"""
    success = await services.delete_nominee(db, nominee_id, customer_id, current_staff, hard_delete)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nominee not found")
    return None


# ==================== VEHICLE MODEL ENDPOINTS ====================

@router.post("/vehicle-models", response_model=schemas.VehicleModelResponse, status_code=status.HTTP_201_CREATED)
async def create_vehicle_model(
    data: schemas.VehicleModelCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Create a new vehicle model"""
    vm = await services.create_vehicle_model(db, data)
    return vm


@router.get("/vehicle-models", response_model=list[schemas.VehicleModelResponse])
async def list_vehicle_models(
    include_deleted: bool = Query(False, description="Include soft-deleted records"),
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """List all vehicle models"""
    return await services.list_vehicle_models(db, include_deleted=include_deleted)


@router.get("/vehicle-models/{vehicle_model_id}", response_model=schemas.VehicleModelResponse)
async def get_vehicle_model(
    vehicle_model_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Get a single vehicle model by ID"""
    vm = await services.get_vehicle_model(db, vehicle_model_id)
    if not vm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle model not found")
    return vm


@router.put("/vehicle-models/{vehicle_model_id}", response_model=schemas.VehicleModelResponse)
async def update_vehicle_model(
    vehicle_model_id: int,
    data: schemas.VehicleModelUpdate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Update a vehicle model"""
    vm = await services.update_vehicle_model(db, vehicle_model_id, data)
    if not vm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle model not found")
    return vm


@router.delete("/vehicle-models/{vehicle_model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vehicle_model(
    vehicle_model_id: int,
    hard_delete: bool = Query(False, description="Permanently delete (Admin/Dealer only)"),
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff)
):
    """Delete a vehicle model (soft delete by default)"""
    success = await services.delete_vehicle_model(db, vehicle_model_id, current_staff, hard_delete)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle model not found")
    return None


@router.post("/vehicle-models/{vehicle_model_id}/restore", status_code=status.HTTP_200_OK)
async def restore_vehicle_model(
    vehicle_model_id: int,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff)
):
    """Restore a soft-deleted vehicle model"""
    success = await services.restore_vehicle_model(db, vehicle_model_id, current_staff.staff_id if hasattr(current_staff, 'staff_id') else current_staff.get('staff_id'))
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle model not found or not deleted")
    return {"detail": "Vehicle model restored"}


# ==================== VEHICLE ENDPOINTS ====================

@router.post("/vehicles", response_model=schemas.VehicleResponse, status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    data: schemas.VehicleCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Create a new vehicle"""
    v = await services.create_vehicle(db, data)
    return v


@router.get("/vehicles", response_model=list[schemas.VehicleResponse])
async def list_vehicles(
    status: str = Query(None, description="Comma-separated list of statuses"),
    vehicle_model_id: int = Query(None, description="Filter by model ID"),
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """List vehicles with optional filters"""
    return await services.list_vehicles(db, status=status, vehicle_model_id=vehicle_model_id)


@router.get("/vehicles/{chassis_no}", response_model=schemas.VehicleResponse)
async def get_vehicle(
    chassis_no: str,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Get vehicle by chassis number"""
    v = await services.get_vehicle(db, chassis_no)
    if not v:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    return v


@router.delete("/vehicles/{chassis_no}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vehicle(
    chassis_no: str,
    hard_delete: bool = Query(False, description="Permanently delete (Admin/Dealer only)"),
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff)
):
    """Delete a vehicle (soft delete by default)"""
    success = await services.delete_vehicle(db, chassis_no, current_staff, hard_delete)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    return None


# ==================== VENDOR ENDPOINTS ====================

@router.post("/vendors", response_model=schemas.VendorResponse, status_code=status.HTTP_201_CREATED)
async def create_vendor(
    data: schemas.VendorCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Create a new vendor"""
    v = await services.create_vendor(db, data)
    return v


@router.get("/vendors", response_model=list[schemas.VendorResponse])
async def list_vendors(
    include_deleted: bool = Query(False, description="Include soft-deleted records"),
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """List all vendors"""
    return await services.list_vendors(db, include_deleted=include_deleted)


@router.get("/vendors/{vendor_id}", response_model=schemas.VendorResponse)
async def get_vendor(
    vendor_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Get a single vendor by ID"""
    v = await services.get_vendor(db, vendor_id)
    if not v:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    return v


@router.put("/vendors/{vendor_id}", response_model=schemas.VendorResponse)
async def update_vendor(
    vendor_id: int,
    data: schemas.VendorUpdate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Update a vendor"""
    v = await services.update_vendor(db, vendor_id, data)
    if not v:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    return v


@router.delete("/vendors/{vendor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vendor(
    vendor_id: int,
    hard_delete: bool = Query(False, description="Permanently delete (Admin/Dealer only)"),
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff)
):
    """Delete a vendor (soft delete by default)"""
    success = await services.delete_vendor(db, vendor_id, current_staff, hard_delete)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    return None


@router.post("/vendors/{vendor_id}/restore", status_code=status.HTTP_200_OK)
async def restore_vendor(
    vendor_id: int,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff)
):
    """Restore a soft-deleted vendor"""
    success = await services.restore_vendor(db, vendor_id, current_staff.staff_id if hasattr(current_staff, 'staff_id') else current_staff.get('staff_id'))
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found or not deleted")
    return {"detail": "Vendor restored"}


# ==================== PRICING ENDPOINTS ====================

@router.post("/pricing/spares/{spare_id}", response_model=schemas.SparePriceHistoryResponse)
async def update_spare_price(
    spare_id: int,
    data: schemas.SparePriceUpdate,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(require_roles("ADMIN"))
):
    """Update spare part price (Admin only)"""
    return await services.update_spare_price(db, spare_id, data, current_staff.staff_id)

@router.get("/pricing/spares/{spare_id}/history", response_model=list[schemas.SparePriceHistoryResponse])
async def get_spare_price_history(
    spare_id: int,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(require_roles("ADMIN", "DEALER"))
):
    """Get price history for a spare part"""
    return await services.get_spare_price_history(db, spare_id)

@router.post("/pricing/vehicles/{vehicle_model_id}", response_model=schemas.VehiclePriceHistoryResponse)
async def update_vehicle_price(
    vehicle_model_id: int,
    data: schemas.VehiclePriceUpdate,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(require_roles("ADMIN"))
):
    """Update vehicle model price (Admin only)"""
    return await services.update_vehicle_price(db, vehicle_model_id, data, current_staff.staff_id)

@router.get("/pricing/vehicles/{vehicle_model_id}/history", response_model=list[schemas.VehiclePriceHistoryResponse])
async def get_vehicle_price_history(
    vehicle_model_id: int,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(require_roles("ADMIN", "DEALER"))
):
    """Get price history for a vehicle model"""
    return await services.get_vehicle_price_history(db, vehicle_model_id)


