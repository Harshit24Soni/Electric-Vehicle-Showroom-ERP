import random

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text

from backend.app.domains.staff.schemas import StaffCreate, StaffResponse
from app.auth.dependencies import get_current_staff
from app.auth.pin_utils import hash_pin
from app.auth.roles import require_roles
from app.db.session import engine


router = APIRouter(
    prefix="/admin/staff",
    tags=["Admin - Staff"],
    dependencies=[
        Depends(get_current_staff),
        Depends(require_roles("ADMIN")),
    ]
)

@router.post("", response_model=StaffResponse)
def create_staff(staff: StaffCreate):
    pin = str(random.randint(100000, 999999))
    pin_hash = hash_pin(pin)

    try:
        with engine.begin() as conn:
            result = conn.execute(
                text("""
                    INSERT INTO master.staff (
                        full_name,
                        mobile_no,
                        email,
                        designation,
                        aadhaar_no,
                        pan_no,
                        upi_id,
                        bank_account_no,
                        bank_name,
                        ifsc_code,
                        joined_date,
                        pin_hash
                    )
                    VALUES (
                        :full_name,
                        :mobile_no,
                        :email,
                        :designation,
                        :aadhaar_no,
                        :pan_no,
                        :upi_id,
                        :bank_account_no,
                        :bank_name,
                        :ifsc_code,
                        :joined_date,
                        :pin_hash
                    )
                    RETURNING
                        staff_id,
                        full_name,
                        mobile_no,
                        email,
                        designation,
                        is_active,
                        joined_date,
                        created_at
                """),
                {
                    **staff.dict(),
                    "pin_hash": pin_hash
                }
            )

            staff_row = result.mappings().first()

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create staff (duplicate or invalid data)"
        )

    # ⚠️ IMPORTANT:
    # PIN must NOT be returned in response
    # For now, log it temporarily for admin testing
    print(f"[TEMP PIN] New staff PIN: {pin}")

    return staff_row

@router.get("", response_model=list[StaffResponse])
def list_staff():
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT
                    staff_id,
                    full_name,
                    mobile_no,
                    email,
                    designation,
                    is_active,
                    joined_date,
                    created_at
                FROM master.staff
                ORDER BY staff_id
            """)
        )
        return result.mappings().all()