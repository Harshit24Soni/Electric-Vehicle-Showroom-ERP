import os

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

from app.db.session import get_db

load_dotenv()

security = HTTPBearer()

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM")


async def get_current_staff(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_db)
) -> dict:
    """
    Extract and validate the currently authenticated staff member.

    - Decodes JWT from Authorization header
    - Validates payload
    - Confirms staff exists and is active in DB
    - Enforces mandatory PIN change if required
    """

    token = credentials.credentials

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        staff_id = payload.get("staff_id")
        designation = payload.get("designation")

        if staff_id is None or designation is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    from app.domains.master.models import Staff
    from sqlalchemy import select
    
    # 🔒 ERP-grade check: ensure staff still exists & is active
    # Using Async Session
    stmt = select(Staff).where(Staff.staff_id == staff_id)
    result = await db.execute(stmt)
    staff = result.scalars().first()

    if not staff or not staff.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive or invalid staff"
        )

    # ⛔ FORCE PIN CHANGE ENFORCEMENT (CORRECT PLACE)
    if payload.get("force_pin_change") is True:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="PIN change required before accessing the system"
        )

    return {
        "staff_id": staff.staff_id,
        "designation": staff.designation,
        "dealer_id": staff.dealer_id
    }

