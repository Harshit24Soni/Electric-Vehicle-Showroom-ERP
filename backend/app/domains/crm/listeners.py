import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.event_bus import event_bus, SaleCreatedEvent
from app.domains.crm.models import Lead, LeadStatusMaster

async def on_sale_created(event: SaleCreatedEvent, db: AsyncSession):
    """Mark lead as converted when a sale is created."""
    if not event.lead_id:
        return
        
    lead = await db.get(Lead, event.lead_id)
    if not lead:
        logging.error(f"Lead {event.lead_id} not found for conversion.")
        return
        
    stmt = select(LeadStatusMaster).filter(LeadStatusMaster.status_name.in_(['WON', 'CONVERTED']))
    result = await db.execute(stmt)
    status_obj = result.scalars().first()
    
    if status_obj:
        lead.lead_status_id = status_obj.status_id
    lead.is_converted = True
    lead.lead_status = "SOLD"
    
    await db.commit()

def register_crm_listeners():
    event_bus.subscribe(SaleCreatedEvent, on_sale_created)
