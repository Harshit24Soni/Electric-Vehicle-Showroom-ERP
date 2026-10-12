from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime

class VehicleMovementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    movement_id: int
    chassis_no: str
    movement_type: str
    reference_type: Optional[str]
    reference_id: Optional[int]
    from_location: Optional[str]
    to_location: Optional[str]
    movement_datetime: datetime
    remarks: Optional[str]


class SpareMovementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    movement_id: int
    spare_id: int
    serial_id: Optional[int]
    quantity: int
    movement_type: str
    reference_type: Optional[str]
    reference_id: Optional[int]
    movement_datetime: datetime
    remarks: Optional[str]


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


class SparePartCodeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    code_id: int
    spare_id: int
    code: str
    is_current: bool
    effective_from: datetime
    effective_to: Optional[datetime] = None
    reason: Optional[str] = None

class SparePartVehicleCompatibilityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    compatibility_id: int
    spare_id: int
    vehicle_model_id: int

class SpareMasterResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    spare_id: int
    spare_name: str
    category: Optional[str] = None
    tracking_mode: str
    status: str
    is_temporary: bool
    is_verified: bool
    remarks: Optional[str] = None
    
    codes: List[SparePartCodeResponse] = []
    compatibilities: List[SparePartVehicleCompatibilityResponse] = []

class SparePartCodeCreate(BaseModel):
    code: str
    reason: Optional[str] = None

class SpareMasterCreate(BaseModel):
    spare_name: str
    category: Optional[str] = None
    tracking_mode: str = "QUANTITY"
    initial_code: str
    remarks: Optional[str] = None

class SpareMasterUpdate(BaseModel):
    spare_name: Optional[str] = None
    category: Optional[str] = None
    remarks: Optional[str] = None

class SparePartVehicleCompatibilityCreate(BaseModel):
    vehicle_model_id: int

class PriceListItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    item_id: int
    version_id: int
    part_code: str
    part_name: Optional[str] = None
    mrp: Optional[float] = None
    dlp: Optional[float] = None
    gst_rate: Optional[float] = None

class PriceListVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    version_id: int
    price_list_id: int
    version_reference: str
    effective_from: datetime
    received_date: datetime
    status: str
    items: List[PriceListItemResponse] = []

class PriceListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    price_list_id: int
    source_name: str
    status: str
    remarks: Optional[str] = None
    versions: List[PriceListVersionResponse] = []

class SpareCostHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    cost_id: int
    spare_id: int
    effective_date: datetime
    quantity: int
    billed_unit_price: float
    additional_costs: float
    landed_cost: float
    source_reference: Optional[str] = None

class SpareSellingPriceHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    price_id: int
    spare_id: int
    selling_price: float
    effective_from: datetime
    effective_to: Optional[datetime] = None
    reason: Optional[str] = None

class PriceListItemCreate(BaseModel):
    part_code: str
    part_name: Optional[str] = None
    mrp: Optional[float] = None
    dlp: Optional[float] = None
    gst_rate: Optional[float] = None

class PriceListVersionCreate(BaseModel):
    version_reference: str
    effective_from: datetime
    received_date: datetime
    items: List[PriceListItemCreate]

class PriceListCreate(BaseModel):
    source_name: str
    remarks: Optional[str] = None
    initial_version: Optional[PriceListVersionCreate] = None

class SpareSellingPriceCreate(BaseModel):
    selling_price: float
    reason: Optional[str] = None

