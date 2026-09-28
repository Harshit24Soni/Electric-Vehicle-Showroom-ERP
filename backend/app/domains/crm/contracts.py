from sqlalchemy.ext.asyncio import AsyncSession
from app.domains.crm.models import Lead

async def verify_lead_exists(db: AsyncSession, lead_id: int) -> bool:
    """Synchronous read contract to verify a lead exists."""
    lead = await db.get(Lead, lead_id)
    return lead is not None
