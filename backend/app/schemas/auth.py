from pydantic import BaseModel, Field

class PinLoginRequest(BaseModel):
    identifier: str = Field(..., example="9876543210")
    pin: str = Field(..., min_length=6, max_length=6, example="123456")

class PinChangeRequest(BaseModel):
    old_pin: str = Field(..., min_length=4, max_length=6)
    new_pin: str = Field(..., min_length=4, max_length=6)

class AdminPinResetRequest(BaseModel):
    staff_id: int = Field(..., gt=0)
