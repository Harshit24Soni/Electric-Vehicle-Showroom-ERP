import enum
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Integer,
    String,
    Text,
    Date,
    TIMESTAMP,
    Numeric,
    ForeignKey,
    CheckConstraint,
    Boolean,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import SoftDeleteMixin


class SaleStage(str, enum.Enum):
    """10-stage sale lifecycle"""
    ENQUIRY = "ENQUIRY"
    QUOTATION = "QUOTATION"
    NEGOTIATION = "NEGOTIATION"
    BOOKING = "BOOKING"
    DOCUMENTATION = "DOCUMENTATION"
    PAYMENT = "PAYMENT"
    INVOICE = "INVOICE"
    PORTAL_WORK = "PORTAL_WORK"
    DELIVERY = "DELIVERY"
    COMPLETED = "COMPLETED"

class Sale(Base, SoftDeleteMixin):
    __tablename__ = "sale"
    __table_args__ = (
        Index("idx_sale_customer", "customer_id"),
        Index("idx_sale_lead", "lead_id"),
        {"schema": "sales"},
    )

    sale_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    lead_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("crm.lead.lead_id"), nullable=True, unique=True)
    customer_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("master.customer.customer_id"), nullable=False)
    # Linking to specific vehicle (inventory item)
    chassis_no: Mapped[str] = mapped_column(String(50), ForeignKey("master.vehicle.chassis_no"), nullable=False, unique=True)
    
    sale_date: Mapped[datetime] = mapped_column(Date, nullable=False, default=datetime.utcnow)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    sale_status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING") # PENDING, INVOICED, DELIVERED, CANCELLED
    
    invoice_number: Mapped[str | None] = mapped_column(String(50), unique=True)
    pay_receipt_number: Mapped[str | None] = mapped_column(String(50)) # If single receipt per sale, but we have multiple receipts table
    delivery_challan_number: Mapped[str | None] = mapped_column(String(50), unique=True)
    
    # Document Generation Flags
    is_invoice_generated: Mapped[bool] = mapped_column(Boolean, default=False)
    is_receipt_generated: Mapped[bool] = mapped_column(Boolean, default=False) # At least one receipt?
    is_challan_generated: Mapped[bool] = mapped_column(Boolean, default=False)
    is_insurance_generated: Mapped[bool] = mapped_column(Boolean, default=False)
    is_service_schedule_generated: Mapped[bool] = mapped_column(Boolean, default=False)
    
    remarks: Mapped[str | None] = mapped_column(Text)
    created_by_staff_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("master.staff.staff_id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)

    # --- NEW workflow columns ---
    sale_stage: Mapped[str | None] = mapped_column(String(50), nullable=True, default=SaleStage.ENQUIRY)
    stage_updated_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
    is_direct_sale: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)

    # Relationships
    lead = relationship("app.domains.crm.models.Lead")
    customer = relationship("app.domains.master.models.Customer")
    vehicle = relationship("app.domains.master.models.Vehicle")
    receipts = relationship("PaymentReceipt", back_populates="sale")
    delivery_checklist = relationship("DeliveryChecklist", uselist=False, back_populates="sale")
    service_schedules = relationship("ServiceSchedule", back_populates="sale", cascade="all, delete-orphan")
    stage_history = relationship("SaleStageHistory", back_populates="sale", cascade="all, delete-orphan", order_by="SaleStageHistory.created_at.desc()")
    sale_payments = relationship("SalePayment", back_populates="sale", cascade="all, delete-orphan")
    sale_documents = relationship("SaleDocument", back_populates="sale", cascade="all, delete-orphan")
    portal_tracking = relationship("SalePortalTracking", uselist=False, back_populates="sale")

    # --- Stage progression helpers ---
    _STAGE_ORDER = list(SaleStage)

    def advance_stage(self, to_stage: str) -> bool:
        """Advance the sale to a new stage. Returns True if stage changed."""
        try:
            to_enum = SaleStage(to_stage)
        except ValueError:
            return False
        current_idx = self._STAGE_ORDER.index(SaleStage(self.sale_stage)) if self.sale_stage else -1
        new_idx = self._STAGE_ORDER.index(to_enum)
        if new_idx > current_idx:
            self.sale_stage = to_enum.value
            self.stage_updated_at = datetime.utcnow()
            return True
        return False

    @property
    def completion_percentage(self) -> int:
        """Return 0-100 based on current stage."""
        if not self.sale_stage:
            return 0
        try:
            idx = self._STAGE_ORDER.index(SaleStage(self.sale_stage))
        except ValueError:
            return 0
        return int(((idx + 1) / len(self._STAGE_ORDER)) * 100)


