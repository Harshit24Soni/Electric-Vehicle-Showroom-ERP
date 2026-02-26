from datetime import datetime, timedelta
import random

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy import text

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
from app.db.session import engine
from app.middleware.rate_limit import rate_limit


router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)


@router.post("/login-pin")
async def login_with_pin(
    payload: PinLoginRequest,
    request: Request,
    _rate_limit=Depends(rate_limit(max_requests=25, window=300)),
) -> dict:
    """
    Login with PIN using mobile number or email.
    Note: Staff ID is NOT allowed for login (only database tracking).
    """
    identifier = payload.identifier.strip()
    pin = payload.pin

    async with engine.begin() as conn:
        result = await conn.execute(
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
                   OR email = :identifier
            """),
            {"identifier": identifier}
        )
        staff = result.mappings().first()

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

        if staff["locked_until"] and staff["locked_until"] <= datetime.utcnow():
            await conn.execute(
                text("""
                    UPDATE master.staff
                    SET failed_attempts = 0,
                        locked_until = NULL,
                        last_failed_at = NULL
                    WHERE staff_id = :staff_id
                """),
                {"staff_id": staff["staff_id"]}
            )
            # Fetch fresh data or manually update local dict
            staff = dict(staff)
            staff["failed_attempts"] = 0
            staff["locked_until"] = None

        if staff["locked_until"] and staff["locked_until"] > datetime.utcnow():
            remaining_seconds = int((staff["locked_until"] - datetime.utcnow()).total_seconds())
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail={
                    "message": "Account temporarily locked.",
                    "retry_after": remaining_seconds
                }
            )

        if not staff["pin_hash"] or not verify_pin(pin, staff["pin_hash"]):
            failed_attempts = staff["failed_attempts"] + 1
            locked_until = None

            if failed_attempts >= 5:
                locked_until = datetime.utcnow() + timedelta(minutes=30)

            await conn.execute(
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

        await conn.execute(
            text("""
                UPDATE master.staff
                SET failed_attempts = 0,
                    last_failed_at = NULL,
                    locked_until = NULL
                WHERE staff_id = :staff_id
            """),
            {"staff_id": staff["staff_id"]}
        )

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


@router.post("/forgot-pin")
async def forgot_pin(payload: ForgotPinRequest):
    """
    Request PIN reset.
    - STAFF: Returns instruction to contact Dealer.
    - DEALER: Returns instruction to use Authenticator App (if enabled).
    """
    identifier = payload.identifier.strip()

    async with engine.begin() as conn:
        result = await conn.execute(
            text("""
                SELECT staff_id, designation, totp_secret
                FROM master.staff
                WHERE (mobile_no = :identifier OR email = :identifier)
                  AND is_active = true
            """),
            {"identifier": identifier}
        )
        staff = result.mappings().first()

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
            await conn.execute(
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
                    "staff_id": staff.staff_id
                }
            )
            
            # Log the request (existing logic, optional or keep)
            await conn.execute(
                text("""
                    INSERT INTO master.pin_reset_request 
                    (staff_id, request_type, requested_at, status)
                    VALUES (:staff_id, 'STAFF_FORGOT_PIN', NOW(), 'PENDING')
                """),
                {"staff_id": staff.staff_id}
            )
            
            # Simulate Notification to Dealer
            print(f"!!! NOTIFICATION TO DEALER !!! Staff {staff.staff_id} requested PIN reset. Temporary PIN: {temp_pin}")
            
            return {
                "action": "NOTIFY_DEALER", 
                "message": "Your request has been sent to the Dealer. They will provide you with a temporary PIN."
            }


@router.post("/change-pin")
async def change_pin(
    payload: PinChangeRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
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

    async with engine.begin() as conn:
        result = await conn.execute(
            text("""
                SELECT staff_id, pin_hash
                FROM master.staff
                WHERE staff_id = :staff_id
            """),
            {"staff_id": staff_id}
        )
        staff = result.mappings().first()

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

        await conn.execute(
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
async def reset_staff_pin(
    payload: AdminPinResetRequest,
    current_staff=Depends(get_current_staff)
):
    """Admin/Dealer can reset a staff member's PIN"""
    staff_id = payload.staff_id

    temp_pin = str(random.randint(100000, 999999))

    async with engine.begin() as conn:
        result = await conn.execute(
            text("""
                SELECT staff_id, designation, dealer_id
                FROM master.staff
                WHERE staff_id = :staff_id
            """),
            {"staff_id": staff_id}
        )
        staff = result.mappings().first()

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

        await conn.execute(
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


@router.post("/totp/setup", response_model=TOTPSetupResponse)
async def setup_totp(
    credentials: HTTPAuthorizationCredentials = Depends(security)
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
    
    async with engine.begin() as conn:
        result = await conn.execute(
            text("SELECT full_name, email FROM master.staff WHERE staff_id = :staff_id"),
            {"staff_id": staff_id}
        )
        staff = result.mappings().first()
        
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
    credentials: HTTPAuthorizationCredentials = Depends(security)
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

    async with engine.begin() as conn:
        await conn.execute(
            text("UPDATE master.staff SET totp_secret = :secret WHERE staff_id = :staff_id"),
            {"secret": payload.secret, "staff_id": staff_id}
        )
        
    return {"message": "2FA enabled successfully"}


# ==================== OTP ENDPOINTS ====================

@router.post("/send-otp")
def send_otp(payload: ForgotPinRequest):
    """
    Send OTP for Dealer PIN reset.
    For development, OTP is always '123456'.
    """
    identifier = payload.identifier.strip()

    with engine.begin() as conn:
        staff = conn.execute(
            text("""
                SELECT staff_id, designation
                FROM master.staff
                WHERE (mobile_no = :identifier OR email = :identifier)
                  AND designation = 'DEALER'
                  AND is_active = true
            """),
            {"identifier": identifier}
        ).mappings().first()

        if not staff:
             # Return success to avoid user enumeration, but log internally
             return {"message": "If account exists, OTP has been sent."}

        # In a real app, generate and save OTP to DB/Redis here
        # For now, we assume a static OTP or log it
        print(f"DEBUG: OTP for {identifier} is 123456")

    return {"message": "OTP sent successfully"}


@router.post("/reset-pin/dealer")
async def reset_dealer_pin(payload: DealerPinResetRequest):
    """
    Reset Dealer PIN using TOTP code.
    """
    identifier = payload.identifier.strip()
    totp_code = payload.totp_code
    new_pin = payload.new_pin

    async with engine.begin() as conn:
        result = await conn.execute(
            text("""
                SELECT staff_id, totp_secret
                FROM master.staff
                WHERE (mobile_no = :identifier OR email = :identifier)
                  AND designation = 'DEALER'
                  AND is_active = true
            """),
            {"identifier": identifier}
        )
        staff = result.mappings().first()

        if not staff:
             raise HTTPException(status_code=404, detail="Dealer not found")
             
        if not staff.totp_secret:
             raise HTTPException(status_code=400, detail="2FA not set up. Cannot reset PIN via Authenticator.")

        if not verify_totp_code(staff.totp_secret, totp_code):
             raise HTTPException(status_code=400, detail="Invalid Authenticator Code")

        await conn.execute(
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
                "staff_id": staff.staff_id
            }
        )

    return {"message": "PIN reset successfully. Please login with new PIN."}


# ==================== PIN RESET REQUEST ENDPOINTS ====================


@router.post("/pin/request-reset")
async def request_pin_reset(payload: PinResetRequestCreate):
    """
    Staff member requests PIN reset from admin/dealer.
    Creates a pending request in the database.
    """
    mobile = payload.mobile.strip()

    async with engine.begin() as conn:
        # Find staff by mobile
        result = await conn.execute(
            text("""
                SELECT staff_id, designation
                FROM master.staff
                WHERE mobile_no = :mobile
                  AND is_active = true
            """),
            {"mobile": mobile}
        )
        staff = result.mappings().first()

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
        existing = await conn.execute(
            text("""
                SELECT id FROM master.pin_reset_request
                WHERE staff_id = :staff_id AND status = 'PENDING'
            """),
            {"staff_id": staff.staff_id}
        )
        if existing.mappings().first():
            raise HTTPException(
                status_code=400,
                detail="You already have a pending reset request."
            )

        # Create reset request
        await conn.execute(
            text("""
                INSERT INTO master.pin_reset_request
                (staff_id, request_type, requested_at, status)
                VALUES (:staff_id, 'STAFF_FORGOT_PIN', NOW(), 'PENDING')
            """),
            {"staff_id": staff.staff_id}
        )

    return {
        "message": "PIN reset request submitted. An admin will process it shortly."
    }


@router.get(
    "/pin/reset-requests",
    dependencies=[Depends(require_roles("ADMIN", "DEALER"))]
)
async def get_reset_requests(current_staff=Depends(get_current_staff)):
    """
    Get all pending PIN reset requests.
    Only admin and dealer can access.
    """
    dealer_id = None
    if current_staff["designation"] == "DEALER":
        dealer_id = current_staff["staff_id"]

    query_str = """
        SELECT
            prr.id,
            prr.staff_id,
            s.full_name AS staff_name,
            s.mobile_no AS staff_mobile,
            prr.requested_at,
            EXTRACT(EPOCH FROM (NOW() - prr.requested_at)) / 3600 AS hours_ago
        FROM master.pin_reset_request prr
        JOIN master.staff s ON s.staff_id = prr.staff_id
        WHERE prr.status = 'PENDING'
    """
    
    params = {}
    if dealer_id:
        query_str += " AND s.dealer_id = :dealer_id"
        params["dealer_id"] = dealer_id
        
    query_str += " ORDER BY prr.requested_at DESC"

    async with engine.begin() as conn:
        result = await conn.execute(text(query_str), params)
        requests = result.mappings().all()

    return {
        "requests": [
            {
                "id": req["id"],
                "staff_id": req["staff_id"],
                "staff_name": req["staff_name"],
                "staff_mobile": req["staff_mobile"],
                "requested_at": req["requested_at"].isoformat() if req["requested_at"] else None,
                "hours_ago": int(req["hours_ago"]) if req["hours_ago"] else 0
            }
            for req in requests
        ]
    }


@router.post(
    "/pin/approve-reset/{request_id}",
    dependencies=[Depends(require_roles("ADMIN", "DEALER"))]
)
async def approve_pin_reset(
    request_id: int,
    current_staff=Depends(get_current_staff)
):
    """
    Admin/Dealer approves PIN reset request.
    Generates temp PIN and marks staff for forced change.
    """
    async with engine.begin() as conn:
        # Get the pending request
        result = await conn.execute(
            text("""
                SELECT prr.id, prr.staff_id, s.full_name, s.dealer_id, s.designation
                FROM master.pin_reset_request prr
                JOIN master.staff s ON s.staff_id = prr.staff_id
                WHERE prr.id = :request_id AND prr.status = 'PENDING'
            """),
            {"request_id": request_id}
        )
        req = result.mappings().first()

        if not req:
            raise HTTPException(status_code=404, detail="Request not found or already processed")

        if current_staff["designation"] == "DEALER":
            if req.designation in ["ADMIN", "DEALER"]:
                 raise HTTPException(status_code=403, detail="Dealers cannot approve resets for Admin/Dealer accounts")
            if req.dealer_id != current_staff["staff_id"]:
                 raise HTTPException(status_code=403, detail="Access denied")

        # Generate temp PIN
        temp_pin = str(random.randint(100000, 999999))
        pin_hash_val = hash_pin(temp_pin)

        # Update staff PIN
        await conn.execute(
            text("""
                UPDATE master.staff
                SET pin_hash = :pin_hash,
                    is_pin_reset_required = true,
                    failed_attempts = 0,
                    locked_until = NULL,
                    last_pin_changed_at = NOW()
                WHERE staff_id = :staff_id
            """),
            {"pin_hash": pin_hash_val, "staff_id": req["staff_id"]}
        )

        # Update request status
        await conn.execute(
            text("""
                UPDATE master.pin_reset_request
                SET status = 'APPROVED'
                WHERE id = :request_id
            """),
            {"request_id": request_id}
        )

    return {
        "message": "PIN reset approved",
        "staff_name": req["full_name"],
        "temp_pin": temp_pin
    }


@router.post(
    "/pin/deny-reset/{request_id}",
    dependencies=[Depends(require_roles("ADMIN", "DEALER"))]
)
async def deny_pin_reset(
    request_id: int,
    current_staff=Depends(get_current_staff)
):
    """Admin/Dealer denies PIN reset request."""
    async with engine.begin() as conn:
        result = await conn.execute(
            text("""
                SELECT prr.id, s.dealer_id, s.designation
                FROM master.pin_reset_request prr
                JOIN master.staff s ON s.staff_id = prr.staff_id
                WHERE prr.id = :request_id AND prr.status = 'PENDING'
            """),
            {"request_id": request_id}
        )
        req = result.mappings().first()

        if not req:
            raise HTTPException(status_code=404, detail="Request not found or already processed")

        if current_staff["designation"] == "DEALER":
            if req.designation in ["ADMIN", "DEALER"]:
                 raise HTTPException(status_code=403, detail="Dealers cannot deny resets for Admin/Dealer accounts")
            if req.dealer_id != current_staff["staff_id"]:
                 raise HTTPException(status_code=403, detail="Access denied")

        await conn.execute(
            text("""
                UPDATE master.pin_reset_request
                SET status = 'DENIED'
                WHERE id = :request_id
            """),
            {"request_id": request_id}
        )

    return {"message": "Request denied"}


@router.post("/pin/reset-self")
async def reset_pin_self(payload: SelfPinResetRequest):
    """
    Admin/Dealer resets own PIN using TOTP.
    Requires valid TOTP code.
    """
    mobile = payload.mobile.strip()

    if payload.new_pin != payload.confirm_pin:
        raise HTTPException(status_code=400, detail="PINs do not match")

    async with engine.begin() as conn:
        result = await conn.execute(
            text("""
                SELECT staff_id, designation, totp_secret
                FROM master.staff
                WHERE mobile_no = :mobile
                  AND is_active = true
            """),
            {"mobile": mobile}
        )
        staff = result.mappings().first()

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
        await conn.execute(
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
                "pin_hash": hash_pin(payload.new_pin),
                "staff_id": staff.staff_id
            }
        )

    return {"message": "PIN reset successful. Please login with your new PIN."}
