import logging
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.event_bus import event_bus, SaleCreatedEvent
from app.domains.master.models import Vehicle

async def on_sale_created(event: SaleCreatedEvent, db: AsyncSession):
    """Update vehicle status when a sale is created."""
    vehicle = await db.get(Vehicle, event.chassis_no)
    if not vehicle:
        logging.error(f"Vehicle {event.chassis_no} not found for sale update.")
        return
        
    vehicle.current_status = event.status
    vehicle.customer_id = event.customer_id
    await db.commit()

def register_master_listeners():
    event_bus.subscribe(SaleCreatedEvent, on_sale_created)
