from datetime import date, datetime
from pydantic import BaseModel, Field
from typing import Optional, List

class SaleCreate(BaseModel):
    lead_id: int
    customer_id: int
    chassis_no: str
    sale_date: date = Field(default_factory=date.today)
    total_amount: float
    remarks: Optional[str] = None

class ServiceScheduleResponse(BaseModel):
    schedule_id: int
    service_number: int
    service_type: str
    due_date: date
    status: str
    
    class Config:
        from_attributes = True

class ChecklistUpdate(BaseModel):
    insurance_completed: Optional[bool] = None
    insurance_details: Optional[str] = None
    subsidy_completed: Optional[bool] = None
    subsidy_details: Optional[str] = None
    rto_completed: Optional[bool] = None
    rto_details: Optional[str] = None
    celex_plate_ordered: Optional[bool] = None
    celex_subsidy_completed: Optional[bool] = None
    celex_details: Optional[str] = None
    plate_fixation_date: Optional[date] = None

class ChecklistResponse(BaseModel):
    checklist_id: int
    sale_id: int
    insurance_completed: bool
    insurance_details: Optional[str] = None
    subsidy_completed: bool
    subsidy_details: Optional[str] = None
    rto_completed: bool
    rto_details: Optional[str] = None
    celex_plate_ordered: bool
    celex_subsidy_completed: bool
    celex_details: Optional[str] = None
    plate_fixation_date: Optional[date] = None
    updated_at: datetime
    
    class Config:
        from_attributes = True

class SaleResponse(BaseModel):
    sale_id: int
    lead_id: int
    customer_id: int
    chassis_no: str
    sale_date: date
    total_amount: float
    sale_status: str
    invoice_number: Optional[str] = None
    pay_receipt_number: Optional[str] = None
    delivery_challan_number: Optional[str] = None
    is_invoice_generated: bool
    is_receipt_generated: bool
    is_challan_generated: bool
    is_insurance_generated: bool
    is_service_schedule_generated: bool
    remarks: Optional[str] = None
    created_by_staff_id: int
    created_at: datetime
    
    service_schedules: List[ServiceScheduleResponse] = []
    
    # Forward reference handled by Pydantic usually, but to be safe:
    delivery_checklist: Optional['ChecklistResponse'] = None

    class Config:
        from_attributes = True

class ReceiptCreate(BaseModel):
    sale_id: int
    amount: float
    payment_mode: str
    transaction_ref: Optional[str] = None
    receipt_date: date = Field(default_factory=date.today)

class ReceiptResponse(BaseModel):
    receipt_id: int
    sale_id: int
    amount: float
    payment_mode: str
    transaction_ref: Optional[str]
    receipt_date: date
    created_by_staff_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

