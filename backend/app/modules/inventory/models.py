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
    Numeric,
    JSON,
    DateTime,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship, synonym
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

    # First-class pricing, tax and margin attributes
    hsn_code: Mapped[str | None] = mapped_column(String(20), index=True)
    gst_rate: Mapped[float | None] = mapped_column(Numeric(5, 2), default=18.0)
    base_cost: Mapped[float | None] = mapped_column(Numeric(12, 2))
    base_dlp: Mapped[float | None] = mapped_column(Numeric(12, 2))
    base_ex_showroom: Mapped[float | None] = mapped_column(Numeric(12, 2))
    base_mrp: Mapped[float | None] = mapped_column(Numeric(12, 2))
    profit_margin_percent: Mapped[float | None] = mapped_column(Numeric(6, 2))

    # Canonical Pricing & Inventory Valuation Fields (ERP V2 Refactor)
    accounting_wac: Mapped[float | None] = mapped_column(Numeric(12, 2))
    manufacturer_dlp: Mapped[float | None] = mapped_column(Numeric(12, 2))
    manufacturer_mrp: Mapped[float | None] = mapped_column(Numeric(12, 2))

    codes: Mapped[list["SparePartCode"]] = relationship(
        "SparePartCode", back_populates="spare", cascade="all, delete-orphan", lazy="selectin"
    )
    compatibilities: Mapped[list["SparePartVehicleCompatibility"]] = relationship(
        "SparePartVehicleCompatibility", back_populates="spare", cascade="all, delete-orphan", lazy="selectin"
    )
    balances: Mapped[list["SpareStockBalance"]] = relationship(
        "SpareStockBalance", back_populates="spare", foreign_keys="[SpareStockBalance.spare_id]", lazy="selectin"
    )
    alterations: Mapped[list["SparePartAlteration"]] = relationship(
        "SparePartAlteration", back_populates="spare", cascade="all, delete-orphan", lazy="selectin"
    )

    # Synonyms & properties for unified SparePart interface
    id = synonym("spare_id")
    name = synonym("spare_name")

    @property
    def part_number(self) -> str | None:
        codes = self.__dict__.get("codes")
        if codes:
            current = [c.code for c in codes if getattr(c, "is_current", False)]
            if current:
                return current[0]
            return codes[0].code
        return None

    @property
    def stock_quantity(self) -> int:
        balances = self.__dict__.get("balances")
        if balances:
            return sum(b.quantity for b in balances)
        return 0

    @property
    def current_wac(self) -> float:
        """Accounting WAC excluding recoverable ITC."""
        if self.accounting_wac is not None:
            return float(self.accounting_wac)
        if self.base_cost is not None:
            return float(self.base_cost)
        return 0.0

    @property
    def current_mrp(self) -> float:
        """Current valid manufacturer retail MRP."""
        if self.manufacturer_mrp is not None:
            return float(self.manufacturer_mrp)
        if self.base_mrp is not None:
            return float(self.base_mrp)
        return 0.0

    @property
    def current_dlp(self) -> float:
        """Manufacturer reference DLP."""
        if self.manufacturer_dlp is not None:
            return float(self.manufacturer_dlp)
        if self.base_dlp is not None:
            return float(self.base_dlp)
        return 0.0


class SparePartCode(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "module_spare_part_code"

    code_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    spare_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("module_spare_master.spare_id", ondelete="CASCADE"), nullable=False
    )
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)
    effective_from: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=False), default=lambda: datetime.now(timezone.utc).replace(tzinfo=None)
    )
    effective_to: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=False))
    reason: Mapped[str | None] = mapped_column(String(200))

    spare: Mapped["SpareMaster"] = relationship("SpareMaster", back_populates="codes")


