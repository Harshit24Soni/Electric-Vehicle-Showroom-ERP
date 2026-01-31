from sqlalchemy.orm import Session
from datetime import datetime
from sqlalchemy import select
from typing import List

from app.domains.inventory.services import is_vehicle_available
from app.domains.sales.models import VehicleSale
from app.domains.inventory.services import add_vehicle_movement


def create_vehicle_sale(
    db: Session,
    *,
    lead_id: int,
    chassis_no: str,
    booking_amount: float,
    remarks: str | None = None,
) -> VehicleSale:

    # 1. Create sale record
    sale = VehicleSale(
        lead_id=lead_id,
        chassis_no=chassis_no,
        booking_amount=booking_amount,
        sale_status="BOOKED",
        remarks=remarks,
    )
    db.add(sale)
    db.flush()  # get sale_id

    # 2. Allocate vehicle in inventory
    add_vehicle_movement(
        db=db,
        chassis_no=chassis_no,
        movement_type="ALLOCATED",
        reference_type="SALE",
        reference_id=sale.sale_id,
        remarks="Vehicle allocated on booking",
    )

    return sale

def confirm_vehicle_delivery(
    db: Session,
    *,
    sale: VehicleSale,
    remarks: str | None = None,
):
    if sale.sale_status == "DELIVERED":
        raise ValueError("Vehicle already delivered")

    # 1. Inventory delivery
    add_vehicle_movement(
        db=db,
        chassis_no=sale.chassis_no,
        movement_type="DELIVERED",
        reference_type="SALE",
        reference_id=sale.sale_id,
        remarks="Vehicle delivered to customer",
    )

    # 2. Update sale
    sale.sale_status = "DELIVERED"
    sale.delivered_at = datetime.utcnow()
    sale.remarks = remarks

def list_vehicle_sales(
    db: Session,
    *,
    status: str | None = None,
) -> List[VehicleSale]:
    query = db.query(VehicleSale)

    if status:
        query = query.filter(VehicleSale.sale_status == status)

    return (
        query
        .order_by(VehicleSale.created_at.desc())
        .all()
    )

def get_vehicle_sale_detail(
    db: Session,
    *,
    sale_id: int,
) -> tuple[VehicleSale, bool]:
    sale = db.get(VehicleSale, sale_id)
    if not sale:
        raise ValueError("Sale not found")

    available = is_vehicle_available(db, sale.chassis_no)

    return sale, available

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.domains.sales.models import VehicleSale
from app.domains.inventory.services import (
    add_vehicle_movement,
    is_vehicle_available,
)


class SaleError(Exception):
    pass


class VehicleAlreadySoldError(SaleError):
    pass


class VehicleNotAvailableForSaleError(SaleError):
    pass


def create_vehicle_sale(
    db: Session,
    *,
    lead_id: int,
    chassis_no: str,
    booking_amount: float,
    remarks: str | None = None,
) -> VehicleSale:

    # 1️⃣ Hard check: vehicle availability (derived, not guessed)
    if not is_vehicle_available(db, chassis_no):
        raise VehicleNotAvailableForSaleError(
            f"Vehicle {chassis_no} is not available for sale"
        )

    # 2️⃣ Create sale (DB constraints still apply)
    sale = VehicleSale(
        lead_id=lead_id,
        chassis_no=chassis_no,
        booking_amount=booking_amount,
        sale_status="BOOKED",
        remarks=remarks,
    )

    db.add(sale)

    try:
        db.flush()
    except IntegrityError:
        # catches:
        # - duplicate lead
        # - duplicate chassis
        raise VehicleAlreadySoldError(
            "Lead or vehicle already converted to sale"
        )

    # 3️⃣ Allocate vehicle (inventory-validated)
    add_vehicle_movement(
        db=db,
        chassis_no=chassis_no,
        movement_type="ALLOCATED",
        reference_type="SALE",
        reference_id=sale.sale_id,
        remarks="Vehicle allocated on booking",
    )

    return sale

from datetime import datetime
from app.domains.inventory.services import get_latest_vehicle_movement


class InvalidSaleDeliveryError(SaleError):
    pass


def confirm_vehicle_delivery(
    db: Session,
    *,
    sale: VehicleSale,
    remarks: str | None = None,
):

    # 1️⃣ Sale state check
    if sale.sale_status != "BOOKED":
        raise InvalidSaleDeliveryError(
            f"Sale {sale.sale_id} not eligible for delivery"
        )

    # 2️⃣ Inventory state check (must be allocated to THIS sale)
    last_movement = get_latest_vehicle_movement(
        db, sale.chassis_no
    )

    if (
        not last_movement
        or last_movement.movement_type != "ALLOCATED"
        or last_movement.reference_type != "SALE"
        or last_movement.reference_id != sale.sale_id
    ):
        raise InvalidSaleDeliveryError(
            "Vehicle is not allocated to this sale"
        )

    # 3️⃣ Deliver vehicle (inventory)
    add_vehicle_movement(
        db=db,
        chassis_no=sale.chassis_no,
        movement_type="DELIVERED",
        reference_type="SALE",
        reference_id=sale.sale_id,
        remarks="Vehicle delivered to customer",
    )

    # 4️⃣ Update sale
    sale.sale_status = "DELIVERED"
    sale.delivered_at = datetime.utcnow()
    sale.remarks = remarks
