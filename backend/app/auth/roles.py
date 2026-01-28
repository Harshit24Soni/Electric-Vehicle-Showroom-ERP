from fastapi import Depends, HTTPException, status
from app.auth.dependencies import get_current_staff

def require_roles(*allowed_roles: str):
    def role_checker(
        current_staff: dict = Depends(get_current_staff)
    ):
        if current_staff["designation"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action"
            )
        return current_staff

    return role_checker
