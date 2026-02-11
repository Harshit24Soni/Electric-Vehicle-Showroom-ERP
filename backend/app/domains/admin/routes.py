import random
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.staff.schemas import StaffCreate, StaffUpdate, StaffResponse, StaffDesignation
from app.domains.master.models import Staff
from app.auth.dependencies import get_current_staff
from app.auth.pin_utils import hash_pin
from app.auth.roles import require_roles
from app.db.session import get_db


router = APIRouter(
    prefix="/admin/staff",
    tags=["Admin - Staff"],
    dependencies=[
        Depends(get_current_staff),
        Depends(require_roles("ADMIN", "DEALER")),
    ]
)

@router.post("", response_model=StaffResponse, status_code=status.HTTP_201_CREATED)
async def create_staff(
    data: StaffCreate,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff)
):
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
    stmt = select(Staff).filter(
        (Staff.mobile_no == data.mobile_no) | (Staff.email == data.email)
    )
    result = await db.execute(stmt)
    if result.scalars().first():
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

        created_at=datetime.utcnow()
    )
    
    db.add(new_staff)
    await db.flush()

    # Log PIN for now (In prod, send via SMS/Email)
    print(f"[TEMP PIN] New staff {new_staff.full_name} PIN: {pin}")

    return StaffResponse.model_validate(new_staff, from_attributes=True)

@router.get("", response_model=list[StaffResponse])
async def list_staff(
    include_deleted: bool = False,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff)
):
    """List all staff members. Dealers only see their own staff."""
    stmt = select(Staff).order_by(Staff.staff_id)
    
    if not include_deleted:
        stmt = stmt.filter(Staff.deleted_at.is_(None))
    
    if current_staff["designation"] == "DEALER":
        stmt = stmt.filter(Staff.dealer_id == current_staff["staff_id"])
    
    # If Admin, they see all. 
    # Optional: Filter by dealer_id query param if needed, but for now list all.

    result = await db.execute(stmt)
    staff_list = result.scalars().all()

    return [StaffResponse.model_validate(s, from_attributes=True) for s in staff_list]

@router.get("/{staff_id}", response_model=StaffResponse)
async def get_staff(
    staff_id: int,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff)
):
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

@router.put("/{staff_id}", response_model=StaffResponse)
async def update_staff(
    staff_id: int,
    data: StaffUpdate,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff)
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

    # 2. Apply Updates
    if data.full_name is not None: staff.full_name = data.full_name
    if data.mobile_no is not None: staff.mobile_no = data.mobile_no
    if data.email is not None: staff.email = data.email
    if data.designation is not None: staff.designation = data.designation
    
    if current_staff["designation"] == "ADMIN" and data.dealer_id is not None:
        staff.dealer_id = data.dealer_id
        
    # Personal
    if data.aadhaar_no is not None: staff.aadhaar_no = data.aadhaar_no
    if data.pan_no is not None: staff.pan_no = data.pan_no
    if data.joined_date is not None: staff.joined_date = data.joined_date
    
    # Address
    if data.address_line1 is not None: staff.address_line1 = data.address_line1
    if data.address_line2 is not None: staff.address_line2 = data.address_line2
    if data.city is not None: staff.city = data.city
    if data.state is not None: staff.state = data.state
    if data.pincode is not None: staff.pincode = data.pincode
    
    # Bank
    if data.bank_name is not None: staff.bank_name = data.bank_name
    if data.bank_account_no is not None: staff.bank_account_no = data.bank_account_no
    if data.ifsc_code is not None: staff.ifsc_code = data.ifsc_code
    if data.upi_id is not None: staff.upi_id = data.upi_id
    
    # Emergency
    if data.emergency_contact_name is not None: staff.emergency_contact_name = data.emergency_contact_name
    if data.emergency_contact_no is not None: staff.emergency_contact_no = data.emergency_contact_no

    await db.flush()

    return StaffResponse.model_validate(staff, from_attributes=True)

@router.delete("/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_staff(
    staff_id: int,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff)
):
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

    staff.deleted_at = datetime.utcnow()
    staff.is_active = False
    await db.flush()
    return None

@router.post("/{staff_id}/restore", response_model=StaffResponse)
async def restore_staff(
    staff_id: int,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff)
):
    """Restore a soft-deleted staff member"""
    # We need to find even deleted ones. 
    # SQLAlchemy select implies filtering out deleted if configured? 
    # Usually Mixin applies filter automatically only if implemented in Query/Session. 
    # Since we use simple select(Staff), if SoftDeleteMixin doesn't auto-filter, we see it.
    # If it does, we need execution_options(include_deleted=True).
    # Assuming standard soft delete mixin usually hides it, let's explicitly look for it.
    
    # For now, let's try selecting. If mixin hides it, this will fail to find it.
    # We might need to use `with_deleted` or Check how Mixin is implemented.
    # The Mixin I saw was `deleted_at`, but I didn't see `Global Filter`. 
    # Usually soft delete is manual filter or event hook.
    # If it's manual, then `select(Staff)` DOES return deleted items unless we filter `deleted_at == None`.
    # Let's check `list_staff`... I didn't add filter `deleted_at == None`. 
    # THIS MEANS LIST STAFF CURRENTLY RETURNS DELETED USERS? 
    # I should fix list_staff too.
    
    stmt = select(Staff).filter(Staff.staff_id == staff_id)
    result = await db.execute(stmt)
    staff = result.scalars().first()
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
        
    if staff.deleted_at is None:
        raise HTTPException(status_code=400, detail="Staff is not deleted")

    # Permission Check (Same as delete)
    if current_staff["designation"] == "DEALER":
         if staff.dealer_id != current_staff["staff_id"]:
             raise HTTPException(status_code=403, detail="Access denied")

    staff.deleted_at = None # Restore
    await db.flush()
    
    return StaffResponse.model_validate(staff, from_attributes=True)
