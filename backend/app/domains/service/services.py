from sqlalchemy.orm import Session
from app.domains.service.models import ServiceJobCard
from datetime import datetime


def open_job_card(
    db: Session,
    *,
    chassis_no: str,
    is_free_service: bool,
    remarks: str | None = None,
) -> ServiceJobCard:

    job = ServiceJobCard(
        chassis_no=chassis_no,
        is_free_service=is_free_service,
        remarks=remarks,
    )

    db.add(job)
    db.flush()

    return job

from app.domains.inventory.services import add_spare_movement


def consume_spare(
    db: Session,
    *,
    job_card_id: int,
    spare_id: int,
    quantity: int,
    serial_id: int | None = None,
):
    # inventory is authoritative
    add_spare_movement(
        db=db,
        spare_id=spare_id,
        quantity=-quantity,
        serial_id=serial_id,
        movement_type="SERVICE_CONSUMPTION",
        reference_type="SERVICE",
        reference_id=job_card_id,
        remarks="Consumed during service",
    )

def close_job_card(
    job: ServiceJobCard,
):
    job.closed_at = datetime.utcnow()

class ServiceError(Exception):
    pass


class JobCardAlreadyOpenError(ServiceError):
    pass


class JobCardClosedError(ServiceError):
    pass

def open_job_card(
    db,
    *,
    chassis_no: str,
    is_free_service: bool,
    remarks: str | None = None,
):
    existing = (
        db.query(ServiceJobCard)
        .filter(
            ServiceJobCard.chassis_no == chassis_no,
            ServiceJobCard.closed_at.is_(None),
        )
        .first()
    )

    if existing:
        raise JobCardAlreadyOpenError(
            "An open job card already exists for this vehicle"
        )

    job = ServiceJobCard(
        chassis_no=chassis_no,
        is_free_service=is_free_service,
        remarks=remarks,
    )
    db.add(job)
    db.flush()
    return job

def consume_spare(
    db,
    *,
    job_card_id: int,
    spare_id: int,
    quantity: int,
    serial_id: int | None = None,
):
    if quantity <= 0:
        raise ServiceError("Quantity must be greater than zero")

    job = db.get(ServiceJobCard, job_card_id)
    if not job:
        raise ServiceError("Job card not found")

    if job.closed_at:
        raise JobCardClosedError(
            "Cannot consume spares on a closed job card"
        )

    add_spare_movement(
        db=db,
        spare_id=spare_id,
        quantity=-quantity,
        serial_id=serial_id,
        movement_type="SERVICE_CONSUMPTION",
        reference_type="SERVICE",
        reference_id=job_card_id,
        remarks="Consumed during service",
    )

def close_job_card(job: ServiceJobCard):
    if job.closed_at:
        raise JobCardClosedError("Job card already closed")

    job.closed_at = datetime.utcnow()
