import logging
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from app.core.event_bus import event_bus, SaleTransactionCompletedEvent
from app.modules.billing.models import SalesInvoice

async def on_sale_transaction_completed_billing(event: SaleTransactionCompletedEvent, db: AsyncSession):
    """Generate invoice document when a sale transaction is completed."""
    try:
        year = datetime.now().year
        inv_number = f"INV-{year}-{event.sale_id:04d}"

        total = event.total_amount
        gst_rate = 18.0
        taxable = total / (1 + (gst_rate / 100))
        gst_amount = total - taxable

        invoice = SalesInvoice(
            sale_id=event.sale_id,
            invoice_number=inv_number,
            taxable_amount=taxable,
            gst_rate=gst_rate,
            gst_amount=gst_amount,
            total_amount=total,
            is_final=True
        )
        db.add(invoice)
        await db.commit()
    except Exception as e:
        logging.error(f"Error generating billing invoice for sale {event.sale_id}: {str(e)}")

def register_billing_listeners():
    event_bus.subscribe(SaleTransactionCompletedEvent, on_sale_transaction_completed_billing)
