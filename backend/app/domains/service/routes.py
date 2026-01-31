from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.domains.service import services
from app.domains.service.schemas import (
    JobCardCreate,
    SpareConsumeCreate,
    JobCardResponse,
    JobCardListItem,
)
from app.db.session import get_db
from app.auth.dependencies import get_current_staff

router = APIRouter(prefix="/service", tags=["Service"])


@router.post("/job-card", response_model=JobCardResponse, status_code=status.HTTP_201_CREATED)
def open_job(
    data: JobCardCreate,
    db: Session = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    try:
        job = services.open_job_card(
            db=db,
            chassis_no=data.chassis_no,
            is_free_service=data.is_free_service,
            remarks=data.remarks,
        )
        return job
    except services.ServiceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/job-card/{job_card_id}/consume-spare", status_code=status.HTTP_200_OK)
def consume_spare_api(
    job_card_id: int,
    data: SpareConsumeCreate,
    db: Session = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    try:
        services.consume_spare(
            db=db,
            job_card_id=job_card_id,
            spare_id=data.spare_id,
            quantity=data.quantity,
            serial_id=data.serial_id,
        )
        return {"message": "Spare consumed"}
    except services.ServiceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/job-card/{job_card_id}/close", status_code=status.HTTP_200_OK)
def close_job_card_api(job_card_id: int, db: Session = Depends(get_db), _staff=Depends(get_current_staff)):
    job = db.get(services.ServiceJobCard, job_card_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job card not found")
    try:
        services.close_job_card(job)
        return {"message": "Job card closed"}
    except services.ServiceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/job-cards", response_model=List[JobCardListItem])
def list_job_cards(db: Session = Depends(get_db), _staff=Depends(get_current_staff)):
    jobs = db.query(services.ServiceJobCard).order_by(services.ServiceJobCard.opened_at.desc()).all()
    return jobs
