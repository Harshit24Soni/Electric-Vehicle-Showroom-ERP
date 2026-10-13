import logging
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.event_bus import event_bus, SaleCreatedEvent
from app.modules.master.models import Vehicle

logger = logging.getLogger(__name__)


async def on_sale_created(event: SaleCreatedEvent, db: AsyncSession | None = None):
    """Update vehicle status when a sale is created."""

    async def _handle(session: AsyncSession):
        try:
            vehicle = await session.get(Vehicle, event.chassis_no)
            if not vehicle:
                logger.error("Vehicle %s not found for sale update.", event.chassis_no)
                return

            vehicle.current_status = event.status
            vehicle.customer_id = event.customer_id
            await session.commit()
        except Exception as exc:
            await session.rollback()
            logger.error("Failed to update vehicle %s on SaleCreatedEvent: %s", event.chassis_no, exc)
            raise

    try:
        if db is not None:
            await _handle(db)
        else:
            from app.db.session import AsyncSessionLocal

            async with AsyncSessionLocal() as session:
                await _handle(session)
    except Exception as exc:
        logger.error("Error processing on_sale_created in master listener: %s", exc)


def register_master_listeners():
    event_bus.subscribe(SaleCreatedEvent, on_sale_created)
