from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


class InsuranceCompanyCreate(BaseModel):
    company_name: str
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None


class InsuranceCompanyResponse(BaseModel):
    insurance_company_id: int
    company_name: str
    contact_phone: Optional[str]
    contact_email: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PolicyCreate(BaseModel):
    vehicle_sale_id: int
    chassis_no: str
    insurance_company_id: int
    policy_number: str
    policy_start_date: date
    policy_end_date: date
    premium_amount: Optional[float] = None


class PolicyResponse(BaseModel):
    policy_id: int
    vehicle_sale_id: int
    chassis_no: str
    insurance_company_id: int
    policy_number: str
    policy_start_date: date
    policy_end_date: date
    premium_amount: Optional[float]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
