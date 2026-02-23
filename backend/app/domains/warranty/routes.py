from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.dependencies import get_current_staff
from app.domains.warranty import services as wsvc
from app.domains.warranty import schemas as ws

router = APIRouter(prefix="/warranty", tags=["warranty"])


@router.post("/claims", response_model=ws.ClaimResponse, status_code=status.HTTP_201_CREATED)
async def raise_claim(
    payload: ws.ClaimCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_staff),
):
    try:
        claim = await wsvc.create_claim(db, payload)
        return claim
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/claims", response_model=List[ws.ClaimResponse])
async def list_claims(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_staff),
):
    """List all warranty claims"""
    return await wsvc.list_claims(db, skip=skip, limit=limit)


@router.delete("/claims/{claim_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_claim(
    claim_id: int,
    hard_delete: bool = Query(False, description="Permanently delete (Admin/Dealer only)"),
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff),
):
    """Delete a warranty claim (soft delete by default)"""
    success = await wsvc.delete_claim(db, claim_id, current_staff, hard_delete)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")
    return None


@router.post("/inwards", response_model=ws.InwardResponse, status_code=status.HTTP_201_CREATED)
async def create_inward(
    payload: ws.InwardCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_staff),
):
    try:
        inward = await wsvc.create_inward_with_items(db, payload)
        return inward
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/shipments", response_model=ws.ShipmentResponse, status_code=status.HTTP_201_CREATED)
async def create_shipment(
    payload: ws.ShipmentCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_staff),
):
    try:
        shipment = await wsvc.create_shipment_with_items(db, payload)
        return shipment
    except wsvc.WarrantyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
