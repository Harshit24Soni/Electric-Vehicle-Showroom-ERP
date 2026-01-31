from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_staff


router = APIRouter(
    prefix="/staff",
    tags=["Staff"]
)


@router.get("/me")
def get_my_profile(current_staff: dict = Depends(get_current_staff)):
    return current_staff
