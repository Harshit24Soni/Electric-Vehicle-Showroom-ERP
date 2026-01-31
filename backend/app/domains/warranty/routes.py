from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.auth.dependencies import get_current_staff
from app.domains.warranty import services as wsvc
from app.domains.warranty import schemas as ws

router = APIRouter(prefix="/warranty", tags=["warranty"])


@router.post("/claims", response_model=ws.ClaimResponse, status_code=status.HTTP_201_CREATED)
def raise_claim(payload: ws.ClaimCreate, db: Session = Depends(get_db), _=Depends(get_current_staff)):
    try:
        claim = wsvc.create_claim(db, payload)
        db.commit()
        db.refresh(claim)
        return claim
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/claims", response_model=List[ws.ClaimResponse])
def list_claims(skip: int = 0, limit: int = 50, db: Session = Depends(get_db), _=Depends(get_current_staff)):
    items = wsvc.list_claims(db, skip=skip, limit=limit)
    return items


@router.post("/inwards", response_model=ws.InwardResponse, status_code=status.HTTP_201_CREATED)
def create_inward(payload: ws.InwardCreate, db: Session = Depends(get_db), _=Depends(get_current_staff)):
    try:
        inward = wsvc.create_inward_with_items(db, payload)
        db.commit()
        db.refresh(inward)
        return inward
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/shipments", response_model=ws.ShipmentResponse, status_code=status.HTTP_201_CREATED)
def create_shipment(payload: ws.ShipmentCreate, db: Session = Depends(get_db), _=Depends(get_current_staff)):
    try:
        shipment = wsvc.create_shipment_with_items(db, payload)
        db.commit()
        db.refresh(shipment)
        return shipment
    except wsvc.WarrantyError as e:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
