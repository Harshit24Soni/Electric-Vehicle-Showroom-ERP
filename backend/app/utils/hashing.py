import hashlib

def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode()).hexdigest()
