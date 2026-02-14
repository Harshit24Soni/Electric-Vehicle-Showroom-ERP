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


class Claim(Base):
    __tablename__ = "claim"
    __table_args__ = (Index("idx_warranty_claim_status", "claim_status"), {"schema": "warranty"})

    claim_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    job_spare_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("service.spare_consumption.consumption_id", ondelete="CASCADE"), nullable=False)
    claim_status: Mapped[str] = mapped_column(String(30), nullable=False)
    portal_ref_no: Mapped[str | None] = mapped_column(String(100))
    approval_date: Mapped[Date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)
    so_number: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    remarks: Mapped[str | None] = mapped_column(Text)


class Inward(Base):
    __tablename__ = "inward"
    __table_args__ = ({"schema": "warranty"},)

    warranty_inward_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    oem_invoice_no: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    oem_invoice_date: Mapped[Date] = mapped_column(Date, nullable=False)
    remarks: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)


class InwardItem(Base):
    __tablename__ = "inward_item"
    __table_args__ = ({"schema": "warranty"},)

    inward_item_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    warranty_inward_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("warranty.inward.warranty_inward_id", ondelete="CASCADE"), nullable=False)
    spare_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("inventory.spare_master.spare_id", ondelete="RESTRICT"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_cost: Mapped[float | None] = mapped_column(Numeric(12,2))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)


class Shipment(Base):
    __tablename__ = "shipment"
    __table_args__ = ({"schema": "warranty"},)

    shipment_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    courier_name: Mapped[str] = mapped_column(String(100), nullable=False)
    docket_no: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    dispatch_date: Mapped[Date] = mapped_column(Date, nullable=False)
    received_date: Mapped[Date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)


class ShipmentItem(Base):
    __tablename__ = "shipment_item"
    __table_args__ = ({"schema": "warranty"},)

    shipment_item_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    shipment_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("warranty.shipment.shipment_id", ondelete="CASCADE"), nullable=False)
    claim_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("warranty.claim.claim_id", ondelete="CASCADE"), nullable=False, unique=True)
