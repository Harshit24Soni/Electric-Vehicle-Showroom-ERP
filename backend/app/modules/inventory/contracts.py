from pydantic import BaseModel, Field
from typing import List, Dict

# Decoupling Strategy (DDD Phase 1):
# Contracts define the PUBLIC INTERFACE for this module.
# Other modules (like Sales or CRM) must use these schemas to interact with Inventory,
# rather than importing internal ORM models or database schemas directly.
# This ensures that internal schema changes don't break external dependencies.

class CheckSpareStockRequest(BaseModel):
    """Request payload to check if a specific list of spares are available."""
    spare_ids: List[int] = Field(..., description="List of internal spare IDs to check.")

class SpareStockAvailabilityInfo(BaseModel):
    spare_id: int
    available_quantity: int
    is_available: bool

class SpareStockAvailabilityResponse(BaseModel):
    """Response payload detailing availability of requested spares."""
    results: List[SpareStockAvailabilityInfo]

class CheckVehicleAvailabilityRequest(BaseModel):
    """Request payload to check if a vehicle is available for sale or allocation."""
    chassis_no: str = Field(..., description="The chassis number of the vehicle.")

class VehicleAvailabilityResponse(BaseModel):
    """Response payload detailing if the vehicle is in AVAILABLE status."""
    chassis_no: str
    is_available: bool
    current_status: str | None = None
