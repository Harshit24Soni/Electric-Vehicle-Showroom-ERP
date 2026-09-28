from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.domains.master import models

# ==================== GENERIC HELPERS ====================

async def _list_all(db: AsyncSession, model_class):
    """List all records from a table, ordered by created_at desc."""
    stmt = select(model_class).order_by(model_class.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

async def _get_by_id(db: AsyncSession, model_class, id_value: int):
    """Get a single record by its primary key."""
    return await db.get(model_class, id_value)

# ==================== BRAND ====================

async def list_brands(db: AsyncSession):
    return await _list_all(db, models.Brand)

async def create_brand(db: AsyncSession, data: dict, staff_id: int):
    stmt = select(models.Brand).where(models.Brand.brand_name.ilike(data["brand_name"]))
    result = await db.execute(stmt)
    existing = result.scalars().first()

    if existing:
        if existing.deleted_at:
            existing.is_deleted = False
            existing.deleted_at = None
            await db.commit()
            await db.refresh(existing)
            return existing
        else:
            raise ValueError("Brand already exists")

    brand = models.Brand(
        brand_name=data["brand_name"],
        created_by=staff_id
    )
    db.add(brand)
    await db.commit()
    await db.refresh(brand)
    return brand

async def update_brand(db: AsyncSession, brand_id: int, data: dict, staff_id: int):
    brand = await _get_by_id(db, models.Brand, brand_id)
    if not brand:
        return None
    brand.brand_name = data["brand_name"]
    brand.updated_at = datetime.utcnow()
    brand.updated_by = staff_id
    await db.commit()
    await db.refresh(brand)
    return brand

async def delete_brand(db: AsyncSession, brand_id: int, staff_id: int):
    brand = await _get_by_id(db, models.Brand, brand_id)
    if brand:
        brand.is_deleted = True
        brand.deleted_at = datetime.utcnow()
        brand.is_active = False
        brand.deleted_by = staff_id
        await db.commit()

async def restore_brand(db: AsyncSession, brand_id: int):
    brand = await _get_by_id(db, models.Brand, brand_id)
    if brand:
        brand.is_deleted = False
        brand.is_active = True
        brand.deleted_at = None
        brand.deleted_by = None
        await db.commit()

# ==================== PAYMENT MODE ====================

async def list_payment_modes(db: AsyncSession):
    return await _list_all(db, models.PaymentMode)

async def create_payment_mode(db: AsyncSession, data: dict, staff_id: int):
    pm = models.PaymentMode(
        mode_name=data["mode_name"],
        description=data.get("description"),
        created_by=staff_id
    )
    db.add(pm)
    await db.commit()
    await db.refresh(pm)
    return pm

async def update_payment_mode(db: AsyncSession, payment_mode_id: int, data: dict, staff_id: int):
    pm = await _get_by_id(db, models.PaymentMode, payment_mode_id)
    if not pm:
        return None
    for field in ["mode_name", "description", "is_active"]:
        if field in data and data[field] is not None:
            setattr(pm, field, data[field])
    pm.updated_at = datetime.utcnow()
    pm.updated_by = staff_id
    await db.commit()
    await db.refresh(pm)
    return pm

async def delete_payment_mode(db: AsyncSession, payment_mode_id: int, staff_id: int):
    pm = await _get_by_id(db, models.PaymentMode, payment_mode_id)
    if pm:
        # Assuming soft delete if applicable, else handle normally. PaymentMode inherits AuditMixin but maybe not SoftDelete.
        # Original code just sets is_deleted and is_active. Let's do the same.
        if hasattr(pm, 'is_deleted'):
            pm.is_deleted = True
            pm.deleted_at = datetime.utcnow()
            pm.deleted_by = staff_id
        pm.is_active = False
        await db.commit()

async def restore_payment_mode(db: AsyncSession, payment_mode_id: int):
    pm = await _get_by_id(db, models.PaymentMode, payment_mode_id)
    if pm:
        if hasattr(pm, 'is_deleted'):
            pm.is_deleted = False
            pm.deleted_at = None
            pm.deleted_by = None
        pm.is_active = True
        await db.commit()

# ==================== EXPENSE CATEGORY ====================

async def list_expense_categories(db: AsyncSession):
    return await _list_all(db, models.ExpenseCategory)

async def create_expense_category(db: AsyncSession, data: dict, staff_id: int):
    ec = models.ExpenseCategory(
        category_name=data["category_name"],
        description=data.get("description"),
        created_by=staff_id
    )
    db.add(ec)
    await db.commit()
    await db.refresh(ec)
    return ec

async def update_expense_category(db: AsyncSession, expense_category_id: int, data: dict, staff_id: int):
    ec = await _get_by_id(db, models.ExpenseCategory, expense_category_id)
    if not ec:
        return None
    for field in ["category_name", "description", "is_active"]:
        if field in data and data[field] is not None:
            setattr(ec, field, data[field])
    ec.updated_at = datetime.utcnow()
    ec.updated_by = staff_id
    await db.commit()
    await db.refresh(ec)
    return ec

async def delete_expense_category(db: AsyncSession, expense_category_id: int, staff_id: int):
    ec = await _get_by_id(db, models.ExpenseCategory, expense_category_id)
    if ec:
        if hasattr(ec, 'is_deleted'):
            ec.is_deleted = True
            ec.deleted_at = datetime.utcnow()
            ec.deleted_by = staff_id
        ec.is_active = False
        await db.commit()

async def restore_expense_category(db: AsyncSession, expense_category_id: int):
    ec = await _get_by_id(db, models.ExpenseCategory, expense_category_id)
    if ec:
        if hasattr(ec, 'is_deleted'):
            ec.is_deleted = False
            ec.deleted_at = None
            ec.deleted_by = None
        ec.is_active = True
        await db.commit()

# ==================== JOB CARD CATEGORY ====================

async def list_job_card_categories(db: AsyncSession):
    return await _list_all(db, models.JobCardCategory)

async def create_job_card_category(db: AsyncSession, data: dict, staff_id: int):
    jcc = models.JobCardCategory(
        category_name=data["category_name"],
        description=data.get("description"),
        created_by=staff_id
    )
    db.add(jcc)
    await db.commit()
    await db.refresh(jcc)
    return jcc

async def update_job_card_category(db: AsyncSession, job_card_category_id: int, data: dict, staff_id: int):
    jcc = await _get_by_id(db, models.JobCardCategory, job_card_category_id)
    if not jcc:
        return None
    for field in ["category_name", "description", "is_active"]:
        if field in data and data[field] is not None:
            setattr(jcc, field, data[field])
    jcc.updated_at = datetime.utcnow()
    jcc.updated_by = staff_id
    await db.commit()
    await db.refresh(jcc)
    return jcc

async def delete_job_card_category(db: AsyncSession, job_card_category_id: int, staff_id: int):
    jcc = await _get_by_id(db, models.JobCardCategory, job_card_category_id)
    if jcc:
        if hasattr(jcc, 'is_deleted'):
            jcc.is_deleted = True
            jcc.deleted_at = datetime.utcnow()
            jcc.deleted_by = staff_id
        jcc.is_active = False
        await db.commit()

async def restore_job_card_category(db: AsyncSession, job_card_category_id: int):
    jcc = await _get_by_id(db, models.JobCardCategory, job_card_category_id)
    if jcc:
        if hasattr(jcc, 'is_deleted'):
            jcc.is_deleted = False
            jcc.deleted_at = None
            jcc.deleted_by = None
        jcc.is_active = True
        await db.commit()

# ==================== INSURANCE COMPANY ====================

async def list_insurance_companies(db: AsyncSession):
    return await _list_all(db, models.InsuranceCompany)

async def create_insurance_company(db: AsyncSession, data: dict, staff_id: int):
    ic = models.InsuranceCompany(
        company_name=data["company_name"],
        contact_person=data.get("contact_person"),
        contact_number=data.get("contact_number"),
        email=data.get("email"),
        address=data.get("address"),
        gstin=data.get("gstin"),
        created_by=staff_id
    )
    db.add(ic)
    await db.commit()
    await db.refresh(ic)
    return ic

async def update_insurance_company(db: AsyncSession, insurance_company_id: int, data: dict, staff_id: int):
    ic = await _get_by_id(db, models.InsuranceCompany, insurance_company_id)
    if not ic:
        return None
    for field in ["company_name", "contact_person", "contact_number", "email", "address", "gstin", "is_active"]:
        if field in data and data[field] is not None:
            setattr(ic, field, data[field])
    ic.updated_at = datetime.utcnow()
    ic.updated_by = staff_id
    await db.commit()
    await db.refresh(ic)
    return ic

async def delete_insurance_company(db: AsyncSession, insurance_company_id: int, staff_id: int):
    ic = await _get_by_id(db, models.InsuranceCompany, insurance_company_id)
    if ic:
        if hasattr(ic, 'is_deleted'):
            ic.is_deleted = True
            ic.deleted_at = datetime.utcnow()
            ic.deleted_by = staff_id
        ic.is_active = False
        await db.commit()

async def restore_insurance_company(db: AsyncSession, insurance_company_id: int):
    ic = await _get_by_id(db, models.InsuranceCompany, insurance_company_id)
    if ic:
        if hasattr(ic, 'is_deleted'):
            ic.is_deleted = False
            ic.deleted_at = None
            ic.deleted_by = None
        ic.is_active = True
        await db.commit()

# ==================== BANK ====================

async def list_banks(db: AsyncSession):
    return await _list_all(db, models.Bank)

async def create_bank(db: AsyncSession, data: dict, staff_id: int):
    bank = models.Bank(
        bank_name=data["bank_name"],
        branch=data.get("branch"),
        ifsc_code=data["ifsc_code"],
        address=data.get("address"),
        contact_number=data.get("contact_number"),
        created_by=staff_id
    )
    db.add(bank)
    await db.commit()
    await db.refresh(bank)
    return bank

async def update_bank(db: AsyncSession, bank_id: int, data: dict, staff_id: int):
    bank = await _get_by_id(db, models.Bank, bank_id)
    if not bank:
        return None
    for field in ["bank_name", "branch", "ifsc_code", "address", "contact_number", "is_active"]:
        if field in data and data[field] is not None:
            setattr(bank, field, data[field])
    bank.updated_at = datetime.utcnow()
    bank.updated_by = staff_id
    await db.commit()
    await db.refresh(bank)
    return bank

async def delete_bank(db: AsyncSession, bank_id: int, staff_id: int):
    bank = await _get_by_id(db, models.Bank, bank_id)
    if bank:
        if hasattr(bank, 'is_deleted'):
            bank.is_deleted = True
            bank.deleted_at = datetime.utcnow()
            bank.deleted_by = staff_id
        bank.is_active = False
        await db.commit()

async def restore_bank(db: AsyncSession, bank_id: int):
    bank = await _get_by_id(db, models.Bank, bank_id)
    if bank:
        if hasattr(bank, 'is_deleted'):
            bank.is_deleted = False
            bank.deleted_at = None
            bank.deleted_by = None
        bank.is_active = True
        await db.commit()

# ==================== DOCUMENT TYPE ====================

async def list_document_types(db: AsyncSession):
    return await _list_all(db, models.DocumentType)

async def create_document_type(db: AsyncSession, data: dict, staff_id: int):
    dt = models.DocumentType(
        type_name=data["type_name"],
        description=data.get("description"),
        applicable_to=data.get("applicable_to"),
        is_mandatory=data.get("is_mandatory", False),
        created_by=staff_id
    )
    db.add(dt)
    await db.commit()
    await db.refresh(dt)
    return dt

async def update_document_type(db: AsyncSession, document_type_id: int, data: dict, staff_id: int):
    dt = await _get_by_id(db, models.DocumentType, document_type_id)
    if not dt:
        return None
    for field in ["type_name", "description", "applicable_to", "is_mandatory", "is_active"]:
        if field in data and data[field] is not None:
            setattr(dt, field, data[field])
    dt.updated_at = datetime.utcnow()
    dt.updated_by = staff_id
    await db.commit()
    await db.refresh(dt)
    return dt

async def delete_document_type(db: AsyncSession, document_type_id: int, staff_id: int):
    dt = await _get_by_id(db, models.DocumentType, document_type_id)
    if dt:
        if hasattr(dt, 'is_deleted'):
            dt.is_deleted = True
            dt.deleted_at = datetime.utcnow()
            dt.deleted_by = staff_id
        dt.is_active = False
        await db.commit()

async def restore_document_type(db: AsyncSession, document_type_id: int):
    dt = await _get_by_id(db, models.DocumentType, document_type_id)
    if dt:
        if hasattr(dt, 'is_deleted'):
            dt.is_deleted = False
            dt.deleted_at = None
            dt.deleted_by = None
        dt.is_active = True
        await db.commit()

# ==================== SHOWROOM CONFIG ====================

async def get_showroom_config(db: AsyncSession):
    """Fetch the single showroom configuration record."""
    stmt = select(models.ShowroomConfig).limit(1)
    result = await db.execute(stmt)
    return result.scalars().first()

async def upsert_showroom_config(db: AsyncSession, data: dict, staff_id: int):
    """Insert or Update the single showroom config record."""
    config = await get_showroom_config(db)
    if config:
        for k, v in data.items():
            setattr(config, k, v)
        config.updated_at = datetime.utcnow()
        config.updated_by = staff_id
    else:
        config = models.ShowroomConfig(**data, created_by=staff_id)
        db.add(config)
    await db.commit()
    await db.refresh(config)
    return config