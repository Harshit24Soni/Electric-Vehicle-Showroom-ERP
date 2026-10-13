import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.token_utils import decode_token, verify_token_type
from app.core.config import settings
from app.db.session import get_db

logger = logging.getLogger(__name__)

# Standard HTTP Bearer scheme
security = HTTPBearer(auto_error=True)

# Exported constants for backwards compatibility
SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = settings.JWT_ALGORITHM


async def get_current_staff(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Extract, decode, and validate the currently authenticated staff member.
    Enforces active account state, lock checks, and mandatory PIN change policies.
    """
    token = credentials.credentials

    try:
        payload = decode_token(token)
    except JWTError as exc:
        logger.warning(f"[Auth] Token validation rejected: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Prevent token substitution (e.g. refresh token used as access token)
    if not verify_token_type(payload, expected_type="access"):
        logger.warning("[Auth] Token type mismatch rejected.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type for API authorization",
            headers={"WWW-Authenticate": "Bearer"},
        )

    staff_id = payload.get("staff_id")
    designation = payload.get("designation")

    if staff_id is None or designation is None:
        logger.warning("[Auth] Malformed token claims rejected.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload structure",
            headers={"WWW-Authenticate": "Bearer"},
        )

    from app.modules.master.models import Staff

    # Efficient database lookup for active account state
    stmt = select(Staff).where(Staff.staff_id == staff_id)
    result = await db.execute(stmt)
    staff = result.scalars().first()

    if not staff or not staff.is_active:
        logger.warning(f"[Auth] Access attempted for inactive or non-existent staff ID {staff_id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive or invalid staff account",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check for active temporary lockout
    now_utc = datetime.now(timezone.utc)
    if staff.locked_until:
        # Normalize timezone awareness
        locked_until_dt = staff.locked_until
        if locked_until_dt.tzinfo is None:
            locked_until_dt = locked_until_dt.replace(tzinfo=timezone.utc)

        if locked_until_dt > now_utc:
            remaining = int((locked_until_dt - now_utc).total_seconds())
            logger.warning(f"[Auth] Blocked request from locked staff ID {staff_id} ({remaining}s remaining)")
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=f"Account is temporarily locked. Retry in {remaining} seconds.",
            )

    # Enforce mandatory PIN change if flagged
    if payload.get("force_pin_change") is True or getattr(staff, "is_pin_reset_required", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="PIN change required before accessing the system",
        )

    return {
        "staff_id": staff.staff_id,
        "designation": staff.designation,
        "dealer_id": staff.dealer_id,
        "full_name": staff.full_name,
        "email": staff.email,
        "mobile_no": staff.mobile_no,
    }


async def get_current_staff_for_pin_change(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Validates authenticated staff credentials specifically for the PIN change endpoint,
    bypassing the force_pin_change block so the user can execute their mandatory PIN update.
    """
    token = credentials.credentials
    try:
        payload = decode_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    staff_id = payload.get("staff_id")
    if not staff_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims",
        )

    from app.modules.master.models import Staff

    stmt = select(Staff).where(Staff.staff_id == staff_id)
    result = await db.execute(stmt)
    staff = result.scalars().first()

    if not staff or not staff.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive or invalid staff account",
        )

    return {
        "staff_id": staff.staff_id,
        "designation": staff.designation,
        "dealer_id": staff.dealer_id,
    }
