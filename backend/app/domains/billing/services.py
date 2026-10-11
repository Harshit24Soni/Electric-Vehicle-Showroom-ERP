from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.exc import IntegrityError
from datetime import datetime
from fastapi import HTTPException

from app.domains.billing.models import SalesInvoice
from app.domains.sales.models import Sale


class BillingError(Exception):
    pass


class InvoiceAlreadyExistsError(BillingError):
    pass


class InvoiceNotEditableError(BillingError):
    pass


class InvoiceNotFinalizableError(BillingError):
    pass


async def get_invoice(db: AsyncSession, invoice_id: int) -> SalesInvoice | None:
    """Get an invoice by ID (excludes soft-deleted)"""
    stmt = select(SalesInvoice).filter(
        SalesInvoice.invoice_id == invoice_id,
        SalesInvoice.is_deleted == False
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def list_invoices(db: AsyncSession) -> list[SalesInvoice]:
    """List all invoices (excludes soft-deleted)"""
    stmt = select(SalesInvoice).filter(
        SalesInvoice.is_deleted == False
    ).order_by(desc(SalesInvoice.invoice_id))
    result = await db.execute(stmt)
    return result.scalars().all()


async def generate_invoice(
    db: AsyncSession,
    *,
    sale_id: int,
    taxable_amount: float,
    gst_rate: float,
    remarks: str | None = None,
) -> SalesInvoice:

    sale = await db.get(Sale, sale_id)
    if not sale or getattr(sale, "sale_status", None) != "DELIVERED":
        raise BillingError("Invoice can only be generated after vehicle delivery")

    existing_stmt = select(SalesInvoice).filter(
        SalesInvoice.sale_id == sale_id,
        SalesInvoice.is_deleted == False
    )
    result = await db.execute(existing_stmt)
    existing = result.scalars().first()
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
        await db.flush()
    except IntegrityError as e:
        raise InvoiceAlreadyExistsError("Invoice creation failed due to unique constraint") from e

    return invoice


async def revise_invoice(
    db: AsyncSession,
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
    await db.flush()

    return invoice


async def finalize_invoice(db: AsyncSession, *, invoice: SalesInvoice):
    if invoice.is_final:
        raise InvoiceNotFinalizableError("Invoice already finalized")

    invoice.is_final = True
    await db.flush()
    return invoice


# ==================== DELETE SERVICES ====================

async def delete_invoice(
    db: AsyncSession, invoice_id: int,
    current_user: dict, hard_delete: bool = False
) -> bool:
    """Delete an invoice (soft by default, hard if authorized)"""
    invoice = await get_invoice(db, invoice_id)
    if not invoice:
        return False

    if hard_delete:
        if current_user["designation"] not in ["Admin", "Dealer"]:
            raise HTTPException(status_code=403, detail="Not authorized to permanently delete")
        await db.delete(invoice)
    else:
        invoice.is_deleted = True
        invoice.deleted_at = datetime.utcnow()
        invoice.deleted_by = current_user["staff_id"]

    await db.flush()
    return True
