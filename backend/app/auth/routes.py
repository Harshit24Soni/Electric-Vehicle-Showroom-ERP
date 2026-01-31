import os
import random
from datetime import datetime, timedelta

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy import text

from app.auth.dependencies import get_current_staff
from app.auth.pin_utils import hash_pin, verify_pin
from app.auth.roles import require_roles
from app.auth.schemas import AdminPinResetRequest, PinChangeRequest, PinLoginRequest
from app.auth.token_utils import create_access_token
from app.db.session import engine

load_dotenv()

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)

security = HTTPBearer()

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM")

@router.post("/login-pin")
def login_with_pin(payload: PinLoginRequest) -> dict:
    """
    Login using staff identifier (mobile or staff_id) and PIN.

    - Verifies PIN
    - Tracks failed attempts
    - Locks account after repeated failures
    - Issues JWT with force_pin_change flag
    """

    identifier = payload.identifier.strip()
    pin = payload.pin

    with engine.begin() as conn:
        staff = conn.execute(
            text("""
                SELECT
                    staff_id,
                    designation,
                    pin_hash,
                    is_active,
                    failed_attempts,
                    locked_until,
                    is_pin_reset_required
                FROM master.staff
                WHERE mobile_no = :identifier
                   OR staff_id::text = :identifier
            """),
            {"identifier": identifier}
        ).mappings().first()

        if not staff:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        if not staff["is_active"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account inactive"
            )

        # 🔓 Auto-unlock if lock time has passed
        if staff["locked_until"] and staff["locked_until"] <= datetime.utcnow():
            conn.execute(
                text("""
                    UPDATE master.staff
                    SET failed_attempts = 0,
                        locked_until = NULL,
                        last_failed_at = NULL
                    WHERE staff_id = :staff_id
                """),
                {"staff_id": staff["staff_id"]}
            )
            staff["failed_attempts"] = 0
            staff["locked_until"] = None

        if staff["locked_until"] and staff["locked_until"] > datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail="Account temporarily locked. Try again later."
            )

        if not staff["pin_hash"] or not verify_pin(pin, staff["pin_hash"]):
            failed_attempts = staff["failed_attempts"] + 1
            locked_until = None

            if failed_attempts >= 5:
                locked_until = datetime.utcnow() + timedelta(minutes=30)

            conn.execute(
                text("""
                    UPDATE master.staff
                    SET failed_attempts = :failed_attempts,
                        last_failed_at = NOW(),
                        locked_until = :locked_until
                    WHERE staff_id = :staff_id
                """),
                {
                    "failed_attempts": failed_attempts,
                    "locked_until": locked_until,
                    "staff_id": staff["staff_id"]
                }
            )

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        # ✅ Successful login → reset failure counters
        conn.execute(
            text("""
                UPDATE master.staff
                SET failed_attempts = 0,
                    last_failed_at = NULL,
                    locked_until = NULL
                WHERE staff_id = :staff_id
            """),
            {"staff_id": staff["staff_id"]}
        )

    # 🔐 Issue JWT (8-hour ERP-friendly session)
    access_token = create_access_token(
        data={
            "staff_id": staff["staff_id"],
            "designation": staff["designation"],
            "force_pin_change": staff["is_pin_reset_required"]
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "force_pin_change": staff["is_pin_reset_required"]
    }

@router.post("/change-pin")
def change_pin(
    payload: PinChangeRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Change staff PIN.

    - Requires valid JWT
    - Verifies old PIN
    - Updates PIN hash
    - Clears force PIN change flag
    """

    token = credentials.credentials

    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        staff_id = decoded.get("staff_id")

        if not staff_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    old_pin = payload.old_pin
    new_pin = payload.new_pin

    if old_pin == new_pin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New PIN must be different from old PIN"
        )

    with engine.begin() as conn:
        staff = conn.execute(
            text("""
                SELECT staff_id, pin_hash
                FROM master.staff
                WHERE staff_id = :staff_id
            """),
            {"staff_id": staff_id}
        ).mappings().first()

        if not staff or not staff["pin_hash"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid staff"
            )

        if not verify_pin(old_pin, staff["pin_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Old PIN is incorrect"
            )

        conn.execute(
            text("""
                UPDATE master.staff
                SET pin_hash = :pin_hash,
                    is_pin_reset_required = false,
                    failed_attempts = 0,
                    locked_until = NULL,
                    last_pin_changed_at = NOW()
                WHERE staff_id = :staff_id
            """),
            {
                "pin_hash": hash_pin(new_pin),
                "staff_id": staff_id
            }
        )

    return {
        "message": "PIN changed successfully. Please login again."
    }

@router.post(
    "/reset-pin",
    dependencies=[Depends(require_roles("ADMIN", "DEALER"))]
)
def reset_staff_pin(payload: AdminPinResetRequest):
    """
    Reset a staff member's PIN (Admin / Dealer only).

    - Generates temporary PIN
    - Forces PIN change on next login
    - Unlocks account if locked
    """

    staff_id = payload.staff_id

    # 🔢 Generate 6-digit temporary PIN
    temp_pin = str(random.randint(100000, 999999))

    with engine.begin() as conn:
        staff = conn.execute(
            text("""
                SELECT staff_id
                FROM master.staff
                WHERE staff_id = :staff_id
            """),
            {"staff_id": staff_id}
        ).mappings().first()

        if not staff:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff not found"
            )

        conn.execute(
            text("""
                UPDATE master.staff
                SET pin_hash = :pin_hash,
                    is_pin_reset_required = true,
                    failed_attempts = 0,
                    locked_until = NULL,
                    last_pin_changed_at = NOW()
                WHERE staff_id = :staff_id
            """),
            {
                "pin_hash": hash_pin(temp_pin),
                "staff_id": staff_id
            }
        )

    return {
        "message": "PIN reset successfully",
        "temporary_pin": temp_pin
    }
