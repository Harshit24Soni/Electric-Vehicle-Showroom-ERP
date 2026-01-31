from sqlalchemy.orm import Session
from datetime import datetime
from sqlalchemy.exc import IntegrityError

from app.domains.billing.models import SalesInvoice
from app.domains.sales.models import VehicleSale


class BillingError(Exception):
    pass


class InvoiceAlreadyExistsError(BillingError):
    pass


class InvoiceNotEditableError(BillingError):
    pass


class InvoiceNotFinalizableError(BillingError):
    pass


def generate_invoice(
    db: Session,
    *,
    sale_id: int,
    taxable_amount: float,
    gst_rate: float,
    remarks: str | None = None,
) -> SalesInvoice:

    sale = db.get(VehicleSale, sale_id)
    if not sale or getattr(sale, "sale_status", None) != "DELIVERED":
        raise BillingError("Invoice can only be generated after vehicle delivery")

    existing = db.query(SalesInvoice).filter(SalesInvoice.sale_id == sale_id).first()
    if existing:
        raise InvoiceAlreadyExistsError("Invoice already exists for this sale")

    gst_amount = round(taxable_amount * gst_rate / 100, 2)
    total = round(taxable_amount + gst_amount, 2)

    invoice = SalesInvoice(
        sale_id=sale_id,
        invoice_number=f"INV-{sale_id}-{int(datetime.utcnow().timestamp())}",
        taxable_amount=taxable_amount,
        gst_rate=gst_rate,
        gst_amount=gst_amount,
        total_amount=total,
        is_final=False,
        revision_no=1,
        remarks=remarks,
    )

    try:
        db.add(invoice)
        db.flush()
    except IntegrityError as e:
        raise InvoiceAlreadyExistsError("Invoice creation failed due to unique constraint") from e

    return invoice


def revise_invoice(
    db: Session,
    *,
    invoice: SalesInvoice,
    taxable_amount: float,
    gst_rate: float,
    remarks: str | None = None,
) -> SalesInvoice:

    if invoice.is_final:
        raise InvoiceNotEditableError("Finalized invoice cannot be edited")

    invoice.revision_no = (invoice.revision_no or 0) + 1
    invoice.taxable_amount = taxable_amount
    invoice.gst_rate = gst_rate
    invoice.gst_amount = round(taxable_amount * gst_rate / 100, 2)
    invoice.total_amount = round(invoice.taxable_amount + invoice.gst_amount, 2)
    invoice.remarks = remarks

    return invoice


def finalize_invoice(db: Session, *, invoice: SalesInvoice):
    if invoice.is_final:
        raise InvoiceNotFinalizableError("Invoice already finalized")

    invoice.is_final = True
    return invoice

