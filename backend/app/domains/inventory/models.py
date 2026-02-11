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
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from app.db.base import Base

class VehicleStockMovement(Base):
    __tablename__ = "vehicle_stock_movement"
    __table_args__ = (
        CheckConstraint(
            "movement_type IN ("
            "'INWARD','AVAILABLE','ALLOCATED','DELIVERED',"
            "'SERVICE_OUT','SERVICE_IN','DEMO','TRANSFER','SCRAPPED'"
            ")",
            name="chk_vehicle_movement_type",
        ),
        CheckConstraint(
            "reference_type IS NULL OR reference_type IN ("
            "'PROCUREMENT','SALE','SERVICE','WARRANTY','INSURANCE','MANUAL'"
            ")",
            name="chk_vehicle_reference_type",
        ),
        Index("idx_vehicle_movement_chassis", "chassis_no"),
        Index("idx_vehicle_movement_type", "movement_type"),
        Index("idx_vehicle_movement_datetime", "movement_datetime"),
        {"schema": "inventory"},
    )

    movement_id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True
    )

    chassis_no: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("master.vehicle.chassis_no", ondelete="RESTRICT"),
        nullable=False,
    )

    movement_type: Mapped[str] = mapped_column(
        String(30), nullable=False
    )

    from_location: Mapped[str | None] = mapped_column(
        String(100)
    )

    to_location: Mapped[str | None] = mapped_column(
        String(100)
    )

    reference_type: Mapped[str | None] = mapped_column(
        String(30)
    )

    reference_id: Mapped[int | None] = mapped_column(
        BigInteger
    )

    movement_datetime: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=False),
        default=datetime.utcnow,
        nullable=False,
    )

    remarks: Mapped[str | None] = mapped_column(Text)

    # Relationships
    # Use string reference to avoid circular import if master imports inventory
    vehicle = relationship("app.domains.master.models.Vehicle")


class SpareMaster(Base):
    __tablename__ = "spare_master"
    __table_args__ = {"schema": "inventory"}

    spare_id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True
    )

    spare_code: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False
    )

    spare_name: Mapped[str] = mapped_column(
        String(150), nullable=False
    )

    category: Mapped[str | None] = mapped_column(
        String(100)
    )

    is_serialized: Mapped[bool] = mapped_column(
        nullable=False, default=False
    )

    is_temporary: Mapped[bool] = mapped_column(
        Boolean, default=False
    )

    is_verified: Mapped[bool] = mapped_column(
        Boolean, default=True
    )

    remarks: Mapped[str | None] = mapped_column(Text)


class SpareSerial(Base):
    __tablename__ = "spare_serial"
    __table_args__ = (
        Index("idx_spare_serial_code", "serial_no"),
        {"schema": "inventory"},
    )

    serial_id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True
    )

    spare_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("inventory.spare_master.spare_id", ondelete="RESTRICT"),
        nullable=False,
    )

    serial_no: Mapped[str] = mapped_column(
        String(100), nullable=False, unique=True
    )

    remarks: Mapped[str | None] = mapped_column(Text)

    # Relationship
    spare: Mapped["SpareMaster"] = relationship("SpareMaster")


class SpareStockMovement(Base):
    __tablename__ = "spare_stock_movement"
    __table_args__ = (
        CheckConstraint(
            "movement_type IN ("
            "'PURCHASE','SALE','SERVICE_CONSUMPTION',"
            "'WARRANTY_INWARD','WARRANTY_OUTWARD','ADJUSTMENT'"
            ")",
            name="chk_spare_movement_type",
        ),
        Index("idx_spare_movement_spare", "spare_id"),
        Index("idx_spare_movement_datetime", "movement_datetime"),
        {"schema": "inventory"},
    )

    movement_id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True
    )

    spare_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("inventory.spare_master.spare_id", ondelete="RESTRICT"),
        nullable=False,
    )

    serial_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("inventory.spare_serial.serial_id", ondelete="RESTRICT"),
    )

    quantity: Mapped[int] = mapped_column(
        Integer, nullable=False
    )

    movement_type: Mapped[str] = mapped_column(
        String(30), nullable=False
    )

    reference_type: Mapped[str | None] = mapped_column(
        String(30)
    )

    reference_id: Mapped[int | None] = mapped_column(
        BigInteger
    )

    movement_datetime: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=False),
        default=datetime.utcnow,
        nullable=False,
    )

    remarks: Mapped[str | None] = mapped_column(Text)

    # Relationships
    spare: Mapped["SpareMaster"] = relationship("SpareMaster")
