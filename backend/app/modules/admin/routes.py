import logging
import random
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.staff.schemas import StaffCreate, StaffUpdate, StaffResponse, StaffDesignation
from app.modules.master.models import Staff
from app.auth.dependencies import get_current_staff
from app.auth.pin_utils import hash_pin
from app.auth.roles import require_roles
from app.db.session import get_db

logger = logging.getLogger(__name__)


def _utc_now_naive() -> datetime:
    """Return current naive UTC datetime for standard TIMESTAMP storage."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


router = APIRouter(
    prefix="/admin/staff",
    tags=["Admin - Staff"],
    dependencies=[
        Depends(get_current_staff),
        Depends(require_roles("ADMIN", "DEALER")),
    ],
)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_staff(data: StaffCreate, db: AsyncSession = Depends(get_db), current_staff=Depends(get_current_staff)):
    """Create a new staff member (Admin/Dealer)"""

    # Permission Check: Dealers cannot create Admins or other Dealers
    if current_staff["designation"] == "DEALER":
        if data.designation in ["ADMIN", "DEALER"]:
            raise HTTPException(status_code=403, detail="Dealers can only create Staff accounts")

        # Force dealer_id to be the current dealer
        data.dealer_id = current_staff["staff_id"]

    # If Admin creates, they can set dealer_id optionally (to link staff to a dealer)
    # If Admin creates a DEALER, dealer_id is likely None (Top level)

    # Check for existing
    stmt = select(Staff).filter((Staff.mobile_no == data.mobile_no) | (Staff.email == data.email))
    result = await db.execute(stmt)
    existing_staff = result.scalars().first()

    try:
        if existing_staff:
            if existing_staff.is_deleted:
                # reinstate
                existing_staff.deleted_at = None
                existing_staff.is_deleted = False
                existing_staff.deleted_by = None
                existing_staff.is_active = True

                # Reset PIN
                pin = str(random.randint(100000, 999999))
                pin_hash = hash_pin(pin)
                existing_staff.pin_hash = pin_hash
                existing_staff.is_pin_reset_required = True
                await db.commit()

                staff_data = StaffResponse.model_validate(existing_staff, from_attributes=True)
                return {**staff_data.model_dump(), "temp_pin": pin, "message": "Staff account reinstated successfully"}
            else:
                raise HTTPException(status_code=400, detail="Mobile number or Email already exists")

        # Generate PIN
        pin = str(random.randint(100000, 999999))
        pin_hash = hash_pin(pin)

        new_staff = Staff(
            full_name=data.full_name,
            mobile_no=data.mobile_no,
            email=data.email,
            designation=data.designation,
            pin_hash=pin_hash,
            is_active=True,
            is_pin_reset_required=True,
            dealer_id=data.dealer_id,
            # Personal
            aadhaar_no=data.aadhaar_no,
            pan_no=data.pan_no,
            joined_date=data.joined_date,
            # Address
            address_line1=data.address_line1,
            address_line2=data.address_line2,
            city=data.city,
            state=data.state,
            pincode=data.pincode,
            # Bank
            bank_name=data.bank_name,
            bank_account_no=data.bank_account_no,
            ifsc_code=data.ifsc_code,
            upi_id=data.upi_id,
            # Emergency
            emergency_contact_name=data.emergency_contact_name,
            emergency_contact_no=data.emergency_contact_no,
            created_at=_utc_now_naive(),
        )

        db.add(new_staff)
        await db.flush()
        await db.commit()

        staff_data = StaffResponse.model_validate(new_staff, from_attributes=True)
        return {**staff_data.model_dump(), "temp_pin": pin, "message": "Staff created successfully"}
    except HTTPException:
        raise
    except Exception as exc:
        await db.rollback()
        logger.error("Failed to create staff %s: %s", data.email, exc)
        raise


@router.get("", response_model=list[StaffResponse])
async def list_staff(
    include_deleted: bool = False, db: AsyncSession = Depends(get_db), current_staff=Depends(get_current_staff)
):
    """List all staff members. Dealers only see their own staff."""
    stmt = select(Staff).order_by(Staff.staff_id)

    if not include_deleted:
        stmt = stmt.filter(Staff.is_deleted == False)

    if current_staff["designation"] == "DEALER":
        stmt = stmt.filter(Staff.dealer_id == current_staff["staff_id"])

    result = await db.execute(stmt)
    staff_list = result.scalars().all()

    return [StaffResponse.model_validate(s, from_attributes=True) for s in staff_list]


@router.get("/{staff_id:int}", response_model=StaffResponse)
async def get_staff(staff_id: int, db: AsyncSession = Depends(get_db), current_staff=Depends(get_current_staff)):
    """Get a specific staff member"""
    stmt = select(Staff).filter(Staff.staff_id == staff_id)
    result = await db.execute(stmt)
    staff = result.scalars().first()

    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    # Scope Check
    if current_staff["designation"] == "DEALER":
        if staff.dealer_id != current_staff["staff_id"] and staff.staff_id != current_staff["staff_id"]:
            raise HTTPException(status_code=403, detail="Access denied")

    return StaffResponse.model_validate(staff, from_attributes=True)


@router.put("/{staff_id:int}", response_model=StaffResponse)
async def update_staff(
    staff_id: int, data: StaffUpdate, db: AsyncSession = Depends(get_db), current_staff=Depends(get_current_staff)
):
    """Update staff details"""
    stmt = select(Staff).filter(Staff.staff_id == staff_id)
    result = await db.execute(stmt)
    staff = result.scalars().first()

    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    # 1. Access Control
    if current_staff["designation"] == "DEALER":
        # Cannot edit admin or other dealers
        if staff.designation in ["ADMIN", "DEALER"] and staff.staff_id != current_staff["staff_id"]:
            raise HTTPException(status_code=403, detail="Dealers cannot modify Higher Authorities")

        # Cannot edit staff verifying to other dealers
        if staff.dealer_id != current_staff["staff_id"] and staff.staff_id != current_staff["staff_id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        # Cannot promote to Admin/Dealer
        if data.designation in ["ADMIN", "DEALER"]:
            raise HTTPException(status_code=403, detail="Dealers cannot promote users to Admin/Dealer")

        # CANNOT UNLINK staff (change dealer_id)
        if data.dealer_id is not None and data.dealer_id != current_staff["staff_id"]:
            raise HTTPException(status_code=403, detail="Cannot transfer staff")

    try:
        # 2. Apply Updates
        if data.full_name is not None:
            staff.full_name = data.full_name
        if data.mobile_no is not None:
            staff.mobile_no = data.mobile_no
        if data.email is not None:
            staff.email = data.email
        if data.designation is not None:
            staff.designation = data.designation

        if current_staff["designation"] == "ADMIN" and data.dealer_id is not None:
            staff.dealer_id = data.dealer_id

        # Personal
        if data.aadhaar_no is not None:
            staff.aadhaar_no = data.aadhaar_no
        if data.pan_no is not None:
            staff.pan_no = data.pan_no
        if data.joined_date is not None:
            staff.joined_date = data.joined_date

        # Address
        if data.address_line1 is not None:
            staff.address_line1 = data.address_line1
        if data.address_line2 is not None:
            staff.address_line2 = data.address_line2
        if data.city is not None:
            staff.city = data.city
        if data.state is not None:
            staff.state = data.state
        if data.pincode is not None:
            staff.pincode = data.pincode

        # Bank
        if data.bank_name is not None:
            staff.bank_name = data.bank_name
        if data.bank_account_no is not None:
            staff.bank_account_no = data.bank_account_no
        if data.ifsc_code is not None:
            staff.ifsc_code = data.ifsc_code
        if data.upi_id is not None:
            staff.upi_id = data.upi_id

        # Emergency
        if data.emergency_contact_name is not None:
            staff.emergency_contact_name = data.emergency_contact_name
        if data.emergency_contact_no is not None:
            staff.emergency_contact_no = data.emergency_contact_no

        await db.flush()
        await db.commit()

        return StaffResponse.model_validate(staff, from_attributes=True)
    except HTTPException:
        raise
    except Exception as exc:
        await db.rollback()
        logger.error("Failed to update staff %s: %s", staff_id, exc)
        raise


@router.delete("/{staff_id:int}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_staff(staff_id: int, db: AsyncSession = Depends(get_db), current_staff=Depends(get_current_staff)):
    """Soft delete a staff member"""
    stmt = select(Staff).filter(Staff.staff_id == staff_id)
    result = await db.execute(stmt)
    staff = result.scalars().first()

    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    # Permission Check
    if current_staff["designation"] == "DEALER":
        if staff.designation in ["ADMIN", "DEALER"]:
            raise HTTPException(status_code=403, detail="Dealers cannot delete Admin/Dealer accounts")
        if staff.dealer_id != current_staff["staff_id"]:
            raise HTTPException(status_code=403, detail="Access denied")

    # Prevent self-deletion
    if staff.staff_id == current_staff["staff_id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    try:
        staff.deleted_at = _utc_now_naive()
        staff.is_deleted = True
        staff.deleted_by = current_staff["staff_id"]
        staff.is_active = False
        await db.flush()
        await db.commit()
        return None
    except Exception as exc:
        await db.rollback()
        logger.error("Failed to delete staff %s: %s", staff_id, exc)
        raise


@router.post("/{staff_id:int}/restore", response_model=StaffResponse)
async def restore_staff(staff_id: int, db: AsyncSession = Depends(get_db), current_staff=Depends(get_current_staff)):
    """Restore a soft-deleted staff member"""
    stmt = select(Staff).filter(Staff.staff_id == staff_id)
    result = await db.execute(stmt)
    staff = result.scalars().first()

    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    if not staff.is_deleted:
        raise HTTPException(status_code=400, detail="Staff is not deleted")

    # Permission Check (Same as delete)
    if current_staff["designation"] == "DEALER":
        if staff.designation in ["ADMIN", "DEALER"]:
            raise HTTPException(status_code=403, detail="Dealers cannot restore Admin/Dealer accounts")
        if staff.dealer_id != current_staff["staff_id"]:
            raise HTTPException(status_code=403, detail="Access denied")

    try:
        staff.deleted_at = None
        staff.is_deleted = False
        staff.deleted_by = None
        staff.is_active = True
        await db.flush()
        await db.commit()

        return StaffResponse.model_validate(staff, from_attributes=True)
    except Exception as exc:
        await db.rollback()
        logger.error("Failed to restore staff %s: %s", staff_id, exc)
        raise
