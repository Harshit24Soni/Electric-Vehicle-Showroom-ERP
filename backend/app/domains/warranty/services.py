from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List
from datetime import datetime
from fastapi import HTTPException

from app.domains.warranty import models as wm
from app.domains.warranty import schemas as ws


class WarrantyError(Exception):
    pass


async def create_claim(db: AsyncSession, payload: ws.ClaimCreate) -> wm.Claim:
    """Create a new warranty claim"""
    claim = wm.Claim(
        job_spare_id=payload.job_spare_id,
        claim_status="pending",
        so_number=payload.so_number,
        remarks=payload.remarks,
        created_at=datetime.utcnow(),
    )
    db.add(claim)
    await db.flush()
    return claim


async def list_claims(db: AsyncSession, skip: int = 0, limit: int = 50) -> List[wm.Claim]:
    """List all warranty claims (excludes soft-deleted)"""
    stmt = select(wm.Claim).filter(
        wm.Claim.is_deleted == False
    ).offset(skip).limit(limit).order_by(desc(wm.Claim.created_at))
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_claim(db: AsyncSession, claim_id: int) -> wm.Claim | None:
    """Get a claim by ID (excludes soft-deleted)"""
    stmt = select(wm.Claim).filter(
        wm.Claim.claim_id == claim_id,
        wm.Claim.is_deleted == False
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def create_inward_with_items(db: AsyncSession, payload: ws.InwardCreate) -> wm.Inward:
    """Create an inward record with items"""
    inward = wm.Inward(
        oem_invoice_no=payload.oem_invoice_no,
        oem_invoice_date=payload.oem_invoice_date,
        remarks=payload.remarks,
        created_at=datetime.utcnow(),
    )
    db.add(inward)
    await db.flush()
    for item in payload.items:
        ii = wm.InwardItem(
            warranty_inward_id=inward.warranty_inward_id,
            spare_id=item.spare_id,
            quantity=item.quantity,
            unit_cost=item.unit_cost,
            created_at=datetime.utcnow(),
        )
        db.add(ii)
    await db.flush()
    return inward


async def create_shipment_with_items(db: AsyncSession, payload: ws.ShipmentCreate) -> wm.Shipment:
    """Create a shipment with items"""
    shipment = wm.Shipment(
        courier_name=payload.courier_name,
        docket_no=payload.docket_no,
        dispatch_date=payload.dispatch_date,
        created_at=datetime.utcnow(),
    )
    db.add(shipment)
    await db.flush()
    for it in payload.items:
        claim = await get_claim(db, it.claim_id)
        if not claim:
            raise WarrantyError(f"Claim {it.claim_id} not found")
        si = wm.ShipmentItem(
            shipment_id=shipment.shipment_id,
            claim_id=it.claim_id,
        )
        db.add(si)
        claim.claim_status = "shipped"
    await db.flush()
    return shipment


# ==================== DELETE SERVICES ====================

async def delete_claim(
    db: AsyncSession, claim_id: int,
    current_user: dict, hard_delete: bool = False
) -> bool:
    """Delete a warranty claim (soft by default, hard if authorized)"""
    claim = await get_claim(db, claim_id)
    if not claim:
        return False

    if hard_delete:
        if current_user["designation"] not in ["Admin", "Dealer"]:
            raise HTTPException(status_code=403, detail="Not authorized to permanently delete")
        await db.delete(claim)
    else:
        claim.is_deleted = True
        claim.deleted_at = datetime.utcnow()
        claim.deleted_by = current_user["staff_id"]

    await db.flush()
    return True
