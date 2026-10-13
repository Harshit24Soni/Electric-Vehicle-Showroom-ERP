import logging
from contextlib import asynccontextmanager
from app.core.event_bus import event_bus, VehicleDeliveredEvent
from app.db.session import AsyncSessionLocal
from app.modules.sales.models import Sale

logger = logging.getLogger(__name__)

@asynccontextmanager
async def get_async_session():
    """Async session generator with rollback protection for background listener tasks."""
    session = AsyncSessionLocal()
    try:
        yield session
    except Exception as e:
        await session.rollback()
        logger.error("Error in sales listener transaction: %s", e)
        raise
    finally:
        await session.close()

async def on_vehicle_delivered_sales(event: VehicleDeliveredEvent):
    """Update sale status to DELIVERED when delivery is finalized."""
    logger.info("Sales module received VehicleDeliveredEvent for sale %s", event.sale_id)
    try:
        async with get_async_session() as db:
            sale = await db.get(Sale, event.sale_id)
            if sale and not sale.is_deleted and sale.sale_status != "DELIVERED":
                sale.sale_status = "DELIVERED"
                await db.commit()
    except Exception as exc:
        logger.error("Failed to update sale status on VehicleDeliveredEvent for sale %s: %s", event.sale_id, exc)

def register_sales_listeners():
    """Register sales module event listeners with the global Event Bus."""
    event_bus.subscribe(VehicleDeliveredEvent, on_vehicle_delivered_sales)
    logger.info("Sales module event listeners registered successfully.")
