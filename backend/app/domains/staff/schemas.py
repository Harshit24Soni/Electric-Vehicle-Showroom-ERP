from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, EmailStr


class StaffDesignation(str, Enum):
    ADMIN = "ADMIN"
    STAFF = "STAFF"
    DEALER = "DEALER"


class StaffCreate(BaseModel):
    full_name: str
    mobile_no: str
    email: EmailStr
    designation: StaffDesignation

    # Hierarchy
    dealer_id: Optional[int] = None

    # Personal
    aadhaar_no: str
    pan_no: Optional[str] = None
    joined_date: Optional[date] = None

    # Address
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None

    # Bank
    upi_id: Optional[str] = None
    bank_account_no: Optional[str] = None
    bank_name: Optional[str] = None
    ifsc_code: Optional[str] = None

    # Emergency
    emergency_contact_name: Optional[str] = None
    emergency_contact_no: Optional[str] = None


class StaffUpdate(BaseModel):
    full_name: Optional[str] = None
    mobile_no: Optional[str] = None
    email: Optional[EmailStr] = None
    designation: Optional[StaffDesignation] = None
    
    # Hierarchy (Only Admin should change potentially, but let's allow it in schema)
    dealer_id: Optional[int] = None

    # Personal
    aadhaar_no: Optional[str] = None
    pan_no: Optional[str] = None
    joined_date: Optional[date] = None

    # Address
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None

    # Bank
    upi_id: Optional[str] = None
    bank_account_no: Optional[str] = None
    bank_name: Optional[str] = None
    ifsc_code: Optional[str] = None

    # Emergency
    emergency_contact_name: Optional[str] = None
    emergency_contact_no: Optional[str] = None


class StaffResponse(BaseModel):
    staff_id: int
    full_name: str
    mobile_no: str
    email: Optional[str]
    designation: StaffDesignation
    dealer_id: Optional[int]

    is_active: bool
    joined_date: Optional[date]
    
    # Personal
    aadhaar_no: Optional[str]
    pan_no: Optional[str]
    
    # Address
    address_line1: Optional[str]
    address_line2: Optional[str]
    city: Optional[str]
    state: Optional[str]
    pincode: Optional[str]

    # Bank
    upi_id: Optional[str]
    bank_account_no: Optional[str]
    bank_name: Optional[str]
    ifsc_code: Optional[str]

    # Emergency
    emergency_contact_name: Optional[str]
    emergency_contact_no: Optional[str]

    created_at: datetime
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    is_deleted: bool = False
    deleted_by: Optional[int] = None

    totp_enabled: bool

    class Config:
        from_attributes = True
