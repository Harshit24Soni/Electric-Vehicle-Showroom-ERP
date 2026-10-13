from app.modules.master.models import Customer
from .base import BaseFactory, fake

class CustomerFactory(BaseFactory):
    model = Customer

    @classmethod
    def get_default_attributes(cls) -> dict:
        return {
            "name": fake.name(),
            "customer_type": "INDIVIDUAL",
            "primary_phone": fake.unique.numerify("9#########"),
            "email": fake.unique.email(),
            "address_line1": fake.street_address(),
            "city": fake.city(),
            "state": "Maharashtra",
            "pincode": "400001",
            "is_active": True,
        }
