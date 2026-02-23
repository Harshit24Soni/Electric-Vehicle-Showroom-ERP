from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
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
async def open_job(
    data: JobCardCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    try:
        job = await services.open_job_card(
            db=db,
            chassis_no=data.chassis_no,
            is_free_service=data.is_free_service,
            remarks=data.remarks,
        )
        return job
    except services.ServiceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/job-card/{job_card_id}/consume-spare", status_code=status.HTTP_200_OK)
async def consume_spare_api(
    job_card_id: int,
    data: SpareConsumeCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    try:
        await services.consume_spare(
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
async def close_job_card_api(
    job_card_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    job = await services.get_job_card(db, job_card_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job card not found")
    try:
        await services.close_job_card(db, job)
        return {"message": "Job card closed"}
    except services.ServiceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/job-cards", response_model=List[JobCardListItem])
async def list_job_cards(
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    """List all job cards (excludes soft-deleted)"""
    return await services.list_job_cards(db)


@router.delete("/job-card/{job_card_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job_card(
    job_card_id: int,
    hard_delete: bool = Query(False, description="Permanently delete (Admin/Dealer only)"),
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff),
):
    """Delete a job card (soft delete by default)"""
    success = await services.delete_job_card(db, job_card_id, current_staff, hard_delete)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job card not found")
    return None
