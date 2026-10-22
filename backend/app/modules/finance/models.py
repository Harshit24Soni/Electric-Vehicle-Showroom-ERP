import enum
from datetime import date, datetime, timezone
from decimal import Decimal
from sqlalchemy import BigInteger, String, Numeric, Date, Boolean, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import AuditMixin, SoftDeleteMixin


class VehicleFinance(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "vehicle_finance"

    finance_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    sale_id: Mapped[int] = mapped_column(
        BigInteger, nullable=False, unique=True, index=True
    )  # Soft link to sales module

    financer_name: Mapped[str] = mapped_column(String(100), nullable=False)

    financer_contact: Mapped[str | None] = mapped_column(String(100))

    loan_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    down_payment: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    finance_status: Mapped[str] = mapped_column(String(30), nullable=False)
    # INITIATED / SANCTIONED / DISBURSED / REJECTED / CANCELLED

    reference_number: Mapped[str | None] = mapped_column(String(100))

    remarks: Mapped[str | None] = mapped_column(String)


class ITCEligibilityStatus(str, enum.Enum):
    ELIGIBLE = "ELIGIBLE"
    INELIGIBLE = "INELIGIBLE"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    BLOCKED = "BLOCKED"


class ITCClaimStatus(str, enum.Enum):
    UNCLAIMED = "UNCLAIMED"
    AVAILABLE = "AVAILABLE"
    UTILIZED = "UTILIZED"
    REVERSED = "REVERSED"


class ITCCreditRecord(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "gst_itc_credit_record"
    __table_args__ = (
        Index("idx_gst_itc_period", "tax_period"),
        Index("idx_gst_itc_vendor", "vendor_id"),
        Index("idx_gst_itc_eligibility", "eligibility_status"),
        Index("idx_gst_itc_claim_status", "claim_status"),
        Index("idx_gst_itc_invoice_num", "invoice_number"),
    )

    itc_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    purchase_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)  # Link to spare_purchase

    invoice_number: Mapped[str] = mapped_column(String(100), nullable=False)
    invoice_date: Mapped[date] = mapped_column(Date, nullable=False)

    vendor_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    vendor_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    vendor_gstin: Mapped[str | None] = mapped_column(String(20), nullable=True)

    taxable_value: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    cgst_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    sgst_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    igst_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    total_tax: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    total_invoice_value: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    eligibility_status: Mapped[str] = mapped_column(
        String(30), default=ITCEligibilityStatus.ELIGIBLE.value, nullable=False
    )
    claim_status: Mapped[str] = mapped_column(String(30), default=ITCClaimStatus.AVAILABLE.value, nullable=False)

    claimed_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    utilized_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    reversal_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)

    tax_period: Mapped[str] = mapped_column(String(10), nullable=False)  # e.g. "2026-10"
    is_reconciled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reconciliation_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    @property
    def available_balance(self) -> float:
        if self.eligibility_status != ITCEligibilityStatus.ELIGIBLE.value:
            return 0.0
        bal = Decimal(str(self.total_tax)) - Decimal(str(self.utilized_amount)) - Decimal(str(self.reversal_amount))
        return float(max(Decimal("0.00"), bal))


class OutputTaxStatus(str, enum.Enum):
    PENDING = "PENDING"
    OFFSET_BY_ITC = "OFFSET_BY_ITC"
    PAID_CASH = "PAID_CASH"
    PARTIALLY_SETTLED = "PARTIALLY_SETTLED"
    REVERSED = "REVERSED"


class OutputTaxRecord(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "gst_output_tax_record"
    __table_args__ = (
        Index("idx_gst_output_period", "tax_period"),
        Index("idx_gst_output_sale", "sale_id"),
        Index("idx_gst_output_status", "status"),
        Index("idx_gst_output_invoice_num", "invoice_number"),
    )

    output_tax_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    sale_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)  # Link to spare_sale

    invoice_number: Mapped[str] = mapped_column(String(100), nullable=False)
    invoice_date: Mapped[date] = mapped_column(Date, nullable=False)
    customer_name: Mapped[str | None] = mapped_column(String(150), nullable=True)

    taxable_value: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    cgst_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    sgst_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    igst_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    total_tax: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    total_invoice_value: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    tax_period: Mapped[str] = mapped_column(String(10), nullable=False)  # e.g. "2026-10"
    status: Mapped[str] = mapped_column(String(30), default=OutputTaxStatus.PENDING.value, nullable=False)

    itc_utilized_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    cash_paid_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    is_reconciled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    @property
    def remaining_liability(self) -> float:
        rem = (
            Decimal(str(self.total_tax)) - Decimal(str(self.itc_utilized_amount)) - Decimal(str(self.cash_paid_amount))
        )
        return float(max(Decimal("0.00"), rem))


class GSTUtilizationEntry(Base, AuditMixin):
    __tablename__ = "gst_utilization_entry"
    __table_args__ = (
        Index("idx_gst_util_itc", "itc_id"),
        Index("idx_gst_util_output", "output_tax_id"),
        Index("idx_gst_util_period", "tax_period"),
    )

    utilization_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    itc_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("gst_itc_credit_record.itc_id", ondelete="RESTRICT"), nullable=False
    )
    output_tax_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("gst_output_tax_record.output_tax_id", ondelete="RESTRICT"), nullable=True
    )

    amount_utilized: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    tax_component: Mapped[str] = mapped_column(String(10), nullable=False)  # CGST, SGST, IGST
    tax_period: Mapped[str] = mapped_column(String(10), nullable=False)
    utilization_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False
    )
    authorized_by_staff_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)

    itc_record: Mapped["ITCCreditRecord"] = relationship("ITCCreditRecord")
    output_tax_record: Mapped["OutputTaxRecord"] = relationship("OutputTaxRecord")


class PeriodClosingStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    RECONCILED = "RECONCILED"


class GSTReconciliationPeriod(Base, AuditMixin):
    __tablename__ = "gst_reconciliation_period"
    __table_args__ = (Index("idx_gst_period_code", "period_code", unique=True),)

    period_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    period_code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)  # "2026-10"
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default=PeriodClosingStatus.OPEN.value, nullable=False)

    total_input_itc_recorded: Mapped[float] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)
    total_eligible_itc: Mapped[float] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)
    total_ineligible_itc: Mapped[float] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)
    total_output_tax: Mapped[float] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)
    total_itc_utilized: Mapped[float] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)
    total_cash_paid: Mapped[float] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)
    itc_carried_forward: Mapped[float] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)

    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=False), nullable=True)
    closed_by_staff_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
