from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.db.session import get_db
from app.modules.sales import services_spare, schemas_spare
from app.auth.dependencies import get_current_staff
from app.auth.roles import require_roles

router = APIRouter(prefix="/sales/spares", tags=["spare_sales"])

@router.get("/", response_model=List[schemas_spare.SpareSaleResponse])
async def list_spare_sales(
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """List all direct spare part sales"""
    return await services_spare.list_spare_sales(db)

@router.post("/", response_model=schemas_spare.SpareSaleResponse)
async def create_spare_sale(
    data: schemas_spare.SpareSaleCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Create a new draft spare part sale"""
    return await services_spare.create_draft_sale(db, data, staff_id=_staff["staff_id"])

@router.get("/{sale_id}", response_model=schemas_spare.SpareSaleResponse)
async def get_spare_sale(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Get spare part sale details"""
    sale = await services_spare.get_spare_sale(db, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    return sale

@router.post("/{sale_id}/confirm", response_model=schemas_spare.SpareSaleResponse)
async def confirm_spare_sale(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_roles("ADMIN", "MANAGER", "DEALER", "STAFF"))
):
    """Confirm a spare sale, consumes inventory"""
    try:
        return await services_spare.confirm_sale(db, sale_id, staff_id=_staff["staff_id"])
    except services_spare.SpareSaleError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{sale_id}/cancel", response_model=schemas_spare.SpareSaleResponse)
async def cancel_spare_sale(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_roles("ADMIN", "MANAGER", "DEALER"))
):
    """Cancel a spare sale, reverts inventory"""
    try:
        return await services_spare.cancel_sale(db, sale_id, staff_id=_staff["staff_id"])
    except services_spare.SpareSaleError as e:
        raise HTTPException(status_code=400, detail=str(e))
