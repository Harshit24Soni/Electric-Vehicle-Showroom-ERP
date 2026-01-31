from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.domains.service import services
from app.domains.service.schemas import JobCardCreate, SpareConsumeCreate
from app.db.session import get_db
from app.auth.dependencies import get_current_staff

router = APIRouter()

@router.post("/job-card")
def open_job(
    data: JobCardCreate,
    db: Session = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    job = services.open_job_card(
        db=db,
        chassis_no=data.chassis_no,
        is_free_service=data.is_free_service,
        remarks=data.remarks,
    )
    return {"job_card_id": job.job_card_id}

@router.post("/job-card/{job_card_id}/consume-spare")
def consume_spare_api(
    job_card_id: int,
    data: SpareConsumeCreate,
    db: Session = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    services.consume_spare(
        db=db,
        job_card_id=job_card_id,
        spare_id=data.spare_id,
        quantity=data.quantity,
        serial_id=data.serial_id,
    )
    return {"message": "Spare consumed"}
