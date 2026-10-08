from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.db.session import get_db
from app.auth.dependencies import get_current_staff
from app.auth.roles import require_roles
from app.domains.inventory.schemas_tags import (
    TagCreateRequest, BulkTagCreateRequest, InventoryTagResponse, TagScanResult
)
from app.domains.inventory import services_tags

router = APIRouter(prefix="/tags", tags=["Inventory Tags"])

@router.post("/bulk", response_model=List[InventoryTagResponse])
async def create_tags(
    req: BulkTagCreateRequest,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_roles("ADMIN", "MANAGER", "DEALER"))
):
    return await services_tags.create_tags(db, req, getattr(_staff, "staff_id", 0))

@router.get("", response_model=dict)
async def list_tags(
    spare_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    return await services_tags.list_tags(db, spare_id=spare_id, status=status, page=page, size=size)

@router.get("/scan/{identifier}", response_model=TagScanResult)
async def scan_tag(
    identifier: str = Path(...),
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    return await services_tags.scan_tag(db, identifier)

@router.post("/{tag_id}/reprint", response_model=InventoryTagResponse)
async def reprint_tag(
    tag_id: int = Path(...),
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_roles("ADMIN", "MANAGER", "DEALER"))
):
    return await services_tags.reprint_tag(db, tag_id)

@router.put("/{tag_id}/revoke", response_model=InventoryTagResponse)
async def revoke_tag(
    tag_id: int = Path(...),
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_roles("ADMIN", "DEALER"))
):
    return await services_tags.revoke_tag(db, tag_id)

@router.get("/{tag_id}/qr")
async def get_tag_qr(
    tag_id: int = Path(...),
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    # Just fetch tag identifier to generate QR
    from sqlalchemy import select
    from app.modules.inventory.models import InventoryTag
    res = await db.execute(select(InventoryTag.tag_identifier).where(InventoryTag.tag_id == tag_id))
    identifier = res.scalar_one_or_none()
    if not identifier:
        raise HTTPException(status_code=404, detail="Tag not found")
        
    qr_b64 = services_tags.generate_qr_base64(identifier)
    return {"qr_base64": qr_b64, "identifier": identifier}
