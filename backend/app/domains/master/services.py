from sqlalchemy.orm import Session
from datetime import datetime

from app.domains.master import models


class MasterError(Exception):
    pass


def create_customer(db: Session, payload) -> models.Customer:
    c = models.Customer(
        customer_type=payload.customer_type,
        name=payload.name,
        guardian_name=payload.guardian_name,
        primary_phone=payload.primary_phone,
        email=payload.email,
        address_line1=payload.address_line1,
        address_line2=payload.address_line2,
        city=payload.city,
        state=payload.state,
        pincode=payload.pincode,
        aadhaar_no=payload.aadhaar_no,
        pan_no=payload.pan_no,
        gstin=payload.gstin,
        created_at=datetime.utcnow(),
        is_active=True,
    )
    db.add(c)
    db.flush()
    return c


def get_customer(db: Session, customer_id: int):
    return db.get(models.Customer, customer_id)


def list_customers(db: Session, limit: int = 100):
    return db.query(models.Customer).order_by(models.Customer.created_at.desc()).limit(limit).all()


def create_vehicle_model(db: Session, payload) -> models.VehicleModel:
    vm = models.VehicleModel(
        brand=payload.brand,
        model_name=payload.model_name,
        material_number=payload.material_number,
        colour=payload.colour,
        battery_type=payload.battery_type,
        is_active=True,
        created_at=datetime.utcnow(),
    )
    db.add(vm)
    db.flush()
    return vm


def list_vehicle_models(db: Session):
    return db.query(models.VehicleModel).filter(models.VehicleModel.is_active == True).all()


def create_vehicle(db: Session, payload) -> models.Vehicle:
    v = models.Vehicle(
        chassis_no=payload.chassis_no,
        vehicle_model_id=payload.vehicle_model_id,
        date_of_manufacture=payload.date_of_manufacture,
        current_status="IN_STOCK",
        created_at=datetime.utcnow(),
    )
    db.add(v)
    db.flush()
    return v


def get_vehicle(db: Session, chassis_no: str):
    return db.get(models.Vehicle, chassis_no)


def create_vendor(db: Session, payload) -> models.Vendor:
    v = models.Vendor(
        vendor_name=payload.vendor_name,
        vendor_type=payload.vendor_type,
        is_active=True,
        created_at=datetime.utcnow(),
    )
    db.add(v)
    db.flush()
    return v


def list_vendors(db: Session):
    return db.query(models.Vendor).filter(models.Vendor.is_active == True).all()
