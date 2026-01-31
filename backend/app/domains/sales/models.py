from sqlalchemy import BigInteger, String, ForeignKey, TIMESTAMP, Numeric
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime

from app.db.base import Base


class VehicleSale(Base):
    __tablename__ = "vehicle_sale"
    __table_args__ = {"schema": "sales"}

    sale_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    lead_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("crm.lead.lead_id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,
    )

    chassis_no: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("master.vehicle.chassis_no", ondelete="RESTRICT"),
        nullable=False,
        unique=True,
    )

    booking_amount: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False
    )

    sale_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="BOOKED"
    )
    # BOOKED → DELIVERED

    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, default=datetime.utcnow
    )

    delivered_at: Mapped[datetime | None] = mapped_column(TIMESTAMP)

    remarks: Mapped[str | None] = mapped_column(String)
