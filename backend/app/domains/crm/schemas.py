from datetime import date, datetime
from pydantic import BaseModel, Field
from typing import Optional


class LeadCreate(BaseModel):
    """Create a new lead - independent of customer"""
    name: str = Field(..., min_length=1, max_length=150)
    customer_id: Optional[int] = None
    phone: str = Field(..., min_length=10, max_length=15)
    email: Optional[str] = None
    vehicle_model_id: int
    lead_source: str
    lead_status_id: int
    owner_staff_id: int
    expected_purchase_date: Optional[date] = None
    remarks: Optional[str] = None


class LeadUpdate(BaseModel):
    """Update lead information"""
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    vehicle_model_id: Optional[int] = None
    lead_source: Optional[str] = None
    lead_status_id: Optional[int] = None
    expected_purchase_date: Optional[date] = None
    remarks: Optional[str] = None


class LeadResponse(BaseModel):
    lead_id: int
    customer_id: Optional[int] = None
    name: str
    phone: str
    email: Optional[str] = None
    vehicle_model_id: int
    lead_source: str
    lead_status_id: int
    owner_staff_id: int
    expected_purchase_date: Optional[date] = None
    remarks: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LeadConversionRequest(BaseModel):
    """Request to convert a lead to customer"""
    lead_id: int
    use_lead_data: bool = Field(default=True, description="Whether to use lead data for customer creation")


class EnquiryCreate(BaseModel):
    """Create an enquiry for lead tracking"""
    lead_id: int
    enquiry_source: str
    enquiry_status_id: int = Field(default=1, description="Default to ACTIVE (1)")
    owner_staff_id: int
    remarks: Optional[str] = None


class EnquiryResponse(BaseModel):
    enquiry_id: int
    lead_id: int
    enquiry_source: str
    enquiry_status_id: int
    owner_staff_id: int
    last_followup_date: Optional[date]
    last_message_date: Optional[datetime]
    remarks: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class FollowupCreate(BaseModel):
    lead_id: int
    scheduled_date: date
    assigned_staff_id: int
    remarks: Optional[str] = None


class FollowupResponse(BaseModel):
    followup_id: int
    lead_id: int
    scheduled_date: date
    assigned_staff_id: int
    followup_status: str
    completed_at: Optional[datetime]
    remarks: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class ActivityCreate(BaseModel):
    lead_id: int
    activity_type: str
    performed_by_staff_id: int
    activity_time: datetime
    outcome: Optional[str] = None
    next_action_date: Optional[date] = None
