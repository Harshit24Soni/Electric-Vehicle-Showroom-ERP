import logging
from contextlib import asynccontextmanager
from app.core.event_bus import event_bus, VehicleDeliveredEvent
from app.db.session import AsyncSessionLocal
from app.modules.sales.models import Sale

logger = logging.getLogger(__name__)

@asynccontextmanager
async def get_async_session():
    """Async session generator for the background listener tasks."""
    try:
        async with AsyncSessionLocal() as session:
            yield session
    except Exception as e:
        logger.error(f"Error obtaining session in sales listener: {e}")
        yield None

async def on_vehicle_delivered_sales(event: VehicleDeliveredEvent):
    """Update sale status to DELIVERED when delivery is finalized."""
    logger.info(f"Sales module received VehicleDeliveredEvent for sale {event.sale_id}")
    async with get_async_session() as db:
        if db is not None:
            sale = await db.get(Sale, event.sale_id)
            if sale and not sale.is_deleted and sale.sale_status != "DELIVERED":
                sale.sale_status = "DELIVERED"
                await db.commit()

def register_sales_listeners():
    """Register sales module event listeners with the global Event Bus."""
    event_bus.subscribe(VehicleDeliveredEvent, on_vehicle_delivered_sales)
    logger.info("Sales module event listeners registered successfully.")
