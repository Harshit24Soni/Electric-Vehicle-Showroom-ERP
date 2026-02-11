import pyotp
from app.core.config import settings

def generate_totp_secret():
    return pyotp.random_base32()

def get_totp_uri(secret: str, username: str, issuer_name: str = "EV Showroom ERP"):
    return pyotp.totp.TOTP(secret).provisioning_uri(name=username, issuer_name=issuer_name)

def verify_totp_code(secret: str, code: str):
    if not secret:
        return False
    return pyotp.TOTP(secret).verify(code)
