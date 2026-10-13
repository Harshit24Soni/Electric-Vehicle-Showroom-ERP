import logging
from enum import Enum
from typing import Any, Callable, Dict, Set
from fastapi import Depends, HTTPException, status
from app.auth.dependencies import get_current_staff

logger = logging.getLogger(__name__)


class Role(str, Enum):
    """Standardized Role definitions across Electric Vehicle Showroom ERP."""

    ADMIN = "ADMIN"
    DEALER = "DEALER"
    STAFF = "STAFF"
    SALES = "SALES"
    SERVICE = "SERVICE"
    INVENTORY = "INVENTORY"
    ACCOUNTS = "ACCOUNTS"


def has_role(current_staff: Dict[str, Any], *allowed_roles: str) -> bool:
    """Check if current staff holds any of the allowed roles (case-insensitive)."""
    user_role = str(current_staff.get("designation", "")).strip().upper()
    if user_role == Role.ADMIN.value:
        return True

    allowed_set: Set[str] = {r.strip().upper() for r in allowed_roles}
    return user_role in allowed_set


def require_roles(*allowed_roles: str) -> Callable:
    """
    FastAPI endpoint dependency enforcing role-based access control (RBAC).
    Super Admins (ADMIN) automatically bypass role limitations.
    Denied accesses log security audit warnings and return uniform 403 Forbidden.

    Usage:
        @router.get("/reports/finance", dependencies=[Depends(require_roles("ADMIN", "ACCOUNTS"))])
        async def get_financial_reports(...): ...
    """
    normalized_allowed: Set[str] = {r.strip().upper() for r in allowed_roles}

    def role_checker(current_staff: Dict[str, Any] = Depends(get_current_staff)) -> Dict[str, Any]:
        user_role = str(current_staff.get("designation", "")).strip().upper()
        staff_id = current_staff.get("staff_id")

        # Super Admin bypass
        if user_role == Role.ADMIN.value:
            return current_staff

        if user_role not in normalized_allowed:
            logger.warning(
                f"[RBAC Denied] Staff ID {staff_id} with role '{user_role}' denied access. "
                f"Required roles: {list(normalized_allowed)}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You do not have permission to perform this action. Required: {list(normalized_allowed)}",
            )
        return current_staff

    return role_checker