class SparePartVehicleCompatibility(Base, AuditMixin):
    __tablename__ = "module_spare_part_vehicle_compatibility"
    __table_args__ = (Index("idx_mod_spare_veh_compat", "spare_id", "vehicle_model_id", unique=True),)

    compatibility_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    spare_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("module_spare_master.spare_id", ondelete="CASCADE"), nullable=False
    )
    vehicle_model_id: Mapped[int] = mapped_column(BigInteger, nullable=False)

    # Model-specific pricing and margins
    ex_factory_price: Mapped[float | None] = mapped_column(Numeric(12, 2))
    dlp: Mapped[float | None] = mapped_column(Numeric(12, 2))
    ex_showroom_price: Mapped[float | None] = mapped_column(Numeric(12, 2))
    customer_mrp: Mapped[float | None] = mapped_column(Numeric(12, 2))
    gst_rate: Mapped[float | None] = mapped_column(Numeric(5, 2), default=18.0)
    profit_margin_percent: Mapped[float | None] = mapped_column(Numeric(6, 2))
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)

    spare: Mapped["SpareMaster"] = relationship("SpareMaster", back_populates="compatibilities")


class SpareSerial(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "module_spare_serial"
    __table_args__ = (Index("idx_mod_spare_serial_code", "serial_no"),)

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
    spare_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("module_spare_master.spare_id", ondelete="RESTRICT"), nullable=False
    )
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
    batch_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("module_spare_batch.batch_id", ondelete="RESTRICT")
    )
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
    __table_args__ = (Index("idx_mod_spare_stock_bal_spare_loc", "spare_id", "location", unique=True),)

    balance_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    spare_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("module_spare_master.spare_id", ondelete="RESTRICT"), nullable=False
    )
    location: Mapped[str] = mapped_column(String(100), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    spare: Mapped["SpareMaster"] = relationship("SpareMaster", back_populates="balances")


class PriceList(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "module_price_list"

    price_list_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    source_name: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)
    remarks: Mapped[str | None] = mapped_column(Text)

    versions: Mapped[list["PriceListVersion"]] = relationship(
        "PriceListVersion", back_populates="price_list", cascade="all, delete-orphan"
    )


class PriceListVersion(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "module_price_list_version"
    __table_args__ = (Index("idx_mod_price_list_version", "price_list_id"),)

    version_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    price_list_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("module_price_list.price_list_id", ondelete="CASCADE"), nullable=False
    )
    version_reference: Mapped[str] = mapped_column(String(100), nullable=False)
    effective_from: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=False), nullable=False)
    received_date: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=False), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PUBLISHED", nullable=False)

    price_list: Mapped["PriceList"] = relationship("PriceList", back_populates="versions")
    items: Mapped[list["PriceListItem"]] = relationship(
        "PriceListItem", back_populates="version", cascade="all, delete-orphan"
    )


class PriceListItem(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "module_price_list_item"
    __table_args__ = (
        Index("idx_mod_price_list_item_version", "version_id"),
        Index("idx_mod_price_list_item_code", "part_code"),
    )

    item_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    version_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("module_price_list_version.version_id", ondelete="CASCADE"), nullable=False
    )
    part_code: Mapped[str] = mapped_column(String(50), nullable=False)
    part_name: Mapped[str | None] = mapped_column(String(150))
    mrp: Mapped[float | None] = mapped_column(Numeric(12, 2))
    dlp: Mapped[float | None] = mapped_column(Numeric(12, 2))
    gst_rate: Mapped[float | None] = mapped_column(Numeric(5, 2))

    version: Mapped["PriceListVersion"] = relationship("PriceListVersion", back_populates="items")


class SpareCostHistory(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "module_spare_cost_history"
    __table_args__ = (Index("idx_mod_spare_cost_spare", "spare_id"),)

    cost_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    spare_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("module_spare_master.spare_id", ondelete="RESTRICT"), nullable=False
    )
    effective_date: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=False), default=lambda: datetime.now(timezone.utc).replace(tzinfo=None)
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    billed_unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    additional_costs: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00)
    landed_cost: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    wac_cost: Mapped[float | None] = mapped_column(Numeric(12, 2))
    source_reference: Mapped[str | None] = mapped_column(String(100))

    spare: Mapped["SpareMaster"] = relationship("SpareMaster")


