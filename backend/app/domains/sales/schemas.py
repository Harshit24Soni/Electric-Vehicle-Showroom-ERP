from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class VehicleSaleCreate(BaseModel):
    lead_id: int
    chassis_no: str
    booking_amount: float
    remarks: Optional[str] = None

class VehicleDeliveryConfirm(BaseModel):
    remarks: Optional[str] = None

class VehicleSaleListItem(BaseModel):
    sale_id: int
    lead_id: int
    chassis_no: str
    sale_status: str
    booking_amount: float
    created_at: datetime
    delivered_at: Optional[datetime]

    class Config:
        from_attributes = True

class VehicleSaleDetail(BaseModel):
    sale_id: int
    lead_id: int
    chassis_no: str
    sale_status: str
    booking_amount: float
    created_at: datetime
    delivered_at: Optional[datetime]
    remarks: Optional[str]

    # derived / related
    vehicle_available: bool

    class Config:
        from_attributes = True
