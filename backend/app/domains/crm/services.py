from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from datetime import datetime
from typing import Optional

from app.domains.crm import models


class CRMError(Exception):
    pass


# ==================== LEAD SERVICES ====================

async def create_lead(db: AsyncSession, *, payload, current_staff_id: int) -> models.Lead:
    """Create a new lead independent of customer"""
    lead = models.Lead(
        customer_id=None,  # Lead can exist without customer
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
        vehicle_model_id=payload.vehicle_model_id,
        lead_source=payload.lead_source,
        lead_status_id=payload.lead_status_id,
        owner_staff_id=payload.owner_staff_id or current_staff_id,
        created_by_staff_id=current_staff_id,
        expected_purchase_date=payload.expected_purchase_date,
        remarks=payload.remarks,
        created_at=datetime.utcnow(),
    )
    db.add(lead)
    await db.flush()
    # Reload with relationships for response
    return await get_lead(db, lead.lead_id)


async def list_leads(db: AsyncSession, status_id: int = None, owner_id: int = None) -> list[models.Lead]:
    """List leads with optional filters"""
    stmt = select(models.Lead).options(
        selectinload(models.Lead.vehicle_model),
        selectinload(models.Lead.lead_status)
    )
    
    if status_id:
        stmt = stmt.filter(models.Lead.lead_status_id == status_id)
    
    if owner_id:
        stmt = stmt.filter(models.Lead.owner_staff_id == owner_id)
    
    stmt = stmt.order_by(desc(models.Lead.created_at))
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_lead(db: AsyncSession, lead_id: int) -> models.Lead | None:
    """Get a single lead by ID with relationships"""
    stmt = select(models.Lead).options(
        selectinload(models.Lead.vehicle_model),
        selectinload(models.Lead.lead_status),
        selectinload(models.Lead.enquiries),
        selectinload(models.Lead.test_rides)
    ).filter(models.Lead.lead_id == lead_id)
    
    result = await db.execute(stmt)
    return result.scalars().first()


async def update_lead(db: AsyncSession, lead_id: int, payload) -> models.Lead | None:
    """Update lead information"""
    lead = await get_lead(db, lead_id)
    if not lead:
        return None
    
    # Update only provided fields
    if payload.name is not None:
        lead.name = payload.name
    if payload.phone is not None:
        lead.phone = payload.phone
    if payload.email is not None:
        lead.email = payload.email
    if payload.vehicle_model_id is not None:
        lead.vehicle_model_id = payload.vehicle_model_id
    if payload.lead_source is not None:
        lead.lead_source = payload.lead_source
    if payload.lead_status_id is not None:
        lead.lead_status_id = payload.lead_status_id
    if payload.expected_purchase_date is not None:
        lead.expected_purchase_date = payload.expected_purchase_date
    if payload.remarks is not None:
        lead.remarks = payload.remarks
    
    await db.flush()
    return lead


async def delete_lead(db: AsyncSession, lead_id: int) -> bool:
    """Delete a lead"""
    lead = await get_lead(db, lead_id)
    if not lead:
        return False
    
    await db.delete(lead)
    await db.flush()
    return True


async def convert_lead_to_customer(db: AsyncSession, lead_id: int, payload) -> Optional['Customer']:
    """Convert a lead to a customer"""
    from app.domains.master import models as master_models
    
    lead = await get_lead(db, lead_id)
    if not lead:
        return None
    
    # Check if already converted
    if lead.customer_id:
        result = await db.execute(select(master_models.Customer).filter_by(customer_id=lead.customer_id))
        return result.scalars().first()
    
    # Create customer with lead data if requested
    if payload.use_lead_data:
        customer = master_models.Customer(
            lead_reference_id=lead_id,
            name=lead.name,
            primary_phone=lead.phone,
            email=lead.email,
            customer_type="INDIVIDUAL",
            created_at=datetime.utcnow(),
            is_active=True
        )
    else:
        customer = master_models.Customer(
            lead_reference_id=lead_id,
            customer_type="INDIVIDUAL",
            created_at=datetime.utcnow(),
            is_active=True
        )
    
    db.add(customer)
    await db.flush()
    
    # Update lead with customer_id and status (5 = CONVERTED)
    lead.customer_id = customer.customer_id
    
    # TODO: Fetch status ID dynamically or use constant
    stmt = select(models.LeadStatusMaster).filter_by(status_name='CONVERTED')
    result = await db.execute(stmt)
    converted_status = result.scalars().first()
    
    if converted_status:
        lead.lead_status_id = converted_status.status_id
        
    await db.flush()
    
    return customer


