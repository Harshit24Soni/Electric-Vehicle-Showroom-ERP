from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List
from datetime import datetime
from fastapi import HTTPException

from app.domains.warranty import models as wm
from app.domains.warranty import schemas as ws
from app.domains.master import models as mm
from app.core.event_bus import event_bus, DefectiveSpareReturnedEvent, WarrantyReplacementIssuedEvent

class WarrantyError(Exception):
    pass

async def swap_vehicle_component(db: AsyncSession, payload: ws.ComponentSwapRequest) -> wm.Claim:
    # 1. Fetch Vehicle
    stmt = select(mm.Vehicle).filter_by(chassis_no=payload.chassis_no, is_deleted=False)
    result = await db.execute(stmt)
    vehicle = result.scalars().first()
    if not vehicle:
        raise WarrantyError(f"Vehicle {payload.chassis_no} not found")

    # 2. Verify Old Serial No matches the component type
    attr_name = f"{payload.component_type}_serial_no"
    current_serial = getattr(vehicle, attr_name, None)
    if current_serial != payload.old_serial_no:
        raise WarrantyError(f"Vehicle {payload.component_type} serial mismatch. Expected: {payload.old_serial_no}, Found: {current_serial}")

    # 3. We cannot query im.SpareSerial directly without violating boundaries.
    # Instead, we proceed assuming serial numbers exist/are valid and let the event handlers figure it out.
    # In a real app, we would make a synchronous cross-domain read via contracts here if validation was strictly required.

    # 4. Publish Event for Defective component (WARRANTY_INWARD)
    await event_bus.publish(
        DefectiveSpareReturnedEvent(
            spare_id=0, # In a real implementation we would look this up via a Contract
            serial_id=0, # We would look this up via a Contract based on old_serial_no
            job_card_id=payload.job_card_id
        )
    )

    # 5. Publish Event for new component (WARRANTY_OUTWARD)
    await event_bus.publish(
        WarrantyReplacementIssuedEvent(
            spare_id=0,
            serial_id=0,
            job_card_id=payload.job_card_id
        )
    )

    # 6. Update Vehicle Master
    setattr(vehicle, attr_name, payload.new_serial_no)

    # 7. Create Claim record (using payload.old_serial_no as reference since movement_id won't exist yet)
    # We alter the schema expectation here conceptually: job_spare_id becomes a generic string reference for old_serial_no
    claim = wm.Claim(
        job_spare_id=0, # No longer strictly tied to a DB foreign key ID from inventory
        claim_status="pending",
        so_number=f"WAR-SWAP-{payload.job_card_id}-{int(datetime.utcnow().timestamp())}",
        remarks=payload.remarks or f"Swap {payload.old_serial_no} -> {payload.new_serial_no}",
        created_at=datetime.utcnow(),
    )
    db.add(claim)
    await db.flush()
    return claim



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
