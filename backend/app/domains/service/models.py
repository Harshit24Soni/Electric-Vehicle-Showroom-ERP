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
from app.db.mixins import AuditMixin, SoftDeleteMixin

class ServiceJobCard(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "job_card"

    job_card_id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True
    )

    chassis_no: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("vehicle.chassis_no", ondelete="RESTRICT"),
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

class ServiceSpareConsumption(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "spare_consumption"

    consumption_id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True
    )

    job_card_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("job_card.job_card_id", ondelete="CASCADE"),
        nullable=False,
    )

    spare_id: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        index=True
    ) # Soft link to inventory module
    
    tracking_mode: Mapped[str] = mapped_column(String(20), nullable=False, default="QUANTITY")
    quantity: Mapped[int] = mapped_column(nullable=False)

    batch_id: Mapped[int | None] = mapped_column(BigInteger, index=True)
    serial_id: Mapped[int | None] = mapped_column(BigInteger, index=True)

    part_code_snapshot: Mapped[str | None] = mapped_column(String(100))
    description_snapshot: Mapped[str | None] = mapped_column(String(255))
    unit_cost_snapshot: Mapped[float | None] = mapped_column()
    total_cost: Mapped[float | None] = mapped_column()

    consumed_by: Mapped[int | None] = mapped_column(BigInteger)
    consumed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="DRAFT") # DRAFT, CONSUMED, REVERSED
    stock_movement_id: Mapped[int | None] = mapped_column(BigInteger)
