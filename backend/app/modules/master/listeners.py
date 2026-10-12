import logging
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.event_bus import event_bus, SaleCreatedEvent
from app.modules.master.models import Vehicle

async def on_sale_created(event: SaleCreatedEvent, db: AsyncSession | None = None):
    """Update vehicle status when a sale is created."""
    async def _handle(session: AsyncSession):
        vehicle = await session.get(Vehicle, event.chassis_no)
        if not vehicle:
            logging.error(f"Vehicle {event.chassis_no} not found for sale update.")
            return

        vehicle.current_status = event.status
        vehicle.customer_id = event.customer_id
        await session.commit()

    if db is not None:
        await _handle(db)
    else:
        from app.db.session import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            await _handle(session)

def register_master_listeners():
    event_bus.subscribe(SaleCreatedEvent, on_sale_created)
