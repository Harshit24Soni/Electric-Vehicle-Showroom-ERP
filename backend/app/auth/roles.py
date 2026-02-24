from fastapi import Depends, HTTPException, status

from app.auth.dependencies import get_current_staff


def require_roles(*allowed_roles: str):
    # Standardize allowed roles to uppercase
    allowed = [r.upper() for r in allowed_roles]
    
    def role_checker(current_staff: dict = Depends(get_current_staff)):
        user_role = current_staff["designation"].upper()
        
        # CENTRAL CONTROL: Super Admins bypass all role restrictions
        if user_role == "ADMIN":
            return current_staff
            
        if user_role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You do not have permission to perform this action. Required: {allowed_roles}"
            )
        return current_staff

    return role_checker
