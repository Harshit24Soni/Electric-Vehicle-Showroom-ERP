from fastapi import APIRouter, Depends
from app.auth.dependencies import get_current_staff
from app.auth.roles import require_roles

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/ping")
def admin_ping(
    current_staff = Depends(get_current_staff),
    _ = Depends(require_roles("ADMIN"))
):
    return {"message": "Admin access confirmed"}
