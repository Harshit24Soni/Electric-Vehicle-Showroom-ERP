from sqlalchemy import (
    BigInteger,
    Integer,
    String,
    Text,
    ForeignKey,
    TIMESTAMP,
    CheckConstraint,
    Index,
    Boolean,
    Enum,
    Numeric,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, timezone
import enum

# Assuming these exist in the legacy base setup
from app.db.base import Base
from app.db.mixins import AuditMixin, SoftDeleteMixin

# Decoupling Strategy (DDD Phase 1):
# This is the Isolated Inventory Module.
# We explicitly REMOVED any ForeignKeys linking to 'master.vehicle' or other 
# external domains. This ensures the Inventory DB schema is self-contained.
# Domain references (like chassis_no) are stored as simple indexed strings.
# This prevents cross-module joins and forces cross-module communication via APIs/Events.

class TrackingMode(str, enum.Enum):
    QUANTITY = "QUANTITY"
    BATCH = "BATCH"
    SERIALIZED = "SERIALIZED"

class SparePartStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class VehicleStockMovement(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "module_vehicle_stock_movement"
    __table_args__ = (
        CheckConstraint(
            "movement_type IN ("
            "'INWARD','AVAILABLE','ALLOCATED','DELIVERED',"
            "'SERVICE_OUT','SERVICE_IN','DEMO','TRANSFER','SCRAPPED'"
            ")",
            name="chk_mod_vehicle_movement_type",
        ),
        CheckConstraint(
            "reference_type IS NULL OR reference_type IN ("
            "'PROCUREMENT','SALE','SERVICE','WARRANTY','INSURANCE','MANUAL'"
            ")",
            name="chk_mod_vehicle_reference_type",
        ),
        Index("idx_mod_vehicle_movement_chassis", "chassis_no"),
        Index("idx_mod_vehicle_movement_type", "movement_type"),
        Index("idx_mod_vehicle_movement_datetime", "movement_datetime"),
    )

    movement_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    # REMOVED: ForeignKey("vehicle.chassis_no")
    # This is now a soft reference. It belongs to the Inventory Domain conceptually,
    # but doesn't have a rigid database tie to Master.
    chassis_no: Mapped[str] = mapped_column(String(50), nullable=False)

    movement_type: Mapped[str] = mapped_column(String(30), nullable=False)
    from_location: Mapped[str | None] = mapped_column(String(100))
    to_location: Mapped[str | None] = mapped_column(String(100))
    
    reference_type: Mapped[str | None] = mapped_column(String(30))
    reference_id: Mapped[int | None] = mapped_column(BigInteger)

    movement_datetime: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=False),
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        nullable=False,
    )
    remarks: Mapped[str | None] = mapped_column(Text)


class SpareMaster(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "module_spare_master"

    spare_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    spare_name: Mapped[str] = mapped_column(String(150), nullable=False)
    category: Mapped[str | None] = mapped_column(String(100))
    tracking_mode: Mapped[str] = mapped_column(String(20), default="QUANTITY", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)
    is_temporary: Mapped[bool] = mapped_column(Boolean, default=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True)
    remarks: Mapped[str | None] = mapped_column(Text)

    codes: Mapped[list["SparePartCode"]] = relationship("SparePartCode", back_populates="spare", cascade="all, delete-orphan")
    compatibilities: Mapped[list["SparePartVehicleCompatibility"]] = relationship("SparePartVehicleCompatibility", back_populates="spare", cascade="all, delete-orphan")


class SparePartCode(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "module_spare_part_code"
    
    code_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    spare_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("module_spare_master.spare_id", ondelete="CASCADE"), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)
    effective_from: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=False), default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    effective_to: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=False))
    reason: Mapped[str | None] = mapped_column(String(200))
    
    spare: Mapped["SpareMaster"] = relationship("SpareMaster", back_populates="codes")


