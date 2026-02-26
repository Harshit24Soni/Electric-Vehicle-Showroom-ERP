from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field


class SparePurchaseItemCreate(BaseModel):
    spare_id: int
    quantity: int = Field(..., gt=0)
    unit_cost: Decimal = Field(..., gt=0, description="Purchase price per unit (mandatory for margin protection)")
    gst_percentage: Optional[Decimal] = Decimal("0.0")


class SparePurchaseCreate(BaseModel):
    vendor_id: int
    vendor_invoice_no: Optional[str] = None
    vendor_invoice_date: Optional[date] = None
    purchase_date: date
    remarks: Optional[str] = None
    include_in_accounting: bool = True
    items: List[SparePurchaseItemCreate]


class VehiclePurchaseDetailCreate(BaseModel):
    chassis_no: str
    vehicle_model_id: int
    color: str
    motor_serial_no: Optional[str] = None
    convertor_serial_no: Optional[str] = None
    charger_serial_no: Optional[str] = None
    controller_serial_no: Optional[str] = None
    battery_serial_no: Optional[str] = None
    date_of_manufacture: Optional[date] = None
    cost_price: Decimal = Field(..., gt=0, description="Procurement cost (mandatory for margin protection)")


class VehiclePurchaseCreate(BaseModel):
    vendor_id: int
    invoice_number: str
    invoice_date: date
    invoice_amount: Optional[Decimal] = None
    include_in_accounting: bool = True
    vehicles: List[VehiclePurchaseDetailCreate]


class PurchaseResponse(BaseModel):
    purchase_id: int
    vendor_id: int
    invoice_number: Optional[str]
    purchase_date: date
    total_amount: Optional[Decimal]
    created_at: datetime

    class Config:
        from_attributes = True


class TemporaryItemCreate(BaseModel):
    spare_name: str
    spare_code: str
    category: Optional[str] = None
    remarks: Optional[str] = None
    price: Optional[Decimal] = None


class TemporaryItemResponse(BaseModel):
    spare_id: int
    spare_code: str
    spare_name: str
    is_temporary: bool
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SparePurchaseItemResponse(BaseModel):
    purchase_item_id: int
    spare_id: int
    spare_name: Optional[str] = None
    spare_code: Optional[str] = None
    quantity: int
    unit_cost: Decimal
    gst_percentage: Decimal
    total_cost: Decimal

    class Config:
        from_attributes = True


class SparePurchaseResponse(BaseModel):
    spare_purchase_id: int
    vendor_id: int
    vendor_name: Optional[str] = None
    vendor_invoice_no: Optional[str]
    vendor_invoice_date: Optional[date]
    purchase_date: date
    remarks: Optional[str]
    is_deleted: bool = False
    created_at: datetime
    items: List[SparePurchaseItemResponse] = []

    class Config:
        from_attributes = True


class VehiclePurchaseDetailResponse(BaseModel):
    vehicle_purchase_detail_id: int
    chassis_no: str
    cost_price: Decimal
    motor_serial_no: Optional[str] = None
    battery_serial_no: Optional[str] = None

    class Config:
        from_attributes = True


class VehiclePurchaseResponse(BaseModel):
    vehicle_purchase_id: int
    vendor_id: int
    vendor_name: Optional[str] = None
    invoice_number: str
    invoice_date: date
    invoice_amount: Optional[Decimal]
    is_deleted: bool = False
    created_at: datetime
    details: List[VehiclePurchaseDetailResponse] = []

    class Config:
        from_attributes = True


# ==================== VEHICLE INTAKE (OEM) SCHEMAS ====================

class VehicleIntakeItem(BaseModel):
    """Single vehicle row in a bulk OEM intake"""
    chassis_no: str = Field(..., min_length=1, max_length=50)
    motor_no: Optional[str] = Field(None, max_length=100)
    vehicle_model_id: int
    color: str = Field(..., min_length=1, max_length=50)
    battery_serial_no: Optional[str] = Field(None, max_length=100)
    purchase_price: Decimal = Field(..., gt=0, description="Procurement cost per vehicle (mandatory)")


class VehicleIntakePayload(BaseModel):
    """Bulk vehicle intake from OEM — creates VehiclePurchase + master.vehicle records"""
    oem_invoice_no: str = Field(..., min_length=1, max_length=100)
    oem_invoice_date: date
    vendor_id: int
    vehicles: List[VehicleIntakeItem] = Field(..., min_length=1)


class VehicleIntakeResponse(BaseModel):
    """Response for a successful vehicle intake"""
    message: str
    vehicle_purchase_id: int
    vehicles_added: int

    class Config:
        from_attributes = True
