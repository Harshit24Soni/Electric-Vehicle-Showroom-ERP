from datetime import date, datetime
from pydantic import BaseModel, Field
from typing import Optional, List


class ClaimCreate(BaseModel):
    job_spare_id: int
    so_number: str
    remarks: Optional[str] = None


class ClaimResponse(BaseModel):
    claim_id: int
    job_spare_id: int
    claim_status: str
    portal_ref_no: Optional[str]
    approval_date: Optional[date]
    created_at: datetime
    so_number: str
    remarks: Optional[str]

    class Config:
        orm_mode = True


class InwardItemCreate(BaseModel):
    spare_id: int
    quantity: int = Field(gt=0)
    unit_cost: Optional[float]


class InwardCreate(BaseModel):
    oem_invoice_no: str
    oem_invoice_date: date
    remarks: Optional[str]
    items: List[InwardItemCreate]


class InwardResponse(BaseModel):
    warranty_inward_id: int
    oem_invoice_no: str
    oem_invoice_date: date
    remarks: Optional[str]
    created_at: datetime

    class Config:
        orm_mode = True


class ShipmentItemCreate(BaseModel):
    claim_id: int


class ShipmentCreate(BaseModel):
    courier_name: str
    docket_no: str
    dispatch_date: date
    items: List[ShipmentItemCreate]


class ShipmentResponse(BaseModel):
    shipment_id: int
    courier_name: str
    docket_no: str
    dispatch_date: date
    received_date: Optional[date]
    created_at: datetime

    class Config:
        orm_mode = True
