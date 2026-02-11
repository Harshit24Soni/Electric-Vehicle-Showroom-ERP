from sqlalchemy import (
    BigInteger,
    String,
    Text,
    Date,
    TIMESTAMP,
    Numeric,
    ForeignKey,
    CheckConstraint,
    Boolean,
    Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from app.db.base import Base
from app.db.mixins import SoftDeleteMixin

class Sale(Base, SoftDeleteMixin):
    __tablename__ = "sale"
    __table_args__ = (
        Index("idx_sale_customer", "customer_id"),
        Index("idx_sale_lead", "lead_id"),
        {"schema": "sales"},
    )

    sale_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    lead_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("crm.lead.lead_id"), nullable=False, unique=True)
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

    # Relationships
    lead = relationship("app.domains.crm.models.Lead")
    customer = relationship("app.domains.master.models.Customer")
    vehicle = relationship("app.domains.master.models.Vehicle")
    receipts = relationship("PaymentReceipt", back_populates="sale")
    delivery_checklist = relationship("DeliveryChecklist", uselist=False, back_populates="sale")
    service_schedules = relationship("ServiceSchedule", back_populates="sale", cascade="all, delete-orphan")


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
