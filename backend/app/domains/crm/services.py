from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from datetime import datetime, date
from typing import Optional
from fastapi import HTTPException

from app.domains.crm import models
from app.domains.crm import schemas as crm_schemas


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
        # New workflow fields
        expected_purchase_days=getattr(payload, 'expected_purchase_days', None),
        lead_status=getattr(payload, 'lead_status', 'WARM'),
        visit_date=datetime.utcnow(),
    )
    # Auto-calculate next followup date
    lead.calculate_next_followup()
    db.add(lead)
    await db.flush()
    # Reload with relationships for response
    return await get_lead(db, lead.lead_id)


async def list_leads(db: AsyncSession, status_id: int = None, owner_id: int = None) -> list[models.Lead]:
    """List leads with optional filters (excludes soft-deleted)"""
    stmt = select(models.Lead).options(
        selectinload(models.Lead.vehicle_model),
        selectinload(models.Lead.lead_status_ref)
    ).filter(models.Lead.is_deleted == False)
    
    if status_id:
        stmt = stmt.filter(models.Lead.lead_status_id == status_id)
    
    if owner_id:
        stmt = stmt.filter(models.Lead.owner_staff_id == owner_id)
    
    stmt = stmt.order_by(desc(models.Lead.created_at))
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_lead(db: AsyncSession, lead_id: int) -> models.Lead | None:
    """Get a single lead by ID with relationships (excludes soft-deleted)"""
    stmt = select(models.Lead).options(
        selectinload(models.Lead.vehicle_model),
        selectinload(models.Lead.lead_status_ref),
        selectinload(models.Lead.enquiries),
        selectinload(models.Lead.test_rides),
        selectinload(models.Lead.lead_followups),
    ).filter(
        models.Lead.lead_id == lead_id,
        models.Lead.is_deleted == False
    )
    
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
    if getattr(payload, 'lead_status', None) is not None:
        lead.lead_status = payload.lead_status
        lead.calculate_next_followup()
    
    await db.flush()
    return lead


async def delete_lead(
    db: AsyncSession, lead_id: int,
    current_user: dict, hard_delete: bool = False
) -> bool:
    """Delete a lead (soft by default, hard if authorized)"""
    lead = await get_lead(db, lead_id)
    if not lead:
        return False

    if hard_delete:
        if current_user["designation"] not in ["Admin", "Dealer"]:
            raise HTTPException(status_code=403, detail="Not authorized to permanently delete")
        await db.delete(lead)
    else:
        lead.is_deleted = True
        lead.deleted_at = datetime.utcnow()
        lead.deleted_by = current_user["staff_id"]

    await db.flush()
    return True


