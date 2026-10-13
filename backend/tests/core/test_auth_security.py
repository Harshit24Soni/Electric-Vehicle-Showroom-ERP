from datetime import timedelta
import pyotp
import pytest
from fastapi import HTTPException
from jose import JWTError

from app.auth.pin_utils import (
    constant_time_compare,
    hash_pin,
    validate_pin_format,
    verify_pin,
)
from app.auth.roles import Role, has_role, require_roles
from app.auth.token_utils import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_token_type,
)
from app.auth.totp_utils import (
    generate_totp_secret,
    get_totp_uri,
    verify_totp_code,
)
from app.middleware.rate_limit import extract_client_ip, rate_limit


# ------------------------------------------------------------------------------
# 1. JWT Access & Refresh Token Tests
# ------------------------------------------------------------------------------
def test_jwt_access_token_generation_and_decoding():
    """Verify access token creation, claims, and signature decoding."""
    payload_data = {"sub": "staff_123", "staff_id": 123, "designation": "SALES"}
    token = create_access_token(data=payload_data)

    decoded = decode_token(token)
    assert decoded["sub"] == "staff_123"
    assert decoded["staff_id"] == 123
    assert decoded["designation"] == "SALES"
    assert decoded["type"] == "access"
    assert "exp" in decoded
    assert "iat" in decoded
    assert "nbf" in decoded
    assert verify_token_type(decoded, expected_type="access") is True
    assert verify_token_type(decoded, expected_type="refresh") is False


def test_jwt_refresh_token_generation():
    """Verify refresh token creation and type differentiation."""
    payload_data = {"sub": "staff_123", "staff_id": 123, "designation": "SALES"}
    refresh_token = create_refresh_token(data=payload_data)

    decoded = decode_token(refresh_token)
    assert decoded["type"] == "refresh"
    assert verify_token_type(decoded, expected_type="refresh") is True
    assert verify_token_type(decoded, expected_type="access") is False


def test_jwt_decode_fails_on_tampering():
    """Verify that tampering with JWT signature raises JWTError."""
    token = create_access_token(data={"staff_id": 1})
    tampered_token = token[:-5] + "XXXXX"
    with pytest.raises(JWTError):
        decode_token(tampered_token)


# ------------------------------------------------------------------------------
# 2. PIN & Password Hashing Tests
# ------------------------------------------------------------------------------
def test_pin_hashing_and_verification():
    """Verify Argon2 PIN hashing and constant-time verification."""
    raw_pin = "852963"
    hashed = hash_pin(raw_pin)

    # Must be valid argon2 hash
    assert hashed.startswith("$argon2")
    assert verify_pin(raw_pin, hashed) is True
    assert verify_pin("123456", hashed) is False
    assert verify_pin("", hashed) is False
    assert verify_pin(raw_pin, "") is False


def test_pin_format_validation():
    """Verify PIN length and numeric constraint validation."""
    assert validate_pin_format("1234") is True
    assert validate_pin_format("123456") is True
    assert validate_pin_format("12345678") is True

    # Invalid cases
    assert validate_pin_format("123") is False  # too short
    assert validate_pin_format("123456789") is False  # too long
    assert validate_pin_format("123a") is False  # non-numeric
    assert validate_pin_format("") is False
    assert validate_pin_format(None) is False


def test_constant_time_comparison():
    """Verify constant-time digest comparison helper."""
    assert constant_time_compare("secret_token_1", "secret_token_1") is True
    assert constant_time_compare("secret_token_1", "secret_token_2") is False


# ------------------------------------------------------------------------------
# 3. Multi-Factor Authentication (TOTP) Tests
# ------------------------------------------------------------------------------
def test_totp_lifecycle():
    """Verify TOTP secret generation, URI construction, and code verification."""
    secret = generate_totp_secret()
    assert len(secret) == 32

    uri = get_totp_uri(secret, "dealer@evshowroom.com", issuer_name="EV Showroom")
    assert uri.startswith("otpauth://totp/")
    assert "EV%20Showroom" in uri or "EV+Showroom" in uri

    # Generate current code using pyotp
    current_code = pyotp.TOTP(secret).now()
    assert verify_totp_code(secret, current_code) is True

    # Test rejection of invalid code
    assert verify_totp_code(secret, "000000") is False
    assert verify_totp_code(secret, "invalid") is False
    assert verify_totp_code(None, current_code) is False


# ------------------------------------------------------------------------------
# 4. Role-Based Access Control (RBAC) Tests
# ------------------------------------------------------------------------------
def test_rbac_has_role():
    """Verify role checks including Super Admin bypass."""
    admin_staff = {"staff_id": 1, "designation": "ADMIN"}
    sales_staff = {"staff_id": 2, "designation": "SALES"}
    service_staff = {"staff_id": 3, "designation": "SERVICE"}

    # Admin bypasses any role
    assert has_role(admin_staff, "SALES") is True
    assert has_role(admin_staff, "ACCOUNTS") is True

    # Specific role checks
    assert has_role(sales_staff, "SALES") is True
    assert has_role(sales_staff, "SERVICE") is False
    assert has_role(service_staff, "SERVICE", "INVENTORY") is True


def test_require_roles_dependency():
    """Verify require_roles dependency enforcement and 403 raising."""
    checker = require_roles("DEALER", "MANAGER")

    # Super Admin allowed
    admin_res = checker(current_staff={"staff_id": 1, "designation": "ADMIN"})
    assert admin_res["designation"] == "ADMIN"

    # Authorized dealer allowed
    dealer_res = checker(current_staff={"staff_id": 2, "designation": "DEALER"})
    assert dealer_res["designation"] == "DEALER"

    # Unauthorized role raises 403 Forbidden
    with pytest.raises(HTTPException) as exc:
        checker(current_staff={"staff_id": 3, "designation": "SALES"})
    assert exc.value.status_code == 403


# ------------------------------------------------------------------------------
# 5. Rate-Limiting & Reverse Proxy IP Extraction Tests
# ------------------------------------------------------------------------------
def test_extract_client_ip_headers():
    """Verify IP resolution across direct connections and reverse proxies."""
    class DummyRequest:
        def __init__(self, headers=None, client_host="192.168.1.50"):
            self.headers = headers or {}
            class Client:
                host = client_host
            self.client = Client()

    # Direct connection
    req_direct = DummyRequest()
    assert extract_client_ip(req_direct) == "192.168.1.50"

    # Behind single proxy
    req_proxy = DummyRequest(headers={"x-forwarded-for": "203.0.113.195"})
    assert extract_client_ip(req_proxy) == "203.0.113.195"

    # Behind multiple proxy chain (extracts originating client)
    req_chain = DummyRequest(headers={"x-forwarded-for": "203.0.113.195, 10.0.0.1, 10.0.0.2"})
    assert extract_client_ip(req_chain) == "203.0.113.195"

    # With port appended
    req_port = DummyRequest(headers={"x-forwarded-for": "203.0.113.195:443"})
    assert extract_client_ip(req_port) == "203.0.113.195"
