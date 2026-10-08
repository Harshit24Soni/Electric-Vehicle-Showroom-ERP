from app.domains.master.models import Staff
from app.auth.pin_utils import hash_pin
from .base import BaseFactory, fake

class StaffFactory(BaseFactory):
    model = Staff

    @classmethod
    def get_default_attributes(cls) -> dict:
        return {
            "full_name": fake.name(),
            "mobile_no": fake.numerify("##########"),
            "email": fake.email(),
            "designation": "STAFF",
            "pin_hash": hash_pin("123456"),
            "is_active": True,
            "failed_attempts": 0,
        }
