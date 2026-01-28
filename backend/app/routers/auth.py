from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from datetime import datetime, timedelta

from app.schemas.auth import PinLoginRequest
from app.db.session import engine
from app.auth.token_utils import create_access_token
from app.utils.hashing import hash_pin

router = APIRouter()

@router.post("/login-pin")
def login_with_pin(payload: PinLoginRequest):
    identifier = payload.identifier.strip()
    pin = payload.pin

    with engine.begin() as conn:

        # 1️⃣ Resolve staff
        staff = conn.execute(
            text("""
                SELECT *
                FROM master.staff
                WHERE mobile_no = :identifier
                   OR staff_id::text = :identifier
            """),
            {"identifier": identifier}
        ).mappings().first()

        if not staff:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # 2️⃣ Active check
        if not staff["is_active"]:
            raise HTTPException(status_code=403, detail="Account inactive")

        # 3️⃣ Auto-unlock if lock expired
        if staff["locked_until"] and staff["locked_until"] <= datetime.utcnow():
            conn.execute(
                text("""
                    UPDATE master.staff
                    SET locked_until = NULL,
                        failed_attempts = 0,
                        last_failed_at = NULL
                    WHERE staff_id = :id
                """),
                {"id": staff["staff_id"]}
            )
            staff["locked_until"] = None
            staff["failed_attempts"] = 0

        # 4️⃣ Locked check
        if staff["locked_until"] and staff["locked_until"] > datetime.utcnow():
            raise HTTPException(
                status_code=423,
                detail="Account temporarily locked. Try again later."
            )

        # 5️⃣ Verify PIN
        if staff["pin_hash"] != hash_pin(pin):
            failed_attempts = staff["failed_attempts"] + 1
            lock_until = None

            if failed_attempts >= 5:
                lock_until = datetime.utcnow() + timedelta(minutes=30)

            conn.execute(
                text("""
                    UPDATE master.staff
                    SET failed_attempts = :attempts,
                        last_failed_at = NOW(),
                        locked_until = :locked_until
                    WHERE staff_id = :id
                """),
                {
                    "attempts": failed_attempts,
                    "locked_until": lock_until,
                    "id": staff["staff_id"]
                }
            )

            raise HTTPException(status_code=401, detail="Invalid credentials")

        # 6️⃣ Successful login → reset failure state
        conn.execute(
            text("""
                UPDATE master.staff
                SET failed_attempts = 0,
                    last_failed_at = NULL,
                    locked_until = NULL
                WHERE staff_id = :id
            """),
            {"id": staff["staff_id"]}
        )

    # 7️⃣ Issue JWT
    access_token = create_access_token(
        data={
            "sub": str(staff["staff_id"]),
            "role": staff["designation"],
            "force_pin_change": staff["is_pin_reset_required"]
        },
        expires_delta=timedelta(minutes=480)  # 8 hours
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "force_pin_change": staff["is_pin_reset_required"]
    }