async def assign_lead(db: AsyncSession, lead_id: int, new_owner_id: int, changed_by: int):
    """Reassign a lead to another staff member"""
    lead = await get_lead(db, lead_id)
    if not lead:
        raise CRMError("Lead not found")
    
    # Record history
    history = models.LeadAssignmentHistory(
        lead_id=lead_id,
        old_staff_id=lead.owner_staff_id,
        new_staff_id=new_owner_id,
        changed_by_staff_id=changed_by,
        changed_at=datetime.utcnow()
    )
    db.add(history)

    lead.owner_staff_id = new_owner_id
    await db.flush()
    return lead


async def get_lead_activities(db: AsyncSession, lead_id: int) -> list[models.LeadActivity]:
    """Get all activities for a lead"""
    stmt = select(models.LeadActivity)\
        .filter(models.LeadActivity.lead_id == lead_id)\
        .order_by(desc(models.LeadActivity.activity_time))
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_lead_statuses(db: AsyncSession):
    stmt = select(models.LeadStatusMaster).order_by(models.LeadStatusMaster.display_order)
    result = await db.execute(stmt)
    return result.scalars().all()


# ==================== ENQUIRY SERVICES ====================

async def create_enquiry(db: AsyncSession, payload, current_staff_id: int) -> models.Enquiry:
    """Create a new enquiry"""
    enquiry = models.Enquiry(
        lead_id=payload.lead_id,
        enquiry_source=payload.enquiry_source,
        enquiry_status_id=payload.enquiry_status_id,
        owner_staff_id=payload.owner_staff_id or current_staff_id,
        created_by_staff_id=current_staff_id,
        remarks=payload.remarks,
        created_at=datetime.utcnow(),
    )
    db.add(enquiry)
    await db.flush()
    return enquiry


async def list_enquiries(db: AsyncSession, status_id: int = None) -> list[models.Enquiry]:
    """List enquiries with optional filters"""
    stmt = select(models.Enquiry).options(selectinload(models.Enquiry.enquiry_status))
    
    if status_id:
        stmt = stmt.filter(models.Enquiry.enquiry_status_id == status_id)
    
    stmt = stmt.order_by(desc(models.Enquiry.created_at))
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_enquiry(db: AsyncSession, enquiry_id: int) -> models.Enquiry | None:
    """Get a single enquiry"""
    return await db.get(models.Enquiry, enquiry_id)


async def update_enquiry(db: AsyncSession, enquiry_id: int, payload: dict) -> models.Enquiry | None:
    """Update enquiry information"""
    enquiry = await get_enquiry(db, enquiry_id)
    if not enquiry:
        return None
    
    if "enquiry_source" in payload:
        enquiry.enquiry_source = payload["enquiry_source"]
    if "enquiry_status_id" in payload:
        enquiry.enquiry_status_id = payload["enquiry_status_id"]
    if "last_followup_date" in payload:
        enquiry.last_followup_date = payload["last_followup_date"]
    if "last_message_date" in payload:
        enquiry.last_message_date = payload["last_message_date"]
    if "remarks" in payload:
        enquiry.remarks = payload["remarks"]
    
    await db.flush()
    return enquiry


