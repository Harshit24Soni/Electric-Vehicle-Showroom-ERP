import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.event_bus import event_bus, SaleCreatedEvent
from app.modules.crm.models import Lead, LeadStatusMaster

async def on_sale_created(event: SaleCreatedEvent, db: AsyncSession | None = None):
    """Mark lead as converted when a sale is created."""
    if not event.lead_id:
        return

    async def _handle(session: AsyncSession):
        lead = await session.get(Lead, event.lead_id)
        if not lead:
            logging.error(f"Lead {event.lead_id} not found for conversion.")
            return

        stmt = select(LeadStatusMaster).filter(LeadStatusMaster.status_name.in_(['WON', 'CONVERTED']))
        result = await session.execute(stmt)
        status_obj = result.scalars().first()

        if status_obj:
            lead.lead_status_id = status_obj.status_id
        lead.is_converted = True
        lead.lead_status = "SOLD"

        await session.commit()

    if db is not None:
        await _handle(db)
    else:
        from app.db.session import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            await _handle(session)

def register_crm_listeners():
    event_bus.subscribe(SaleCreatedEvent, on_sale_created)
