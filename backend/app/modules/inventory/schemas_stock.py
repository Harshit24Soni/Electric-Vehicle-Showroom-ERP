from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from decimal import Decimal


# Dashboard
class InventoryDashboardResponse(BaseModel):
    total_active_spares: int
    total_stock_value: Decimal  # Accounting inventory value (excluding recoverable ITC)
    total_gst_inclusive_value: Optional[Decimal] = None  # Operational GST-inclusive acquisition view
    gst_inclusive_valuation_label: Optional[str] = "Operational Acquisition View (Invoice-Backed & Labelled Estimates)"
    is_gst_inclusive_estimated: Optional[bool] = False
    unverified_opening_stock_count: Optional[int] = 0
    total_movements_last_30d: int
    critical_alerts_count: Optional[int] = 0
    high_alerts_count: Optional[int] = 0


class StockByLocationResponse(BaseModel):
    location: str
    total_quantity: int
    total_value: Decimal


# Stock
class StockItemResponse(BaseModel):
    spare_id: int
    spare_name: str
    part_code: Optional[str] = None
    tracking_mode: str
    location: str
    quantity: int
    unit_cost: Decimal  # Accounting WAC
    total_value: Decimal  # Accounting carrying value (WAC * quantity)
    gst_inclusive_value: Optional[Decimal] = None  # Operational GST-inclusive acquisition value
    cost_classification: Optional[str] = "INVOICE_VERIFIED"  # "INVOICE_VERIFIED" or "ESTIMATED_OPENING"
    acquisition_tax_status: Optional[str] = "TRACEABLE_INVOICE"  # "TRACEABLE_INVOICE" or "CATALOG_ESTIMATE"
    has_unverified_historical_tax: Optional[bool] = False
    manufacturer_mrp: Optional[Decimal] = None
    manufacturer_dlp: Optional[Decimal] = None
    expected_gross_profit: Optional[Decimal] = None
    gross_margin_percent: Optional[Decimal] = None


class StockListResponse(BaseModel):
    items: List[StockItemResponse]


# Batches
class BatchItemResponse(BaseModel):
    batch_id: int
    spare_id: int
    spare_name: str
    part_code: Optional[str] = None
    batch_number: str
    location: str
    quantity: int
    unit_cost: Decimal
    total_value: Decimal
    expiry_date: Optional[datetime] = None


class BatchListResponse(BaseModel):
    items: List[BatchItemResponse]


# Serials
class SerialItemResponse(BaseModel):
    serial_id: int
    spare_id: int
    spare_name: str
    part_code: Optional[str] = None
    serial_number: str
    location: str
    status: str
    unit_cost: Decimal


class SerialListResponse(BaseModel):
    items: List[SerialItemResponse]


# Movements
class MovementHistoryItemResponse(BaseModel):
    movement_id: int
    movement_datetime: datetime
    movement_type: str
    spare_id: int
    spare_name: str
    part_code: Optional[str] = None
    quantity: int
    from_location: Optional[str] = None
    to_location: Optional[str] = None
    batch_number: Optional[str] = None
    serial_number: Optional[str] = None
    unit_cost: Optional[Decimal] = None
    total_cost: Optional[Decimal] = None
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    remarks: Optional[str] = None


class MovementHistoryListResponse(BaseModel):
    items: List[MovementHistoryItemResponse]
    total: int
    page: int
    size: int
