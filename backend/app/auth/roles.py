from fastapi import HTTPException, status

def require_roles(*allowed_roles: str):
    def role_checker(current_staff: dict):
        if current_staff["designation"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action"
            )
        return current_staff
    return role_checker
