from sqlalchemy import (
    BigInteger,
    String,
    ForeignKey,
    Numeric,
    TIMESTAMP,
    Boolean,
)
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime

from app.db.base import Base


class SalesInvoice(Base):
    __tablename__ = "sales_invoice"
    __table_args__ = {"schema": "billing"}

    invoice_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    sale_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("sales.vehicle_sale.sale_id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,
    )

    invoice_number: Mapped[str] = mapped_column(
        String(50), nullable=False, unique=True
    )

    invoice_date: Mapped[datetime] = mapped_column(
        TIMESTAMP, default=datetime.utcnow
    )

    taxable_amount: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False
    )

    gst_rate: Mapped[float] = mapped_column(
        Numeric(5, 2), nullable=False
    )

    gst_amount: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False
    )

    total_amount: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False
    )

    is_final: Mapped[bool] = mapped_column(
        Boolean, default=False
    )

    revision_no: Mapped[int] = mapped_column(
        default=1
    )

    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, default=datetime.utcnow
    )

    remarks: Mapped[str | None] = mapped_column(String)

class VehicleSubsidy(Base):
    __tablename__ = "vehicle_subsidy"
    __table_args__ = {"schema": "billing"}

    subsidy_id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True
    )

    invoice_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("billing.sales_invoice.invoice_id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    government_customer_id: Mapped[str] = mapped_column(
        String(100), nullable=False
    )

    application_status: Mapped[str] = mapped_column(
        String(30), nullable=False
    )
    # APPLIED / APPROVED / REJECTED / PAID

    document_uploaded: Mapped[bool] = mapped_column(
        default=False
    )

    last_updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, default=datetime.utcnow
    )

    remarks: Mapped[str | None] = mapped_column(String)