class SparePartVehicleCompatibility(Base, AuditMixin):
    __tablename__ = "module_spare_part_vehicle_compatibility"
    __table_args__ = (
        Index("idx_mod_spare_veh_compat", "spare_id", "vehicle_model_id", unique=True),
    )
    
    compatibility_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    spare_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("module_spare_master.spare_id", ondelete="CASCADE"), nullable=False)
    vehicle_model_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    
    spare: Mapped["SpareMaster"] = relationship("SpareMaster", back_populates="compatibilities")


class SpareSerial(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "module_spare_serial"
    __table_args__ = (
        Index("idx_mod_spare_serial_code", "serial_no"),
    )

    serial_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    spare_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("module_spare_master.spare_id", ondelete="RESTRICT"),
        nullable=False,
    )
    serial_no: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    location: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(30), default="AVAILABLE", nullable=False)
    unit_cost: Mapped[float | None] = mapped_column(Numeric(12, 2))
    remarks: Mapped[str | None] = mapped_column(Text)

    # Intra-domain relationships are fine.
    spare: Mapped["SpareMaster"] = relationship("SpareMaster")



class SpareBatch(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "module_spare_batch"
    __table_args__ = (
        Index("idx_mod_spare_batch_spare", "spare_id"),
        Index("idx_mod_spare_batch_no", "batch_number"),
    )

    batch_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    spare_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("module_spare_master.spare_id", ondelete="RESTRICT"), nullable=False)
    batch_number: Mapped[str] = mapped_column(String(100), nullable=False)
    received_date: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=False), nullable=False)
    expiry_date: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=False))
    location: Mapped[str] = mapped_column(String(100), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    unit_cost: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)
    
    spare: Mapped["SpareMaster"] = relationship("SpareMaster")

class SpareStockMovement(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "module_spare_stock_movement"
    __table_args__ = (
        CheckConstraint(
            "movement_type IN ("
            "'PURCHASE','SALE','SERVICE_CONSUMPTION',"
            "'WARRANTY_INWARD','WARRANTY_OUTWARD','ADJUSTMENT'"
            ")",
            name="chk_mod_spare_movement_type",
        ),
        Index("idx_mod_spare_movement_spare", "spare_id"),
        Index("idx_mod_spare_movement_datetime", "movement_datetime"),
    )

    movement_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    spare_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("module_spare_master.spare_id", ondelete="RESTRICT"),
        nullable=False,
    )
    serial_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("module_spare_serial.serial_id", ondelete="RESTRICT"),
    )
    batch_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("module_spare_batch.batch_id", ondelete="RESTRICT"))
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    movement_type: Mapped[str] = mapped_column(String(30), nullable=False)
    from_location: Mapped[str | None] = mapped_column(String(100))
    to_location: Mapped[str | None] = mapped_column(String(100))
    unit_cost: Mapped[float | None] = mapped_column(Numeric(12, 2))
    total_cost: Mapped[float | None] = mapped_column(Numeric(14, 2))
    reference_type: Mapped[str | None] = mapped_column(String(30))
    reference_id: Mapped[int | None] = mapped_column(BigInteger)

    movement_datetime: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=False),
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        nullable=False,
    )
    remarks: Mapped[str | None] = mapped_column(Text)

    spare: Mapped["SpareMaster"] = relationship("SpareMaster")
    batch: Mapped["SpareBatch"] = relationship("SpareBatch")
    serial: Mapped["SpareSerial"] = relationship("SpareSerial")


