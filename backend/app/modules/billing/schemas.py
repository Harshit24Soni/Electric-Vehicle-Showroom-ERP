from decimal import Decimal
from pydantic import BaseModel
from typing import Optional


class InvoiceCreate(BaseModel):
    sale_id: int
    taxable_amount: Decimal
    gst_rate: Decimal  # snapshot (e.g. 5.0)
    remarks: Optional[str] = None


class InvoiceUpdate(BaseModel):
    taxable_amount: Decimal
    gst_rate: Decimal
    remarks: Optional[str] = None


class InvoiceResponse(BaseModel):
    invoice_id: int
    sale_id: int
    invoice_number: str
    invoice_date: Optional[str]
    taxable_amount: Decimal
    gst_rate: Decimal
    gst_amount: Decimal
    total_amount: Decimal
    is_final: bool
    revision_no: int

    class Config:
        from_attributes = True
