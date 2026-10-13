import hmac
import logging
import re
from passlib.context import CryptContext

logger = logging.getLogger(__name__)

# Argon2 is the primary enterprise-grade password hashing scheme
# with bcrypt support for legacy migrations
pwd_context = CryptContext(
    schemes=["argon2", "bcrypt"],
    deprecated="auto",
    argon2__memory_cost=65536,
    argon2__time_cost=3,
    argon2__parallelism=4,
)


def hash_pin(pin: str) -> str:
    """Hash numeric PIN or password using modern Argon2id with salt."""
    if not pin:
        raise ValueError("PIN or password to hash cannot be empty.")
    return pwd_context.hash(pin)


def verify_pin(plain_pin: str, pin_hash: str) -> bool:
    """
    Verify plain PIN against hashed representation using constant-time comparison.
    Safely handles corrupt or mismatched hashes without raising internal exceptions.
    """
    if not plain_pin or not pin_hash:
        return False
    try:
        return pwd_context.verify(plain_pin, pin_hash)
    except Exception as exc:
        logger.warning(f"[PinUtils] Failed hash verification: {exc}")
        return False


def validate_pin_format(pin: str, min_length: int = 4, max_length: int = 8) -> bool:
    """Validate that PIN consists strictly of digits within the configured length range."""
    if not pin or not isinstance(pin, str):
        return False
    pattern = rf"^\d{{{min_length},{max_length}}}$"
    return bool(re.match(pattern, pin))


def constant_time_compare(val1: str, val2: str) -> bool:
    """Constant-time string comparison to prevent timing attacks on sensitive tokens."""
    return hmac.compare_digest(val1.encode("utf-8"), val2.encode("utf-8"))


# Aliases for password operations
hash_password = hash_pin
verify_password = verify_pin
