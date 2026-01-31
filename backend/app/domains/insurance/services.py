from sqlalchemy.orm import Session
from datetime import datetime

from app.domains.insurance import models


class InsuranceError(Exception):
    pass


def create_company(db: Session, payload) -> models.InsuranceCompany:
    c = models.InsuranceCompany(
        company_name=payload.company_name,
        contact_phone=payload.contact_phone,
        contact_email=payload.contact_email,
        is_active=True,
        created_at=datetime.utcnow(),
    )
    db.add(c)
    db.flush()
    return c


def list_companies(db: Session):
    return db.query(models.InsuranceCompany).order_by(models.InsuranceCompany.company_name).all()


def create_policy(db: Session, payload) -> models.Policy:
    if payload.policy_end_date <= payload.policy_start_date:
        raise InsuranceError("policy_end_date must be after policy_start_date")

    # ensure no other active policy for the same chassis exists
    existing = (
        db.query(models.Policy)
        .filter(models.Policy.chassis_no == payload.chassis_no, models.Policy.is_active == True)
        .first()
    )
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
    db.flush()
    return p


def list_policies(db: Session):
    return db.query(models.Policy).order_by(models.Policy.policy_end_date.desc()).all()
