import logging
import random
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import (
    get_current_staff,
    get_current_staff_for_pin_change,
)
from app.auth.pin_utils import hash_pin, verify_pin
from app.auth.roles import require_roles
from app.auth.token_utils import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_token_type,
)
from app.auth.totp_utils import generate_totp_secret, get_totp_uri, verify_totp_code
from app.db.session import get_db
from app.middleware.rate_limit import rate_limit
from app.modules.master.models import PinResetRequest, Staff
from app.modules.staff.schemas import (
    AdminPinResetRequest,
    DealerPinResetRequest,
    ForgotPinRequest,
    PinChangeRequest,
    PinLoginRequest,
    PinResetRequestCreate,
    SelfPinResetRequest,
    TOTPSetupResponse,
    TOTPVerifyRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])


class RefreshTokenRequest(BaseModel):
    refresh_token: str


def utc_now() -> datetime:
    """Helper returning timezone-aware current UTC datetime."""
    return datetime.now(timezone.utc)


# ------------------------------------------------------------------------------
# 1. Login with PIN
# ------------------------------------------------------------------------------
@router.post("/login-pin")
async def login_with_pin(
    payload: PinLoginRequest,
    request: Request,
    _rate_limit=Depends(rate_limit(max_requests=25, window=300)),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Login with PIN using mobile number or email identifier.
    Guarantees account lockout protection, security event logging, and JWT generation.
    """
    identifier = payload.identifier.strip()
    pin = payload.pin
    now = utc_now()

    stmt = select(Staff).where(
        or_(
            Staff.mobile_no == identifier,
            Staff.email == identifier,
        )
    )
    result = await db.execute(stmt)
    staff = result.scalars().first()

    if not staff:
        logger.warning(f"[Auth Audit] Failed login attempt for non-existent identifier: {identifier[:3]}***")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not staff.is_active:
        logger.warning(f"[Auth Audit] Login attempt for inactive staff ID {staff.staff_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact your administrator.",
        )

    # Check and release expired temporary locks
    if staff.locked_until:
        locked_dt = staff.locked_until
        if locked_dt.tzinfo is None:
            locked_dt = locked_dt.replace(tzinfo=timezone.utc)

        if locked_dt <= now:
            staff.failed_attempts = 0
            staff.locked_until = None
            staff.last_failed_at = None
            await db.commit()
            await db.refresh(staff)
        else:
            remaining_seconds = max(1, int((locked_dt - now).total_seconds()))
            logger.warning(f"[Auth Audit] Login rejected for locked staff ID {staff.staff_id}")
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail={
                    "message": "Account temporarily locked due to excessive failed attempts.",
                    "retry_after": remaining_seconds,
                },
            )

    # Validate PIN hash with constant-time comparison
    if not staff.pin_hash or not verify_pin(pin, staff.pin_hash):
        failed_attempts = (staff.failed_attempts or 0) + 1
        locked_until = None

        if failed_attempts >= 5:
            locked_until = now + timedelta(minutes=30)
            logger.warning(f"[Auth Audit] Staff ID {staff.staff_id} locked out after 5 consecutive failures.")

        staff.failed_attempts = failed_attempts
        staff.last_failed_at = now
        staff.locked_until = locked_until
        await db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    # Reset failure tracking on successful authentication
    staff.failed_attempts = 0
    staff.last_failed_at = None
    staff.locked_until = None
    await db.commit()

    token_data = {
        "sub": str(staff.staff_id),
        "staff_id": staff.staff_id,
        "designation": staff.designation,
        "dealer_id": staff.dealer_id,
        "force_pin_change": staff.is_pin_reset_required,
    }

    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)

    logger.info(f"[Auth Audit] Successful login for staff ID {staff.staff_id} ({staff.designation})")

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "force_pin_change": staff.is_pin_reset_required,
    }


# ------------------------------------------------------------------------------
# 2. Token Refresh
# ------------------------------------------------------------------------------
@router.post("/refresh")
async def refresh_access_token(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Exchange a valid JWT refresh token for a fresh access token and refresh token.
    Prevents token substitution by verifying the 'refresh' token claim.
    """
    try:
        decoded = decode_token(payload.refresh_token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    if not verify_token_type(decoded, expected_type="refresh"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Supplied token is not a valid refresh token",
        )

    staff_id = decoded.get("staff_id")
    if not staff_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    staff = await db.get(Staff, staff_id)
    if not staff or not staff.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive staff account")

    new_data = {
        "sub": str(staff.staff_id),
        "staff_id": staff.staff_id,
        "designation": staff.designation,
        "dealer_id": staff.dealer_id,
        "force_pin_change": staff.is_pin_reset_required,
    }

    return {
        "access_token": create_access_token(data=new_data),
        "refresh_token": create_refresh_token(data=new_data),
        "token_type": "bearer",
    }


# ------------------------------------------------------------------------------
# 3. Forgot PIN & Self Request
# ------------------------------------------------------------------------------
@router.post("/forgot-pin")
async def forgot_pin(
    payload: ForgotPinRequest,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Initiate PIN recovery flow.
    Admins/Dealers are directed to TOTP Authenticator.
    Staff requests create a pending reset flow for Dealer authorization.
    """
    identifier = payload.identifier.strip()
    now = utc_now()

    stmt = select(Staff).where(
        or_(
            Staff.mobile_no == identifier,
            Staff.email == identifier,
        ),
        Staff.is_active.is_(True),
    )
    result = await db.execute(stmt)
    staff = result.scalars().first()

    if not staff:
        # Uniform return to prevent account enumeration
        return {"action": "NONE", "message": "If account exists, instructions have been sent."}

    if staff.designation in ["DEALER", "ADMIN"]:
        if staff.totp_secret:
            return {
                "action": "TOTP_REQUIRED",
                "message": "Please enter the code from your Authenticator App.",
            }
        else:
            return {
                "action": "CONTACT_ADMIN",
                "message": "2FA not configured. Please contact the System Administrator.",
            }
    else:
        # Staff: generate temporary PIN and log request
        temp_pin = str(random.randint(100000, 999999))
        staff.pin_hash = hash_pin(temp_pin)
        staff.is_pin_reset_required = True
        staff.failed_attempts = 0
        staff.locked_until = None
        staff.last_pin_changed_at = now

        req = PinResetRequest(
            staff_id=staff.staff_id,
            request_type="STAFF_FORGOT_PIN",
            status="PENDING",
        )
        db.add(req)
        await db.commit()

        logger.info(f"[Auth Audit] Temporary PIN generated for Staff {staff.staff_id}")
        return {
            "action": "NOTIFY_DEALER",
            "message": "Your request has been sent to the Dealer. They will provide your temporary PIN.",
        }


# ------------------------------------------------------------------------------
# 4. Change PIN
# ------------------------------------------------------------------------------
@router.post("/change-pin")
async def change_pin(
    payload: PinChangeRequest,
    current_staff: Dict[str, Any] = Depends(get_current_staff_for_pin_change),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Change PIN for authenticated user. Accessible even when force_pin_change is active.
    """
    staff_id = current_staff["staff_id"]
    old_pin = payload.old_pin
    new_pin = payload.new_pin
    now = utc_now()

    if old_pin == new_pin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New PIN must be different from old PIN.",
        )

    staff = await db.get(Staff, staff_id)
    if not staff or not staff.pin_hash:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid staff account")

    if not verify_pin(old_pin, staff.pin_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current PIN is incorrect")

    staff.pin_hash = hash_pin(new_pin)
    staff.is_pin_reset_required = False
    staff.failed_attempts = 0
    staff.locked_until = None
    staff.last_pin_changed_at = now
    await db.commit()

    logger.info(f"[Auth Audit] PIN successfully updated for staff ID {staff_id}")
    return {"message": "PIN changed successfully. Please login again."}


# ------------------------------------------------------------------------------
# 5. Admin / Dealer PIN Reset
# ------------------------------------------------------------------------------
@router.post(
    "/reset-pin",
    dependencies=[Depends(require_roles("ADMIN", "DEALER"))],
)
async def reset_staff_pin(
    payload: AdminPinResetRequest,
    current_staff=Depends(get_current_staff),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Admin or Dealer directly resets a staff member's PIN with role boundary enforcement."""
    staff_id = payload.staff_id
    now = utc_now()
    temp_pin = str(random.randint(100000, 999999))

    staff = await db.get(Staff, staff_id)
    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found")

    if current_staff["designation"] == "DEALER":
        if staff.designation in ["ADMIN", "DEALER"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Dealers cannot reset PINs for Admin or Dealer accounts.",
            )
        if staff.dealer_id != current_staff["staff_id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    staff.pin_hash = hash_pin(temp_pin)
    staff.is_pin_reset_required = True
    staff.failed_attempts = 0
    staff.locked_until = None
    staff.last_pin_changed_at = now
    await db.commit()

    logger.info(f"[Auth Audit] Admin/Dealer {current_staff['staff_id']} reset PIN for staff {staff_id}")
    return {
        "message": "PIN reset successfully",
        "temporary_pin": temp_pin,
    }


# ------------------------------------------------------------------------------
# 6. Multi-Factor Authentication (TOTP)
# ------------------------------------------------------------------------------
@router.post("/totp/setup", response_model=TOTPSetupResponse)
async def setup_totp(
    current_staff: Dict[str, Any] = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Generate a new TOTP secret and QR provisioning URI for 2FA setup.
    Restricted to Admins and Dealers. Secret is only activated upon successful verification.
    """
    if current_staff["designation"] not in ["DEALER", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admins and Dealers can configure 2FA.",
        )

    staff = await db.get(Staff, current_staff["staff_id"])
    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found")

    secret = generate_totp_secret()
    identifier = staff.email or staff.mobile_no or staff.full_name
    uri = get_totp_uri(secret, identifier)

    return {"secret": secret, "provisioning_uri": uri}


@router.post("/totp/verify")
async def verify_totp(
    payload: TOTPVerifyRequest,
    current_staff: Dict[str, Any] = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Verify TOTP code and persist secret to enable 2FA."""
    if not verify_totp_code(payload.secret, payload.code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid TOTP code")

    staff = await db.get(Staff, current_staff["staff_id"])
    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found")

    staff.totp_secret = payload.secret
    await db.commit()

    logger.info(f"[Auth Audit] 2FA successfully activated for staff ID {current_staff['staff_id']}")
    return {"message": "2FA enabled successfully"}


# ------------------------------------------------------------------------------
# 7. OTP Fallback & Dealer Self-Reset
# ------------------------------------------------------------------------------
@router.post("/send-otp")
async def send_otp(
    payload: ForgotPinRequest,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Dispatch OTP for dealer password recovery (development mock / notification bridge)."""
    identifier = payload.identifier.strip()
    stmt = select(Staff).where(
        or_(
            Staff.mobile_no == identifier,
            Staff.email == identifier,
        ),
        Staff.designation == "DEALER",
        Staff.is_active.is_(True),
    )
    result = await db.execute(stmt)
    staff = result.scalars().first()

    if not staff:
        return {"message": "If account exists, OTP has been sent."}

    logger.info(f"[Auth Audit] OTP dispatched for {identifier[:3]}***")
    return {"message": "OTP sent successfully"}


@router.post("/reset-pin/dealer")
async def reset_dealer_pin(
    payload: DealerPinResetRequest,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Dealer PIN reset verified against TOTP Authenticator."""
    identifier = payload.identifier.strip()
    totp_code = payload.totp_code
    new_pin = payload.new_pin
    now = utc_now()

    stmt = select(Staff).where(
        or_(
            Staff.mobile_no == identifier,
            Staff.email == identifier,
        ),
        Staff.designation == "DEALER",
        Staff.is_active.is_(True),
    )
    result = await db.execute(stmt)
    staff = result.scalars().first()

    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dealer account not found")

    if not staff.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA not configured. Cannot reset PIN via Authenticator.",
        )

    if not verify_totp_code(staff.totp_secret, totp_code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Authenticator Code")

    staff.pin_hash = hash_pin(new_pin)
    staff.is_pin_reset_required = False
    staff.failed_attempts = 0
    staff.locked_until = None
    staff.last_pin_changed_at = now
    await db.commit()

    logger.info(f"[Auth Audit] Dealer PIN reset successfully via TOTP for staff ID {staff.staff_id}")
    return {"message": "PIN reset successfully. Please login with new PIN."}


# ------------------------------------------------------------------------------
# 8. Staff PIN Reset Workflow
# ------------------------------------------------------------------------------
@router.post("/pin/request-reset")
async def request_pin_reset(
    payload: PinResetRequestCreate,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Staff requests PIN reset from dealer/admin."""
    mobile = payload.mobile.strip()

    stmt = select(Staff).where(
        Staff.mobile_no == mobile,
        Staff.is_active.is_(True),
    )
    result = await db.execute(stmt)
    staff = result.scalars().first()

    if not staff:
        return {"message": "If this mobile number exists, a reset request has been sent."}

    if staff.designation in ("ADMIN", "DEALER"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admins and Dealers must use TOTP reset or contact another administrator.",
        )

    stmt_existing = select(PinResetRequest).where(
        PinResetRequest.staff_id == staff.staff_id,
        PinResetRequest.status == "PENDING",
    )
    result_existing = await db.execute(stmt_existing)
    if result_existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a pending reset request.",
        )

    req = PinResetRequest(
        staff_id=staff.staff_id,
        request_type="STAFF_FORGOT_PIN",
        status="PENDING",
    )
    db.add(req)
    await db.commit()

    return {"message": "PIN reset request submitted. An administrator will process it shortly."}


@router.get(
    "/pin/reset-requests",
    dependencies=[Depends(require_roles("ADMIN", "DEALER"))],
)
async def get_reset_requests(
    current_staff=Depends(get_current_staff),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Retrieve all pending PIN reset requests within authorized dealer/admin scope."""
    now = utc_now()
    dealer_id = None
    if current_staff["designation"] == "DEALER":
        dealer_id = current_staff["staff_id"]

    stmt = (
        select(PinResetRequest, Staff)
        .join(Staff, PinResetRequest.staff_id == Staff.staff_id)
        .where(PinResetRequest.status == "PENDING")
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
            req_dt = req.requested_at
            if req_dt.tzinfo is None:
                req_dt = req_dt.replace(tzinfo=timezone.utc)
            hours_ago = int((now - req_dt).total_seconds() / 3600)

        requests_out.append(
            {
                "id": req.id,
                "staff_id": req.staff_id,
                "staff_name": staff.full_name,
                "staff_mobile": staff.mobile_no,
                "requested_at": req.requested_at.isoformat() if req.requested_at else None,
                "hours_ago": hours_ago,
            }
        )

    return {"requests": requests_out}


@router.post(
    "/pin/approve-reset/{request_id}",
    dependencies=[Depends(require_roles("ADMIN", "DEALER"))],
)
async def approve_pin_reset(
    request_id: int,
    current_staff=Depends(get_current_staff),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Admin/Dealer approves a staff member's PIN reset request."""
    now = utc_now()
    stmt = (
        select(PinResetRequest, Staff)
        .join(Staff, PinResetRequest.staff_id == Staff.staff_id)
        .where(PinResetRequest.id == request_id, PinResetRequest.status == "PENDING")
    )
    result = await db.execute(stmt)
    row = result.first()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found or already processed")

    req, staff = row

    if current_staff["designation"] == "DEALER":
        if staff.designation in ["ADMIN", "DEALER"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Dealers cannot approve resets for Admin or Dealer accounts.",
            )
        if staff.dealer_id != current_staff["staff_id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    temp_pin = str(random.randint(100000, 999999))
    staff.pin_hash = hash_pin(temp_pin)
    staff.is_pin_reset_required = True
    staff.failed_attempts = 0
    staff.locked_until = None
    staff.last_pin_changed_at = now

    req.status = "APPROVED"
    await db.commit()

    logger.info(f"[Auth Audit] Reset request {request_id} approved by staff {current_staff['staff_id']}")
    return {
        "message": "PIN reset approved",
        "staff_name": staff.full_name,
        "temp_pin": temp_pin,
    }


@router.post(
    "/pin/deny-reset/{request_id}",
    dependencies=[Depends(require_roles("ADMIN", "DEALER"))],
)
async def deny_pin_reset(
    request_id: int,
    current_staff=Depends(get_current_staff),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Admin/Dealer denies a staff member's PIN reset request."""
    stmt = (
        select(PinResetRequest, Staff)
        .join(Staff, PinResetRequest.staff_id == Staff.staff_id)
        .where(PinResetRequest.id == request_id, PinResetRequest.status == "PENDING")
    )
    result = await db.execute(stmt)
    row = result.first()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found or already processed")

    req, staff = row

    if current_staff["designation"] == "DEALER":
        if staff.designation in ["ADMIN", "DEALER"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Dealers cannot deny resets for Admin or Dealer accounts.",
            )
        if staff.dealer_id != current_staff["staff_id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    req.status = "DENIED"
    await db.commit()

    logger.info(f"[Auth Audit] Reset request {request_id} denied by staff {current_staff['staff_id']}")
    return {"message": "Request denied"}


@router.post("/pin/reset-self")
async def reset_pin_self(
    payload: SelfPinResetRequest,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Admin or Dealer resets own PIN using Authenticator TOTP."""
    mobile = payload.mobile.strip()
    now = utc_now()

    if payload.new_pin != payload.confirm_pin:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PINs do not match")

    stmt = select(Staff).where(
        Staff.mobile_no == mobile,
        Staff.is_active.is_(True),
    )
    result = await db.execute(stmt)
    staff = result.scalars().first()

    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found")

    if staff.designation not in ("ADMIN", "DEALER"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Staff members must request reset from an administrator.",
        )

    if not staff.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="TOTP not configured. Please contact another administrator.",
        )

    if not verify_totp_code(staff.totp_secret, payload.totp_code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Authenticator Code")

    staff.pin_hash = hash_pin(payload.new_pin)
    staff.is_pin_reset_required = False
    staff.failed_attempts = 0
    staff.locked_until = None
    staff.last_pin_changed_at = now
    await db.commit()

    logger.info(f"[Auth Audit] Self-reset completed successfully for staff ID {staff.staff_id}")
    return {"message": "PIN reset successful. Please login with your new PIN."}