async def convert_lead_to_customer(
    db: AsyncSession,
    lead_id: int,
    payload: crm_schemas.LeadConvertPayload,
    current_user: dict,
) -> dict:
    """Convert a Lead into a Customer + Nominee in a single atomic transaction.

    Supports the 'Buyer vs. Rider' scenario: the payload may differ from
    the original lead data (e.g., son enquired but father is buying).

    Steps:
      a. Fetch Lead, guard against double-conversion.
      b. Create Customer with full KYC & address.
      c. Create primary Nominee for insurance.
      d. Mark Lead as converted and update status to CONVERTED/SOLD.
      e. Commit everything atomically.
    """
    from app.domains.master import models as master_models

    # (a) Fetch Lead & guard
    lead = await get_lead(db, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if lead.is_converted:
        raise HTTPException(status_code=400, detail="This lead has already been converted to a customer.")

    # (b) Create Customer
    customer = master_models.Customer(
        lead_reference_id=lead_id,
        name=payload.name,
        primary_phone=payload.phone,
        email=payload.email,
        customer_type=payload.customer_type,
        address_line1=payload.address_line1,
        city=payload.city,
        state=payload.state,
        pincode=payload.pincode,
        aadhaar_no=payload.aadhaar_no,
        pan_no=payload.pan_no,
        is_active=True,
        created_at=datetime.utcnow(),
        created_by=current_user["staff_id"],
    )
    db.add(customer)
    await db.flush()  # get customer_id

    # (c) Create primary Nominee
    nominee = master_models.Nominee(
        customer_id=customer.customer_id,
        nominee_name=payload.nominee.nominee_name,
        nominee_dob=payload.nominee.nominee_dob,
        relation=payload.nominee.relation,
        is_primary=True,
        is_active=True,
        created_at=datetime.utcnow(),
        created_by=current_user["staff_id"],
    )
    db.add(nominee)
    await db.flush()  # get nominee_id

    # (d) Update Lead — mark converted
    lead.is_converted = True
    lead.customer_id = customer.customer_id

    # Fetch CONVERTED / SOLD status from master
    stmt = select(models.LeadStatusMaster).filter(
        models.LeadStatusMaster.status_name.in_(("CONVERTED", "SOLD"))
    )
    result = await db.execute(stmt)
    converted_status = result.scalars().first()
    if converted_status:
        lead.lead_status_id = converted_status.status_id
    lead.lead_status = "SOLD"
    lead.next_followup_date = None  # No more follow-ups needed

    # (e) Commit atomically
    await db.commit()

    return {
        "message": "Lead converted to customer successfully",
        "customer_id": customer.customer_id,
        "lead_id": lead_id,
        "nominee_id": nominee.nominee_id,
    }


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
    """Get all activities for a lead (excludes soft-deleted)"""
    stmt = select(models.LeadActivity)\
        .filter(
            models.LeadActivity.lead_id == lead_id,
            models.LeadActivity.is_deleted == False
        )\
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
    """List enquiries with optional filters (excludes soft-deleted)"""
    stmt = select(models.Enquiry).options(
        selectinload(models.Enquiry.enquiry_status)
    ).filter(models.Enquiry.is_deleted == False)
    
    if status_id:
        stmt = stmt.filter(models.Enquiry.enquiry_status_id == status_id)
    
    stmt = stmt.order_by(desc(models.Enquiry.created_at))
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_enquiry(db: AsyncSession, enquiry_id: int) -> models.Enquiry | None:
    """Get a single enquiry (excludes soft-deleted)"""
    stmt = select(models.Enquiry).filter(
        models.Enquiry.enquiry_id == enquiry_id,
        models.Enquiry.is_deleted == False
    )
    result = await db.execute(stmt)
    return result.scalars().first()


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
    """Get enquiry statistics (excludes soft-deleted)"""
    result = await db.execute(
        select(models.Enquiry).filter(models.Enquiry.is_deleted == False)
    )
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
    """Get all pending followups (excludes soft-deleted)"""
    stmt = select(models.FollowupSchedule)\
        .filter(
            models.FollowupSchedule.followup_status.in_(("PENDING", "MISSED")),
            models.FollowupSchedule.is_deleted == False
        )\
        .order_by(models.FollowupSchedule.scheduled_date)
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_followup(db: AsyncSession, followup_id: int) -> models.FollowupSchedule | None:
    """Get a followup by ID (excludes soft-deleted)"""
    stmt = select(models.FollowupSchedule).filter(
        models.FollowupSchedule.followup_id == followup_id,
        models.FollowupSchedule.is_deleted == False
    )
    result = await db.execute(stmt)
    return result.scalars().first()


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
            .filter(
                models.FollowupSchedule.followup_status.in_(("PENDING", "MISSED")),
                models.FollowupSchedule.is_deleted == False
            )\
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


# ==================== NEW LEAD FOLLOWUP SERVICES ====================

async def add_lead_followup(
    db: AsyncSession,
    lead_id: int,
    payload: crm_schemas.LeadFollowupCreate,
    current_staff_id: int,
) -> models.LeadFollowup:
    """Add a followup entry to a lead with mandatory 10-char remarks.
    Also updates the lead's status and next followup date."""
    lead = await get_lead(db, lead_id)
    if not lead:
        raise CRMError("Lead not found")

    # Strict validation: remarks must not be empty or whitespace-only
    if not payload.remarks or not payload.remarks.strip():
        raise HTTPException(
            status_code=400,
            detail="A remark is strictly mandatory for logging a follow-up.",
        )

    # Double-check remarks length (schema already validates, but belt & suspenders)
    if len(payload.remarks.strip()) < 10:
        raise CRMError("Remarks must be at least 10 characters")

    followup = models.LeadFollowup(
        lead_id=lead_id,
        followup_date=datetime.utcnow(),
        remarks=payload.remarks,
        outcome_status=payload.outcome_status,
        next_followup_date=payload.next_followup_date,
        staff_id=current_staff_id,
    )
    db.add(followup)

    # Update lead status and recalculate next followup
    lead.lead_status = payload.outcome_status
    if payload.next_followup_date:
        lead.next_followup_date = payload.next_followup_date
    else:
        lead.calculate_next_followup()

    await db.flush()
    return followup


async def get_lead_followups(db: AsyncSession, lead_id: int) -> list[models.LeadFollowup]:
    """Get all followup entries for a lead (excludes soft-deleted)"""
    stmt = (
        select(models.LeadFollowup)
        .filter(
            models.LeadFollowup.lead_id == lead_id,
            models.LeadFollowup.is_deleted == False
        )
        .order_by(desc(models.LeadFollowup.followup_date))
    )
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_lead_followup_dashboard(
    db: AsyncSession,
    staff_id: int | None = None,
) -> dict:
    """Get lead followup dashboard categorized into overdue, today, upcoming."""
    today = date.today()

    base_stmt = select(models.Lead).filter(
        models.Lead.is_converted != True,  # noqa: E712
        models.Lead.is_deleted == False,
        models.Lead.next_followup_date.isnot(None),
    )
    if staff_id:
        base_stmt = base_stmt.filter(models.Lead.owner_staff_id == staff_id)

    # Overdue: next_followup_date < today
    overdue_stmt = base_stmt.filter(models.Lead.next_followup_date < today).order_by(models.Lead.next_followup_date)
    result = await db.execute(overdue_stmt)
    overdue = result.scalars().all()

    # Today: next_followup_date == today
    today_stmt = base_stmt.filter(models.Lead.next_followup_date == today)
    result = await db.execute(today_stmt)
    today_leads = result.scalars().all()

    # Upcoming: next_followup_date > today (next 7 days)
    from datetime import timedelta
    upcoming_stmt = base_stmt.filter(
        models.Lead.next_followup_date > today,
        models.Lead.next_followup_date <= today + timedelta(days=7),
    ).order_by(models.Lead.next_followup_date)
    result = await db.execute(upcoming_stmt)
    upcoming = result.scalars().all()

    return {
        "overdue": overdue,
        "today": today_leads,
        "upcoming": upcoming,
    }


async def add_test_ride(
    db: AsyncSession,
    lead_id: int,
    payload: crm_schemas.TestRideCreate,
    current_staff_id: int,
) -> models.TestRide:
    """Add a test ride for a lead"""
    lead = await get_lead(db, lead_id)
    if not lead:
        raise CRMError("Lead not found")
        
    from app.domains.master import models as master_models
    vehicle = await db.get(master_models.Vehicle, payload.chassis_no)
    if not vehicle:
        raise CRMError("Vehicle not found")

    test_ride = models.TestRide(
        lead_id=lead_id,
        vehicle_model_id=vehicle.vehicle_model_id,
        chassis_no=payload.chassis_no,
        test_ride_date=payload.test_ride_date,
        staff_id=current_staff_id,
        customer_feedback=payload.customer_feedback,
        created_at=datetime.utcnow(),
    )
    db.add(test_ride)
    await db.flush()
    return test_ride


# ==================== DELETE SERVICES ====================

async def delete_enquiry(
    db: AsyncSession, enquiry_id: int,
    current_user: dict, hard_delete: bool = False
) -> bool:
    """Delete an enquiry (soft by default, hard if authorized)"""
    enquiry = await get_enquiry(db, enquiry_id)
    if not enquiry:
        return False

    if hard_delete:
        if current_user["designation"] not in ["Admin", "Dealer"]:
            raise HTTPException(status_code=403, detail="Not authorized to permanently delete")
        await db.delete(enquiry)
    else:
        enquiry.is_deleted = True
        enquiry.deleted_at = datetime.utcnow()
        enquiry.deleted_by = current_user["staff_id"]

    await db.flush()
    return True


async def delete_followup(
    db: AsyncSession, followup_id: int,
    current_user: dict, hard_delete: bool = False
) -> bool:
    """Delete a followup schedule (soft by default, hard if authorized)"""
    followup = await get_followup(db, followup_id)
    if not followup:
        return False

    if hard_delete:
        if current_user["designation"] not in ["Admin", "Dealer"]:
            raise HTTPException(status_code=403, detail="Not authorized to permanently delete")
        await db.delete(followup)
    else:
        followup.is_deleted = True
        followup.deleted_at = datetime.utcnow()
        followup.deleted_by = current_user["staff_id"]

    await db.flush()
    return True
