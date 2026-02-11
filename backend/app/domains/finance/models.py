from sqlalchemy import (
    BigInteger,
    String,
    ForeignKey,
    Numeric,
    TIMESTAMP,
)
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime

from app.db.base import Base

class VehicleFinance(Base):
    __tablename__ = "vehicle_finance"
    __table_args__ = {"schema": "finance"}

    finance_id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True
    )

    sale_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("sales.sale.sale_id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,
    )

    financer_name: Mapped[str] = mapped_column(
        String(100), nullable=False
    )

    financer_contact: Mapped[str | None] = mapped_column(
        String(100)
    )

    loan_amount: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False
    )

    down_payment: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False
    )

    finance_status: Mapped[str] = mapped_column(
        String(30), nullable=False
    )
    # INITIATED / SANCTIONED / DISBURSED / REJECTED / CANCELLED

    reference_number: Mapped[str | None] = mapped_column(
        String(100)
    )

    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, default=datetime.utcnow
    )

    updated_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP
    )

    remarks: Mapped[str | None] = mapped_column(String)

