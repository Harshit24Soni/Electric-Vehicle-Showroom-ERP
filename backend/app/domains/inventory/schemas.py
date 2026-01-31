from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class VehicleMovementResponse(BaseModel):
    movement_id: int
    chassis_no: str
    movement_type: str
    reference_type: Optional[str]
    reference_id: Optional[int]
    from_location: Optional[str]
    to_location: Optional[str]
    movement_datetime: datetime
    remarks: Optional[str]

    class Config:
        from_attributes = True


class SpareMovementResponse(BaseModel):
    movement_id: int
    spare_id: int
    serial_id: Optional[int]
    quantity: int
    movement_type: str
    reference_type: Optional[str]
    reference_id: Optional[int]
    movement_datetime: datetime
    remarks: Optional[str]

    class Config:
        from_attributes = True


class SpareStockResponse(BaseModel):
    spare_id: int
    available_quantity: int


class VehicleMovementCreate(BaseModel):
    chassis_no: str
    movement_type: str
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    from_location: Optional[str] = None
    to_location: Optional[str] = None
    remarks: Optional[str] = None

class SpareMovementCreate(BaseModel):
    spare_id: int
    quantity: int
    movement_type: str
    serial_id: Optional[int] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    remarks: Optional[str] = None

