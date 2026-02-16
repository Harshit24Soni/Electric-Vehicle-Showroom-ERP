from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date

from app.domains.crm import models as crm_models
from app.domains.followup import models as followup_models
from app.domains.followup.schemas import FollowupItem


async def get_unified_followup_dashboard(db: AsyncSession) -> dict:
    """Query-based unified followup dashboard across lead, service, and insurance."""
    today = date.today()

    # --- 1. Lead followups (active leads with next_followup_date) ---
    lead_stmt = select(crm_models.Lead).filter(
        crm_models.Lead.deleted_at.is_(None),
        crm_models.Lead.is_converted != True,  # noqa: E712
        crm_models.Lead.next_followup_date.isnot(None),
    ).order_by(crm_models.Lead.next_followup_date)

    result = await db.execute(lead_stmt)
    leads = result.scalars().all()

    lead_items = [
        FollowupItem(
            followup_type="LEAD",
            entity_id=lead.lead_id,
            entity_label=f"{lead.name} ({lead.phone})",
            due_date=lead.next_followup_date,
            status=lead.lead_status or "WARM",
            is_completed=False,
            remarks=lead.remarks,
        )
        for lead in leads
    ]

    # --- 2. Service followups ---
    svc_stmt = select(followup_models.ServiceFollowup).filter(
        followup_models.ServiceFollowup.is_completed == False,  # noqa: E712
    ).order_by(followup_models.ServiceFollowup.next_service_date)

    result = await db.execute(svc_stmt)
    svc_followups = result.scalars().all()

    service_items = [
        FollowupItem(
            followup_type="SERVICE",
            entity_id=sf.job_card_id,
            entity_label=f"Service: {sf.service_type}",
            due_date=sf.next_service_date,
            status="PENDING",
            is_completed=sf.is_completed,
            remarks=sf.remarks,
        )
        for sf in svc_followups
    ]

    # --- 3. Insurance followups ---
    ins_stmt = select(followup_models.InsuranceFollowup).filter(
        followup_models.InsuranceFollowup.is_renewed == False,  # noqa: E712
    ).order_by(followup_models.InsuranceFollowup.renewal_date)

    result = await db.execute(ins_stmt)
    ins_followups = result.scalars().all()

    insurance_items = [
        FollowupItem(
            followup_type="INSURANCE",
            entity_id=inf.policy_id,
            entity_label=f"Policy #{inf.policy_id} Renewal",
            due_date=inf.renewal_date,
            status="PENDING",
            is_completed=inf.is_renewed,
            remarks=inf.remarks,
        )
        for inf in ins_followups
    ]

    # Calculate totals
    all_items = lead_items + service_items + insurance_items
    total_pending = len(all_items)
    total_overdue = sum(1 for item in all_items if item.due_date < today)

    return {
        "lead_followups": lead_items,
        "service_followups": service_items,
        "insurance_followups": insurance_items,
        "total_pending": total_pending,
        "total_overdue": total_overdue,
    }
