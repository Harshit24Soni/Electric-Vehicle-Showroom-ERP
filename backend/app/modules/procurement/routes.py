from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.dependencies import get_current_staff
from app.auth.roles import require_roles
from app.modules.procurement import schemas, services
from app.modules.procurement.ocr_service import OCRService

router = APIRouter(prefix="/procurement", tags=["Procurement"])


@router.post("/purchases/spares", response_model=schemas.PurchaseResponse, status_code=status.HTTP_201_CREATED)
async def create_spare_purchase(
    data: schemas.SparePurchaseCreate,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(require_roles("DEALER", "ADMIN")),
):
    """Create a new Spare Purchase (Dealer/Admin)"""
    return await services.create_spare_purchase(db, data)


@router.post("/purchases/spares/ocr", response_model=schemas.SparePurchaseResponse, status_code=status.HTTP_201_CREATED)
async def ocr_upload_invoice(
    vendor_id: int = Form(...),
    file: Optional[UploadFile] = File(None),
    files: Optional[List[UploadFile]] = File(None),
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(require_roles("DEALER", "ADMIN")),
):
    """Upload one or more invoice files/pages and trigger OCR to create an accumulated Draft Purchase Receipt"""
    uploaded_files: List[UploadFile] = []
    if files:
        uploaded_files.extend(files)
    elif file:
        uploaded_files.append(file)

    if not uploaded_files:
        raise HTTPException(status_code=400, detail="No invoice files provided.")

    for f in uploaded_files:
        if not f.filename.lower().endswith((".pdf", ".png", ".jpg", ".jpeg")):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type for {f.filename}. Allowed: pdf, png, jpg, jpeg",
            )

    ocr_service = OCRService()
    try:
        purchase = await ocr_service.process_invoices(db, vendor_id, uploaded_files)
        return purchase
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")


@router.put("/purchases/spares/{spare_purchase_id}/verify", response_model=schemas.SparePurchaseResponse)
async def verify_spare_purchase(
    spare_purchase_id: int,
    data: schemas.SparePurchaseCreate,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(require_roles("DEALER", "ADMIN")),
):
    """Verify and update OCR extracted draft (Dealer/Admin)"""
    return await services.verify_spare_purchase(db, spare_purchase_id, data, current_staff=current_staff)


@router.put("/purchases/spares/{spare_purchase_id}", response_model=schemas.SparePurchaseResponse)
async def update_spare_purchase(
    spare_purchase_id: int,
    data: schemas.SparePurchaseCreate,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(require_roles("DEALER", "ADMIN")),
):
    """Update an existing spare purchase order/invoice (Dealer/Admin)"""
    return await services.verify_spare_purchase(db, spare_purchase_id, data, current_staff=current_staff)


@router.post("/purchases/spares/{spare_purchase_id}/approve", response_model=schemas.SparePurchaseResponse)
async def approve_spare_purchase(
    spare_purchase_id: int, db: AsyncSession = Depends(get_db), current_staff=Depends(require_roles("DEALER", "ADMIN"))
):
    """Approve verified draft, finalize Landed Cost and trigger Inventory Update"""
    return await services.approve_spare_purchase(db, spare_purchase_id)


@router.post("/purchases/spares/{spare_purchase_id}/post", response_model=schemas.SparePurchaseResponse)
async def post_spare_purchase(
    spare_purchase_id: int,
    payload: schemas.PostPurchaseReceiptRequest,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(require_roles("DEALER", "ADMIN")),
):
    """Post approved purchase receipt to inventory"""
    return await services.post_spare_purchase(db, spare_purchase_id, payload)


@router.post(
    "/purchases/vehicles/intake",
    response_model=schemas.VehicleIntakeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def intake_vehicles(
    data: schemas.VehicleIntakePayload,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(require_roles("DEALER", "ADMIN")),
):
    """Bulk-register vehicles from an OEM invoice into inventory"""
    return await services.process_vehicle_intake(db, payload=data, current_user=current_staff)


@router.get("/purchases/spares", response_model=list[schemas.SparePurchaseResponse])
async def list_spare_purchases(
    db: AsyncSession = Depends(get_db), current_staff=Depends(require_roles("DEALER", "ADMIN"))
):
    """List Spare Purchases"""
    return await services.list_spare_purchases(db)


@router.get("/purchases/spares/{spare_purchase_id}", response_model=Optional[schemas.SparePurchaseResponse])
async def get_spare_purchase(
    spare_purchase_id: int, db: AsyncSession = Depends(get_db), current_staff=Depends(require_roles("DEALER", "ADMIN"))
):
    """Get single Spare Purchase"""
    purchase = await services.get_spare_purchase(db, spare_purchase_id)
    if not purchase:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Spare purchase not found")
    return purchase


@router.get("/purchases/vehicles", response_model=list[schemas.VehiclePurchaseResponse])
async def list_vehicle_purchases(
    db: AsyncSession = Depends(get_db), current_staff=Depends(require_roles("DEALER", "ADMIN"))
):
    """List Vehicle Purchases"""
    return await services.list_vehicle_purchases(db)


@router.delete("/purchases/spares/{spare_purchase_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_spare_purchase(
    spare_purchase_id: int,
    hard_delete: bool = Query(False, description="Permanently delete (Admin/Dealer only)"),
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff),
):
    """Delete a spare purchase (soft delete by default)"""
    success = await services.delete_spare_purchase(db, spare_purchase_id, current_staff, hard_delete)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Spare purchase not found")
    return None


@router.delete("/purchases/vehicles/{vehicle_purchase_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vehicle_purchase(
    vehicle_purchase_id: int,
    hard_delete: bool = Query(False, description="Permanently delete (Admin/Dealer only)"),
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff),
):
    """Delete a vehicle purchase (soft delete by default)"""
    success = await services.delete_vehicle_purchase(db, vehicle_purchase_id, current_staff, hard_delete)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle purchase not found")
    return None


@router.post("/temporary-items", response_model=schemas.TemporaryItemResponse, status_code=status.HTTP_201_CREATED)
async def create_temporary_item(
    data: schemas.TemporaryItemCreate,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(require_roles("DEALER", "ADMIN")),
):
    """Create a temporary item (Dealer/Admin)"""
    return await services.create_temporary_item(db, data, current_staff.staff_id)


@router.get("/temporary-items", response_model=list[schemas.TemporaryItemResponse])
async def list_temporary_items(db: AsyncSession = Depends(get_db), current_staff=Depends(require_roles("ADMIN"))):
    """List pending temporary items (Admin only)"""
    return await services.list_temporary_items(db)


@router.put("/temporary-items/{spare_id}/approve", response_model=schemas.TemporaryItemResponse)
async def approve_temporary_item(
    spare_id: int, db: AsyncSession = Depends(get_db), current_staff=Depends(require_roles("ADMIN"))
):
    """Approve temporary item (Admin only)"""
    return await services.approve_temporary_item(db, spare_id)
