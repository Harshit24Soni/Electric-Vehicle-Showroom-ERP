from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.finance import services
from app.domains.finance import schemas
from app.domains.finance.models import VehicleFinance
from app.db.session import get_db
from app.auth.dependencies import get_current_staff
from app.auth.roles import require_roles

router = APIRouter(
    prefix="/finance",
    tags=["Finance"],
    dependencies=[Depends(get_current_staff)],
)


@router.post("/", response_model=schemas.FinanceResponse, status_code=status.HTTP_201_CREATED)
async def create_finance_api(
    data: schemas.FinanceCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    try:
        finance = await services.create_finance(
            db=db,
            sale_id=data.sale_id,
            financer_name=data.financer_name,
            financer_contact=data.financer_contact,
            loan_amount=data.loan_amount,
            down_payment=data.down_payment,
            remarks=data.remarks,
        )
        return finance
    except services.FinanceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/", response_model=list[schemas.FinanceResponse])
async def list_finances(
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    """List all finance records"""
    return await services.list_finances(db)


@router.put("/{finance_id}/status", status_code=status.HTTP_200_OK)
async def update_finance_status_api(
    finance_id: int,
    data: schemas.FinanceStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    finance = await services.get_finance(db, finance_id)
    if not finance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finance record not found")

    await services.update_finance_status(
        db=db,
        finance=finance,
        finance_status=data.finance_status,
        reference_number=data.reference_number,
        remarks=data.remarks,
    )

    return {"message": "Finance status updated"}


@router.delete("/{finance_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_finance(
    finance_id: int,
    hard_delete: bool = Query(False, description="Permanently delete (Admin/Dealer only)"),
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff),
):
    """Delete a finance record (soft delete by default)"""
    success = await services.delete_finance(db, finance_id, current_staff, hard_delete)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finance record not found")
    return None
