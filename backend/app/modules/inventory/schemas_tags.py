from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class InventoryTagBase(BaseModel):
    tracking_mode: str
    spare_id: int
    batch_id: Optional[int] = None
    serial_id: Optional[int] = None
    location: Optional[str] = None

class TagCreateRequest(InventoryTagBase):
    quantity: Optional[int] = 1 # If they want to generate multiple tags for QUANTITY mode

class BulkTagCreateRequest(BaseModel):
    spare_id: int
    tracking_mode: str
    batch_id: Optional[int] = None
    serial_ids: Optional[List[int]] = None
    quantity: Optional[int] = 1

class InventoryTagResponse(InventoryTagBase):
    tag_id: int
    tag_identifier: str
    status: str
    last_printed_at: Optional[datetime] = None
    print_count: int
    revoked_at: Optional[datetime] = None
    
    # Enrichment fields for scan result
    spare_name: Optional[str] = None
    spare_code: Optional[str] = None
    batch_number: Optional[str] = None
    serial_number: Optional[str] = None
    available_quantity: Optional[int] = None
    inventory_status: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class TagScanResult(InventoryTagResponse):
    pass # All fields inherited
