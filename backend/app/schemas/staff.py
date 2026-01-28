from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr
from enum import Enum


class StaffDesignation(str, Enum):
    ADMIN = "ADMIN"
    STAFF = "STAFF"


class StaffCreate(BaseModel):
    full_name: str
    mobile_no: str
    email: EmailStr
    designation: StaffDesignation

    aadhaar_no: str

    pan_no: Optional[str] = None
    upi_id: Optional[str] = None

    bank_account_no: Optional[str] = None
    bank_name: Optional[str] = None
    ifsc_code: Optional[str] = None

    joined_date: Optional[date] = None


class StaffResponse(BaseModel):
    staff_id: int
    full_name: str
    mobile_no: str
    email: Optional[str]
    designation: StaffDesignation

    is_active: bool
    joined_date: Optional[date]
    created_at: datetime

    class Config:
        from_attributes = True