async def get_enquiry_statuses(db: AsyncSession):
    stmt = select(models.EnquiryStatusMaster).order_by(models.EnquiryStatusMaster.display_order)
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_enquiry_stats(db: AsyncSession) -> dict:
    """Get enquiry statistics"""
    result = await db.execute(select(models.Enquiry))
    total = len(result.scalars().all())
    return {"total_enquiries": total}


# ==================== FOLLOWUP SERVICES ====================

async def add_followup(db: AsyncSession, payload, current_staff_id: int) -> models.FollowupSchedule:
    """Create a new followup schedule"""
    f = models.FollowupSchedule(
        lead_id=payload.lead_id,
        scheduled_date=payload.scheduled_date,
        assigned_staff_id=payload.assigned_staff_id or current_staff_id,
        followup_status="PENDING",
        remarks=payload.remarks,
        created_at=datetime.utcnow(),
    )
    db.add(f)
    await db.flush()
    return f


async def list_pending_followups(db: AsyncSession) -> list[models.FollowupSchedule]:
    """Get all pending followups"""
    stmt = select(models.FollowupSchedule)\
        .filter(models.FollowupSchedule.followup_status.in_(("PENDING", "MISSED")))\
        .order_by(models.FollowupSchedule.scheduled_date)
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_followup(db: AsyncSession, followup_id: int) -> models.FollowupSchedule | None:
    return await db.get(models.FollowupSchedule, followup_id)


async def update_followup(db: AsyncSession, followup_id: int, payload) -> models.FollowupSchedule:
    f = await get_followup(db, followup_id)
    if not f:
        raise CRMError("Followup not found")

    # Validation: If completing, remark is required
    if payload.followup_status in ["COMPLETED", "DONE"] and not payload.remarks and not f.remarks:
        # Check if remarks provided in payload OR already exist
        # Requirement: "cannot be marked 'Done' without adding a Remark"
        # If user adds remark now, it's fine.
        if not payload.remarks:
             raise CRMError("Remarks are required when completing a follow-up")

    if payload.scheduled_date:
        f.scheduled_date = payload.scheduled_date
    if payload.assigned_staff_id:
        f.assigned_staff_id = payload.assigned_staff_id
    if payload.followup_status:
        f.followup_status = payload.followup_status
        if payload.followup_status in ["COMPLETED", "DONE"]:
            f.completed_at = datetime.utcnow()
    if payload.remarks:
        f.remarks = payload.remarks
        
    await db.flush()
    return f


async def get_followup_dashboard(db: AsyncSession, followup_type: str = "ALL") -> dict:
    """Get unified followup dashboard with all types"""
    sales_followups = []
    service_followups = []
    warranty_followups = []
    
    if followup_type in ("ALL", "SALES"):
        stmt = select(models.FollowupSchedule)\
            .filter(models.FollowupSchedule.followup_status.in_(("PENDING", "MISSED")))\
            .order_by(models.FollowupSchedule.scheduled_date)
        result = await db.execute(stmt)
        sales_followups = result.scalars().all()
    
    return {
        "sales_followups": [
            {
                "followup_id": f.followup_id,
                "lead_id": f.lead_id,
                "scheduled_date": f.scheduled_date,
                "status": f.followup_status
            }
            for f in sales_followups
        ],
        "service_followups": service_followups,
        "warranty_followups": warranty_followups
    }


# ==================== ACTIVITY SERVICES ====================

async def add_activity(db: AsyncSession, payload: dict, current_staff_id: int) -> models.LeadActivity:
    """Record a lead activity"""
    
    # Handle activity_time parsing if it's a string
    activity_time = payload.get("activity_time")
    if isinstance(activity_time, str):
        activity_time = datetime.fromisoformat(activity_time)
        
    a = models.LeadActivity(
        lead_id=payload.get("lead_id"),
        activity_type=payload.get("activity_type"),
        activity_time=activity_time,
        performed_by_staff_id=current_staff_id, # Always current user
        outcome=payload.get("outcome"),
        next_action_date=payload.get("next_action_date"),
        created_at=datetime.utcnow(),
    )
    db.add(a)
    await db.flush()
    return a
