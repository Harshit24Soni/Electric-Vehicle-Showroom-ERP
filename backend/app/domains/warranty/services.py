from sqlalchemy.orm import Session
from app.domains.warranty.models import WarrantyClaim

def raise_claim(
    db: Session,
    *,
    job_card_id: int,
    spare_id: int,
    serial_id: int | None,
    remarks: str | None = None,
):
    claim = WarrantyClaim(
        job_card_id=job_card_id,
        spare_id=spare_id,
        serial_id=serial_id,
        remarks=remarks,
    )
    db.add(claim)
    db.flush()
    return claim

from app.domains.inventory.services import add_spare_movement

def receive_warranty_part(
    db: Session,
    *,
    claim_id: int,
    spare_id: int,
    serial_id: int | None,
):
    add_spare_movement(
        db=db,
        spare_id=spare_id,
        quantity=1,
        serial_id=serial_id,
        movement_type="WARRANTY_INWARD",
        reference_type="WARRANTY",
        reference_id=claim_id,
        remarks="Warranty replacement received",
    )

from app.domains.warranty.models import WarrantyShipment, WarrantyShipmentItem

def create_warranty_shipment(
    db: Session,
    *,
    claim_ids: list[int],
):
    shipment = WarrantyShipment()
    db.add(shipment)
    db.flush()

    for cid in claim_ids:
        db.add(
            WarrantyShipmentItem(
                shipment_id=shipment.shipment_id,
                claim_id=cid,
            )
        )

    return shipment

class WarrantyError(Exception):
    pass


class InvalidWarrantyClaimError(WarrantyError):
    pass
