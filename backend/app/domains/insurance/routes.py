from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.auth.dependencies import get_current_staff
from app.domains.insurance import services, schemas


router = APIRouter(prefix="/insurance", tags=["Insurance"])


@router.post("/companies", response_model=schemas.InsuranceCompanyResponse, status_code=status.HTTP_201_CREATED)
def create_company(data: schemas.InsuranceCompanyCreate, db: Session = Depends(get_db), _staff=Depends(get_current_staff)):
    try:
        c = services.create_company(db, data)
        return c
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/companies", response_model=list[schemas.InsuranceCompanyResponse])
def list_companies(db: Session = Depends(get_db), _staff=Depends(get_current_staff)):
    return services.list_companies(db)


@router.post("/policies", response_model=schemas.PolicyResponse, status_code=status.HTTP_201_CREATED)
def create_policy(data: schemas.PolicyCreate, db: Session = Depends(get_db), _staff=Depends(get_current_staff)):
    try:
        p = services.create_policy(db, data)
        return p
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/policies", response_model=list[schemas.PolicyResponse])
def list_policies(db: Session = Depends(get_db), _staff=Depends(get_current_staff)):
    return services.list_policies(db)
