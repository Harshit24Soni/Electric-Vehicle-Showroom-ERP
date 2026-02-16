from sqlalchemy import (
	BigInteger,
	Integer,
	String,
	Text,
	Date,
	TIMESTAMP,
	Boolean,
	Index,
	ForeignKey,
	Numeric,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, date

from app.db.base import Base


from app.db.mixins import SoftDeleteMixin, AuditMixin

class Customer(Base, SoftDeleteMixin, AuditMixin):
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

	is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Nominee(Base, SoftDeleteMixin, AuditMixin):
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

	is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Staff(Base, SoftDeleteMixin, AuditMixin):
	__tablename__ = "staff"
	__table_args__ = (
		Index("idx_staff_active_lock", "staff_id", "is_active", "locked_until"),
		{"schema": "master"},
	)

	staff_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
	full_name: Mapped[str] = mapped_column(String(100), nullable=False)
	email: Mapped[str | None] = mapped_column(String(150), unique=True)
	mobile_no: Mapped[str] = mapped_column(String(15), unique=True, nullable=False)
	designation: Mapped[str] = mapped_column(String(50), nullable=False)
	pin_hash: Mapped[str | None] = mapped_column(String(255))
	is_active: Mapped[bool] = mapped_column(Boolean, default=True)
	failed_attempts: Mapped[int] = mapped_column(BigInteger, default=0)
	last_failed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP)
	locked_until: Mapped[datetime | None] = mapped_column(TIMESTAMP)
	is_pin_reset_required: Mapped[bool] = mapped_column(Boolean, default=False)
	last_pin_changed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP)
	totp_secret: Mapped[str | None] = mapped_column(String(100))  # For Dealer 2FA


	# Hierarchy
	dealer_id: Mapped[int | None] = mapped_column(BigInteger)

	# Soft delete
	is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
	deleted_by: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("master.staff.staff_id"), nullable=True)

	# Personal details
	joined_date: Mapped[date | None] = mapped_column(Date)
	aadhaar_no: Mapped[str | None] = mapped_column(String(12), unique=True)
	pan_no: Mapped[str | None] = mapped_column(String(10), unique=True)

	# Address
	address_line1: Mapped[str | None] = mapped_column(Text)
	address_line2: Mapped[str | None] = mapped_column(Text)
	city: Mapped[str | None] = mapped_column(String(100))
	state: Mapped[str | None] = mapped_column(String(100))
	pincode: Mapped[str | None] = mapped_column(String(10))

	# Bank details
	bank_name: Mapped[str | None] = mapped_column(String(100))
	bank_account_no: Mapped[str | None] = mapped_column(String(30))
	ifsc_code: Mapped[str | None] = mapped_column(String(20))
	upi_id: Mapped[str | None] = mapped_column(String(100), unique=True)

	# Emergency contact
	emergency_contact_name: Mapped[str | None] = mapped_column(String(150))
	emergency_contact_no: Mapped[str | None] = mapped_column(String(15))

	@property
	def totp_enabled(self):
		return bool(self.totp_secret)


class Brand(Base, SoftDeleteMixin, AuditMixin):
	__tablename__ = "brand"
	__table_args__ = ({"schema": "master"},)

	brand_id: Mapped[int] = mapped_column(Integer, primary_key=True)
	brand_name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
	is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")



class VehicleModel(Base, SoftDeleteMixin, AuditMixin):
	__tablename__ = "vehicle_model"
	__table_args__ = (Index("idx_vehicle_model_material", "created_at"), {"schema": "master"})

	vehicle_model_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
	brand_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("master.brand.brand_id"), nullable=False)
	model_name: Mapped[str] = mapped_column(String(100), nullable=False)
	material_number: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
	colour: Mapped[str] = mapped_column(String(50), nullable=False)
	battery_type: Mapped[str | None] = mapped_column(String(50))
	laden_weight: Mapped[float | None] = mapped_column(nullable=True)
	unladen_weight: Mapped[float | None] = mapped_column(nullable=True)
	hsn_code: Mapped[str | None] = mapped_column(String(20))
	is_active: Mapped[bool] = mapped_column(Boolean, default=True)



