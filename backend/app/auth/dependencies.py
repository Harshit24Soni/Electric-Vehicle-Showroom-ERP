from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy import text
import os
from dotenv import load_dotenv
from fastapi import HTTPException, status

from app.db.session import engine

load_dotenv()

security = HTTPBearer()

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM")

if not SECRET_KEY or not ALGORITHM:
    raise RuntimeError("JWT configuration missing")


def get_current_staff(
    credentials: HTTPAuthorizationCredentials = Depends(security)
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
    with engine.connect() as conn:
        result = conn.execute(
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
