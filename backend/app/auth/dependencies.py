import os

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy import text

from app.db.session import get_db

load_dotenv()

security = HTTPBearer()

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-key")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

# In development, allow defaults so the app can run without explicit env vars.


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

    # 🔒 ERP-grade check: ensure staff still exists & is active
    # Using Async Session
    result = await db.execute(
        text("""
            SELECT staff_id, designation, is_active
            FROM master.staff
            WHERE staff_id = :staff_id
        """),
        {"staff_id": staff_id}
    )
    staff = result.mappings().first()

    if not staff or not staff["is_active"]:
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
        "staff_id": staff["staff_id"],
        "designation": staff["designation"]
    }
