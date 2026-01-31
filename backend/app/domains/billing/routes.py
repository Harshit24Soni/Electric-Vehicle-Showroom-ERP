from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.auth.dependencies import get_current_staff
from app.domains.billing.schemas import InvoiceCreate, InvoiceUpdate
from app.domains.billing import services
from app.domains.billing.models import SalesInvoice

router = APIRouter(prefix="/billing", tags=["Billing"])

@router.post("/invoice")
def create_invoice(
    data: InvoiceCreate,
    db: Session = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    invoice = services.generate_invoice(
        db=db,
        sale_id=data.sale_id,
        taxable_amount=data.taxable_amount,
        gst_rate=data.gst_rate,
        remarks=data.remarks,
    )
    return {
        "invoice_id": invoice.invoice_id,
        "invoice_number": invoice.invoice_number,
        "total_amount": float(invoice.total_amount),
    }

@router.put("/invoice/{invoice_id}")
def update_invoice(
    invoice_id: int,
    data: InvoiceUpdate,
    db: Session = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    invoice = db.get(SalesInvoice, invoice_id)
    if not invoice:
        raise HTTPException(404, "Invoice not found")

    services.revise_invoice(
        db=db,
        invoice=invoice,
        taxable_amount=data.taxable_amount,
        gst_rate=data.gst_rate,
        remarks=data.remarks,
    )

    return {"message": "Invoice updated", "revision": invoice.revision_no}

@router.post("/invoice/{invoice_id}/finalize")
def finalize_invoice_api(
    invoice_id: int,
    db: Session = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    invoice = db.get(SalesInvoice, invoice_id)
    if not invoice:
        raise HTTPException(404, "Invoice not found")

    services.finalize_invoice(db=db, invoice=invoice)

    return {"message": "Invoice finalized successfully"}

