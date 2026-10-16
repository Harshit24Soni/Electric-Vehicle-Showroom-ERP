import logging
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from fastapi import HTTPException

from app.modules.warranty import models as wm
from app.modules.warranty import schemas as ws
from app.modules.master import models as mm
from app.core.event_bus import event_bus, DefectiveSpareReturnedEvent, WarrantyReplacementIssuedEvent
from app.db.mixins import utc_now_naive

logger = logging.getLogger(__name__)

_utc_now_naive = utc_now_naive


class WarrantyError(Exception):
    pass


async def swap_vehicle_component(db: AsyncSession, payload: ws.ComponentSwapRequest) -> wm.Claim:
    """Perform a physical component warranty swap, updating the vehicle master and emitting domain events."""
    try:
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
            raise WarrantyError(
                f"Vehicle {payload.component_type} serial mismatch. Expected: {payload.old_serial_no}, Found: {current_serial}"
            )

        # 3. Update Vehicle Master
        setattr(vehicle, attr_name, payload.new_serial_no)

        # 4. Create Claim record
        claim = wm.Claim(
            job_spare_id=0,
            claim_status="pending",
            so_number=f"WAR-SWAP-{payload.job_card_id}-{int(_utc_now_naive().timestamp())}",
            remarks=payload.remarks or f"Swap {payload.old_serial_no} -> {payload.new_serial_no}",
            created_at=_utc_now_naive(),
        )
        db.add(claim)
        await db.flush()

        # 5. Publish events for defective component & replacement component
        await event_bus.publish(DefectiveSpareReturnedEvent(spare_id=0, serial_id=0, job_card_id=payload.job_card_id))
        await event_bus.publish(
            WarrantyReplacementIssuedEvent(spare_id=0, serial_id=0, job_card_id=payload.job_card_id)
        )

        return claim
    except Exception as exc:
        await db.rollback()
        logger.error(
            "Failed to execute warranty component swap for vehicle %s: %s", payload.chassis_no, exc, exc_info=True
        )
        raise


async def create_claim(db: AsyncSession, payload: ws.ClaimCreate) -> wm.Claim:
    """Create a new warranty claim."""
    try:
        claim = wm.Claim(
            job_spare_id=payload.job_spare_id,
            claim_status="pending",
            so_number=payload.so_number,
            remarks=payload.remarks,
            created_at=_utc_now_naive(),
        )
        db.add(claim)
        await db.flush()
        return claim
    except Exception as exc:
        await db.rollback()
        logger.error("Failed to create warranty claim %s: %s", payload.so_number, exc, exc_info=True)
        raise


async def list_claims(db: AsyncSession, skip: int = 0, limit: int = 50) -> List[wm.Claim]:
    """List all warranty claims (excludes soft-deleted)."""
    stmt = (
        select(wm.Claim)
        .filter(wm.Claim.is_deleted.is_(False))
        .offset(skip)
        .limit(limit)
        .order_by(desc(wm.Claim.created_at))
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_claim(db: AsyncSession, claim_id: int) -> Optional[wm.Claim]:
    """Get a claim by ID (excludes soft-deleted)."""
    stmt = select(wm.Claim).filter(wm.Claim.claim_id == claim_id, wm.Claim.is_deleted.is_(False))
    result = await db.execute(stmt)
    return result.scalars().first()


async def create_inward_with_items(db: AsyncSession, payload: ws.InwardCreate) -> wm.Inward:
    """Create an inward warranty receipt with items."""
    try:
        inward = wm.Inward(
            oem_invoice_no=payload.oem_invoice_no,
            oem_invoice_date=payload.oem_invoice_date,
            remarks=payload.remarks,
            created_at=_utc_now_naive(),
        )
        db.add(inward)
        await db.flush()
        for item in payload.items:
            ii = wm.InwardItem(
                warranty_inward_id=inward.warranty_inward_id,
                spare_id=item.spare_id,
                quantity=item.quantity,
                unit_cost=item.unit_cost,
                created_at=_utc_now_naive(),
            )
            db.add(ii)
        await db.flush()
        return inward
    except Exception as exc:
        await db.rollback()
        logger.error("Failed to create warranty inward with items: %s", exc, exc_info=True)
        raise


async def create_shipment_with_items(db: AsyncSession, payload: ws.ShipmentCreate) -> wm.Shipment:
    """Create a warranty shipment and link claims."""
    try:
        shipment = wm.Shipment(
            courier_name=payload.courier_name,
            docket_no=payload.docket_no,
            dispatch_date=payload.dispatch_date,
            created_at=_utc_now_naive(),
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
    except Exception as exc:
        await db.rollback()
        logger.error("Failed to create warranty shipment: %s", exc, exc_info=True)
        raise


# ==================== DELETE SERVICES ====================


async def delete_claim(db: AsyncSession, claim_id: int, current_user: dict, hard_delete: bool = False) -> bool:
    """Delete a warranty claim (soft by default, hard if authorized)."""
    claim = await get_claim(db, claim_id)
    if not claim:
        return False

    if hard_delete:
        if current_user["designation"] not in ["Admin", "Dealer"]:
            raise HTTPException(status_code=403, detail="Not authorized to permanently delete")
        await db.delete(claim)
    else:
        claim.is_deleted = True
        claim.deleted_at = _utc_now_naive()
        claim.deleted_by = current_user["staff_id"]

    await db.flush()
    return True
