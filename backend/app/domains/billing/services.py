from sqlalchemy.orm import Session
from datetime import datetime

from app.domains.billing.models import SalesInvoice
from app.domains.sales.models import VehicleSale


def generate_invoice(
    db: Session,
    *,
    sale_id: int,
    taxable_amount: float,
    gst_rate: float,
    remarks: str | None = None,
) -> SalesInvoice:

    sale = db.get(VehicleSale, sale_id)
    if not sale or sale.sale_status != "DELIVERED":
        raise ValueError("Invoice can only be generated after delivery")

    gst_amount = taxable_amount * gst_rate / 100
    total = taxable_amount + gst_amount

    invoice = SalesInvoice(
        sale_id=sale_id,
        invoice_number=f"INV-{sale_id}",
        taxable_amount=taxable_amount,
        gst_rate=gst_rate,
        gst_amount=gst_amount,
        total_amount=total,
        remarks=remarks,
    )

    db.add(invoice)
    db.flush()

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
        raise ValueError("Finalized invoice cannot be edited")

    invoice.revision_no += 1
    invoice.taxable_amount = taxable_amount
    invoice.gst_rate = gst_rate
    invoice.gst_amount = taxable_amount * gst_rate / 100
    invoice.total_amount = invoice.taxable_amount + invoice.gst_amount
    invoice.remarks = remarks

    return invoice

class BillingError(Exception):
    pass


class InvoiceAlreadyExistsError(BillingError):
    pass


class InvoiceNotEditableError(BillingError):
    pass


class InvoiceNotFinalizableError(BillingError):
    pass

from sqlalchemy.exc import IntegrityError
from app.domains.billing.models import SalesInvoice


def generate_invoice(
    db,
    *,
    sale_id: int,
    taxable_amount: float,
    gst_rate: float,
    remarks: str | None = None,
) -> SalesInvoice:

    # 1️⃣ Ensure sale exists & delivered
    sale = db.get(VehicleSale, sale_id)
    if not sale or sale.sale_status != "DELIVERED":
        raise BillingError(
            "Invoice can only be generated after vehicle delivery"
        )

    # 2️⃣ Prevent duplicate invoice
    existing = (
        db.query(SalesInvoice)
        .filter(SalesInvoice.sale_id == sale_id)
        .first()
    )
    if existing:
        raise InvoiceAlreadyExistsError(
            "Invoice already exists for this sale"
        )

    # 3️⃣ Calculate tax safely
    gst_amount = round(taxable_amount * gst_rate / 100, 2)
    total = round(taxable_amount + gst_amount, 2)

    invoice = SalesInvoice(
        sale_id=sale_id,
        invoice_number=f"INV-{sale_id}",
        taxable_amount=taxable_amount,
        gst_rate=gst_rate,
        gst_amount=gst_amount,
        total_amount=total,
        is_final=False,
        revision_no=1,
        remarks=remarks,
    )

    db.add(invoice)
    db.flush()

    return invoice

def revise_invoice(
    db,
    *,
    invoice: SalesInvoice,
    taxable_amount: float,
    gst_rate: float,
    remarks: str | None = None,
) -> SalesInvoice:

    if invoice.is_final:
        raise InvoiceNotEditableError(
            "Finalized invoice cannot be edited"
        )

    invoice.revision_no += 1
    invoice.taxable_amount = taxable_amount
    invoice.gst_rate = gst_rate
    invoice.gst_amount = round(taxable_amount * gst_rate / 100, 2)
    invoice.total_amount = round(
        invoice.taxable_amount + invoice.gst_amount, 2
    )
    invoice.remarks = remarks

    return invoice

def finalize_invoice(
    db,
    *,
    invoice: SalesInvoice,
):
    if invoice.is_final:
        raise InvoiceNotFinalizableError(
            "Invoice already finalized"
        )

    invoice.is_final = True

