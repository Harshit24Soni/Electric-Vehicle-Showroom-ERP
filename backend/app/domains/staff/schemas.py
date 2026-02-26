# backend/app/domains/staff/schemas.py
from datetime import date, datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class StaffDesignation(str, Enum):
    ADMIN = "ADMIN"
    STAFF = "STAFF"
    DEALER = "DEALER"

# --- AUTH & PIN SCHEMAS ---
class PinLoginRequest(BaseModel):
    identifier: str = Field(..., description="Mobile number or email", example="9876543210")
    pin: str = Field(..., min_length=6, max_length=6, example="123456")

class PinChangeRequest(BaseModel):
    old_pin: str = Field(..., min_length=6, max_length=6)
    new_pin: str = Field(..., min_length=6, max_length=6)

class AdminPinResetRequest(BaseModel):
    staff_id: int = Field(..., gt=0)

class ForgotPinRequest(BaseModel):
    identifier: str = Field(..., description="Mobile number or email of staff")

class SelfPinResetRequest(BaseModel):
    mobile: str = Field(..., description="Mobile number")
    totp_code: str = Field(..., min_length=6, max_length=6, description="Code from Authenticator App")
    new_pin: str = Field(..., min_length=6, max_length=6)
    confirm_pin: str = Field(..., min_length=6, max_length=6)

class TOTPSetupResponse(BaseModel):
    secret: str
    provisioning_uri: str

class TOTPVerifyRequest(BaseModel):
    secret: str
    code: str

class DealerPinResetRequest(BaseModel):
    """For dealers to reset their own PIN - requires TOTP verification"""
    identifier: str = Field(..., description="Mobile number or email", example="9876543210")
    totp_code: str = Field(..., min_length=6, max_length=6, description="Code from Authenticator App")
    new_pin: str = Field(..., min_length=6, max_length=6)

class PinResetRequestCreate(BaseModel):
    mobile: str = Field(..., description="Mobile number of the staff requesting PIN reset")

# --- STAFF CRUD SCHEMAS ---
class StaffCreate(BaseModel):
    full_name: str = Field(..., min_length=3, max_length=100)
    mobile_no: str = Field(..., pattern=r"^[6-9]\d{9}$", description="10-digit Indian mobile number")
    email: EmailStr
    designation: StaffDesignation
    dealer_id: Optional[int] = None

    aadhaar_no: str = Field(..., pattern=r"^\d{12}$", description="12-digit Aadhaar")
    pan_no: Optional[str] = Field(None, pattern=r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$", description="Valid PAN format")
    joined_date: Optional[date] = None

    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = Field(None, pattern=r"^\d{6}$")

    upi_id: Optional[str] = None
    bank_account_no: Optional[str] = None
    bank_name: Optional[str] = None
    ifsc_code: Optional[str] = Field(None, pattern=r"^[A-Z]{4}0[A-Z0-9]{6}$")

    emergency_contact_name: Optional[str] = None
    emergency_contact_no: Optional[str] = Field(None, pattern=r"^[6-9]\d{9}$")

class StaffUpdate(BaseModel):
    # Same fields as StaffCreate but all optional
    full_name: Optional[str] = Field(None, min_length=3, max_length=100)
    mobile_no: Optional[str] = Field(None, pattern=r"^[6-9]\d{9}$")
    email: Optional[EmailStr] = None
    designation: Optional[StaffDesignation] = None
    dealer_id: Optional[int] = None
    aadhaar_no: Optional[str] = Field(None, pattern=r"^\d{12}$")
    pan_no: Optional[str] = Field(None, pattern=r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$")
    joined_date: Optional[date] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = Field(None, pattern=r"^\d{6}$")
    upi_id: Optional[str] = None
    bank_account_no: Optional[str] = None
    bank_name: Optional[str] = None
    ifsc_code: Optional[str] = Field(None, pattern=r"^[A-Z]{4}0[A-Z0-9]{6}$")
    emergency_contact_name: Optional[str] = None
    emergency_contact_no: Optional[str] = Field(None, pattern=r"^[6-9]\d{9}$")
    is_active: Optional[bool] = None

class StaffResponse(BaseModel):
    staff_id: int
    full_name: str
    mobile_no: str
    email: Optional[str]
    designation: StaffDesignation
    is_active: bool
    joined_date: Optional[date]
    created_at: datetime
    totp_enabled: bool

    class Config:
        from_attributes = True