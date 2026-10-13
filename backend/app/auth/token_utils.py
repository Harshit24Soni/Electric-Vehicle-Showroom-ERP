import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from jose import JWTError, jwt
from app.core.config import settings

logger = logging.getLogger(__name__)

# Cryptographic token signing parameters from validated settings
SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = settings.JWT_ALGORITHM

# Access token expiry (defaults to configured minutes, e.g., 240m)
ACCESS_TOKEN_EXPIRE_MINUTES = settings.JWT_EXPIRE_MINUTES

# Refresh token expiry (7 days)
REFRESH_TOKEN_EXPIRE_DAYS = 7


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Generate a signed JWT access token with standard exp, iat, and nbf claims.
    Uses timezone-aware UTC timestamps and configured algorithm.
    """
    to_encode = data.copy()
    now = datetime.now(timezone.utc)

    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update(
        {
            "exp": expire,
            "iat": now,
            "nbf": now,
            "type": "access",
            "token_type": "bearer",
        }
    )
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Generate a signed JWT refresh token with extended TTL.
    """
    to_encode = data.copy()
    now = datetime.now(timezone.utc)

    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode.update(
        {
            "exp": expire,
            "iat": now,
            "nbf": now,
            "type": "refresh",
            "token_type": "refresh",
        }
    )
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str, verify_exp: bool = True) -> Dict[str, Any]:
    """
    Decode, verify cryptographic signature, and validate token claims.
    Raises JWTError if expired, tampered with, or invalid algorithm.
    """
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            options={"verify_exp": verify_exp, "verify_signature": True},
        )
        return payload
    except JWTError as exc:
        logger.debug(f"[TokenUtils] Token decode failure: {exc}")
        raise


def verify_token_type(payload: Dict[str, Any], expected_type: str = "access") -> bool:
    """
    Verify token payload represents the expected token type (access vs refresh).
    Prevents token substitution attacks.
    """
    token_type = payload.get("type") or payload.get("token_type")
    return token_type == expected_type
