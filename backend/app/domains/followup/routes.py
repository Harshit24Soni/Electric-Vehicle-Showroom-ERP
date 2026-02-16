from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.dependencies import get_current_staff
from app.domains.followup import services, schemas


router = APIRouter(prefix="/followups", tags=["Follow-ups"])


@router.get("/dashboard", response_model=schemas.UnifiedFollowupDashboardResponse)
async def get_unified_followup_dashboard(
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    """Get unified followup dashboard across leads, service, and insurance"""
    return await services.get_unified_followup_dashboard(db)
