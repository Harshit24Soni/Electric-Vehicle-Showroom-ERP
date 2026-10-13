import logging
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.event_bus import event_bus, SaleTransactionCompletedEvent
from app.modules.billing.models import SalesInvoice

logger = logging.getLogger(__name__)


async def on_sale_transaction_completed_billing(event: SaleTransactionCompletedEvent, db: AsyncSession | None = None):
    """Generate invoice document when a sale transaction is completed."""
    try:
        year = datetime.now(timezone.utc).year
        inv_number = f"INV-{year}-{event.sale_id:04d}"

        total = event.total_amount
        gst_rate = getattr(settings, "DEFAULT_GST_RATE_PERCENT", 18.0)
        taxable = round(total / (1 + (gst_rate / 100)), 2)
        gst_amount = round(total - taxable, 2)

        invoice = SalesInvoice(
            sale_id=event.sale_id,
            invoice_number=inv_number,
            taxable_amount=taxable,
            gst_rate=gst_rate,
            gst_amount=gst_amount,
            total_amount=total,
            is_final=True,
        )
        if db is not None:
            try:
                db.add(invoice)
                await db.commit()
            except Exception as inner_exc:
                await db.rollback()
                logger.error("Failed to commit billing invoice on caller session: %s", inner_exc)
                raise
        else:
            from app.db.session import AsyncSessionLocal

            async with AsyncSessionLocal() as session:
                try:
                    session.add(invoice)
                    await session.commit()
                except Exception as inner_exc:
                    await session.rollback()
                    logger.error("Failed to commit billing invoice on background session: %s", inner_exc)
                    raise
    except Exception as e:
        logger.error("Error generating billing invoice for sale %s: %s", event.sale_id, str(e))


def register_billing_listeners():
    event_bus.subscribe(SaleTransactionCompletedEvent, on_sale_transaction_completed_billing)
