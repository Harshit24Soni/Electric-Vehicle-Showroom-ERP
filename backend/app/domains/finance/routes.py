from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.domains.finance import services
from app.domains.finance import schemas
from app.domains.finance.models import VehicleFinance
from app.db.session import get_db
from app.auth.dependencies import get_current_staff

router = APIRouter(prefix="/finance", tags=["Finance"])


@router.post("/", response_model=schemas.FinanceResponse, status_code=status.HTTP_201_CREATED)
def create_finance_api(
    data: schemas.FinanceCreate,
    db: Session = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    try:
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
    except services.FinanceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{finance_id}/status", status_code=status.HTTP_200_OK)
def update_finance_status_api(
    finance_id: int,
    data: schemas.FinanceStatusUpdate,
    db: Session = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    finance = db.get(VehicleFinance, finance_id)
    if not finance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finance record not found")

    services.update_finance_status(
        db=db,
        finance=finance,
        finance_status=data.finance_status,
        reference_number=data.reference_number,
        remarks=data.remarks,
    )

    return {"message": "Finance status updated"}

