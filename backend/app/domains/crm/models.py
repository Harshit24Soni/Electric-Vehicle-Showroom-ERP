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
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from app.db.base import Base


from app.db.mixins import SoftDeleteMixin

class Enquiry(Base, SoftDeleteMixin):
    """Enquiry tracking for leads - stores initial inquiry information"""
    __tablename__ = "enquiry"
    __table_args__ = (
        CheckConstraint(
            "enquiry_status IN ('ACTIVE','INACTIVE','CONVERTED','LOST')",
            name="chk_enquiry_status",
        ),
        Index("idx_enquiry_created", "created_at"),
        {"schema": "crm"},
    )

    enquiry_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    lead_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("crm.lead.lead_id", ondelete="CASCADE"), nullable=False)
    enquiry_source: Mapped[str] = mapped_column(String(50), nullable=False)
    enquiry_status_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("crm.enquiry_status_master.status_id"), nullable=False)
    owner_staff_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("master.staff.staff_id"), nullable=False)
    created_by_staff_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("master.staff.staff_id"), nullable=False)
    last_followup_date: Mapped[datetime | None] = mapped_column(Date)
    last_message_date: Mapped[datetime | None] = mapped_column(TIMESTAMP)
    remarks: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False)

    # Relationships
    lead = relationship("Lead", back_populates="enquiries")
    enquiry_status = relationship("EnquiryStatusMaster")


class Lead(Base, SoftDeleteMixin):
    """Lead tracking - represents potential customer with interest"""
    __tablename__ = "lead"
    __table_args__ = (
        Index("idx_crm_lead_created", "created_at"),
        Index("idx_crm_lead_status", "lead_status_id"),
        {"schema": "crm"},
    )

    lead_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    customer_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[str] = mapped_column(String(15), nullable=False)
    email: Mapped[str | None] = mapped_column(String(150))
    vehicle_model_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("master.vehicle_model.vehicle_model_id"), nullable=False)
    lead_source: Mapped[str] = mapped_column(String(50), nullable=False)
    lead_status_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("crm.lead_status_master.status_id"), nullable=False)
    owner_staff_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("master.staff.staff_id"), nullable=False)
    created_by_staff_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("master.staff.staff_id"), nullable=False)
    expected_purchase_date: Mapped[datetime | None] = mapped_column(Date)
    remarks: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False)

    # Relationships
    vehicle_model = relationship("app.domains.master.models.VehicleModel", lazy="selectin")
    lead_status = relationship("LeadStatusMaster")
    enquiries = relationship("Enquiry", back_populates="lead", cascade="all, delete-orphan")
    test_rides = relationship("TestRide", back_populates="lead", cascade="all, delete-orphan")

    
class LeadStatusMaster(Base):
    __tablename__ = "lead_status_master"
    __table_args__ = ({"schema": "crm"},)
    status_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    status_name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    display_order: Mapped[int] = mapped_column(BigInteger, default=0)


class EnquiryStatusMaster(Base):
    __tablename__ = "enquiry_status_master"
    __table_args__ = ({"schema": "crm"},)
    status_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    status_name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    display_order: Mapped[int] = mapped_column(BigInteger, default=0)


class FollowupSchedule(Base, SoftDeleteMixin):
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

    # Relationship
    lead = relationship("Lead")


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


class LeadAssignmentHistory(Base):
    __tablename__ = "lead_assignment_history"
    __table_args__ = ({"schema": "crm"},)

    assignment_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    lead_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("crm.lead.lead_id", ondelete="CASCADE"), nullable=False)
    old_staff_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("master.staff.staff_id"), nullable=True)
    new_staff_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("master.staff.staff_id"), nullable=False)
    changed_by_staff_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("master.staff.staff_id"), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)
    remarks: Mapped[str | None] = mapped_column(Text)


class LeadStatusHistory(Base):
    __tablename__ = "lead_status_history"
    __table_args__ = ({"schema": "crm"},)

    status_history_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    lead_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("crm.lead.lead_id", ondelete="CASCADE"), nullable=False)
    old_status: Mapped[str | None] = mapped_column(String(30))
    new_status: Mapped[str] = mapped_column(String(30), nullable=False)
    changed_by_staff_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("master.staff.staff_id"), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)
    remarks: Mapped[str | None] = mapped_column(Text)


class TestRide(Base, SoftDeleteMixin):
    __tablename__ = "test_ride"
    __table_args__ = ({"schema": "crm"},)

    test_ride_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    lead_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("crm.lead.lead_id", ondelete="CASCADE"), nullable=False)
    vehicle_model_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("master.vehicle_model.vehicle_model_id"), nullable=False)
    test_ride_date: Mapped[Date] = mapped_column(Date, nullable=False)
    staff_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("master.staff.staff_id"), nullable=False)
    customer_feedback: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)

    # Relationships
    lead = relationship("Lead", back_populates="test_rides")
    vehicle_model = relationship("app.domains.master.models.VehicleModel", lazy="selectin")
