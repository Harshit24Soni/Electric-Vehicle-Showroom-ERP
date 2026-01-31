from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.auth.dependencies import get_current_staff
from app.domains.master import services, schemas


router = APIRouter(prefix="/master", tags=["Master"])


@router.post("/customers", response_model=schemas.CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(data: schemas.CustomerCreate, db: Session = Depends(get_db), _staff=Depends(get_current_staff)):
    try:
        c = services.create_customer(db, data)
        return c
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/customers", response_model=list[schemas.CustomerResponse])
def list_customers(db: Session = Depends(get_db), _staff=Depends(get_current_staff)):
    return services.list_customers(db)


@router.get("/customers/{customer_id}", response_model=schemas.CustomerResponse)
def get_customer(customer_id: int, db: Session = Depends(get_db), _staff=Depends(get_current_staff)):
    c = services.get_customer(db, customer_id)
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    return c


@router.post("/vehicle-models", response_model=schemas.VehicleModelResponse, status_code=status.HTTP_201_CREATED)
def create_vehicle_model(data: schemas.VehicleModelCreate, db: Session = Depends(get_db), _staff=Depends(get_current_staff)):
    vm = services.create_vehicle_model(db, data)
    return vm


@router.get("/vehicle-models", response_model=list[schemas.VehicleModelResponse])
def list_vehicle_models(db: Session = Depends(get_db), _staff=Depends(get_current_staff)):
    return services.list_vehicle_models(db)


@router.post("/vehicles", response_model=schemas.VehicleResponse, status_code=status.HTTP_201_CREATED)
def create_vehicle(data: schemas.VehicleCreate, db: Session = Depends(get_db), _staff=Depends(get_current_staff)):
    v = services.create_vehicle(db, data)
    return v


@router.get("/vehicles/{chassis_no}", response_model=schemas.VehicleResponse)
def get_vehicle(chassis_no: str, db: Session = Depends(get_db), _staff=Depends(get_current_staff)):
    v = services.get_vehicle(db, chassis_no)
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return v


@router.post("/vendors", response_model=schemas.VendorResponse, status_code=status.HTTP_201_CREATED)
def create_vendor(data: schemas.VendorCreate, db: Session = Depends(get_db), _staff=Depends(get_current_staff)):
    v = services.create_vendor(db, data)
    return v


@router.get("/vendors", response_model=list[schemas.VendorResponse])
def list_vendors(db: Session = Depends(get_db), _staff=Depends(get_current_staff)):
    return services.list_vendors(db)