class SpareSellingPriceHistory(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "module_spare_selling_price_history"
    __table_args__ = (Index("idx_mod_spare_selling_price_spare", "spare_id"),)

    price_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    spare_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("module_spare_master.spare_id", ondelete="RESTRICT"), nullable=False
    )
    selling_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    effective_from: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=False), default=lambda: datetime.now(timezone.utc).replace(tzinfo=None)
    )
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


# Alias for unified inventory / admin interface
SparePart = SpareMaster


class ImportType(str, enum.Enum):
    MASTER = "MASTER"
    COMPATIBILITY = "COMPATIBILITY"
    PRICING = "PRICING"


class ImportBatchStatus(str, enum.Enum):
    PENDING_REVIEW = "PENDING_REVIEW"
    COMMITTED = "COMMITTED"
    REJECTED = "REJECTED"


class InventoryImportBatch(Base, AuditMixin):
    __tablename__ = "inventory_import_batches"
    __table_args__ = (
        Index("idx_inv_import_batch_status", "status"),
        Index("idx_inv_import_batch_type", "import_type"),
    )

    batch_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    total_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    import_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="PENDING_REVIEW", nullable=False)
    error_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    committed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    committed_by: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("staff.staff_id", ondelete="SET NULL"), nullable=True
    )

    items: Mapped[list["InventoryImportItem"]] = relationship(
        "InventoryImportItem", back_populates="batch", cascade="all, delete-orphan", lazy="selectin"
    )


class InventoryImportItem(Base, AuditMixin):
    __tablename__ = "inventory_import_items"
    __table_args__ = (
        Index("idx_inv_import_items_batch", "batch_id"),
        Index("idx_inv_import_items_valid", "is_valid"),
    )

    item_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    batch_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("inventory_import_batches.batch_id", ondelete="CASCADE"), nullable=False
    )
    raw_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    parsed_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    is_valid: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    batch: Mapped["InventoryImportBatch"] = relationship("InventoryImportBatch", back_populates="items")


class SparePartAlteration(Base):
    __tablename__ = "module_spare_part_alteration"
    __table_args__ = (
        Index("idx_mod_spare_alt_spare_id", "spare_id"),
        Index("idx_mod_spare_alt_part_code", "part_code"),
        Index("idx_mod_spare_alt_timestamp", "timestamp"),
    )

    alteration_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    spare_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("module_spare_master.spare_id", ondelete="CASCADE"), nullable=False
    )
    part_code: Mapped[str] = mapped_column(String(50), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    action_type: Mapped[str] = mapped_column(String(50), nullable=False)
    source_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    altered_by_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("staff.staff_id", ondelete="SET NULL"), nullable=True
    )
    altered_by_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    changes: Mapped[dict] = mapped_column(JSON, nullable=False)
    snapshot_before: Mapped[dict] = mapped_column(JSON, nullable=False)
    snapshot_after: Mapped[dict] = mapped_column(JSON, nullable=False)
    is_reverted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reverted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reverted_by_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("staff.staff_id", ondelete="SET NULL"), nullable=True
    )

    spare: Mapped["SpareMaster"] = relationship("SpareMaster", back_populates="alterations")


class DiscountTargetType(str, enum.Enum):
    SUPPLIER = "SUPPLIER"
    CUSTOMER = "CUSTOMER"


class DiscountType(str, enum.Enum):
    PERCENTAGE = "PERCENTAGE"
    FIXED_AMOUNT = "FIXED_AMOUNT"
    QUANTITY_SLAB = "QUANTITY_SLAB"
    THRESHOLD_BASKET = "THRESHOLD_BASKET"


class DiscountStackingMode(str, enum.Enum):
    STACKABLE = "STACKABLE"
    EXCLUSIVE = "EXCLUSIVE"
    PRIORITY = "PRIORITY"


