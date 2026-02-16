from datetime import date, datetime
from pydantic import BaseModel
from typing import Optional, List


class FollowupItem(BaseModel):
    """Unified followup item for the dashboard"""
    followup_type: str  # LEAD, SERVICE, INSURANCE
    entity_id: int  # lead_id, job_card_id, or policy_id
    entity_label: str  # Display name / description
    due_date: date
    status: str
    is_completed: bool = False
    remarks: Optional[str] = None

    class Config:
        from_attributes = True


class UnifiedFollowupDashboardResponse(BaseModel):
    """Unified followup dashboard with all types aggregated"""
    lead_followups: List[FollowupItem] = []
    service_followups: List[FollowupItem] = []
    insurance_followups: List[FollowupItem] = []
    total_pending: int = 0
    total_overdue: int = 0
