from pydantic import BaseModel, Field, EmailStr
from typing import Optional


# ==================== PAYMENT MODE ====================

class PaymentModeCreate(BaseModel):
    mode_name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None

class PaymentModeUpdate(BaseModel):
    mode_name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None


# ==================== EXPENSE CATEGORY ====================

class ExpenseCategoryCreate(BaseModel):
    category_name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None

class ExpenseCategoryUpdate(BaseModel):
    category_name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None


# ==================== JOB CARD CATEGORY ====================

class JobCardCategoryCreate(BaseModel):
    category_name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None

class JobCardCategoryUpdate(BaseModel):
    category_name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None


# ==================== INSURANCE COMPANY ====================

class InsuranceCompanyCreate(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=255)
    contact_person: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None

class InsuranceCompanyUpdate(BaseModel):
    company_name: Optional[str] = Field(None, min_length=1, max_length=255)
    contact_person: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    is_active: Optional[bool] = None


# ==================== BANK ====================

class BankCreate(BaseModel):
    bank_name: str = Field(..., min_length=1, max_length=255)
    branch: Optional[str] = None
    ifsc_code: str = Field(..., min_length=4, max_length=11)
    address: Optional[str] = None
    contact_number: Optional[str] = None

class BankUpdate(BaseModel):
    bank_name: Optional[str] = Field(None, min_length=1, max_length=255)
    branch: Optional[str] = None
    ifsc_code: Optional[str] = Field(None, min_length=4, max_length=11)
    address: Optional[str] = None
    contact_number: Optional[str] = None
    is_active: Optional[bool] = None


# ==================== DOCUMENT TYPE ====================

class DocumentTypeCreate(BaseModel):
    type_name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    applicable_to: Optional[str] = Field(None, pattern="^(customer|vendor|vehicle|sale|all)$")
    is_mandatory: bool = False

class DocumentTypeUpdate(BaseModel):
    type_name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    applicable_to: Optional[str] = Field(None, pattern="^(customer|vendor|vehicle|sale|all)$")
    is_mandatory: Optional[bool] = None
    is_active: Optional[bool] = None


# ==================== BRAND (existing table, new CRUD) ====================

class BrandCreate(BaseModel):
    brand_name: str = Field(..., min_length=1, max_length=100)

class BrandUpdate(BaseModel):
    brand_name: Optional[str] = Field(None, min_length=1, max_length=100)


class ShowroomConfigSchema(BaseModel):
    dealership_name: str = Field(..., min_length=2, max_length=150)
    legal_entity_name: str = Field(..., min_length=2, max_length=150)
    gstin: str = Field(..., pattern=r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")
    registered_address: str
    city: str
    state: str
    pincode: str = Field(..., pattern=r"^\d{6}$")
    contact_email: EmailStr
    contact_mobile: str = Field(..., pattern=r"^[6-9]\d{9}$")
    bank_name: Optional[str] = None
    bank_account_no: Optional[str] = None
    bank_ifsc: Optional[str] = Field(None, pattern=r"^[A-Z]{4}0[A-Z0-9]{6}$")