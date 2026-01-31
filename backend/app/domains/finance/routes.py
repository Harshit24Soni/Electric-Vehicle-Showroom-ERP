from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.domains.finance import services
from app.domains.finance.schemas import FinanceCreate, FinanceStatusUpdate
from app.domains.finance.models import VehicleFinance
from app.db.session import get_db
from app.domains.finance.services import FinanceResponse
from app.auth.dependencies import get_current_staff

router = APIRouter()

@router.post("/finance", response_model=FinanceResponse)
def create_finance_api(
    data: FinanceCreate,
    db: Session = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    finance = services.create_finance(
        db=db,
        sale_id=data.sale_id,
        financer_name=data.financer_name,
        financer_contact=data.financer_contact,
        loan_amount=data.loan_amount,
        down_payment=data.down_payment,
        remarks=data.remarks,
    )
    return finance

@router.put("/finance/{finance_id}/status")
def update_finance_status_api(
    finance_id: int,
    data: FinanceStatusUpdate,
    db: Session = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    finance = db.get(VehicleFinance, finance_id)
    if not finance:
        raise HTTPException(404, "Finance record not found")

    services.update_finance_status(
        db=db,
        finance=finance,
        finance_status=data.finance_status,
        reference_number=data.reference_number,
        remarks=data.remarks,
    )

    return {"message": "Finance status updated"}

