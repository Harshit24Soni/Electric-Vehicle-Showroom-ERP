from datetime import datetime, timedelta
import random

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, update, insert

from app.auth.dependencies import SECRET_KEY, ALGORITHM, security, get_current_staff
from app.auth.pin_utils import hash_pin, verify_pin
from app.auth.roles import require_roles
from app.auth.totp_utils import generate_totp_secret, get_totp_uri, verify_totp_code
from app.domains.staff.schemas import (
    AdminPinResetRequest,
    PinChangeRequest,
    PinLoginRequest,
    ForgotPinRequest,
    DealerPinResetRequest,
    TOTPSetupResponse,
    TOTPVerifyRequest,
    PinResetRequestCreate,
    SelfPinResetRequest
)
from app.auth.token_utils import create_access_token
from app.db.session import get_db
from app.middleware.rate_limit import rate_limit
from app.domains.master.models import Staff, PinResetRequest


router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)


@router.post("/login-pin")
async def login_with_pin(
    payload: PinLoginRequest,
    request: Request,
    _rate_limit=Depends(rate_limit(max_requests=25, window=300)),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Login with PIN using mobile number or email.
    Note: Staff ID is NOT allowed for login (only database tracking).
    """
    identifier = payload.identifier.strip()
    pin = payload.pin

    stmt = select(Staff).where(
        or_(
            Staff.mobile_no == identifier,
            Staff.email == identifier
        )
    )
    result = await db.execute(stmt)
    staff = result.scalars().first()

    if not staff:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    if not staff.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account inactive"
        )

    if staff.locked_until and staff.locked_until <= datetime.utcnow():
        staff.failed_attempts = 0
        staff.locked_until = None
        staff.last_failed_at = None
        await db.commit()
        await db.refresh(staff)

    if staff.locked_until and staff.locked_until > datetime.utcnow():
        remaining_seconds = int((staff.locked_until - datetime.utcnow()).total_seconds())
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail={
                "message": "Account temporarily locked.",
                "retry_after": remaining_seconds
            }
        )

    if not staff.pin_hash or not verify_pin(pin, staff.pin_hash):
        failed_attempts = staff.failed_attempts + 1
        locked_until = None

        if failed_attempts >= 5:
            locked_until = datetime.utcnow() + timedelta(minutes=30)

        staff.failed_attempts = failed_attempts
        staff.last_failed_at = datetime.utcnow()
        staff.locked_until = locked_until
        await db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    staff.failed_attempts = 0
    staff.last_failed_at = None
    staff.locked_until = None
    await db.commit()

    access_token = create_access_token(
        data={
            "staff_id": staff.staff_id,
            "designation": staff.designation,
            "force_pin_change": staff.is_pin_reset_required
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "force_pin_change": staff.is_pin_reset_required
    }


@router.post("/forgot-pin")
async def forgot_pin(payload: ForgotPinRequest, db: AsyncSession = Depends(get_db)):
    """
    Request PIN reset.
    - STAFF: Returns instruction to contact Dealer.
    - DEALER: Returns instruction to use Authenticator App (if enabled).
    """
    identifier = payload.identifier.strip()

    stmt = select(Staff).where(
        or_(
            Staff.mobile_no == identifier,
            Staff.email == identifier
        ),
        Staff.is_active == True
    )
    result = await db.execute(stmt)
    staff = result.scalars().first()

    if not staff:
        # blind return
        return {"action": "NONE", "message": "If account exists, instructions have been sent."}

    if staff.designation in ["DEALER", "ADMIN"]:
        if staff.totp_secret:
            return {
                "action": "TOTP_REQUIRED", 
                "message": "Please enter the code from your Authenticator App."
            }
        else:
            return {
                "action": "CONTACT_ADMIN", 
                "message": "2FA not set up. Please contact System Admin."
            }
    else:
        # STAFF
        # Generate temporary PIN
        temp_pin = str(random.randint(100000, 999999))
        
        # Update staff record
        staff.pin_hash = hash_pin(temp_pin)
        staff.is_pin_reset_required = True
        staff.failed_attempts = 0
        staff.locked_until = None
        staff.last_pin_changed_at = datetime.utcnow()

        # Log the request
        req = PinResetRequest(
            staff_id=staff.staff_id,
            request_type='STAFF_FORGOT_PIN',
            status='PENDING'
        )
        db.add(req)
        await db.commit()
        
        # Simulate Notification to Dealer
        print(f"!!! NOTIFICATION TO DEALER !!! Staff {staff.staff_id} requested PIN reset. Temporary PIN: {temp_pin}")
        
        return {
            "action": "NOTIFY_DEALER", 
            "message": "Your request has been sent to the Dealer. They will provide you with a temporary PIN."
        }


@router.post("/change-pin")
async def change_pin(
    payload: PinChangeRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Change PIN for authenticated user"""
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

    staff = await db.get(Staff, staff_id)

    if not staff or not staff.pin_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid staff"
        )

    if not verify_pin(old_pin, staff.pin_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Old PIN is incorrect"
        )

    staff.pin_hash = hash_pin(new_pin)
    staff.is_pin_reset_required = False
    staff.failed_attempts = 0
    staff.locked_until = None
    staff.last_pin_changed_at = datetime.utcnow()
    await db.commit()

    return {
        "message": "PIN changed successfully. Please login again."
    }


