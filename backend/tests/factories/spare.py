from app.modules.inventory.models import SpareMaster
from app.modules.master.models import Vendor
from .base import BaseFactory, fake


class VendorFactory(BaseFactory):
    model = Vendor

    @classmethod
    def get_default_attributes(cls) -> dict:
        return {
            "vendor_name": fake.company(),
            "vendor_type": "SPARE_PARTS",
            "gstin": fake.unique.bothify("27#####????#?#?").upper(),
            "pan_no": fake.unique.bothify("?????####?").upper(),
            "city": fake.city(),
            "state": "Maharashtra",
            "is_active": True,
        }


class SpareMasterFactory(BaseFactory):
    model = SpareMaster

    @classmethod
    def get_default_attributes(cls) -> dict:
        return {
            "spare_name": f"Spare {fake.word().capitalize()}",
            "category": "ELECTRICAL",
            "tracking_mode": "QUANTITY",
            "status": "ACTIVE",
            "is_temporary": False,
            "is_verified": True,
        }
