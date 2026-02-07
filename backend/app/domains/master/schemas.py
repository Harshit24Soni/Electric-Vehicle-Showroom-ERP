from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


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


class VehicleModelCreate(BaseModel):
    brand: str
    model_name: str
    material_number: str
    colour: Optional[str] = None
    battery_type: Optional[str] = None


class VehicleModelResponse(BaseModel):
    vehicle_model_id: int
    brand: str
    model_name: str
    material_number: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


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


class VendorCreate(BaseModel):
    vendor_name: str
    vendor_type: str


class VendorResponse(BaseModel):
    vendor_id: int
    vendor_name: str
    vendor_type: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
