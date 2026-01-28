from pydantic import BaseModel, Field

class PinLoginRequest(BaseModel):
    identifier: str = Field(..., example="9876543210")
    pin: str = Field(..., min_length=6, max_length=6, example="123456")
