from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from fastapi import HTTPException
from app.domains.service.models import ServiceJobCard
from datetime import datetime
from app.domains.inventory.services import add_spare_movement


class ServiceError(Exception):
    pass


class JobCardAlreadyOpenError(ServiceError):
    pass


class JobCardClosedError(ServiceError):
    pass


async def open_job_card(
    db: AsyncSession,
    *,
    chassis_no: str,
    is_free_service: bool,
    remarks: str | None = None,
) -> ServiceJobCard:
    """Open a new job card (checks for existing open, non-deleted cards)"""
    stmt = (
        select(ServiceJobCard)
        .filter(
            ServiceJobCard.chassis_no == chassis_no,
            ServiceJobCard.closed_at.is_(None),
            ServiceJobCard.is_deleted == False,
        )
    )
    result = await db.execute(stmt)
    existing = result.scalars().first()

    if existing:
        raise JobCardAlreadyOpenError(
            "An open job card already exists for this vehicle"
        )

    job = ServiceJobCard(
        chassis_no=chassis_no,
        is_free_service=is_free_service,
        remarks=remarks,
        opened_at=datetime.utcnow(),
    )
    db.add(job)
    await db.flush()
    return job


async def get_job_card(db: AsyncSession, job_card_id: int) -> ServiceJobCard | None:
    """Get a job card by ID (excludes soft-deleted)"""
    stmt = select(ServiceJobCard).filter(
        ServiceJobCard.job_card_id == job_card_id,
        ServiceJobCard.is_deleted == False
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def list_job_cards(db: AsyncSession) -> list[ServiceJobCard]:
    """List all job cards (excludes soft-deleted)"""
    stmt = select(ServiceJobCard).filter(
        ServiceJobCard.is_deleted == False
    ).order_by(ServiceJobCard.opened_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


async def consume_spare(
    db: AsyncSession,
    *,
    job_card_id: int,
    spare_id: int,
    quantity: int,
    serial_id: int | None = None,
):
    if quantity <= 0:
        raise ServiceError("Quantity must be greater than zero")

    job = await get_job_card(db, job_card_id)
    if not job:
        raise ServiceError("Job card not found")

    if job.closed_at:
        raise JobCardClosedError(
            "Cannot consume spares on a closed job card"
        )

    await add_spare_movement(
        db=db,
        spare_id=spare_id,
        quantity=-quantity,
        serial_id=serial_id,
        movement_type="SERVICE_CONSUMPTION",
        reference_type="SERVICE",
        reference_id=job_card_id,
        remarks="Consumed during service",
    )


async def close_job_card(
    db: AsyncSession,
    job: ServiceJobCard
):
    if job.closed_at:
        raise JobCardClosedError("Job card already closed")

    job.closed_at = datetime.utcnow()
    await db.flush()


# ==================== DELETE SERVICES ====================

async def delete_job_card(
    db: AsyncSession, job_card_id: int,
    current_user: dict, hard_delete: bool = False
) -> bool:
    """Delete a job card (soft by default, hard if authorized)"""
    job = await get_job_card(db, job_card_id)
    if not job:
        return False

    if hard_delete:
        if current_user["designation"] not in ["Admin", "Dealer"]:
            raise HTTPException(status_code=403, detail="Not authorized to permanently delete")
        await db.delete(job)
    else:
        job.is_deleted = True
        job.deleted_at = datetime.utcnow()
        job.deleted_by = current_user["staff_id"]

    await db.flush()
    return True
