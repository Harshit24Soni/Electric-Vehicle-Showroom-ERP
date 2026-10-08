from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class JobCardCreate(BaseModel):
    chassis_no: str
    is_free_service: bool
    remarks: Optional[str] = None

class JobCardResponse(BaseModel):
    job_card_id: int
    chassis_no: str
    is_free_service: bool
    opened_at: datetime
    closed_at: Optional[datetime]
    remarks: Optional[str]

    model_config = ConfigDict(from_attributes=True)

class SpareConsumeCreate(BaseModel):
    spare_id: int
    tracking_mode: str = "QUANTITY"
    quantity: int
    batch_id: Optional[int] = None
    serial_id: Optional[int] = None

class SpareConsumptionResponse(BaseModel):
    consumption_id: int
    job_card_id: int
    spare_id: int
    tracking_mode: str
    quantity: int
    batch_id: Optional[int]
    serial_id: Optional[int]
    part_code_snapshot: Optional[str]
    description_snapshot: Optional[str]
    unit_cost_snapshot: Optional[float]
    total_cost: Optional[float]
    consumed_by: Optional[int]
    consumed_at: Optional[datetime]
    status: str
    stock_movement_id: Optional[int]

    model_config = ConfigDict(from_attributes=True)

class JobCardClose(BaseModel):
    remarks: Optional[str] = None

class JobCardListItem(BaseModel):
    job_card_id: int
    chassis_no: str
    is_free_service: bool
    opened_at: datetime
    closed_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)

