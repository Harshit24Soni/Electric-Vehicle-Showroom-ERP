from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.dependencies import get_current_staff
from app.domains.crm import services, schemas


router = APIRouter(prefix="/crm", tags=["CRM"])


# ==================== MASTER ENDPOINTS ====================

@router.get("/master/lead-statuses")
async def get_lead_statuses(db: AsyncSession = Depends(get_db)):
    """Get list of all lead status options"""
    return await services.get_lead_statuses(db)


@router.get("/master/enquiry-statuses")
async def get_enquiry_statuses(db: AsyncSession = Depends(get_db)):
    """Get list of all enquiry status options"""
    return await services.get_enquiry_statuses(db)


# ==================== LEAD ENDPOINTS ====================

@router.post("/leads", response_model=schemas.LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(
    data: schemas.LeadCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Create a new lead independently (not tied to customer)"""
    lead = await services.create_lead(db, payload=data, current_staff_id=_staff["staff_id"])
    return lead


@router.get("/leads", response_model=list[schemas.LeadResponse])
async def list_leads(
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
    status_id: int = Query(None, description="Filter by lead status ID"),
    owner_id: int = Query(None, description="Filter by owner staff ID")
):
    """List all leads with optional filters"""
    return await services.list_leads(db, status_id=status_id, owner_id=owner_id)


@router.get("/leads/{lead_id}", response_model=schemas.LeadResponse)
async def get_lead(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Get a single lead by ID"""
    lead = await services.get_lead(db, lead_id)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return lead


@router.put("/leads/{lead_id}", response_model=schemas.LeadResponse)
async def update_lead(
    lead_id: int,
    data: schemas.LeadUpdate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Update lead information"""
    lead = await services.update_lead(db, lead_id, data)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return lead


@router.delete("/leads/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lead(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Delete a lead"""
    success = await services.delete_lead(db, lead_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return None


@router.post("/leads/{lead_id}/convert", status_code=status.HTTP_201_CREATED)
async def convert_lead_to_customer(
    lead_id: int,
    data: schemas.LeadConversionRequest,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff)
):
    """Convert a lead to a customer"""
    customer = await services.convert_lead_to_customer(db, lead_id, data)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found or already converted")
    return {
        "message": "Lead converted to customer successfully",
        "customer_id": customer.customer_id,
        "lead_reference_id": customer.lead_reference_id
    }


@router.get("/leads/{lead_id}/activities", response_model=list)
async def get_lead_activities(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Get activity history for a lead"""
    return await services.get_lead_activities(db, lead_id)


@router.post("/leads/{lead_id}/assign")
async def assign_lead(
    lead_id: int,
    new_owner_id: int,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff)
):
    """Reassign a lead to another staff member"""
    if current_staff["designation"] not in ["ADMIN", "DEALER"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Admin or Dealer can reassign leads")
        
    try:
        lead = await services.assign_lead(db, lead_id, new_owner_id, current_staff["staff_id"])
        return {"message": "Lead reassigned successfully", "lead_id": lead.lead_id}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ==================== ENQUIRY ENDPOINTS ====================

@router.post("/enquiries", response_model=schemas.EnquiryResponse, status_code=status.HTTP_201_CREATED)
async def create_enquiry(
    data: schemas.EnquiryCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Create a new enquiry for a lead"""
    enquiry = await services.create_enquiry(db, payload=data, current_staff_id=_staff["staff_id"])
    return enquiry


@router.get("/enquiries", response_model=list[schemas.EnquiryResponse])
async def list_enquiries(
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
    status_id: int = Query(None, description="Filter by enquiry status ID")
):
    """List all enquiries with optional filters"""
    return await services.list_enquiries(db, status_id=status_id)


@router.get("/enquiries/{enquiry_id}", response_model=schemas.EnquiryResponse)
async def get_enquiry(
    enquiry_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Get a single enquiry by ID"""
    enquiry = await services.get_enquiry(db, enquiry_id)
    if not enquiry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enquiry not found")
    return enquiry


@router.put("/enquiries/{enquiry_id}", response_model=schemas.EnquiryResponse)
async def update_enquiry(
    enquiry_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Update enquiry information"""
    enquiry = await services.update_enquiry(db, enquiry_id, data)
    if not enquiry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enquiry not found")
    return enquiry


@router.get("/enquiries/stats/summary")
async def get_enquiry_stats(
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Get enquiry statistics (active count, etc)"""
    return await services.get_enquiry_stats(db)


# ==================== FOLLOWUP ENDPOINTS ====================

@router.post("/followups", response_model=schemas.FollowupResponse, status_code=status.HTTP_201_CREATED)
async def create_followup(
    data: schemas.FollowupCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Create a new followup schedule"""
    f = await services.add_followup(db, data, current_staff_id=_staff["staff_id"])
    return f


@router.put("/followups/{followup_id}", response_model=schemas.FollowupResponse)
async def update_followup(
    followup_id: int,
    data: schemas.FollowupUpdate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Update a followup schedule (e.g. mark as COMPLETED)"""
    try:
        f = await services.update_followup(db, followup_id, data)
        return f
    except services.CRMError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/followups/pending", response_model=list[schemas.FollowupResponse])
async def pending_followups(
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Get all pending followups"""
    return await services.list_pending_followups(db)


@router.get("/followups/dashboard")
async def get_followup_dashboard(
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
    followup_type: str = Query("ALL", description="ALL|SALES|SERVICE|WARRANTY")
):
    """Get unified followup dashboard with all types"""
    return await services.get_followup_dashboard(db, followup_type)


# ==================== ACTIVITY ENDPOINTS ====================

@router.post("/activities")
async def add_activity(
    data: dict,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    """Record a lead activity"""
    a = await services.add_activity(db, data, current_staff_id=_staff["staff_id"])
    return {"message": "Activity recorded", "activity_id": a.activity_id}

