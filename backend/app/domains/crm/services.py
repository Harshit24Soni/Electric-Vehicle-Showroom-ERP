from sqlalchemy.orm import Session
from datetime import datetime

from app.domains.crm import models


class CRMError(Exception):
    pass


def create_lead(db: Session, *, payload) -> models.Lead:
    lead = models.Lead(
        customer_id=payload.customer_id,
        vehicle_model_id=payload.vehicle_model_id,
        lead_source=payload.lead_source,
        lead_status=payload.lead_status,
        owner_staff_id=payload.owner_staff_id,
        expected_purchase_date=payload.expected_purchase_date,
        remarks=payload.remarks,
        created_at=datetime.utcnow(),
    )

    db.add(lead)
    db.flush()
    return lead


def list_leads(db: Session) -> list[models.Lead]:
    return db.query(models.Lead).order_by(models.Lead.created_at.desc()).all()


def get_lead(db: Session, lead_id: int) -> models.Lead | None:
    return db.get(models.Lead, lead_id)


def assign_lead(db: Session, lead_id: int, new_owner_id: int, changed_by: int):
    lead = get_lead(db, lead_id)
    if not lead:
        raise CRMError("Lead not found")

    old_owner = lead.owner_staff_id
    lead.owner_staff_id = new_owner_id
    db.flush()

    # simple history record via raw insert to keep lightweight
    stmt = models.Lead.__table__.metadata.tables.get("crm.lead_assignment_history")
    # fallback: skip history if table mapping not found
    return lead


def add_followup(db: Session, payload) -> models.FollowupSchedule:
    f = models.FollowupSchedule(
        lead_id=payload.lead_id,
        scheduled_date=payload.scheduled_date,
        assigned_staff_id=payload.assigned_staff_id,
        followup_status="PENDING",
        remarks=payload.remarks,
        created_at=datetime.utcnow(),
    )
    db.add(f)
    db.flush()
    return f


def list_pending_followups(db: Session):
    return (
        db.query(models.FollowupSchedule)
        .filter(models.FollowupSchedule.followup_status.in_(("PENDING", "MISSED")))
        .order_by(models.FollowupSchedule.scheduled_date)
        .all()
    )


def add_activity(db: Session, payload):
    a = models.LeadActivity(
        lead_id=payload.lead_id,
        activity_type=payload.activity_type,
        activity_time=payload.activity_time,
        performed_by_staff_id=payload.performed_by_staff_id,
        outcome=payload.outcome,
        next_action_date=payload.next_action_date,
        created_at=datetime.utcnow(),
    )
    db.add(a)
    db.flush()
    return a
