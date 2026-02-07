from sqlalchemy import (
	BigInteger,
	String,
	Text,
	Date,
	TIMESTAMP,
	Boolean,
	Index,
	ForeignKey,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from app.db.base import Base


class Customer(Base):
	__tablename__ = "customer"
	__table_args__ = (
		Index("idx_customer_created", "created_at"),
		{"schema": "master"}
	)

	customer_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
	lead_reference_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)  # References the lead this customer was converted from
	customer_type: Mapped[str | None] = mapped_column(String(20))
	name: Mapped[str | None] = mapped_column(String(150))
	guardian_name: Mapped[str | None] = mapped_column(String(150))
	primary_phone: Mapped[str | None] = mapped_column(String(15), unique=True)
	email: Mapped[str | None] = mapped_column(String(150))
	address_line1: Mapped[str | None] = mapped_column(Text)
	address_line2: Mapped[str | None] = mapped_column(Text)
	city: Mapped[str | None] = mapped_column(String(100))
	state: Mapped[str | None] = mapped_column(String(100))
	pincode: Mapped[str | None] = mapped_column(String(10))
	aadhaar_no: Mapped[str | None] = mapped_column(String(12), unique=True)
	pan_no: Mapped[str | None] = mapped_column(String(10), unique=True)
	gstin: Mapped[str | None] = mapped_column(String(15), unique=True)
	created_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)
	is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Nominee(Base):
	"""Insurance nominee details for a customer"""
	__tablename__ = "nominee"
	__table_args__ = (
		Index("idx_nominee_customer", "customer_id"),
		{"schema": "master"}
	)

	nominee_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
	customer_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("master.customer.customer_id", ondelete="CASCADE"), nullable=False)
	nominee_name: Mapped[str] = mapped_column(String(150), nullable=False)
	nominee_dob: Mapped[Date] = mapped_column(Date, nullable=False)
	relation: Mapped[str] = mapped_column(String(100), nullable=False)
	is_primary: Mapped[bool] = mapped_column(Boolean, default=True)
	created_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)
	is_active: Mapped[bool] = mapped_column(Boolean, default=True)



class Brand(Base):
	__tablename__ = "brand"
	__table_args__ = ({"schema": "master"},)

	brand_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
	brand_name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)


class VehicleModel(Base):
	__tablename__ = "vehicle_model"
	__table_args__ = (Index("idx_vehicle_model_material", "created_at"), {"schema": "master"})

	vehicle_model_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
	brand_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("master.brand.brand_id"), nullable=False)
	model_name: Mapped[str] = mapped_column(String(100), nullable=False)
	material_number: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
	colour: Mapped[str | None] = mapped_column(String(50))
	battery_type: Mapped[str | None] = mapped_column(String(50))
	laden_weight: Mapped[float | None] = mapped_column(nullable=True)
	unladen_weight: Mapped[float | None] = mapped_column(nullable=True)
	hsn_code: Mapped[str | None] = mapped_column(String(20))
	is_active: Mapped[bool] = mapped_column(Boolean, default=True)
	created_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)

	# Relationships
	brand = relationship("Brand")


class Vehicle(Base):
	__tablename__ = "vehicle"
	__table_args__ = ({"schema": "master"},)

	chassis_no: Mapped[str] = mapped_column(String(50), primary_key=True)
	vehicle_model_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("master.vehicle_model.vehicle_model_id"), nullable=False)
	motor_serial_no: Mapped[str | None] = mapped_column(String(100))
	convertor_serial_no: Mapped[str | None] = mapped_column(String(100))
	charger_serial_no: Mapped[str | None] = mapped_column(String(100))
	controller_serial_no: Mapped[str | None] = mapped_column(String(100))
	battery_serial_no: Mapped[str | None] = mapped_column(String(100))
	date_of_manufacture: Mapped[Date | None] = mapped_column(Date)
	current_status: Mapped[str] = mapped_column(String(30), nullable=False, default="IN_STOCK")
	created_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)


class Vendor(Base):
	__tablename__ = "vendor"
	__table_args__ = ({"schema": "master"},)

	vendor_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
	vendor_name: Mapped[str] = mapped_column(String(150), nullable=False)
	vendor_type: Mapped[str] = mapped_column(String(50), nullable=False)
	gstin: Mapped[str | None] = mapped_column(String(15))
	pan_no: Mapped[str | None] = mapped_column(String(10))
	address_line1: Mapped[str | None] = mapped_column(Text)
	address_line2: Mapped[str | None] = mapped_column(Text)
	city: Mapped[str | None] = mapped_column(String(100))
	state: Mapped[str | None] = mapped_column(String(100))
	pincode: Mapped[str | None] = mapped_column(String(10))
	is_active: Mapped[bool] = mapped_column(Boolean, default=True)
	created_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)
