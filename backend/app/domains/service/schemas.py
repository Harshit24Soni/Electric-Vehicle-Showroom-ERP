from pydantic import BaseModel
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

    class Config:
        from_attributes = True

class SpareConsumeCreate(BaseModel):
    spare_id: int
    quantity: int
    serial_id: Optional[int] = None

class JobCardClose(BaseModel):
    remarks: Optional[str] = None

class JobCardListItem(BaseModel):
    job_card_id: int
    chassis_no: str
    is_free_service: bool
    opened_at: datetime
    closed_at: Optional[datetime]

    class Config:
        from_attributes = True

