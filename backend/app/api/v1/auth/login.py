from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from app.db.session import engine
from app.auth.pin_utils import verify_pin
from app.auth.token_utils import create_access_token
from typing import Dict, Any


router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login")
def login_with_pin(pin: str) -> dict:
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT staff_id, designation, pin_hash
                FROM master.staff
                WHERE is_active = true
            """)
        ).fetchall()

        for row in result:
            if row.pin_hash and verify_pin(pin, row.pin_hash):
                token = create_access_token({
                    "staff_id": row.staff_id,
                    "designation": row.designation
                })
                return {
                    "access_token": token,
                    "token_type": "bearer",
                    "designation": row.designation
                }

    raise HTTPException(status_code=401, detail="Invalid PIN")
