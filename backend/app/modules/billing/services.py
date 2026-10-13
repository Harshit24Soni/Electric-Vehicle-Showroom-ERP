import logging
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from app.modules.billing.models import SalesInvoice
from app.modules.sales.models import Sale

logger = logging.getLogger(__name__)


def _utc_now_naive() -> datetime:
    """Return current naive UTC datetime for standard TIMESTAMP storage."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


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
    stmt = select(SalesInvoice).filter(SalesInvoice.invoice_id == invoice_id, SalesInvoice.is_deleted == False)
    result = await db.execute(stmt)
    return result.scalars().first()


async def list_invoices(db: AsyncSession) -> list[SalesInvoice]:
    """List all invoices (excludes soft-deleted)"""
    stmt = select(SalesInvoice).filter(SalesInvoice.is_deleted == False).order_by(desc(SalesInvoice.invoice_id))
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
    """Generate a preliminary sales invoice for a delivered vehicle."""
    sale = await db.get(Sale, sale_id)
    if not sale or getattr(sale, "sale_status", None) != "DELIVERED":
        raise BillingError("Invoice can only be generated after vehicle delivery")

    existing_stmt = select(SalesInvoice).filter(SalesInvoice.sale_id == sale_id, SalesInvoice.is_deleted == False)
    result = await db.execute(existing_stmt)
    existing = result.scalars().first()
    if existing:
        raise InvoiceAlreadyExistsError("Invoice already exists for this sale")

    gst_amount = round(taxable_amount * gst_rate / 100, 2)
    total = round(taxable_amount + gst_amount, 2)

    invoice = SalesInvoice(
        sale_id=sale_id,
        invoice_number=f"INV-{sale_id}-{int(_utc_now_naive().timestamp())}",
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
        return invoice
    except IntegrityError as exc:
        await db.rollback()
        logger.error("Unique constraint violation generating invoice for sale %s: %s", sale_id, exc)
        raise InvoiceAlreadyExistsError("Invoice creation failed due to unique constraint") from exc
    except Exception as exc:
        await db.rollback()
        logger.error("Failed to generate invoice for sale %s: %s", sale_id, exc)
        raise


async def revise_invoice(
    db: AsyncSession,
    *,
    invoice: SalesInvoice,
    taxable_amount: float,
    gst_rate: float,
    remarks: str | None = None,
) -> SalesInvoice:
    """Revise non-finalized invoice pricing."""
    if invoice.is_final:
        raise InvoiceNotEditableError("Finalized invoice cannot be edited")

    try:
        invoice.revision_no = (invoice.revision_no or 0) + 1
        invoice.taxable_amount = taxable_amount
        invoice.gst_rate = gst_rate
        invoice.gst_amount = round(taxable_amount * gst_rate / 100, 2)
        invoice.total_amount = round(invoice.taxable_amount + invoice.gst_amount, 2)
        invoice.remarks = remarks
        await db.flush()
        return invoice
    except Exception as exc:
        await db.rollback()
        logger.error("Failed to revise invoice %s: %s", getattr(invoice, "invoice_id", None), exc)
        raise


async def finalize_invoice(db: AsyncSession, *, invoice: SalesInvoice) -> SalesInvoice:
    """Lock invoice as finalized."""
    if invoice.is_final:
        raise InvoiceNotFinalizableError("Invoice already finalized")

    try:
        invoice.is_final = True
        await db.flush()
        return invoice
    except Exception as exc:
        await db.rollback()
        logger.error("Failed to finalize invoice %s: %s", getattr(invoice, "invoice_id", None), exc)
        raise


# ==================== DELETE SERVICES ====================


async def delete_invoice(db: AsyncSession, invoice_id: int, current_user: dict, hard_delete: bool = False) -> bool:
    """Delete an invoice (soft by default, hard if authorized)"""
    invoice = await get_invoice(db, invoice_id)
    if not invoice:
        return False

    try:
        if hard_delete:
            if current_user["designation"] not in ["Admin", "Dealer"]:
                raise HTTPException(status_code=403, detail="Not authorized to permanently delete")
            await db.delete(invoice)
        else:
            invoice.is_deleted = True
            invoice.deleted_at = _utc_now_naive()
            invoice.deleted_by = current_user["staff_id"]

        await db.flush()
        return True
    except HTTPException:
        raise
    except Exception as exc:
        await db.rollback()
        logger.error("Failed to delete invoice %s: %s", invoice_id, exc)
        raise
