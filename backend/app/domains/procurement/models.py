from datetime import date, datetime
from typing import Optional, List
from sqlalchemy import BigInteger, String, Date, Text, Boolean, Integer, Numeric, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import AuditMixin, SoftDeleteMixin

class SparePurchase(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "spare_purchase"

    spare_purchase_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    vendor_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("vendor.vendor_id"))
    vendor_invoice_no: Mapped[Optional[str]] = mapped_column(String(100))
    vendor_invoice_date: Mapped[Optional[date]] = mapped_column(Date)
    purchase_date: Mapped[date] = mapped_column(Date)
    remarks: Mapped[Optional[str]] = mapped_column(Text)
    include_in_accounting: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Phase 3 Fields
    status: Mapped[str] = mapped_column(String(50), default="DRAFT", nullable=False)
    docket_reference: Mapped[Optional[str]] = mapped_column(String(100))
    subtotal: Mapped[Optional[float]] = mapped_column(Numeric(14, 2))
    tax_total: Mapped[Optional[float]] = mapped_column(Numeric(14, 2))
    additional_charges: Mapped[Optional[float]] = mapped_column(Numeric(14, 2))
    landed_cost_total: Mapped[Optional[float]] = mapped_column(Numeric(14, 2))
    invoice_document_id: Mapped[Optional[str]] = mapped_column(String(100))
    verification_status: Mapped[Optional[str]] = mapped_column(String(50))

    # Relationships
    vendor = relationship("Vendor")
    items: Mapped[List["SparePurchaseItem"]] = relationship("SparePurchaseItem", back_populates="purchase", cascade="all, delete-orphan")


class SparePurchaseItem(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "spare_purchase_item"

    purchase_item_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    spare_purchase_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("spare_purchase.spare_purchase_id"))
    spare_id: Mapped[Optional[int]] = mapped_column(BigInteger) # Soft link to inventory.spare_master, Optional for OCR drafts
    quantity: Mapped[int] = mapped_column(Integer)
    unit_cost: Mapped[float] = mapped_column(Numeric(12, 2))
    gst_percentage: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    total_cost: Mapped[Optional[float]] = mapped_column(Numeric(14, 2))
    
    # Phase 3 OCR/Verification Fields
    part_code: Mapped[Optional[str]] = mapped_column(String(100))
    part_description: Mapped[Optional[str]] = mapped_column(String(255))
    discount: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    tax_amount: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    verification_status: Mapped[str] = mapped_column(String(50), default="EXTRACTED", nullable=False)
    confidence_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 4))
    variance_amount: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))

    # Relationships
    purchase: Mapped["SparePurchase"] = relationship("SparePurchase", back_populates="items")


class VehiclePurchase(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "vehicle_purchase"

    vehicle_purchase_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    vendor_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("vendor.vendor_id"))
    invoice_number: Mapped[str] = mapped_column(String(100))
    invoice_date: Mapped[date] = mapped_column(Date)
    invoice_amount: Mapped[Optional[float]] = mapped_column(Numeric(14, 2))
    include_in_accounting: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    vendor = relationship("Vendor")
    details: Mapped[List["VehiclePurchaseDetail"]] = relationship("VehiclePurchaseDetail", back_populates="purchase", cascade="all, delete-orphan")


class VehiclePurchaseDetail(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "vehicle_purchase_detail"

    vehicle_purchase_detail_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    vehicle_purchase_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("vehicle_purchase.vehicle_purchase_id"))
    chassis_no: Mapped[str] = mapped_column(String(50), ForeignKey("vehicle.chassis_no"))
    cost_price: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))

    # Relationships
    purchase: Mapped["VehiclePurchase"] = relationship("VehiclePurchase", back_populates="details")
    vehicle = relationship("Vehicle")
