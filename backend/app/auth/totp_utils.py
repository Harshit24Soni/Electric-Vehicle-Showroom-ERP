import logging
import re
from typing import Optional
import pyotp
from app.core.config import settings

logger = logging.getLogger(__name__)


def generate_totp_secret() -> str:
    """Generate a cryptographically random RFC 6238 Base32 secret for TOTP MFA."""
    return pyotp.random_base32()


def get_totp_uri(secret: str, username: str, issuer_name: Optional[str] = None) -> str:
    """Generate otpauth:// URI for authenticator QR codes (Google Authenticator, Authy, etc.)."""
    issuer = issuer_name or settings.PROJECT_NAME or "EV Showroom ERP"
    return pyotp.totp.TOTP(secret).provisioning_uri(name=username, issuer_name=issuer)


def verify_totp_code(secret: Optional[str], code: Optional[str], valid_window: int = 1) -> bool:
    """
    Verify a 6-digit TOTP code against the shared Base32 secret.
    Allows ±1 window (30 seconds before/after) to account for client clock skew.
    Guarantees exception safety and constant-time execution.
    """
    if not secret or not code or not isinstance(code, str):
        return False

    clean_code = code.strip()
    if not re.match(r"^\d{6}$", clean_code):
        return False

    try:
        totp = pyotp.TOTP(secret)
        return bool(totp.verify(clean_code, valid_window=valid_window))
    except Exception as exc:
        logger.warning(f"[TotpUtils] Verification error: {exc}")
        return False
