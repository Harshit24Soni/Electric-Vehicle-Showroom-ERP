from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from datetime import datetime
from fastapi import HTTPException

from app.domains.finance.models import VehicleFinance
from app.domains.sales.models import Sale


class FinanceError(Exception):
    pass


async def create_finance(
    db: AsyncSession,
    *,
    sale_id: int,
    financer_name: str,
    loan_amount: float,
    down_payment: float,
    financer_contact: str | None = None,
    remarks: str | None = None,
) -> VehicleFinance:

    sale = await db.get(Sale, sale_id)
    if not sale:
        raise FinanceError("Invalid sale")

    finance = VehicleFinance(
        sale_id=sale_id,
        financer_name=financer_name,
        financer_contact=financer_contact,
        loan_amount=loan_amount,
        down_payment=down_payment,
        finance_status="INITIATED",
        remarks=remarks,
    )

    db.add(finance)

    try:
        await db.flush()
    except IntegrityError:
        raise FinanceError("Finance already exists for this sale")

    return finance


async def get_finance(db: AsyncSession, finance_id: int) -> VehicleFinance | None:
    """Get a finance record by ID (excludes soft-deleted)"""
    stmt = select(VehicleFinance).filter(
        VehicleFinance.finance_id == finance_id,
        VehicleFinance.is_deleted == False
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def list_finances(db: AsyncSession) -> list[VehicleFinance]:
    """List all finance records (excludes soft-deleted)"""
    stmt = select(VehicleFinance).filter(
        VehicleFinance.is_deleted == False
    ).order_by(VehicleFinance.finance_id.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


async def update_finance_status(
    db: AsyncSession,
    *,
    finance: VehicleFinance,
    finance_status: str,
    reference_number: str | None = None,
    remarks: str | None = None,
):
    finance.finance_status = finance_status
    finance.reference_number = reference_number
    finance.remarks = remarks
    finance.updated_at = datetime.utcnow()
    await db.flush()


# ==================== DELETE SERVICES ====================

async def delete_finance(
    db: AsyncSession, finance_id: int,
    current_user: dict, hard_delete: bool = False
) -> bool:
    """Delete a finance record (soft by default, hard if authorized)"""
    finance = await get_finance(db, finance_id)
    if not finance:
        return False

    if hard_delete:
        if current_user["designation"] not in ["Admin", "Dealer"]:
            raise HTTPException(status_code=403, detail="Not authorized to permanently delete")
        await db.delete(finance)
    else:
        finance.is_deleted = True
        finance.deleted_at = datetime.utcnow()
        finance.deleted_by = current_user["staff_id"]

    await db.flush()
    return True
