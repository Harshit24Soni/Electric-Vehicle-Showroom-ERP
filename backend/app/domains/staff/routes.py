from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.auth.dependencies import get_current_staff
from app.db.session import get_db
from app.domains.master.models import Staff
from app.domains.staff.schemas import StaffResponse, StaffUpdate

router = APIRouter(
    prefix="/staff",
    tags=["Staff"]
)


@router.get("/me", response_model=StaffResponse)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    current_staff_auth: dict = Depends(get_current_staff)
):
    """Get my own profile with full details"""
    stmt = select(Staff).filter(Staff.staff_id == current_staff_auth["staff_id"])
    result = await db.execute(stmt)
    staff = result.scalars().first()
    
    if not staff:
        raise HTTPException(status_code=404, detail="Profile not found")
        
    return StaffResponse.model_validate(staff, from_attributes=True)

@router.put("/me", response_model=StaffResponse)
async def update_my_profile(
    data: StaffUpdate,
    db: AsyncSession = Depends(get_db),
    current_staff_auth: dict = Depends(get_current_staff)
):
    """Update my own profile (Restricted fields)"""
    stmt = select(Staff).filter(Staff.staff_id == current_staff_auth["staff_id"])
    result = await db.execute(stmt)
    staff = result.scalars().first()
    
    if not staff:
        raise HTTPException(status_code=404, detail="Profile not found")
        
    # Prevent updating Restricted Fields
    if data.designation is not None or data.dealer_id is not None:
         raise HTTPException(status_code=403, detail="Cannot update designation or dealer linkage")
         
    # Allow Personal Updates
    if data.full_name is not None: staff.full_name = data.full_name # Allowed? Maybe restrict name change? Spec says "Edit their own details". usually name is allowed.
    if data.mobile_no is not None: staff.mobile_no = data.mobile_no
    if data.email is not None: staff.email = data.email
    
    # Personal
    if data.aadhaar_no is not None: staff.aadhaar_no = data.aadhaar_no
    if data.pan_no is not None: staff.pan_no = data.pan_no
    # joined_date should be read-only for self? Spec says "basic info... name, role, join date... Admin/Dealer enters". 
    # Staff update "personal info, address, bank, documents". 
    # Joining date is official record. Staff shouldn't change it. 
    # But schema allows it. Let's ignore it here or allow. Ideally ignore.
    
    # Address
    if data.address_line1 is not None: staff.address_line1 = data.address_line1
    if data.address_line2 is not None: staff.address_line2 = data.address_line2
    if data.city is not None: staff.city = data.city
    if data.state is not None: staff.state = data.state
    if data.pincode is not None: staff.pincode = data.pincode
    
    # Bank
    if data.bank_name is not None: staff.bank_name = data.bank_name
    if data.bank_account_no is not None: staff.bank_account_no = data.bank_account_no
    if data.ifsc_code is not None: staff.bank_ifsc = data.ifsc_code
    if data.upi_id is not None: staff.upi_id = data.upi_id
    
    # Emergency
    if data.emergency_contact_name is not None: staff.emergency_contact_name = data.emergency_contact_name
    if data.emergency_contact_no is not None: staff.emergency_contact_no = data.emergency_contact_no
    
    await db.flush()
    
    return StaffResponse.model_validate(staff, from_attributes=True)
