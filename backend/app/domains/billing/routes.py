from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.dependencies import get_current_staff
from app.auth.roles import require_roles
from app.domains.billing.schemas import InvoiceCreate, InvoiceUpdate, InvoiceResponse
from app.domains.billing import services

router = APIRouter(
    prefix="/billing",
    tags=["Billing"],
    dependencies=[Depends(get_current_staff)],
)


@router.post("/invoice", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    data: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    try:
        invoice = await services.generate_invoice(
            db=db,
            sale_id=data.sale_id,
            taxable_amount=data.taxable_amount,
            gst_rate=data.gst_rate,
            remarks=data.remarks,
        )
        return invoice
    except services.InvoiceAlreadyExistsError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except services.BillingError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/invoices", response_model=list[InvoiceResponse])
async def list_invoices(
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    """List all invoices"""
    return await services.list_invoices(db)


@router.put("/invoice/{invoice_id}", status_code=status.HTTP_200_OK)
async def update_invoice(
    invoice_id: int,
    data: InvoiceUpdate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    invoice = await services.get_invoice(db, invoice_id)
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    try:
        await services.revise_invoice(
            db=db,
            invoice=invoice,
            taxable_amount=data.taxable_amount,
            gst_rate=data.gst_rate,
            remarks=data.remarks,
        )
        return {"message": "Invoice updated", "revision": invoice.revision_no}
    except services.InvoiceNotEditableError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/invoice/{invoice_id}/finalize", status_code=status.HTTP_200_OK)
async def finalize_invoice_api(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    invoice = await services.get_invoice(db, invoice_id)
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    try:
        await services.finalize_invoice(db=db, invoice=invoice)
        return {"message": "Invoice finalized successfully"}
    except services.InvoiceNotFinalizableError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/invoice/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(
    invoice_id: int,
    hard_delete: bool = Query(False, description="Permanently delete (Admin/Dealer only)"),
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff),
):
    """Delete an invoice (soft delete by default)"""
    success = await services.delete_invoice(db, invoice_id, current_staff, hard_delete)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return None
