import logging
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.event_bus import event_bus, SaleTransactionCompletedEvent
from app.modules.finance.models import VehicleFinance

async def on_sale_transaction_completed_finance(event: SaleTransactionCompletedEvent, db: AsyncSession):
    """Initialize finance ledger if the sale involves financing."""
    try:
        if event.payment_mode == 'FINANCE' and event.financier_name:
            finance = VehicleFinance(
                sale_id=event.sale_id,
                financer_name=event.financier_name,
                loan_amount=event.total_amount - (event.down_payment_amount or 0.0),
                down_payment=event.down_payment_amount or 0.0,
                finance_status='INITIATED'
            )
            db.add(finance)
            await db.commit()
    except Exception as e:
        logging.error(f"Error generating finance ledger for sale {event.sale_id}: {str(e)}")

def register_finance_listeners():
    event_bus.subscribe(SaleTransactionCompletedEvent, on_sale_transaction_completed_finance)