@router.post(
    "/reset-pin",
    dependencies=[Depends(require_roles("ADMIN", "DEALER"))]
)
async def reset_staff_pin(
    payload: AdminPinResetRequest,
    current_staff=Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)
):
    """Admin/Dealer can reset a staff member's PIN"""
    staff_id = payload.staff_id

    temp_pin = str(random.randint(100000, 999999))

    staff = await db.get(Staff, staff_id)

    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff not found"
        )

    if current_staff["designation"] == "DEALER":
        if staff.designation in ["ADMIN", "DEALER"]:
                raise HTTPException(status_code=403, detail="Dealers cannot reset PIN for Admin/Dealer accounts")
        if staff.dealer_id != current_staff["staff_id"]:
                raise HTTPException(status_code=403, detail="Access denied")

    staff.pin_hash = hash_pin(temp_pin)
    staff.is_pin_reset_required = True
    staff.failed_attempts = 0
    staff.locked_until = None
    staff.last_pin_changed_at = datetime.utcnow()
    await db.commit()

    return {
        "message": "PIN reset successfully",
        "temporary_pin": temp_pin
    }


@router.post("/totp/setup", response_model=TOTPSetupResponse)
async def setup_totp(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a new TOTP secret for the authenticated user (Dealer).
    Returns the secret and a provisioning URI for QR code generation.
    """
    token = credentials.credentials
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        staff_id = decoded.get("staff_id")
        designation = decoded.get("designation")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    if designation not in ["DEALER", "ADMIN"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Admins and Dealers can set up 2FA")

    secret = generate_totp_secret()
    
    staff = await db.get(Staff, staff_id)
        
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
        
    identifier = staff.email or staff.full_name
    uri = get_totp_uri(secret, identifier)
    
    # We do NOT save the secret yet. It must be verified first.
    # The client must send it back in /totp/verify.
    
    return {"secret": secret, "provisioning_uri": uri}


@router.post("/totp/verify")
async def verify_totp(
    payload: TOTPVerifyRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """
    Verify the TOTP code and enable 2FA by saving the secret.
    """
    token = credentials.credentials
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        staff_id = decoded.get("staff_id")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    if not verify_totp_code(payload.secret, payload.code):
        raise HTTPException(status_code=400, detail="Invalid TOTP code")

    staff = await db.get(Staff, staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
        
    staff.totp_secret = payload.secret
    await db.commit()
        
    return {"message": "2FA enabled successfully"}


# ==================== OTP ENDPOINTS ====================

@router.post("/send-otp")
async def send_otp(payload: ForgotPinRequest, db: AsyncSession = Depends(get_db)):
    """
    Send OTP for Dealer PIN reset.
    For development, OTP is always '123456'.
    """
    identifier = payload.identifier.strip()

    stmt = select(Staff).where(
        or_(
            Staff.mobile_no == identifier,
            Staff.email == identifier
        ),
        Staff.designation == 'DEALER',
        Staff.is_active == True
    )
    result = await db.execute(stmt)
    staff = result.scalars().first()

    if not staff:
            # Return success to avoid user enumeration, but log internally
            return {"message": "If account exists, OTP has been sent."}

    # In a real app, generate and save OTP to DB/Redis here
    # For now, we assume a static OTP or log it
    print(f"DEBUG: OTP for {identifier} is 123456")

    return {"message": "OTP sent successfully"}


@router.post("/reset-pin/dealer")
async def reset_dealer_pin(payload: DealerPinResetRequest, db: AsyncSession = Depends(get_db)):
    """
    Reset Dealer PIN using TOTP code.
    """
    identifier = payload.identifier.strip()
    totp_code = payload.totp_code
    new_pin = payload.new_pin

    stmt = select(Staff).where(
        or_(
            Staff.mobile_no == identifier,
            Staff.email == identifier
        ),
        Staff.designation == 'DEALER',
        Staff.is_active == True
    )
    result = await db.execute(stmt)
    staff = result.scalars().first()

    if not staff:
            raise HTTPException(status_code=404, detail="Dealer not found")
            
    if not staff.totp_secret:
            raise HTTPException(status_code=400, detail="2FA not set up. Cannot reset PIN via Authenticator.")

    if not verify_totp_code(staff.totp_secret, totp_code):
            raise HTTPException(status_code=400, detail="Invalid Authenticator Code")

    staff.pin_hash = hash_pin(new_pin)
    staff.is_pin_reset_required = False
    staff.failed_attempts = 0
    staff.locked_until = None
    staff.last_pin_changed_at = datetime.utcnow()
    await db.commit()

    return {"message": "PIN reset successfully. Please login with new PIN."}


# ==================== PIN RESET REQUEST ENDPOINTS ====================


@router.post("/pin/request-reset")
async def request_pin_reset(payload: PinResetRequestCreate, db: AsyncSession = Depends(get_db)):
    """
    Staff member requests PIN reset from admin/dealer.
    Creates a pending request in the database.
    """
    mobile = payload.mobile.strip()

    # Find staff by mobile
    stmt = select(Staff).where(
        Staff.mobile_no == mobile,
        Staff.is_active == True
    )
    result = await db.execute(stmt)
    staff = result.scalars().first()

    if not staff:
        # Don't reveal if user exists (security)
        return {"message": "If this mobile number exists, a reset request has been sent."}

    # Admin/Dealer should use TOTP self-reset, not this flow
    if staff.designation in ("ADMIN", "DEALER"):
        raise HTTPException(
            status_code=400,
            detail="Admins and Dealers should use TOTP reset or contact another admin."
        )

    # Check for existing pending request
    stmt_existing = select(PinResetRequest).where(
        PinResetRequest.staff_id == staff.staff_id,
        PinResetRequest.status == 'PENDING'
    )
    result_existing = await db.execute(stmt_existing)
    existing = result_existing.scalars().first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="You already have a pending reset request."
        )

    # Create reset request
    req = PinResetRequest(
        staff_id=staff.staff_id,
        request_type='STAFF_FORGOT_PIN',
        status='PENDING'
    )
    db.add(req)
    await db.commit()

    return {
        "message": "PIN reset request submitted. An admin will process it shortly."
    }


@router.get(
    "/pin/reset-requests",
    dependencies=[Depends(require_roles("ADMIN", "DEALER"))]
)
async def get_reset_requests(current_staff=Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    """
    Get all pending PIN reset requests.
    Only admin and dealer can access.
    """
    dealer_id = None
    if current_staff["designation"] == "DEALER":
        dealer_id = current_staff["staff_id"]

    stmt = select(PinResetRequest, Staff).join(Staff, PinResetRequest.staff_id == Staff.staff_id).where(
        PinResetRequest.status == 'PENDING'
    )
    
    if dealer_id:
        stmt = stmt.where(Staff.dealer_id == dealer_id)
        
    stmt = stmt.order_by(PinResetRequest.requested_at.desc())

    result = await db.execute(stmt)
    rows = result.all()

    requests_out = []
    for req, staff in rows:
        hours_ago = 0
        if req.requested_at:
            delta = datetime.utcnow() - req.requested_at
            hours_ago = int(delta.total_seconds() / 3600)
            
        requests_out.append({
            "id": req.id,
            "staff_id": req.staff_id,
            "staff_name": staff.full_name,
            "staff_mobile": staff.mobile_no,
            "requested_at": req.requested_at.isoformat() if req.requested_at else None,
            "hours_ago": hours_ago
        })

    return {
        "requests": requests_out
    }


@router.post(
    "/pin/approve-reset/{request_id}",
    dependencies=[Depends(require_roles("ADMIN", "DEALER"))]
)
async def approve_pin_reset(
    request_id: int,
    current_staff=Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Admin/Dealer approves PIN reset request.
    Generates temp PIN and marks staff for forced change.
    """
    stmt = select(PinResetRequest, Staff).join(Staff, PinResetRequest.staff_id == Staff.staff_id).where(
        PinResetRequest.id == request_id,
        PinResetRequest.status == 'PENDING'
    )
    result = await db.execute(stmt)
    row = result.first()

    if not row:
        raise HTTPException(status_code=404, detail="Request not found or already processed")

    req, staff = row

    if current_staff["designation"] == "DEALER":
        if staff.designation in ["ADMIN", "DEALER"]:
                raise HTTPException(status_code=403, detail="Dealers cannot approve resets for Admin/Dealer accounts")
        if staff.dealer_id != current_staff["staff_id"]:
                raise HTTPException(status_code=403, detail="Access denied")

    # Generate temp PIN
    temp_pin = str(random.randint(100000, 999999))
    pin_hash_val = hash_pin(temp_pin)

    # Update staff PIN
    staff.pin_hash = pin_hash_val
    staff.is_pin_reset_required = True
    staff.failed_attempts = 0
    staff.locked_until = None
    staff.last_pin_changed_at = datetime.utcnow()

    # Update request status
    req.status = 'APPROVED'
    await db.commit()

    return {
        "message": "PIN reset approved",
        "staff_name": staff.full_name,
        "temp_pin": temp_pin
    }


@router.post(
    "/pin/deny-reset/{request_id}",
    dependencies=[Depends(require_roles("ADMIN", "DEALER"))]
)
async def deny_pin_reset(
    request_id: int,
    current_staff=Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)
):
    """Admin/Dealer denies PIN reset request."""
    stmt = select(PinResetRequest, Staff).join(Staff, PinResetRequest.staff_id == Staff.staff_id).where(
        PinResetRequest.id == request_id,
        PinResetRequest.status == 'PENDING'
    )
    result = await db.execute(stmt)
    row = result.first()

    if not row:
        raise HTTPException(status_code=404, detail="Request not found or already processed")
        
    req, staff = row

    if current_staff["designation"] == "DEALER":
        if staff.designation in ["ADMIN", "DEALER"]:
                raise HTTPException(status_code=403, detail="Dealers cannot deny resets for Admin/Dealer accounts")
        if staff.dealer_id != current_staff["staff_id"]:
                raise HTTPException(status_code=403, detail="Access denied")

    req.status = 'DENIED'
    await db.commit()

    return {"message": "Request denied"}


