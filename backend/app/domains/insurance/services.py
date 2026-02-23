from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime
from fastapi import HTTPException

from app.domains.insurance import models


class InsuranceError(Exception):
    pass


async def create_company(db: AsyncSession, payload) -> models.InsuranceCompany:
    """Create a new insurance company"""
    c = models.InsuranceCompany(
        company_name=payload.company_name,
        contact_phone=payload.contact_phone,
        contact_email=payload.contact_email,
        is_active=True,
        created_at=datetime.utcnow(),
    )
    db.add(c)
    await db.flush()
    return c


async def get_company(db: AsyncSession, company_id: int) -> models.InsuranceCompany | None:
    """Get an insurance company by ID (excludes soft-deleted)"""
    stmt = select(models.InsuranceCompany).filter(
        models.InsuranceCompany.insurance_company_id == company_id,
        models.InsuranceCompany.is_deleted == False
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def list_companies(db: AsyncSession) -> list[models.InsuranceCompany]:
    """List all insurance companies (excludes soft-deleted)"""
    stmt = select(models.InsuranceCompany).filter(
        models.InsuranceCompany.is_deleted == False
    ).order_by(models.InsuranceCompany.company_name)
    result = await db.execute(stmt)
    return result.scalars().all()


async def create_policy(db: AsyncSession, payload) -> models.Policy:
    """Create a new insurance policy"""
    if payload.policy_end_date <= payload.policy_start_date:
        raise InsuranceError("policy_end_date must be after policy_start_date")

    # ensure no other active policy for the same chassis exists
    existing_stmt = select(models.Policy).filter(
        models.Policy.chassis_no == payload.chassis_no,
        models.Policy.is_active == True,
        models.Policy.is_deleted == False
    )
    result = await db.execute(existing_stmt)
    existing = result.scalars().first()
    if existing:
        # we still allow creating but mark old as inactive
        existing.is_active = False

    p = models.Policy(
        vehicle_sale_id=payload.vehicle_sale_id,
        chassis_no=payload.chassis_no,
        insurance_company_id=payload.insurance_company_id,
        policy_number=payload.policy_number,
        policy_start_date=payload.policy_start_date,
        policy_end_date=payload.policy_end_date,
        premium_amount=payload.premium_amount,
        is_active=True,
        created_at=datetime.utcnow(),
    )
    db.add(p)
    await db.flush()
    return p


async def get_policy(db: AsyncSession, policy_id: int) -> models.Policy | None:
    """Get a policy by ID (excludes soft-deleted)"""
    stmt = select(models.Policy).filter(
        models.Policy.policy_id == policy_id,
        models.Policy.is_deleted == False
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def list_policies(db: AsyncSession) -> list[models.Policy]:
    """List all policies (excludes soft-deleted)"""
    stmt = select(models.Policy).filter(
        models.Policy.is_deleted == False
    ).order_by(models.Policy.policy_end_date.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


# ==================== DELETE SERVICES ====================

async def delete_company(
    db: AsyncSession, company_id: int,
    current_user: dict, hard_delete: bool = False
) -> bool:
    """Delete an insurance company (soft by default, hard if authorized)"""
    company = await get_company(db, company_id)
    if not company:
        return False

    if hard_delete:
        if current_user["designation"] not in ["Admin", "Dealer"]:
            raise HTTPException(status_code=403, detail="Not authorized to permanently delete")
        await db.delete(company)
    else:
        company.is_deleted = True
        company.deleted_at = datetime.utcnow()
        company.deleted_by = current_user["staff_id"]
        company.is_active = False

    await db.flush()
    return True


async def delete_policy(
    db: AsyncSession, policy_id: int,
    current_user: dict, hard_delete: bool = False
) -> bool:
    """Delete an insurance policy (soft by default, hard if authorized)"""
    policy = await get_policy(db, policy_id)
    if not policy:
        return False

    if hard_delete:
        if current_user["designation"] not in ["Admin", "Dealer"]:
            raise HTTPException(status_code=403, detail="Not authorized to permanently delete")
        await db.delete(policy)
    else:
        policy.is_deleted = True
        policy.deleted_at = datetime.utcnow()
        policy.deleted_by = current_user["staff_id"]
        policy.is_active = False

    await db.flush()
    return True
