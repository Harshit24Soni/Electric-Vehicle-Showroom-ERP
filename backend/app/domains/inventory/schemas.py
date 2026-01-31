from pydantic import BaseModel
from typing import Optional


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

