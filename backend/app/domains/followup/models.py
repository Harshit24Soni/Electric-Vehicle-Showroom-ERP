from sqlalchemy import (
    BigInteger,
    Integer,
    String,
    Text,
    Date,
    TIMESTAMP,
    ForeignKey,
    Boolean,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from app.db.base import Base
from app.db.mixins import AuditMixin, SoftDeleteMixin


class ServiceFollowup(Base, AuditMixin, SoftDeleteMixin):
    """Tracks service follow-ups linked to job cards"""
    __tablename__ = "service_followup"
    __table_args__ = ({"schema": "service"},)

    service_followup_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    job_card_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("service.job_card.job_card_id", ondelete="CASCADE"),
        nullable=False,
    )
    service_type: Mapped[str] = mapped_column(String(50), nullable=False)
    next_service_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    km_at_service: Mapped[int | None] = mapped_column(Integer, nullable=True)
    next_service_km: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_date: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)


class InsuranceFollowup(Base, AuditMixin, SoftDeleteMixin):
    """Tracks insurance renewal follow-ups"""
    __tablename__ = "insurance_followup"
    __table_args__ = ({"schema": "insurance"},)

    insurance_followup_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    policy_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("insurance.policy.policy_id", ondelete="CASCADE"),
        nullable=False,
    )
    renewal_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    reminder_days_before: Mapped[int] = mapped_column(Integer, default=30)
    is_renewed: Mapped[bool] = mapped_column(Boolean, default=False)
    renewed_date: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
