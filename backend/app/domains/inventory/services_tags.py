import uuid
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func
from fastapi import HTTPException
import qrcode
import base64
import io

from app.modules.inventory.models import (
    InventoryTag, TagStatus, SpareMaster, SpareBatch, SpareSerial, SpareStockBalance, SparePartCode
)
from app.domains.inventory.schemas_tags import (
    TagCreateRequest, BulkTagCreateRequest, InventoryTagResponse
)

def _generate_opaque_identifier() -> str:
    # SPT- + 12 random hex chars
    return f"SPT-{uuid.uuid4().hex[:12].upper()}"

async def _enrich_tag(db: AsyncSession, tag: InventoryTag) -> InventoryTagResponse:
    # Fetch spare and current code
    spare_res = await db.execute(select(SpareMaster).where(SpareMaster.spare_id == tag.spare_id))
    spare = spare_res.scalar_one_or_none()
    
    code_res = await db.execute(
        select(SparePartCode.code)
        .where(SparePartCode.spare_id == tag.spare_id, SparePartCode.is_current == True)
    )
    current_code = code_res.scalar_one_or_none()

    resp = InventoryTagResponse.model_validate(tag)
    if spare:
        resp.spare_name = spare.spare_name
        resp.spare_code = current_code
        
    # Real-time resolution based on tracking mode
    if tag.tracking_mode == "SERIALIZED" and tag.serial_id:
        serial_res = await db.execute(select(SpareSerial).where(SpareSerial.serial_id == tag.serial_id))
        serial = serial_res.scalar_one_or_none()
        if serial:
            resp.serial_number = serial.serial_no
            resp.location = serial.location
            resp.inventory_status = serial.status
            resp.available_quantity = 1 if serial.status == "AVAILABLE" else 0
            
    elif tag.tracking_mode == "BATCH" and tag.batch_id:
        batch_res = await db.execute(select(SpareBatch).where(SpareBatch.batch_id == tag.batch_id))
        batch = batch_res.scalar_one_or_none()
        if batch:
            resp.batch_number = batch.batch_number
            resp.location = batch.location
            resp.inventory_status = batch.status
            resp.available_quantity = batch.quantity
            
    elif tag.tracking_mode == "QUANTITY":
        # Sum of balances
        bal_res = await db.execute(select(func.sum(SpareStockBalance.quantity)).where(SpareStockBalance.spare_id == tag.spare_id))
        total_qty = bal_res.scalar_one_or_none() or 0
        resp.available_quantity = total_qty
        
        # If tag had an initial location, we can return the balance for that location as well
        # but the prompt says "Scanning the same QR on Day 10 must return Location B".
        # For quantity, if we just show all locations, that's better. We will set location to "VARIOUS" if multiple.
        loc_res = await db.execute(select(SpareStockBalance.location).where(SpareStockBalance.spare_id == tag.spare_id, SpareStockBalance.quantity > 0))
        locations = loc_res.scalars().all()
        if locations:
            resp.location = ", ".join(locations)
        else:
            resp.location = "OUT OF STOCK"
        resp.inventory_status = "AVAILABLE" if total_qty > 0 else "OUT OF STOCK"

    return resp

async def scan_tag(db: AsyncSession, identifier: str) -> InventoryTagResponse:
    res = await db.execute(select(InventoryTag).where(InventoryTag.tag_identifier == identifier))
    tag = res.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
        
    # We still enrich and return even if REVOKED or RETIRED. The UI will show status.
    return await _enrich_tag(db, tag)