class PaymentReceipt(Base, SoftDeleteMixin):
    __tablename__ = "payment_receipt"
    __table_args__ = ({"schema": "sales"},)

    receipt_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    sale_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("sales.sale.sale_id"), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    payment_mode: Mapped[str] = mapped_column(String(20), nullable=False) # CASH, UPI, CARD, CHEQUE, FINANCE
    transaction_ref: Mapped[str | None] = mapped_column(String(100))
    receipt_date: Mapped[datetime] = mapped_column(Date, default=datetime.utcnow)
    
    created_by_staff_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("master.staff.staff_id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)

    sale = relationship("Sale", back_populates="receipts")


class DeliveryChecklist(Base):
    __tablename__ = "delivery_checklist"
    __table_args__ = ({"schema": "sales"},)

    checklist_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    sale_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("sales.sale.sale_id"), nullable=False, unique=True)
    
    insurance_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    insurance_details: Mapped[str | None] = mapped_column(Text)
    
    subsidy_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    subsidy_details: Mapped[str | None] = mapped_column(Text)
    
    rto_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    rto_details: Mapped[str | None] = mapped_column(Text)
    
    celex_plate_ordered: Mapped[bool] = mapped_column(Boolean, default=False)
    celex_subsidy_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    celex_details: Mapped[str | None] = mapped_column(Text)
    
    plate_fixation_date: Mapped[datetime | None] = mapped_column(Date)
    
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)

    sale = relationship("Sale", back_populates="delivery_checklist")


class ServiceSchedule(Base):
    __tablename__ = "service_schedule"
    __table_args__ = ({"schema": "sales"},)

    schedule_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    sale_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("sales.sale.sale_id"), nullable=False)
    
    service_number: Mapped[int] = mapped_column(nullable=False) # 1, 2, 3...
    service_type: Mapped[str] = mapped_column(String(20), nullable=False) # FREE, PAID
    due_date: Mapped[Date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PENDING") # PENDING, COMPLETED, SKIPPED
    
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)
    
    sale = relationship("Sale", back_populates="service_schedules")


class SaleStageHistory(Base):
    """Audit trail for sale stage transitions"""
    __tablename__ = "sale_stage_history"
    __table_args__ = ({"schema": "sales"},)

    stage_history_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    sale_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("sales.sale.sale_id", ondelete="CASCADE"),
        nullable=False,
    )
    from_stage: Mapped[str | None] = mapped_column(String(50), nullable=True)
    to_stage: Mapped[str] = mapped_column(String(50), nullable=False)
    changed_by_staff_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("master.staff.staff_id"),
        nullable=False,
    )
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)

    sale = relationship("Sale", back_populates="stage_history")


class SalePayment(Base):
    """Payment tracking for sales with type and mode"""
    __tablename__ = "sale_payment"
    __table_args__ = ({"schema": "sales"},)

    sale_payment_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    sale_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("sales.sale.sale_id", ondelete="CASCADE"),
        nullable=False,
    )
    payment_type: Mapped[str] = mapped_column(String(20), nullable=False)  # BOOKING, PARTIAL, FINAL
    payment_mode: Mapped[str] = mapped_column(String(20), nullable=False)  # CASH, UPI, CARD, CHEQUE, FINANCE
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    reference_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    payment_date: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, default=datetime.utcnow)
    bank_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_staff_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("master.staff.staff_id"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)

    sale = relationship("Sale", back_populates="sale_payments")


class SaleDocument(Base):
    """Generated documents for a sale (invoice, challan, receipt, etc.)"""
    __tablename__ = "sale_document"
    __table_args__ = ({"schema": "sales"},)

    sale_document_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    sale_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("sales.sale.sale_id", ondelete="CASCADE"),
        nullable=False,
    )
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)  # INVOICE, RECEIPT, CHALLAN, INSURANCE, SERVICE_SCHEDULE
    document_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    generated_date: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, default=datetime.utcnow)
    generated_by_staff_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("master.staff.staff_id"),
        nullable=False,
    )
    is_printed: Mapped[bool] = mapped_column(Boolean, default=False)
    print_count: Mapped[int] = mapped_column(Integer, default=0)
    last_printed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)

    sale = relationship("Sale", back_populates="sale_documents")


class SalePortalTracking(Base):
    """Portal work tracking: insurance, subsidy, RTO, CELEX, num-plate"""
    __tablename__ = "sale_portal_tracking"
    __table_args__ = ({"schema": "sales"},)

    portal_tracking_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    sale_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("sales.sale.sale_id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    # Insurance
    insurance_status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING")
    insurance_completed_date: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
    insurance_policy_number: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Subsidy
    subsidy_status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING")
    subsidy_completed_date: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
    subsidy_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # RTO
    rto_status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING")
    rto_completed_date: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
    registration_number: Mapped[str | None] = mapped_column(String(20), nullable=True, unique=True)

    # CELEX
    celex_status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING")
    celex_completed_date: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)

    # Number plate
    number_plate_ordered_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    number_plate_fixed_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)

    # Additional documents
    form_20_generated: Mapped[bool] = mapped_column(Boolean, default=False)
    helmet_invoice_generated: Mapped[bool] = mapped_column(Boolean, default=False)
    all_portals_completed: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)
    updated_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)

    sale = relationship("Sale", back_populates="portal_tracking")

    def check_completion(self) -> bool:
        """Check if all portal work is complete and update flag."""
        all_done = all([
            self.insurance_status == "COMPLETED",
            self.subsidy_status == "COMPLETED",
            self.rto_status == "COMPLETED",
            self.celex_status == "COMPLETED",
        ])
        self.all_portals_completed = all_done
        return all_done
