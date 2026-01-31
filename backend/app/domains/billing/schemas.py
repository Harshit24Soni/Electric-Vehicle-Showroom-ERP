from pydantic import BaseModel
from typing import Optional


class InvoiceCreate(BaseModel):
    sale_id: int
    taxable_amount: float
    gst_rate: float  # snapshot (e.g. 5.0)
    remarks: Optional[str] = None

class InvoiceUpdate(BaseModel):
    taxable_amount: float
    gst_rate: float
    remarks: Optional[str] = None

