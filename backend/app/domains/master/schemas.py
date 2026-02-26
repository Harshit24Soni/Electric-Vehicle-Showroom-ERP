from datetime import date, datetime
from enum import Enum
from typing import Optional, Literal
from pydantic import BaseModel, EmailStr, Field, field_validator
import re


# ==================== ENUMS ====================

class VendorType(str, Enum):
    OEM = "OEM"
    SPARE_PART = "SPARE_PART"
    FINANCIER = "FINANCIER"
    OTHER = "OTHER"


# ==================== SHARED VALIDATORS ====================

GSTIN_REGEX = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")
PAN_REGEX = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$")
PINCODE_REGEX = re.compile(r"^\d{6}$")


# ==================== NOMINEE SCHEMAS ====================

class NomineeCreate(BaseModel):
    """Create nominee details for insurance"""
    nominee_name: str = Field(..., min_length=1, max_length=150)
    nominee_dob: date
    relation: str = Field(..., min_length=1, max_length=100)
    is_primary: bool = Field(default=True)


class NomineeUpdate(BaseModel):
    """Update nominee details"""
    nominee_name: Optional[str] = None
    nominee_dob: Optional[date] = None
    relation: Optional[str] = None
    is_primary: Optional[bool] = None


class NomineeResponse(BaseModel):
    nominee_id: int
    customer_id: int
    nominee_name: str
    nominee_dob: date
    relation: str
    is_primary: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== CUSTOMER SCHEMAS ====================

class CustomerCreate(BaseModel):
    customer_type: Optional[str] = "INDIVIDUAL"
    name: str
    guardian_name: Optional[str] = None
    primary_phone: str
    email: Optional[EmailStr] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    aadhaar_no: Optional[str] = None
    pan_no: Optional[str] = None
    gstin: Optional[str] = None
    lead_reference_id: Optional[int] = None  # Reference to lead this customer was converted from


class CustomerUpdate(BaseModel):
    """Update customer details"""
    customer_type: Optional[str] = None
    name: Optional[str] = None
    guardian_name: Optional[str] = None
    primary_phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    aadhaar_no: Optional[str] = None
    pan_no: Optional[str] = None
    gstin: Optional[str] = None


class CustomerResponse(BaseModel):
    customer_id: int
    lead_reference_id: Optional[int]
    customer_type: Optional[str]
    name: str
    primary_phone: str
    email: Optional[EmailStr]
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


class CustomerDetailedResponse(BaseModel):
    """Detailed customer response with nominee information"""
    customer_id: int
    lead_reference_id: Optional[int]
    customer_type: Optional[str]
    name: str
    guardian_name: Optional[str]
    primary_phone: str
    email: Optional[EmailStr]
    address_line1: Optional[str]
    address_line2: Optional[str]
    city: Optional[str]
    state: Optional[str]
    pincode: Optional[str]
    aadhaar_no: Optional[str]
    pan_no: Optional[str]
    gstin: Optional[str]
    nominees: list[NomineeResponse] = []
    vehicle_count: int = 0
    last_service_date: Optional[datetime] = None
    last_warranty_date: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==================== VEHICLE MODEL SCHEMAS ====================

class VehicleModelCreate(BaseModel):
    brand_id: int = Field(..., gt=0, description="FK to master.brand")
    model_name: str = Field(..., min_length=1, max_length=100)
    material_number: str = Field(..., min_length=1, max_length=100)
    colour: str = Field(..., min_length=1, max_length=50)
    battery_type: Optional[str] = Field(None, max_length=50)
    laden_weight: Optional[float] = Field(None, gt=0)
    unladen_weight: Optional[float] = Field(None, gt=0)
    hsn_code: Optional[str] = Field(None, max_length=20)


class VehicleModelUpdate(BaseModel):
    """Partial update for vehicle model — only supplied fields are changed."""
    model_name: Optional[str] = Field(None, min_length=1, max_length=100)
    material_number: Optional[str] = Field(None, min_length=1, max_length=100)
    colour: Optional[str] = Field(None, min_length=1, max_length=50)
    battery_type: Optional[str] = Field(None, max_length=50)
    laden_weight: Optional[float] = Field(None, gt=0)
    unladen_weight: Optional[float] = Field(None, gt=0)
    hsn_code: Optional[str] = Field(None, max_length=20)


