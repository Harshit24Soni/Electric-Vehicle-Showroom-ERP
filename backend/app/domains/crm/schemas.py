from datetime import date, datetime
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List


class LeadCreate(BaseModel):
    """Create a new lead - independent of customer"""
    name: str = Field(..., min_length=1, max_length=150)
    customer_id: Optional[int] = None
    phone: str = Field(..., min_length=10, max_length=15)
    email: Optional[str] = None
    vehicle_model_id: int
    lead_source: str
    lead_status_id: int
    owner_staff_id: Optional[int] = None
    expected_purchase_date: Optional[date] = None
    remarks: Optional[str] = None
    # New workflow fields
    expected_purchase_days: Optional[int] = None
    lead_status: Optional[str] = "WARM"


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
    lead_status: Optional[str] = None


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
    created_by_staff_id: int
    expected_purchase_date: Optional[date] = None
    remarks: Optional[str] = None
    created_at: datetime
    # New workflow fields
    expected_purchase_days: Optional[int] = None
    next_followup_date: Optional[date] = None
    lead_status: Optional[str] = None
    visit_date: Optional[datetime] = None
    is_converted: Optional[bool] = None
    converted_sale_id: Optional[int] = None

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
    owner_staff_id: Optional[int] = None
    remarks: Optional[str] = None


class EnquiryResponse(BaseModel):
    enquiry_id: int
    lead_id: int
    enquiry_source: str
    enquiry_status_id: int
    owner_staff_id: int
    created_by_staff_id: int
    last_followup_date: Optional[date]
    last_message_date: Optional[datetime]
    remarks: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class FollowupCreate(BaseModel):
    lead_id: int
    scheduled_date: date
    assigned_staff_id: Optional[int] = None
    remarks: Optional[str] = None


class FollowupUpdate(BaseModel):
    scheduled_date: Optional[date] = None
    assigned_staff_id: Optional[int] = None
    followup_status: Optional[str] = None
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
    performed_by_staff_id: Optional[int] = None
    activity_time: datetime
    outcome: Optional[str] = None
    next_action_date: Optional[date] = None


# ==================== NEW WORKFLOW SCHEMAS ====================

class LeadFollowupCreate(BaseModel):
    """Create a followup entry for a lead with mandatory remarks (min 10 chars)"""
    remarks: str = Field(..., min_length=10, description="Mandatory remarks, minimum 10 characters")
    outcome_status: str = Field(..., description="HOT, WARM, COLD, LOST, SOLD")
    next_followup_date: Optional[date] = None

    @field_validator("remarks")
    @classmethod
    def validate_remarks_length(cls, v: str) -> str:
        if len(v.strip()) < 10:
            raise ValueError("Remarks must be at least 10 characters (excluding whitespace)")
        return v.strip()

    @field_validator("outcome_status")
    @classmethod
    def validate_outcome(cls, v: str) -> str:
        allowed = {"HOT", "WARM", "COLD", "LOST", "SOLD"}
        if v.upper() not in allowed:
            raise ValueError(f"outcome_status must be one of: {', '.join(allowed)}")
        return v.upper()


class LeadFollowupResponse(BaseModel):
    lead_followup_id: int
    lead_id: int
    followup_date: datetime
    remarks: str
    outcome_status: str
    next_followup_date: Optional[date] = None
    staff_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class LeadDashboardItem(BaseModel):
    lead_id: int
    name: str
    phone: str
    lead_status: Optional[str] = None
    next_followup_date: Optional[date] = None
    owner_staff_id: int

    class Config:
        from_attributes = True


class LeadFollowupDashboardResponse(BaseModel):
    overdue: List[LeadDashboardItem] = []
    today: List[LeadDashboardItem] = []
    upcoming: List[LeadDashboardItem] = []


class TestRideCreate(BaseModel):
    """Create a test ride entry"""
    vehicle_model_id: int
    test_ride_date: date
    customer_feedback: Optional[str] = None
