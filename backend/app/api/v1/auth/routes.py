from fastapi import APIRouter, HTTPException, status
from sqlalchemy import text
from datetime import datetime, timedelta

from app.db.session import engine
from app.schemas.auth import PinLoginRequest
from app.auth.pin_utils import verify_pin
from app.auth.token_utils import create_access_token

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)

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
