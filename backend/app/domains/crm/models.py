import enum
from datetime import datetime, date, timedelta

from sqlalchemy import (
    BigInteger,
    String,
    Text,
    Date,
    Integer,
    TIMESTAMP,
    ForeignKey,
    CheckConstraint,
    Boolean,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


from app.db.mixins import AuditMixin, SoftDeleteMixin

class Enquiry(Base, AuditMixin, SoftDeleteMixin):
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


    # Relationships
    lead = relationship("Lead", back_populates="enquiries")
    enquiry_status = relationship("EnquiryStatusMaster")


class LeadStatusEnum(str, enum.Enum):
    """Lead temperature / status classification"""
    HOT = "HOT"
    WARM = "WARM"
    COLD = "COLD"
    LOST = "LOST"
    SOLD = "SOLD"


class Lead(Base, AuditMixin, SoftDeleteMixin):
    """Lead tracking - represents potential customer with interest"""
    __tablename__ = "lead"
    __table_args__ = {'schema': 'crm'}

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


    # --- NEW workflow columns ---
    expected_purchase_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    next_followup_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    lead_status: Mapped[str | None] = mapped_column(String(20), nullable=True, default="WARM")
    visit_date: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
    is_converted: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    converted_sale_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    # Relationships
    vehicle_model = relationship("app.domains.master.models.VehicleModel", lazy="selectin")
    lead_status_ref = relationship("LeadStatusMaster")
    enquiries = relationship("Enquiry", back_populates="lead", cascade="all, delete-orphan")
    test_rides = relationship("TestRide", back_populates="lead", cascade="all, delete-orphan")
    lead_followups = relationship("LeadFollowup", back_populates="lead", cascade="all, delete-orphan", order_by="LeadFollowup.followup_date.desc()")

    def calculate_next_followup(self) -> date | None:
        """Calculate next followup date based on lead temperature."""
        days_map = {
            LeadStatusEnum.HOT: 1,
            LeadStatusEnum.WARM: 3,
            LeadStatusEnum.COLD: 7,
        }
        status = self.lead_status
        if status in days_map:
            self.next_followup_date = date.today() + timedelta(days=days_map[status])
        elif status in (LeadStatusEnum.LOST, LeadStatusEnum.SOLD):
            self.next_followup_date = None
        return self.next_followup_date

    @property
    def is_overdue(self) -> bool:
        """Check if lead followup is overdue."""
        if self.next_followup_date is None:
            return False
        return date.today() > self.next_followup_date


    
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


class FollowupSchedule(Base, AuditMixin, SoftDeleteMixin):
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


    # Relationship
    lead = relationship("Lead")


class LeadActivity(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "lead_activity"
    __table_args__ = ({"schema": "crm"},)

    activity_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    lead_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("crm.lead.lead_id", ondelete="CASCADE"), nullable=False)
    activity_type: Mapped[str] = mapped_column(String(30), nullable=False)
    activity_time: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False)
    performed_by_staff_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    outcome: Mapped[str | None] = mapped_column(Text)
    next_action_date: Mapped[datetime | None] = mapped_column(Date)



class LeadAssignmentHistory(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "lead_assignment_history"
    __table_args__ = ({"schema": "crm"},)

    assignment_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    lead_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("crm.lead.lead_id", ondelete="CASCADE"), nullable=False)
    old_staff_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("master.staff.staff_id"), nullable=True)
    new_staff_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("master.staff.staff_id"), nullable=False)
    changed_by_staff_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("master.staff.staff_id"), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)
    remarks: Mapped[str | None] = mapped_column(Text)


class LeadStatusHistory(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "lead_status_history"
    __table_args__ = ({"schema": "crm"},)

    status_history_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    lead_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("crm.lead.lead_id", ondelete="CASCADE"), nullable=False)
    old_status: Mapped[str | None] = mapped_column(String(30))
    new_status: Mapped[str] = mapped_column(String(30), nullable=False)
    changed_by_staff_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("master.staff.staff_id"), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)
    remarks: Mapped[str | None] = mapped_column(Text)


class TestRide(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "test_ride"
    __table_args__ = ({"schema": "crm"},)

    test_ride_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    lead_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("crm.lead.lead_id", ondelete="CASCADE"), nullable=False)
    vehicle_model_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("master.vehicle_model.vehicle_model_id"), nullable=False)
    chassis_no: Mapped[str] = mapped_column(String(50), ForeignKey("master.vehicle.chassis_no"), nullable=False)
    test_ride_date: Mapped[Date] = mapped_column(Date, nullable=False)
    staff_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("master.staff.staff_id"), nullable=False)
    customer_feedback: Mapped[str | None] = mapped_column(Text)


    # Relationships
    lead = relationship("Lead", back_populates="test_rides")
    vehicle_model = relationship("app.domains.master.models.VehicleModel", lazy="selectin")
    vehicle = relationship("app.domains.master.models.Vehicle", lazy="selectin")


class LeadFollowup(Base, AuditMixin, SoftDeleteMixin):
    """Lead followup log with mandatory remarks (min 10 chars)"""
    __tablename__ = "lead_followup"
    __table_args__ = ({"schema": "crm"},)

    lead_followup_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    lead_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("crm.lead.lead_id", ondelete="CASCADE"),
        nullable=False,
    )
    followup_date: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, default=datetime.utcnow)
    remarks: Mapped[str] = mapped_column(Text, nullable=False)
    outcome_status: Mapped[str] = mapped_column(String(20), nullable=False)
    next_followup_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    staff_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("master.staff.staff_id"),
        nullable=False,
    )


    # Relationships
    lead = relationship("Lead", back_populates="lead_followups")