class SpareStockBalance(Base, AuditMixin):
    __tablename__ = "module_spare_stock_balance"
    __table_args__ = (
        Index("idx_mod_spare_stock_bal_spare_loc", "spare_id", "location", unique=True),
    )

    balance_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    spare_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("module_spare_master.spare_id", ondelete="RESTRICT"), nullable=False)
    location: Mapped[str] = mapped_column(String(100), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    spare: Mapped["SpareMaster"] = relationship("SpareMaster")

class PriceList(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "module_price_list"
    
    price_list_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    source_name: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)
    remarks: Mapped[str | None] = mapped_column(Text)
    
    versions: Mapped[list["PriceListVersion"]] = relationship("PriceListVersion", back_populates="price_list", cascade="all, delete-orphan")

class PriceListVersion(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "module_price_list_version"
    __table_args__ = (
        Index("idx_mod_price_list_version", "price_list_id"),
    )
    
    version_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    price_list_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("module_price_list.price_list_id", ondelete="CASCADE"), nullable=False)
    version_reference: Mapped[str] = mapped_column(String(100), nullable=False)
    effective_from: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=False), nullable=False)
    received_date: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=False), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PUBLISHED", nullable=False)
    
    price_list: Mapped["PriceList"] = relationship("PriceList", back_populates="versions")
    items: Mapped[list["PriceListItem"]] = relationship("PriceListItem", back_populates="version", cascade="all, delete-orphan")

class PriceListItem(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "module_price_list_item"
    __table_args__ = (
        Index("idx_mod_price_list_item_version", "version_id"),
        Index("idx_mod_price_list_item_code", "part_code"),
    )
    
    item_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    version_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("module_price_list_version.version_id", ondelete="CASCADE"), nullable=False)
    part_code: Mapped[str] = mapped_column(String(50), nullable=False)
    part_name: Mapped[str | None] = mapped_column(String(150))
    mrp: Mapped[float | None] = mapped_column(Numeric(12, 2))
    dlp: Mapped[float | None] = mapped_column(Numeric(12, 2))
    gst_rate: Mapped[float | None] = mapped_column(Numeric(5, 2))
    
    version: Mapped["PriceListVersion"] = relationship("PriceListVersion", back_populates="items")

class SpareCostHistory(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "module_spare_cost_history"
    __table_args__ = (
        Index("idx_mod_spare_cost_spare", "spare_id"),
    )
    
    cost_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    spare_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("module_spare_master.spare_id", ondelete="RESTRICT"), nullable=False)
    effective_date: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=False), default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    billed_unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    additional_costs: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00)
    landed_cost: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    wac_cost: Mapped[float | None] = mapped_column(Numeric(12, 2))
    source_reference: Mapped[str | None] = mapped_column(String(100))
    
    spare: Mapped["SpareMaster"] = relationship("SpareMaster")

class SpareSellingPriceHistory(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "module_spare_selling_price_history"
    __table_args__ = (
        Index("idx_mod_spare_selling_price_spare", "spare_id"),
    )
    
    price_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    spare_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("module_spare_master.spare_id", ondelete="RESTRICT"), nullable=False)
    selling_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    effective_from: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=False), default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    effective_to: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=False))
    reason: Mapped[str | None] = mapped_column(String(200))
    
    spare: Mapped["SpareMaster"] = relationship("SpareMaster")


class TagStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    REVOKED = "REVOKED"
    RETIRED = "RETIRED"


class InventoryTag(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "module_inventory_tag"
    __table_args__ = (
        Index("idx_mod_inv_tag_identifier", "tag_identifier", unique=True),
        Index("idx_mod_inv_tag_spare", "spare_id"),
        Index("idx_mod_inv_tag_batch", "batch_id"),
        Index("idx_mod_inv_tag_serial", "serial_id"),
    )

    tag_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    tag_identifier: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)
    tracking_mode: Mapped[str] = mapped_column(String(20), nullable=False)
    
    spare_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("module_spare_master.spare_id", ondelete="RESTRICT"), nullable=False
    )
    batch_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("module_spare_batch.batch_id", ondelete="RESTRICT")
    )
    serial_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("module_spare_serial.serial_id", ondelete="RESTRICT")
    )
    
    # Store initial creation location for reference, though true location comes from real-time stock
    location: Mapped[str | None] = mapped_column(String(100))
    
    last_printed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=False))
    print_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=False))
    
    spare: Mapped["SpareMaster"] = relationship("SpareMaster")
    batch: Mapped["SpareBatch"] = relationship("SpareBatch")
    serial: Mapped["SpareSerial"] = relationship("SpareSerial")
