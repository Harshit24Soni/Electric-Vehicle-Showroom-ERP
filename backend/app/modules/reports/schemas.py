from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class DashboardStatsResponse(BaseModel):
    revenue: float
    active_leads: int
    conversion_ratio: float
    in_stock_inventory: int

class AgingInventoryAlert(BaseModel):
    chassis_no: str
    model_name: str
    days_in_stock: int
    age_category: str  # ">30 Days" or ">60 Days"

class UpcomingRenewalAlert(BaseModel):
    chassis_no: str
    type: str  # "INSURANCE" or "SERVICE"
    due_date: date
    details: str

class DashboardAlertsResponse(BaseModel):
    aging_inventory: List[AgingInventoryAlert]
    upcoming_renewals: List[UpcomingRenewalAlert]
