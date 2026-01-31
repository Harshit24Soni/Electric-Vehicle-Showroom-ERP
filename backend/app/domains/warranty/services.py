from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List
from datetime import datetime

from app.domains.warranty import models as wm
from app.domains.warranty import schemas as ws


class WarrantyError(Exception):
    pass


def create_claim(db: Session, payload: ws.ClaimCreate) -> wm.Claim:
    claim = wm.Claim(
        job_spare_id=payload.job_spare_id,
        claim_status="pending",
        so_number=payload.so_number,
        remarks=payload.remarks,
        created_at=datetime.utcnow(),
    )
    db.add(claim)
    db.flush()
    db.refresh(claim)
    return claim


def list_claims(db: Session, skip: int = 0, limit: int = 50) -> List[wm.Claim]:
    q = select(wm.Claim).offset(skip).limit(limit)
    return db.execute(q).scalars().all()


def get_claim(db: Session, claim_id: int) -> wm.Claim | None:
    return db.get(wm.Claim, claim_id)


def create_inward_with_items(db: Session, payload: ws.InwardCreate) -> wm.Inward:
    inward = wm.Inward(
        oem_invoice_no=payload.oem_invoice_no,
        oem_invoice_date=payload.oem_invoice_date,
        remarks=payload.remarks,
        created_at=datetime.utcnow(),
    )
    db.add(inward)
    db.flush()
    for item in payload.items:
        ii = wm.InwardItem(
            warranty_inward_id=inward.warranty_inward_id,
            spare_id=item.spare_id,
            quantity=item.quantity,
            unit_cost=item.unit_cost,
            created_at=datetime.utcnow(),
        )
        db.add(ii)
    db.flush()
    db.refresh(inward)
    return inward


def create_shipment_with_items(db: Session, payload: ws.ShipmentCreate) -> wm.Shipment:
    shipment = wm.Shipment(
        courier_name=payload.courier_name,
        docket_no=payload.docket_no,
        dispatch_date=payload.dispatch_date,
        created_at=datetime.utcnow(),
    )
    db.add(shipment)
    db.flush()
    for it in payload.items:
        claim = db.get(wm.Claim, it.claim_id)
        if not claim:
            raise WarrantyError(f"Claim {it.claim_id} not found")
        si = wm.ShipmentItem(
            shipment_id=shipment.shipment_id,
            claim_id=it.claim_id,
        )
        db.add(si)
        claim.claim_status = "shipped"
        db.add(claim)
    db.flush()
    db.refresh(shipment)
    return shipment
