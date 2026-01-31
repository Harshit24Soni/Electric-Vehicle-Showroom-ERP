from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


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


class CustomerResponse(BaseModel):
    customer_id: int
    customer_type: Optional[str]
    name: str
    primary_phone: str
    email: Optional[EmailStr]
    created_at: datetime
    is_active: bool

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
