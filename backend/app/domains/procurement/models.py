from datetime import date, datetime
from typing import Optional, List
from sqlalchemy import BigInteger, String, Date, Text, Boolean, Integer, Numeric, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

class SparePurchase(Base):
    __tablename__ = "spare_purchase"
    __table_args__ = {"schema": "procurement"}

    spare_purchase_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    vendor_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("master.vendor.vendor_id"))
    vendor_invoice_no: Mapped[Optional[str]] = mapped_column(String(100))
    vendor_invoice_date: Mapped[Optional[date]] = mapped_column(Date)
    purchase_date: Mapped[date] = mapped_column(Date)
    remarks: Mapped[Optional[str]] = mapped_column(Text)
    include_in_accounting: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    # Relationships
    vendor = relationship("Vendor")
    items: Mapped[List["SparePurchaseItem"]] = relationship("SparePurchaseItem", back_populates="purchase", cascade="all, delete-orphan")


class SparePurchaseItem(Base):
    __tablename__ = "spare_purchase_item"
    __table_args__ = {"schema": "procurement"}

    purchase_item_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    spare_purchase_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("procurement.spare_purchase.spare_purchase_id"))
    spare_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("inventory.spare_master.spare_id"))
    quantity: Mapped[int] = mapped_column(Integer)
    unit_cost: Mapped[float] = mapped_column(Numeric(12, 2))
    gst_percentage: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    total_cost: Mapped[Optional[float]] = mapped_column(Numeric(14, 2))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    # Relationships
    purchase: Mapped["SparePurchase"] = relationship("SparePurchase", back_populates="items")
    spare = relationship("SpareMaster")


class VehiclePurchase(Base):
    __tablename__ = "vehicle_purchase"
    __table_args__ = {"schema": "procurement"}

    vehicle_purchase_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    vendor_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("master.vendor.vendor_id"))
    invoice_number: Mapped[str] = mapped_column(String(100))
    invoice_date: Mapped[date] = mapped_column(Date)
    invoice_amount: Mapped[Optional[float]] = mapped_column(Numeric(14, 2))
    include_in_accounting: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    # Relationships
    vendor = relationship("Vendor")
    details: Mapped[List["VehiclePurchaseDetail"]] = relationship("VehiclePurchaseDetail", back_populates="purchase", cascade="all, delete-orphan")


class VehiclePurchaseDetail(Base):
    __tablename__ = "vehicle_purchase_detail"
    __table_args__ = {"schema": "procurement"}

    vehicle_purchase_detail_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    vehicle_purchase_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("procurement.vehicle_purchase.vehicle_purchase_id"))
    chassis_no: Mapped[str] = mapped_column(String(50), ForeignKey("master.vehicle.chassis_no"))
    cost_price: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    # Relationships
    purchase: Mapped["VehiclePurchase"] = relationship("VehiclePurchase", back_populates="details")
    vehicle = relationship("Vehicle")
