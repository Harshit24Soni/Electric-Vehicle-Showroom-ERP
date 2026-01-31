from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.auth.dependencies import get_current_staff
from app.domains.crm import services, schemas


router = APIRouter(prefix="/crm", tags=["CRM"])


@router.post("/leads", response_model=schemas.LeadResponse, status_code=status.HTTP_201_CREATED)
def create_lead(data: schemas.LeadCreate, db: Session = Depends(get_db), _staff=Depends(get_current_staff)):
    lead = services.create_lead(db, payload=data)
    return lead


@router.get("/leads", response_model=list[schemas.LeadResponse])
def list_leads(db: Session = Depends(get_db), _staff=Depends(get_current_staff)):
    return services.list_leads(db)


@router.get("/leads/{lead_id}", response_model=schemas.LeadResponse)
def get_lead(lead_id: int, db: Session = Depends(get_db), _staff=Depends(get_current_staff)):
    lead = services.get_lead(db, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.post("/leads/{lead_id}/assign")
def assign_lead(lead_id: int, new_owner_id: int, db: Session = Depends(get_db), current_staff=Depends(get_current_staff)):
    try:
        lead = services.assign_lead(db, lead_id, new_owner_id, current_staff["staff_id"])
        return {"message": "Lead reassigned", "lead_id": lead.lead_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/followups", response_model=schemas.FollowupResponse, status_code=status.HTTP_201_CREATED)
def create_followup(data: schemas.FollowupCreate, db: Session = Depends(get_db), _staff=Depends(get_current_staff)):
    f = services.add_followup(db, data)
    return f


@router.get("/followups/pending", response_model=list[schemas.FollowupResponse])
def pending_followups(db: Session = Depends(get_db), _staff=Depends(get_current_staff)):
    return services.list_pending_followups(db)


@router.post("/activities")
def add_activity(data: schemas.ActivityCreate, db: Session = Depends(get_db), _staff=Depends(get_current_staff)):
    a = services.add_activity(db, data)
    return {"message": "Activity recorded", "activity_id": a.activity_id}
