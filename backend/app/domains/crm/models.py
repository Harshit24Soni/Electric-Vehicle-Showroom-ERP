from sqlalchemy import (
    BigInteger,
    String,
    Text,
    Date,
    TIMESTAMP,
    ForeignKey,
    CheckConstraint,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime

from app.db.base import Base


class Lead(Base):
    __tablename__ = "lead"
    __table_args__ = (
        CheckConstraint(
            "lead_status IN ('NEW','HOT','WARM','COLD','CONVERTED','LOST','DROPPED')",
            name="chk_lead_status",
        ),
        Index("idx_crm_lead_created", "created_at"),
        {"schema": "crm"},
    )

    lead_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    customer_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    vehicle_model_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    lead_source: Mapped[str] = mapped_column(String(50), nullable=False)
    lead_status: Mapped[str] = mapped_column(String(30), nullable=False)
    owner_staff_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    expected_purchase_date: Mapped[datetime | None] = mapped_column(Date)
    remarks: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False)


class FollowupSchedule(Base):
    __tablename__ = "followup_schedule"
    __table_args__ = (
        Index("idx_followup_schedule_date", "scheduled_date"),
        {"schema": "crm"},
    )

    followup_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    lead_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("crm.lead.lead_id", ondelete="CASCADE"), nullable=False)
    scheduled_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    assigned_staff_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    followup_status: Mapped[str] = mapped_column(String(30), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP)
    remarks: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False)


class LeadActivity(Base):
    __tablename__ = "lead_activity"
    __table_args__ = ({"schema": "crm"},)

    activity_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    lead_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("crm.lead.lead_id", ondelete="CASCADE"), nullable=False)
    activity_type: Mapped[str] = mapped_column(String(30), nullable=False)
    activity_time: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False)
    performed_by_staff_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    outcome: Mapped[str | None] = mapped_column(Text)
    next_action_date: Mapped[datetime | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False)
