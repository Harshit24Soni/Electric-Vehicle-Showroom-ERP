from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class SparePurchaseItemCreate(BaseModel):
    spare_id: int
    quantity: int = Field(..., gt=0)
    unit_cost: float
    gst_percentage: Optional[float] = 0.0

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
    vehicle_model_id: int # Needed to create vehicle record
    color: str # Needed for vehicle record if creating new? Or select existing model attributes? 
    # Actually, master.vehicle needs vehicle_model_id. 
    # Also we might need motor_serial_no etc. 
    # The requirement said "Dealer must NOT manually type chassis numbers *while selling*". 
    # For purchasing, they enter chassis no. 
    # Also "Vehicle + Chassis + Model Linking". 
    # When purchasing, we are creating the stock. 
    # So we need chassis_no, model_id, and other serials if available.
    
    motor_serial_no: Optional[str] = None
    convertor_serial_no: Optional[str] = None
    charger_serial_no: Optional[str] = None
    controller_serial_no: Optional[str] = None
    battery_serial_no: Optional[str] = None
    date_of_manufacture: Optional[date] = None
    cost_price: float

class VehiclePurchaseCreate(BaseModel):
    vendor_id: int
    invoice_number: str
    invoice_date: date
    invoice_amount: Optional[float] = None
    include_in_accounting: bool = True
    vehicles: List[VehiclePurchaseDetailCreate]

class PurchaseResponse(BaseModel):
    purchase_id: int
    vendor_id: int
    invoice_number: Optional[str]
    purchase_date: date
    total_amount: Optional[float]
    created_at: datetime
    
    class Config:
        from_attributes = True

class TemporaryItemCreate(BaseModel):
    spare_name: str
    spare_code: str # Dealer suggests code or system generates? Let's require unique code for now.
    category: Optional[str] = None
    remarks: Optional[str] = None
    # Price is not part of master, but might be needed to set initial price history?
    # Let's handle price in purchase or separately. 
    # But usually dealer wants to set price immediately.
    price: Optional[float] = None # Initial landing price

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
    quantity: int
    unit_cost: float
    gst_percentage: float
    total_cost: float
    
    class Config:
        from_attributes = True

class SparePurchaseResponse(BaseModel):
    spare_purchase_id: int
    vendor_id: int
    vendor_invoice_no: Optional[str]
    vendor_invoice_date: Optional[date]
    purchase_date: date
    remarks: Optional[str]
    created_at: datetime
    items: List[SparePurchaseItemResponse] = []

    class Config:
        from_attributes = True

class VehiclePurchaseDetailResponse(BaseModel):
    vehicle_purchase_detail_id: int
    chassis_no: str
    cost_price: float
    
    class Config:
        from_attributes = True

class VehiclePurchaseResponse(BaseModel):
    vehicle_purchase_id: int
    vendor_id: int
    invoice_number: str
    invoice_date: date
    invoice_amount: Optional[float]
    created_at: datetime
    details: List[VehiclePurchaseDetailResponse] = []

    class Config:
        from_attributes = True
