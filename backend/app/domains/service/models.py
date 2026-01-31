from sqlalchemy import (
    BigInteger,
    String,
    ForeignKey,
    TIMESTAMP,
    Boolean,
)
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime

from app.db.base import Base

class ServiceJobCard(Base):
    __tablename__ = "job_card"
    __table_args__ = {"schema": "service"}

    job_card_id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True
    )

    chassis_no: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("master.vehicle.chassis_no", ondelete="RESTRICT"),
        nullable=False,
    )

    is_free_service: Mapped[bool] = mapped_column(
        Boolean, default=False
    )

    opened_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, default=datetime.utcnow
    )

    closed_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP
    )

    remarks: Mapped[str | None] = mapped_column(String)

class ServiceSpareConsumption(Base):
    __tablename__ = "spare_consumption"
    __table_args__ = {"schema": "service"}

    consumption_id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True
    )

    job_card_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("service.job_card.job_card_id", ondelete="CASCADE"),
        nullable=False,
    )

    spare_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("inventory.spare_master.spare_id", ondelete="RESTRICT"),
        nullable=False,
    )

    quantity: Mapped[int] = mapped_column(nullable=False)

    serial_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("inventory.spare_serial.serial_id", ondelete="RESTRICT"),
    )

