from datetime import datetime
from typing import Optional
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.domains.finance.models import VehicleFinance
from app.domains.sales.models import Sale

class FinanceResponse(BaseModel):
    finance_id: int
    sale_id: int
    financer_name: str
    loan_amount: float
    down_payment: float
    finance_status: str
    reference_number: Optional[str]

    class Config:
        from_attributes = True

class FinanceError(Exception):
    pass

def create_finance(
    db: Session,
    *,
    sale_id: int,
    financer_name: str,
    loan_amount: float,
    down_payment: float,
    financer_contact: str | None = None,
    remarks: str | None = None,
) -> VehicleFinance:

    sale = db.get(Sale, sale_id)
    if not sale:
        raise FinanceError("Invalid sale")

    finance = VehicleFinance(
        sale_id=sale_id,
        financer_name=financer_name,
        financer_contact=financer_contact,
        loan_amount=loan_amount,
        down_payment=down_payment,
        finance_status="INITIATED",
        remarks=remarks,
    )

    db.add(finance)

    try:
        db.flush()
    except IntegrityError:
        raise FinanceError("Finance already exists for this sale")

    return finance

def update_finance_status(
    db: Session,
    *,
    finance: VehicleFinance,
    finance_status: str,
    reference_number: str | None = None,
    remarks: str | None = None,
):
    finance.finance_status = finance_status
    finance.reference_number = reference_number
    finance.remarks = remarks
    finance.updated_at = datetime.utcnow()

