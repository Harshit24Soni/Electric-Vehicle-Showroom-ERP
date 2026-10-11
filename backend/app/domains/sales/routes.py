from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.db.session import get_db
from app.domains.sales import services, schemas, models
from app.auth.dependencies import get_current_staff

router = APIRouter(prefix="/sales", tags=["sales"])

@router.post("/", response_model=schemas.SaleResponse)
async def create_sale(
    data: schemas.SaleCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Create a new sale from a lead"""
    try:
        sale = await services.create_sale(db, payload=data, current_staff_id=_staff["staff_id"])
        return sale
    except services.SalesError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/billing", response_model=schemas.SaleResponse, status_code=status.HTTP_201_CREATED)
async def create_sale_billing(
    data: schemas.SaleCreatePayload,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff),
):
    """Full Sales & Billing transaction: Sale + Invoice + Payment + Vehicle SOLD"""
    return await services.create_sale_transaction(db, payload=data, current_user=current_staff)


@router.get("/", response_model=List[schemas.SaleResponse])
async def list_sales(
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """List all sales"""
    return await services.list_sales(db)


@router.get("/{sale_id}", response_model=schemas.SaleResponse)
async def get_sale(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Get a sale by ID"""
    sale = await services.get_sale(db, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    return sale


@router.delete("/{sale_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sale(
    sale_id: int,
    hard_delete: bool = Query(False, description="Permanently delete (Admin/Dealer only)"),
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff)
):
    """Delete a sale (soft delete by default)"""
    success = await services.delete_sale(db, sale_id, current_staff, hard_delete)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")
    return None


@router.post("/receipts", response_model=schemas.ReceiptResponse)
async def add_receipt(
    data: schemas.ReceiptCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Add a payment receipt"""
    try:
        return await services.add_receipt(db, payload=data, current_staff_id=_staff["staff_id"])
    except services.SalesError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{sale_id}/invoice", response_model=schemas.SaleResponse)
async def generate_invoice(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Generate Invoice"""
    try:
        return await services.generate_invoice(db, sale_id)
    except services.SalesError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{sale_id}/challan", response_model=schemas.SaleResponse)
async def generate_challan(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Generate Delivery Challan"""
    try:
        return await services.generate_challan(db, sale_id)
    except services.SalesError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{sale_id}/service-schedule", response_model=schemas.SaleResponse)
async def generate_service_schedule(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Generate Service Schedule"""
    try:
        return await services.generate_service_schedule(db, sale_id)
    except services.SalesError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{sale_id}/delivery-status")
async def get_delivery_status(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Get Document & Delivery Status"""
    try:
        return await services.get_delivery_status(db, sale_id)
    except services.SalesError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{sale_id}/deliver", response_model=schemas.SaleResponse)
async def deliver_vehicle(
    sale_id: int,
    remarks: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Mark sale as delivered"""
    try:
        return await services.deliver_vehicle(db, sale_id, remarks)
    except services.SalesError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{sale_id}/checklist", response_model=schemas.ChecklistResponse)
async def update_checklist(
    sale_id: int,
    data: schemas.ChecklistUpdate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Update Delivery Checklist / Compliance"""
    try:
        return await services.update_checklist(db, sale_id, data)
    except services.SalesError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==================== NEW WORKFLOW ENDPOINTS ====================

@router.post("/{sale_id}/stage", response_model=schemas.SaleResponse)
async def advance_sale_stage(
    sale_id: int,
    data: schemas.StageAdvanceRequest,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    """Advance sale to the next stage"""
    try:
        sale = await services.advance_sale_stage(
            db, sale_id, data, current_staff_id=_staff["staff_id"]
        )
        return sale
    except services.SalesError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/{sale_id}/payments",
    response_model=schemas.SalePaymentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_sale_payment(
    sale_id: int,
    data: schemas.SalePaymentCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    """Add a payment to a sale"""
    try:
        return await services.add_sale_payment(
            db, sale_id, data, current_staff_id=_staff["staff_id"]
        )
    except services.SalesError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/{sale_id}/documents",
    response_model=schemas.SaleDocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_sale_document(
    sale_id: int,
    data: schemas.SaleDocumentCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    """Generate a document (invoice, receipt, challan, etc.) for a sale"""
    try:
        return await services.generate_sale_document(
            db, sale_id, data, current_staff_id=_staff["staff_id"]
        )
    except services.SalesError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{sale_id}/portal", response_model=schemas.PortalTrackingResponse)
async def get_portal_tracking(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    """Get portal work tracking for a sale"""
    portal = await services.get_portal_tracking(db, sale_id)
    if not portal:
        raise HTTPException(status_code=404, detail="Portal tracking not found")
    return portal


@router.patch("/{sale_id}/portal", response_model=schemas.PortalTrackingResponse)
async def update_portal_tracking(
    sale_id: int,
    data: schemas.PortalTrackingUpdate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    """Update portal tracking (insurance, subsidy, RTO, CELEX, number plate)"""
    try:
        return await services.update_portal_tracking(db, sale_id, data)
    except services.SalesError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{sale_id}/progress", response_model=schemas.SaleProgressResponse)
async def get_sale_progress(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    """Get comprehensive sale progress: stage, payments, documents, portal status"""
    try:
        return await services.get_sale_progress(db, sale_id)
    except services.SalesError as e:
        raise HTTPException(status_code=404, detail=str(e))