class Vehicle(Base, SoftDeleteMixin, AuditMixin):
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



class Vendor(Base, SoftDeleteMixin, AuditMixin):
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



# ==================== SETUP MODULE TABLES ====================


class PaymentMode(Base, AuditMixin):
	__tablename__ = "payment_mode"
	__table_args__ = (
		Index("idx_payment_mode_active", "is_active"),
		{"schema": "master"},
	)

	payment_mode_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
	mode_name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
	description: Mapped[str | None] = mapped_column(Text)
	is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")



class ExpenseCategory(Base, AuditMixin):
	__tablename__ = "expense_category"
	__table_args__ = (
		Index("idx_expense_category_active", "is_active"),
		{"schema": "master"},
	)

	expense_category_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
	category_name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
	description: Mapped[str | None] = mapped_column(Text)
	is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")



class JobCardCategory(Base, AuditMixin):
	__tablename__ = "job_card_category"
	__table_args__ = (
		Index("idx_job_card_category_active", "is_active"),
		{"schema": "master"},
	)

	job_card_category_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
	category_name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
	description: Mapped[str | None] = mapped_column(Text)
	is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")



class InsuranceCompany(Base, AuditMixin):
	__tablename__ = "insurance_company"
	__table_args__ = (
		Index("idx_insurance_company_active", "is_active"),
		{"schema": "master"},
	)

	insurance_company_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
	company_name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
	contact_person: Mapped[str | None] = mapped_column(String(255))
	contact_number: Mapped[str | None] = mapped_column(String(20))
	email: Mapped[str | None] = mapped_column(String(255))
	address: Mapped[str | None] = mapped_column(Text)
	gstin: Mapped[str | None] = mapped_column(String(20))
	is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")



class Bank(Base, AuditMixin):
	__tablename__ = "bank"
	__table_args__ = (
		Index("idx_bank_active", "is_active"),
		{"schema": "master"},
	)

	bank_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
	bank_name: Mapped[str] = mapped_column(String(255), nullable=False)
	branch: Mapped[str | None] = mapped_column(String(255))
	ifsc_code: Mapped[str] = mapped_column(String(11), nullable=False)
	address: Mapped[str | None] = mapped_column(Text)
	contact_number: Mapped[str | None] = mapped_column(String(20))
	is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")



class DocumentType(Base, AuditMixin):
	__tablename__ = "document_type"
	__table_args__ = (
		Index("idx_document_type_active", "is_active"),
		{"schema": "master"},
	)

	document_type_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
	type_name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
	description: Mapped[str | None] = mapped_column(Text)
	applicable_to: Mapped[str | None] = mapped_column(String(20))  # customer, vendor, vehicle, sale, all
	is_mandatory: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
	is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")



class SparePriceHistory(Base):
    __tablename__ = "spare_price_history"
    __table_args__ = ({"schema": "master"},)

    history_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    spare_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("inventory.spare_master.spare_id", ondelete="CASCADE"), nullable=False)
    price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    margin: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    effective_from: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)
    effective_to: Mapped[datetime | None] = mapped_column(TIMESTAMP)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("master.staff.staff_id"))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)


class VehiclePriceHistory(Base):
    __tablename__ = "vehicle_price_history"
    __table_args__ = ({"schema": "master"},)

    history_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    vehicle_model_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("master.vehicle_model.vehicle_model_id", ondelete="CASCADE"), nullable=False)
    price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    effective_from: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)
    effective_to: Mapped[datetime | None] = mapped_column(TIMESTAMP)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("master.staff.staff_id"))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)


class PinResetRequest(Base):
    __tablename__ = "pin_reset_request"
    __table_args__ = ({"schema": "master"},)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    staff_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("master.staff.staff_id", ondelete="CASCADE"), nullable=False)
    request_type: Mapped[str] = mapped_column(String(50), nullable=False) # STAFF_FORGOT_PIN
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING") # PENDING, APPROVED, DENIED
    requested_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)
    processed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP)
    processed_by: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("master.staff.staff_id"))

