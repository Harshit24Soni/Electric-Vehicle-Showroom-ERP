from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
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
    stmt = (
        select(ServiceJobCard)
        .filter(
            ServiceJobCard.chassis_no == chassis_no,
            ServiceJobCard.closed_at.is_(None),
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

    job = await db.get(ServiceJobCard, job_card_id)
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
