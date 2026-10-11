from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

class SpareSaleItemBase(BaseModel):
    spare_id: int
    part_code: str
    spare_name: str
    tracking_mode: str
    batch_id: Optional[int] = None
    serial_id: Optional[int] = None
    quantity: int
    unit_selling_price: Decimal
    discount: Decimal = Decimal('0.0')
    tax: Decimal = Decimal('0.0')
    
class SpareSaleItemCreate(SpareSaleItemBase):
    pass

class SpareSaleItemResponse(SpareSaleItemBase):
    sale_item_id: int
    sale_id: int
    line_total: Decimal
    
    model_config = ConfigDict(from_attributes=True)

class SpareSaleBase(BaseModel):
    customer_id: int
    remarks: Optional[str] = None
    
class SpareSaleCreate(SpareSaleBase):
    items: List[SpareSaleItemCreate]

class SpareSaleResponse(SpareSaleBase):
    sale_id: int
    sale_date: datetime
    status: str
    subtotal: Decimal
    discount: Decimal
    tax: Decimal
    grand_total: Decimal
    invoice_number: Optional[str]
    created_by_staff_id: int
    items: List[SpareSaleItemResponse]
    
    model_config = ConfigDict(from_attributes=True)