async def create_tags(db: AsyncSession, req: BulkTagCreateRequest, current_user_id: int) -> List[InventoryTagResponse]:
    # Validate Spare
    spare_res = await db.execute(select(SpareMaster).where(SpareMaster.spare_id == req.spare_id))
    spare = spare_res.scalar_one_or_none()
    if not spare:
        raise HTTPException(status_code=404, detail="Spare not found")
        
    if spare.tracking_mode != req.tracking_mode:
        raise HTTPException(status_code=400, detail="Tracking mode mismatch")

    created_tags = []
    
    if req.tracking_mode == "SERIALIZED":
        if not req.serial_ids:
            raise HTTPException(status_code=400, detail="Serial IDs required for SERIALIZED tracking mode")
        for sid in req.serial_ids:
            # Verify serial exists
            serial_res = await db.execute(select(SpareSerial).where(SpareSerial.serial_id == sid, SpareSerial.spare_id == req.spare_id))
            if not serial_res.scalar_one_or_none():
                raise HTTPException(status_code=400, detail=f"Serial ID {sid} invalid")
                
            tag = InventoryTag(
                tag_identifier=_generate_opaque_identifier(),
                tracking_mode="SERIALIZED",
                spare_id=req.spare_id,
                serial_id=sid
            )
            db.add(tag)
            created_tags.append(tag)
            
    elif req.tracking_mode == "BATCH":
        if not req.batch_id:
            raise HTTPException(status_code=400, detail="Batch ID required for BATCH tracking mode")
        batch_res = await db.execute(select(SpareBatch).where(SpareBatch.batch_id == req.batch_id, SpareBatch.spare_id == req.spare_id))
        if not batch_res.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Batch ID invalid")
            
        qty = req.quantity or 1
        for _ in range(qty):
            tag = InventoryTag(
                tag_identifier=_generate_opaque_identifier(),
                tracking_mode="BATCH",
                spare_id=req.spare_id,
                batch_id=req.batch_id
            )
            db.add(tag)
            created_tags.append(tag)
            
    elif req.tracking_mode == "QUANTITY":
        qty = req.quantity or 1
        for _ in range(qty):
            tag = InventoryTag(
                tag_identifier=_generate_opaque_identifier(),
                tracking_mode="QUANTITY",
                spare_id=req.spare_id
            )
            db.add(tag)
            created_tags.append(tag)

    await db.flush()
    
    responses = []
    for t in created_tags:
        responses.append(await _enrich_tag(db, t))
        
    return responses

async def list_tags(db: AsyncSession, spare_id: Optional[int] = None, status: Optional[str] = None, page: int = 1, size: int = 20):
    query = select(InventoryTag)
    if spare_id:
        query = query.where(InventoryTag.spare_id == spare_id)
    if status:
        query = query.where(InventoryTag.status == status)
        
    query = query.order_by(desc(InventoryTag.created_at))
    query = query.offset((page - 1) * size).limit(size)
    
    res = await db.execute(query)
    tags = res.scalars().all()
    
    # Enrich tags
    enriched = []
    for t in tags:
        enriched.append(await _enrich_tag(db, t))
        
    # Get total
    count_q = select(func.count(InventoryTag.tag_id))
    if spare_id:
        count_q = count_q.where(InventoryTag.spare_id == spare_id)
    if status:
        count_q = count_q.where(InventoryTag.status == status)
        
    total = (await db.execute(count_q)).scalar_one_or_none() or 0
    
    return {
        "items": enriched,
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size
    }

async def reprint_tag(db: AsyncSession, tag_id: int) -> InventoryTagResponse:
    res = await db.execute(select(InventoryTag).where(InventoryTag.tag_id == tag_id))
    tag = res.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
        
    if tag.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Only active tags can be printed")
        
    tag.print_count += 1
    tag.last_printed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.flush()
    
    return await _enrich_tag(db, tag)

async def revoke_tag(db: AsyncSession, tag_id: int, reason: str = "") -> InventoryTagResponse:
    res = await db.execute(select(InventoryTag).where(InventoryTag.tag_id == tag_id))
    tag = res.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
        
    tag.status = TagStatus.REVOKED
    tag.revoked_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.flush()
    
    return await _enrich_tag(db, tag)

def generate_qr_base64(identifier: str) -> str:
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(identifier)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    img_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return img_str