class VehicleModelResponse(BaseModel):
    vehicle_model_id: int
    brand_id: int
    brand_name: Optional[str] = None
    model_name: str
    material_number: str
    colour: str
    battery_type: Optional[str] = None
    laden_weight: Optional[float] = None
    unladen_weight: Optional[float] = None
    hsn_code: Optional[str] = None
    is_active: bool
    is_deleted: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== VEHICLE SCHEMAS ====================

class VehicleCreate(BaseModel):
    chassis_no: str
    vehicle_model_id: int
    date_of_manufacture: Optional[date] = None


class VehicleResponse(BaseModel):
    chassis_no: str
    vehicle_model_id: int
    current_status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== VENDOR SCHEMAS ====================

class VendorCreate(BaseModel):
    vendor_name: str = Field(..., min_length=1, max_length=150)
    vendor_type: VendorType
    gstin: Optional[str] = Field(None, max_length=15)
    pan_no: Optional[str] = Field(None, max_length=10)
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    pincode: Optional[str] = Field(None, max_length=10)

    @field_validator("gstin")
    @classmethod
    def validate_gstin(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v != "":
            if not GSTIN_REGEX.match(v):
                raise ValueError("Invalid GSTIN format. Expected: 22AAAAA0000A1Z5")
        return v or None

    @field_validator("pan_no")
    @classmethod
    def validate_pan(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v != "":
            if not PAN_REGEX.match(v):
                raise ValueError("Invalid PAN format. Expected: ABCDE1234F")
        return v or None

    @field_validator("pincode")
    @classmethod
    def validate_pincode(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v != "":
            if not PINCODE_REGEX.match(v):
                raise ValueError("Invalid pincode. Must be 6 digits.")
        return v or None


class VendorUpdate(BaseModel):
    """Partial update for vendor — only supplied fields are changed."""
    vendor_name: Optional[str] = Field(None, min_length=1, max_length=150)
    vendor_type: Optional[VendorType] = None
    gstin: Optional[str] = Field(None, max_length=15)
    pan_no: Optional[str] = Field(None, max_length=10)
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    pincode: Optional[str] = Field(None, max_length=10)

    @field_validator("gstin")
    @classmethod
    def validate_gstin(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v != "":
            if not GSTIN_REGEX.match(v):
                raise ValueError("Invalid GSTIN format. Expected: 22AAAAA0000A1Z5")
        return v or None

    @field_validator("pan_no")
    @classmethod
    def validate_pan(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v != "":
            if not PAN_REGEX.match(v):
                raise ValueError("Invalid PAN format. Expected: ABCDE1234F")
        return v or None

    @field_validator("pincode")
    @classmethod
    def validate_pincode(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v != "":
            if not PINCODE_REGEX.match(v):
                raise ValueError("Invalid pincode. Must be 6 digits.")
        return v or None


class VendorResponse(BaseModel):
    vendor_id: int
    vendor_name: str
    vendor_type: str
    gstin: Optional[str] = None
    pan_no: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    is_active: bool
    is_deleted: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== PRICING SCHEMAS ====================

class SparePriceUpdate(BaseModel):
    price: float = Field(..., gt=0)
    margin: float = Field(..., ge=0, le=100)
    effective_from: Optional[datetime] = None


class SparePriceHistoryResponse(BaseModel):
    history_id: int
    spare_id: int
    price: float
    margin: float
    effective_from: datetime
    effective_to: Optional[datetime]
    created_at: datetime
    created_by: Optional[int]

    class Config:
        from_attributes = True


class VehiclePriceUpdate(BaseModel):
    price: float = Field(..., gt=0)
    effective_from: Optional[datetime] = None


class VehiclePriceHistoryResponse(BaseModel):
    history_id: int
    vehicle_model_id: int
    price: float
    effective_from: datetime
    effective_to: Optional[datetime]
    created_at: datetime
    created_by: Optional[int]

    class Config:
        from_attributes = True
