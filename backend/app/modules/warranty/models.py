from sqlalchemy import (
    BigInteger,
    String,
    Text,
    Date,
    TIMESTAMP,
    Integer,
    Numeric,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime

from app.db.base import Base
from app.db.mixins import AuditMixin, SoftDeleteMixin


class Claim(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "claim"
    __table_args__ = (Index("idx_warranty_claim_status", "claim_status"),)

    claim_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    job_spare_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("spare_consumption.consumption_id", ondelete="CASCADE"), nullable=False)
    claim_status: Mapped[str] = mapped_column(String(30), nullable=False)
    portal_ref_no: Mapped[str | None] = mapped_column(String(100))
    approval_date: Mapped[Date | None] = mapped_column(Date)
    so_number: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    remarks: Mapped[str | None] = mapped_column(Text)


class Inward(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "inward"

    warranty_inward_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    oem_invoice_no: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    oem_invoice_date: Mapped[Date] = mapped_column(Date, nullable=False)
    remarks: Mapped[str | None] = mapped_column(Text)


class InwardItem(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "inward_item"

    inward_item_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    warranty_inward_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("inward.warranty_inward_id", ondelete="CASCADE"), nullable=False)
    spare_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True) # Soft link to inventory module
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_cost: Mapped[float | None] = mapped_column(Numeric(12,2))


class Shipment(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "shipment"

    shipment_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    courier_name: Mapped[str] = mapped_column(String(100), nullable=False)
    docket_no: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    dispatch_date: Mapped[Date] = mapped_column(Date, nullable=False)
    received_date: Mapped[Date | None] = mapped_column(Date)


class ShipmentItem(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "shipment_item"

    shipment_item_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    shipment_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("shipment.shipment_id", ondelete="CASCADE"), nullable=False)
    claim_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("claim.claim_id", ondelete="CASCADE"), nullable=False, unique=True)
