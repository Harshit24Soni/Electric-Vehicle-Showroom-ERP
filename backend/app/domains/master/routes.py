from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.dependencies import get_current_staff
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
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Delete a nominee (soft delete)"""
    success = await services.delete_nominee(db, nominee_id, customer_id)
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
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """List all vehicle models"""
    return await services.list_vehicle_models(db)


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
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """List all vendors"""
    return await services.list_vendors(db)