class DiscountRule(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "module_discount_rule"
    __table_args__ = (
        Index("idx_mod_discount_target", "target_type"),
        Index("idx_mod_discount_spare", "spare_id"),
        Index("idx_mod_discount_active", "is_active"),
    )

    rule_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    rule_name: Mapped[str] = mapped_column(String(150), nullable=False)
    target_type: Mapped[str] = mapped_column(String(20), default=DiscountTargetType.CUSTOMER.value, nullable=False)
    discount_type: Mapped[str] = mapped_column(String(30), default=DiscountType.PERCENTAGE.value, nullable=False)
    discount_value: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    applicable_entity_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)  # supplier_id or customer_id
    spare_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("module_spare_master.spare_id", ondelete="CASCADE"), nullable=True
    )
    vehicle_model_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    min_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    min_basket_value: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    threshold_is_pre_tax: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    stacking_mode: Mapped[str] = mapped_column(String(20), default=DiscountStackingMode.STACKABLE.value, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_discount_amount: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)

    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=False), nullable=True)
    expiry_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=False), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by_staff_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)


class AlertSeverity(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    WARNING = "WARNING"
    INFO = "INFO"


class AlertStatus(str, enum.Enum):
    OPEN = "OPEN"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"
    ESCALATED = "ESCALATED"


class PricingAlert(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "module_pricing_alert"
    __table_args__ = (
        Index("idx_mod_pricing_alert_spare", "spare_id"),
        Index("idx_mod_pricing_alert_status", "status"),
        Index("idx_mod_pricing_alert_severity", "severity"),
        Index("idx_mod_pricing_alert_fingerprint", "risk_fingerprint"),
    )

    alert_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    spare_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("module_spare_master.spare_id", ondelete="CASCADE"), nullable=False
    )
    part_code: Mapped[str] = mapped_column(String(50), nullable=False)
    alert_type: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default=AlertSeverity.WARNING.value, nullable=False)

    current_wac: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    current_mrp: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    expected_margin_percent: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)

    message: Mapped[str] = mapped_column(Text, nullable=False)
    calculation_details: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    status: Mapped[str] = mapped_column(String(20), default=AlertStatus.OPEN.value, nullable=False)
    acknowledged_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=False), nullable=True)
    resolved_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=False), nullable=True)
    resolution_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    risk_fingerprint: Mapped[str] = mapped_column(String(100), nullable=False)
    spare: Mapped["SpareMaster"] = relationship("SpareMaster")


class LossSaleException(Base, AuditMixin):
    __tablename__ = "module_loss_sale_exception"
    __table_args__ = (
        Index("idx_mod_loss_exc_sale", "sale_id"),
        Index("idx_mod_loss_exc_spare", "spare_id"),
    )

    exception_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    sale_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    spare_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("module_spare_master.spare_id", ondelete="RESTRICT"), nullable=False
    )
    part_code: Mapped[str] = mapped_column(String(50), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)

    requested_by_staff_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    authorized_by_staff_id: Mapped[int] = mapped_column(BigInteger, nullable=False)

    expected_revenue: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    expected_cost: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    expected_loss: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    expected_margin: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)

    reason: Mapped[str] = mapped_column(Text, nullable=False)
    policy_version: Mapped[str] = mapped_column(String(50), default="v2.0", nullable=False)

    spare: Mapped["SpareMaster"] = relationship("SpareMaster")


class PriceChangeAuditEvent(Base, AuditMixin):
    __tablename__ = "module_price_change_audit_event"
    __table_args__ = (
        Index("idx_mod_price_audit_spare", "spare_id"),
        Index("idx_mod_price_audit_type", "change_type"),
        Index("idx_mod_price_audit_effective", "effective_timestamp"),
    )

    event_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    spare_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("module_spare_master.spare_id", ondelete="CASCADE"), nullable=False
    )
    part_code: Mapped[str] = mapped_column(String(50), nullable=False)
    change_type: Mapped[str] = mapped_column(String(50), nullable=False)

    old_value: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    new_value: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    difference_amount: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    difference_percent: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)

    source_document: Mapped[str | None] = mapped_column(String(100), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    actor_staff_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    actor_name: Mapped[str | None] = mapped_column(String(100), nullable=True)

    effective_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False
    )
    recorded_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False
    )
    profit_impact_margin: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)

    spare: Mapped["SpareMaster"] = relationship("SpareMaster")
