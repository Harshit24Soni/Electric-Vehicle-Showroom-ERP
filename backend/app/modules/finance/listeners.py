import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.event_bus import event_bus, SaleTransactionCompletedEvent
from app.modules.finance.models import VehicleFinance

logger = logging.getLogger(__name__)


async def on_sale_transaction_completed_finance(event: SaleTransactionCompletedEvent, db: Optional[AsyncSession] = None):
    """Initialize finance ledger if the sale involves financing with rollback protection."""
    try:
        if event.payment_mode == 'FINANCE' and event.financier_name:
            finance = VehicleFinance(
                sale_id=event.sale_id,
                financer_name=event.financier_name,
                loan_amount=event.total_amount - (event.down_payment_amount or 0.0),
                down_payment=event.down_payment_amount or 0.0,
                finance_status='INITIATED'
            )
            if db is not None:
                try:
                    db.add(finance)
                    await db.commit()
                except Exception as db_exc:
                    await db.rollback()
                    logger.error("Failed to commit finance record on passed session: %s", db_exc)
                    raise
            else:
                from app.db.session import AsyncSessionLocal
                async with AsyncSessionLocal() as session:
                    try:
                        session.add(finance)
                        await session.commit()
                    except Exception as s_exc:
                        await session.rollback()
                        logger.error("Failed to commit finance record on background session: %s", s_exc)
                        raise
    except Exception as e:
        logger.error("Error generating finance ledger for sale %s: %s", event.sale_id, e, exc_info=True)


def register_finance_listeners():
    event_bus.subscribe(SaleTransactionCompletedEvent, on_sale_transaction_completed_finance)
