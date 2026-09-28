from decimal import Decimal
from pydantic import BaseModel
from typing import Optional


class FinanceCreate(BaseModel):
    sale_id: int
    financer_name: str
    financer_contact: Optional[str] = None
    loan_amount: Decimal
    down_payment: Decimal
    remarks: Optional[str] = None


class FinanceStatusUpdate(BaseModel):
    finance_status: str
    reference_number: Optional[str] = None
    remarks: Optional[str] = None


class FinanceResponse(BaseModel):
    finance_id: int
    sale_id: int
    financer_name: str
    loan_amount: Decimal
    down_payment: Decimal
    finance_status: str
    reference_number: Optional[str]

    class Config:
        from_attributes = True
