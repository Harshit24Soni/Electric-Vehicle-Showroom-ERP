from pydantic import BaseModel, Field


class PinLoginRequest(BaseModel):
    identifier: str = Field(..., description="Mobile number or email (NOT staff ID)", example="9876543210")
    pin: str = Field(..., min_length=6, max_length=6, example="123456")


class PinChangeRequest(BaseModel):
    old_pin: str = Field(..., min_length=4, max_length=6)
    new_pin: str = Field(..., min_length=4, max_length=6)


class AdminPinResetRequest(BaseModel):
    staff_id: int = Field(..., gt=0)


class ForgotPinRequest(BaseModel):
    identifier: str = Field(..., description="Mobile number or email of staff", example="9876543210")


class DealerPinResetRequest(BaseModel):
    """For dealers to reset their own PIN - requires TOTP verification"""
    identifier: str = Field(..., description="Mobile number or email", example="9876543210")
    totp_code: str = Field(..., min_length=6, max_length=6, description="Code from Authenticator App")
    new_pin: str = Field(..., min_length=6, max_length=6)


class TOTPSetupResponse(BaseModel):
    secret: str
    provisioning_uri: str


class TOTPVerifyRequest(BaseModel):
    secret: str
    code: str

