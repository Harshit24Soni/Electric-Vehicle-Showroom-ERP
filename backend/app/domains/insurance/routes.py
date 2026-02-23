from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.dependencies import get_current_staff
from app.domains.insurance import services, schemas


router = APIRouter(prefix="/insurance", tags=["Insurance"])


@router.post("/companies", response_model=schemas.InsuranceCompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_company(
    data: schemas.InsuranceCompanyCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    try:
        c = await services.create_company(db, data)
        return c
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/companies", response_model=list[schemas.InsuranceCompanyResponse])
async def list_companies(
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    """List all insurance companies"""
    return await services.list_companies(db)


@router.delete("/companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(
    company_id: int,
    hard_delete: bool = Query(False, description="Permanently delete (Admin/Dealer only)"),
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff),
):
    """Delete an insurance company (soft delete by default)"""
    success = await services.delete_company(db, company_id, current_staff, hard_delete)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Insurance company not found")
    return None


@router.post("/policies", response_model=schemas.PolicyResponse, status_code=status.HTTP_201_CREATED)
async def create_policy(
    data: schemas.PolicyCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    try:
        p = await services.create_policy(db, data)
        return p
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/policies", response_model=list[schemas.PolicyResponse])
async def list_policies(
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    """List all insurance policies"""
    return await services.list_policies(db)


@router.delete("/policies/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_policy(
    policy_id: int,
    hard_delete: bool = Query(False, description="Permanently delete (Admin/Dealer only)"),
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff),
):
    """Delete an insurance policy (soft delete by default)"""
    success = await services.delete_policy(db, policy_id, current_staff, hard_delete)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Insurance policy not found")
    return None
