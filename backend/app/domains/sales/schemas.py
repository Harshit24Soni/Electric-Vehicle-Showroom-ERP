from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field
from typing import Optional, List


class SaleCreate(BaseModel):
    lead_id: Optional[int] = None  # Nullable for direct sales
    customer_id: int
    chassis_no: str
    sale_date: date = Field(default_factory=date.today)
    total_amount: Decimal
    remarks: Optional[str] = None
    is_direct_sale: bool = False


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
    lead_id: Optional[int] = None
    customer_id: int
    chassis_no: str
    sale_date: date
    total_amount: Decimal
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
    # New workflow fields
    sale_stage: Optional[str] = None
    stage_updated_at: Optional[datetime] = None
    is_direct_sale: Optional[bool] = None

    service_schedules: List[ServiceScheduleResponse] = []

    # Forward reference handled by Pydantic usually, but to be safe:
    delivery_checklist: Optional['ChecklistResponse'] = None

    class Config:
        from_attributes = True


class ReceiptCreate(BaseModel):
    sale_id: int
    amount: Decimal
    payment_mode: str
    transaction_ref: Optional[str] = None
    receipt_date: date = Field(default_factory=date.today)


class ReceiptResponse(BaseModel):
    receipt_id: int
    sale_id: int
    amount: Decimal
    payment_mode: str
    transaction_ref: Optional[str]
    receipt_date: date
    created_by_staff_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== NEW WORKFLOW SCHEMAS ====================

class StageAdvanceRequest(BaseModel):
    """Advance a sale to the next stage"""
    to_stage: str = Field(..., description="Target stage: ENQUIRY, QUOTATION, NEGOTIATION, BOOKING, DOCUMENTATION, PAYMENT, INVOICE, PORTAL_WORK, DELIVERY, COMPLETED")
    remarks: Optional[str] = None


class SalePaymentCreate(BaseModel):
    """Add a payment to a sale"""
    payment_type: str = Field(..., description="BOOKING, PARTIAL, FINAL")
    payment_mode: str = Field(..., description="CASH, UPI, CARD, CHEQUE, FINANCE")
    amount: Decimal
    reference_number: Optional[str] = None
    payment_date: Optional[datetime] = None
    bank_name: Optional[str] = None
    remarks: Optional[str] = None


class SalePaymentResponse(BaseModel):
    sale_payment_id: int
    sale_id: int
    payment_type: str
    payment_mode: str
    amount: Decimal
    reference_number: Optional[str] = None
    payment_date: datetime
    bank_name: Optional[str] = None
    remarks: Optional[str] = None
    created_by_staff_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class SaleDocumentCreate(BaseModel):
    """Generate a document for a sale"""
    document_type: str = Field(..., description="INVOICE, RECEIPT, CHALLAN, INSURANCE, SERVICE_SCHEDULE")


class SaleDocumentResponse(BaseModel):
    sale_document_id: int
    sale_id: int
    document_type: str
    document_number: str
    generated_date: datetime
    generated_by_staff_id: int
    is_printed: bool
    print_count: int
    last_printed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PortalTrackingUpdate(BaseModel):
    """Update portal tracking for a sale"""
    insurance_status: Optional[str] = None
    insurance_policy_number: Optional[str] = None
    subsidy_status: Optional[str] = None
    subsidy_reference: Optional[str] = None
    rto_status: Optional[str] = None
    registration_number: Optional[str] = None
    celex_status: Optional[str] = None
    number_plate_ordered_date: Optional[date] = None
    number_plate_fixed_date: Optional[date] = None
    form_20_generated: Optional[bool] = None
    helmet_invoice_generated: Optional[bool] = None


class PortalTrackingResponse(BaseModel):
    portal_tracking_id: int
    sale_id: int
    insurance_status: str
    insurance_completed_date: Optional[datetime] = None
    insurance_policy_number: Optional[str] = None
    subsidy_status: str
    subsidy_completed_date: Optional[datetime] = None
    subsidy_reference: Optional[str] = None
    rto_status: str
    rto_completed_date: Optional[datetime] = None
    registration_number: Optional[str] = None
    celex_status: str
    celex_completed_date: Optional[datetime] = None
    number_plate_ordered_date: Optional[date] = None
    number_plate_fixed_date: Optional[date] = None
    form_20_generated: bool
    helmet_invoice_generated: bool
    all_portals_completed: bool

    class Config:
        from_attributes = True


class StageHistoryResponse(BaseModel):
    stage_history_id: int
    sale_id: int
    from_stage: Optional[str] = None
    to_stage: str
    changed_by_staff_id: int
    remarks: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SaleProgressResponse(BaseModel):
    """Complete sale progress with stage, percentage, payments, documents, and portal"""
    sale_id: int
    sale_stage: Optional[str] = None
    completion_percentage: int = 0
    is_direct_sale: Optional[bool] = None
    stage_history: List[StageHistoryResponse] = []
    payments: List[SalePaymentResponse] = []
    documents: List[SaleDocumentResponse] = []
    portal_tracking: Optional[PortalTrackingResponse] = None
