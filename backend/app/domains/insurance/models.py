from sqlalchemy import (
    BigInteger,
    String,
    Text,
    Date,
    TIMESTAMP,
    ForeignKey,
    Boolean,
    Index,
    CheckConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime

from app.db.base import Base


class InsuranceCompany(Base):
    __tablename__ = "insurance_company"
    __table_args__ = ({"schema": "insurance"},)

    insurance_company_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    company_name: Mapped[str] = mapped_column(String(150), nullable=False, unique=True)
    contact_phone: Mapped[str | None] = mapped_column(String(15))
    contact_email: Mapped[str | None] = mapped_column(String(150))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False)


class Policy(Base):
    __tablename__ = "policy"
    __table_args__ = (
        CheckConstraint("policy_end_date > policy_start_date", name="chk_policy_date_valid"),
        Index("idx_insurance_policy_expiry", "policy_end_date"),
        {"schema": "insurance"},
    )

    policy_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    vehicle_sale_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    chassis_no: Mapped[str] = mapped_column(String(50), ForeignKey("master.vehicle.chassis_no", ondelete="RESTRICT"), nullable=False)
    insurance_company_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("insurance.insurance_company.insurance_company_id", ondelete="RESTRICT"), nullable=False)
    policy_number: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    policy_start_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    policy_end_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    premium_amount: Mapped[float | None] = mapped_column(nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False)
