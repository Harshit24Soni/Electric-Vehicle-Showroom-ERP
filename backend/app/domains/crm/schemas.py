from datetime import date, datetime
from pydantic import BaseModel, Field
from typing import Optional


class LeadCreate(BaseModel):
    customer_id: int
    vehicle_model_id: int
    lead_source: str
    lead_status: str = Field(default="NEW")
    owner_staff_id: int
    expected_purchase_date: Optional[date] = None
    remarks: Optional[str] = None


class LeadResponse(BaseModel):
    lead_id: int
    customer_id: int
    vehicle_model_id: int
    lead_source: str
    lead_status: str
    owner_staff_id: int
    expected_purchase_date: Optional[date]
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
