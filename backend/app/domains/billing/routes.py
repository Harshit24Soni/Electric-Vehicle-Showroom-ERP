from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.db.session import get_db
from app.auth.dependencies import get_current_staff
from app.auth.roles import require_roles
from app.domains.billing.schemas import InvoiceCreate, InvoiceUpdate, InvoiceResponse
from app.domains.billing import services
from app.domains.billing.models import SalesInvoice

router = APIRouter(
    prefix="/billing",
    tags=["Billing"],
    dependencies=[Depends(get_current_staff)],
)



@router.post("/invoice", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_invoice(
    data: InvoiceCreate,
    db: Session = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    try:
        invoice = services.generate_invoice(
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


@router.put("/invoice/{invoice_id}", status_code=status.HTTP_200_OK)
def update_invoice(
    invoice_id: int,
    data: InvoiceUpdate,
    db: Session = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    invoice = db.get(SalesInvoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    try:
        services.revise_invoice(
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
def finalize_invoice_api(
    invoice_id: int,
    db: Session = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    invoice = db.get(SalesInvoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    try:
        services.finalize_invoice(db=db, invoice=invoice)
        return {"message": "Invoice finalized successfully"}
    except services.InvoiceNotFinalizableError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

