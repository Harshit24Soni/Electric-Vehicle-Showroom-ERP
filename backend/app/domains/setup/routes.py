from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.auth.dependencies import get_current_staff
from app.auth.roles import require_roles
from app.domains.setup import services
from app.domains.master.models import Staff
from app.domains.setup.schemas import (
    BrandCreate, BrandUpdate,
    PaymentModeCreate, PaymentModeUpdate,
    ExpenseCategoryCreate, ExpenseCategoryUpdate,
    JobCardCategoryCreate, JobCardCategoryUpdate,
    InsuranceCompanyCreate, InsuranceCompanyUpdate,
    BankCreate, BankUpdate,
    DocumentTypeCreate, DocumentTypeUpdate, ShowroomConfigSchema
)

router = APIRouter(
    prefix="/setup",
    tags=["Setup"],
    dependencies=[Depends(require_roles("ADMIN", "DEALER"))],
)

# ==================== BRANDS ====================

@router.get("/brands")
async def list_brands(db: AsyncSession = Depends(get_db)):
    return await services.list_brands(db)

@router.post("/brands")
async def create_brand(payload: BrandCreate, current_staff=Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    return await services.create_brand(db, payload.model_dump(), current_staff["staff_id"])

@router.put("/brands/{brand_id}")
async def update_brand(brand_id: int, payload: BrandUpdate, current_staff=Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    result = await services.update_brand(db, brand_id, payload.model_dump(exclude_none=True), current_staff["staff_id"])
    if not result:
        raise HTTPException(status_code=404, detail="Brand not found")
    return result

@router.delete("/brands/{brand_id}")
async def delete_brand(brand_id: int, current_staff=Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    await services.delete_brand(db, brand_id, current_staff["staff_id"])
    return {"message": "Brand deleted"}

@router.post("/brands/{brand_id}/restore")
async def restore_brand(brand_id: int, db: AsyncSession = Depends(get_db)):
    await services.restore_brand(db, brand_id)
    return {"message": "Brand restored"}

# ==================== PAYMENT MODES ====================

@router.get("/payment-modes")
async def list_payment_modes(db: AsyncSession = Depends(get_db)):
    return await services.list_payment_modes(db)

@router.post("/payment-modes")
async def create_payment_mode(payload: PaymentModeCreate, current_staff=Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    return await services.create_payment_mode(db, payload.model_dump(), current_staff["staff_id"])

@router.put("/payment-modes/{payment_mode_id}")
async def update_payment_mode(payment_mode_id: int, payload: PaymentModeUpdate, current_staff=Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    result = await services.update_payment_mode(db, payment_mode_id, payload.model_dump(exclude_none=True), current_staff["staff_id"])
    if not result:
        raise HTTPException(status_code=404, detail="Payment mode not found")
    return result

@router.delete("/payment-modes/{payment_mode_id}")
async def delete_payment_mode(payment_mode_id: int, current_staff=Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    await services.delete_payment_mode(db, payment_mode_id, current_staff["staff_id"])
    return {"message": "Payment mode deleted"}

@router.post("/payment-modes/{payment_mode_id}/restore")
async def restore_payment_mode(payment_mode_id: int, db: AsyncSession = Depends(get_db)):
    await services.restore_payment_mode(db, payment_mode_id)
    return {"message": "Payment mode restored"}

# ==================== EXPENSE CATEGORIES ====================

@router.get("/expense-categories")
async def list_expense_categories(db: AsyncSession = Depends(get_db)):
    return await services.list_expense_categories(db)

@router.post("/expense-categories")
async def create_expense_category(payload: ExpenseCategoryCreate, current_staff=Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    return await services.create_expense_category(db, payload.model_dump(), current_staff["staff_id"])

@router.put("/expense-categories/{expense_category_id}")
async def update_expense_category(expense_category_id: int, payload: ExpenseCategoryUpdate, current_staff=Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    result = await services.update_expense_category(db, expense_category_id, payload.model_dump(exclude_none=True), current_staff["staff_id"])
    if not result:
        raise HTTPException(status_code=404, detail="Expense category not found")
    return result

@router.delete("/expense-categories/{expense_category_id}")
async def delete_expense_category(expense_category_id: int, current_staff=Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    await services.delete_expense_category(db, expense_category_id, current_staff["staff_id"])
    return {"message": "Expense category deleted"}

@router.post("/expense-categories/{expense_category_id}/restore")
async def restore_expense_category(expense_category_id: int, db: AsyncSession = Depends(get_db)):
    await services.restore_expense_category(db, expense_category_id)
    return {"message": "Expense category restored"}

# ==================== JOB CARD CATEGORIES ====================

@router.get("/job-card-categories")
async def list_job_card_categories(db: AsyncSession = Depends(get_db)):
    return await services.list_job_card_categories(db)

@router.post("/job-card-categories")
async def create_job_card_category(payload: JobCardCategoryCreate, current_staff=Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    return await services.create_job_card_category(db, payload.model_dump(), current_staff["staff_id"])

@router.put("/job-card-categories/{job_card_category_id}")
async def update_job_card_category(job_card_category_id: int, payload: JobCardCategoryUpdate, current_staff=Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    result = await services.update_job_card_category(db, job_card_category_id, payload.model_dump(exclude_none=True), current_staff["staff_id"])
    if not result:
        raise HTTPException(status_code=404, detail="Job card category not found")
    return result

@router.delete("/job-card-categories/{job_card_category_id}")
async def delete_job_card_category(job_card_category_id: int, current_staff=Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    await services.delete_job_card_category(db, job_card_category_id, current_staff["staff_id"])
    return {"message": "Job card category deleted"}

@router.post("/job-card-categories/{job_card_category_id}/restore")
async def restore_job_card_category(job_card_category_id: int, db: AsyncSession = Depends(get_db)):
    await services.restore_job_card_category(db, job_card_category_id)
    return {"message": "Job card category restored"}

# ==================== INSURANCE COMPANIES ====================

@router.get("/insurance-companies")
async def list_insurance_companies(db: AsyncSession = Depends(get_db)):
    return await services.list_insurance_companies(db)

@router.post("/insurance-companies")
async def create_insurance_company(payload: InsuranceCompanyCreate, current_staff=Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    return await services.create_insurance_company(db, payload.model_dump(), current_staff["staff_id"])

@router.put("/insurance-companies/{insurance_company_id}")
async def update_insurance_company(insurance_company_id: int, payload: InsuranceCompanyUpdate, current_staff=Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    result = await services.update_insurance_company(db, insurance_company_id, payload.model_dump(exclude_none=True), current_staff["staff_id"])
    if not result:
        raise HTTPException(status_code=404, detail="Insurance company not found")
    return result

@router.delete("/insurance-companies/{insurance_company_id}")
async def delete_insurance_company(insurance_company_id: int, current_staff=Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    await services.delete_insurance_company(db, insurance_company_id, current_staff["staff_id"])
    return {"message": "Insurance company deleted"}

@router.post("/insurance-companies/{insurance_company_id}/restore")
async def restore_insurance_company(insurance_company_id: int, db: AsyncSession = Depends(get_db)):
    await services.restore_insurance_company(db, insurance_company_id)
    return {"message": "Insurance company restored"}

# ==================== BANKS ====================

@router.get("/banks")
async def list_banks(db: AsyncSession = Depends(get_db)):
    return await services.list_banks(db)

@router.post("/banks")
async def create_bank(payload: BankCreate, current_staff=Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    return await services.create_bank(db, payload.model_dump(), current_staff["staff_id"])

@router.put("/banks/{bank_id}")
async def update_bank(bank_id: int, payload: BankUpdate, current_staff=Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    result = await services.update_bank(db, bank_id, payload.model_dump(exclude_none=True), current_staff["staff_id"])
    if not result:
        raise HTTPException(status_code=404, detail="Bank not found")
    return result

@router.delete("/banks/{bank_id}")
async def delete_bank(bank_id: int, current_staff=Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    await services.delete_bank(db, bank_id, current_staff["staff_id"])
    return {"message": "Bank deleted"}

@router.post("/banks/{bank_id}/restore")
async def restore_bank(bank_id: int, db: AsyncSession = Depends(get_db)):
    await services.restore_bank(db, bank_id)
    return {"message": "Bank restored"}

# ==================== DOCUMENT TYPES ====================

@router.get("/document-types")
async def list_document_types(db: AsyncSession = Depends(get_db)):
    return await services.list_document_types(db)

@router.post("/document-types")
async def create_document_type(payload: DocumentTypeCreate, current_staff=Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    return await services.create_document_type(db, payload.model_dump(), current_staff["staff_id"])

@router.put("/document-types/{document_type_id}")
async def update_document_type(document_type_id: int, payload: DocumentTypeUpdate, current_staff=Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    result = await services.update_document_type(db, document_type_id, payload.model_dump(exclude_none=True), current_staff["staff_id"])
    if not result:
        raise HTTPException(status_code=404, detail="Document type not found")
    return result

@router.delete("/document-types/{document_type_id}")
async def delete_document_type(document_type_id: int, current_staff=Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    await services.delete_document_type(db, document_type_id, current_staff["staff_id"])
    return {"message": "Document type deleted"}

@router.post("/document-types/{document_type_id}/restore")
async def restore_document_type(document_type_id: int, db: AsyncSession = Depends(get_db)):
    await services.restore_document_type(db, document_type_id)
    return {"message": "Document type restored"}

# ==================== STAFF COUNT ====================

@router.get("/staff-summary")
async def get_staff_summary(db: AsyncSession = Depends(get_db)):
    """Returns active staff count for the Setup → Staff tab summary card."""
    active_stmt = select(func.count(Staff.staff_id)).where(Staff.is_active == True)
    inactive_stmt = select(func.count(Staff.staff_id)).where(Staff.is_active == False)
    total_stmt = select(func.count(Staff.staff_id))
    
    active_count = await db.scalar(active_stmt)
    inactive_count = await db.scalar(inactive_stmt)
    total_count = await db.scalar(total_stmt)
    
    return {
        "active_count": active_count or 0,
        "inactive_count": inactive_count or 0,
        "total_count": total_count or 0
    }

# ==================== SHOWROOM CONFIG ====================

@router.get("/showroom-config")
async def get_showroom_config(db: AsyncSession = Depends(get_db)):
    config = await services.get_showroom_config(db)
    if not config:
        return {}
    return config

@router.post("/showroom-config")
async def upsert_showroom_config(payload: ShowroomConfigSchema, current_staff=Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    """Creates or updates the global dealership configuration"""
    return await services.upsert_showroom_config(db, payload.model_dump(), current_staff["staff_id"])