@router.post("/pin/reset-self")
async def reset_pin_self(payload: SelfPinResetRequest, db: AsyncSession = Depends(get_db)):
    """
    Admin/Dealer resets own PIN using TOTP.
    Requires valid TOTP code.
    """
    mobile = payload.mobile.strip()

    if payload.new_pin != payload.confirm_pin:
        raise HTTPException(status_code=400, detail="PINs do not match")

    stmt = select(Staff).where(
        Staff.mobile_no == mobile,
        Staff.is_active == True
    )
    result = await db.execute(stmt)
    staff = result.scalars().first()

    if not staff:
        raise HTTPException(status_code=404, detail="User not found")

    if staff.designation not in ("ADMIN", "DEALER"):
        raise HTTPException(
            status_code=400,
            detail="Staff members must request reset from admin"
        )

    if not staff.totp_secret:
        raise HTTPException(
            status_code=400,
            detail="TOTP not configured. Please contact another admin."
        )

    if not verify_totp_code(staff.totp_secret, payload.totp_code):
        raise HTTPException(status_code=400, detail="Invalid TOTP code")

    # Update PIN
    staff.pin_hash = hash_pin(payload.new_pin)
    staff.is_pin_reset_required = False
    staff.failed_attempts = 0
    staff.locked_until = None
    staff.last_pin_changed_at = datetime.utcnow()
    await db.commit()

    return {"message": "PIN reset successful. Please login with your new PIN."}
