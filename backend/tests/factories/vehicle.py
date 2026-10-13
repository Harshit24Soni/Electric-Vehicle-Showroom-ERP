from app.modules.master.models import Vehicle, VehicleModel, Brand
from .base import BaseFactory, fake

class BrandFactory(BaseFactory):
    model = Brand

    @classmethod
    def get_default_attributes(cls) -> dict:
        return {
            "brand_name": f"Brand-{fake.unique.lexify('????').upper()}",
            "is_active": True,
        }

class VehicleModelFactory(BaseFactory):
    model = VehicleModel

    @classmethod
    def get_default_attributes(cls) -> dict:
        return {
            "brand_id": 1,
            "model_name": f"Model-{fake.lexify('???').upper()}",
            "material_number": fake.unique.bothify("MAT-####-???").upper(),
            "colour": fake.color_name(),
            "battery_type": "Lithium-Ion 3.2kWh",
            "is_active": True,
        }

class VehicleFactory(BaseFactory):
    model = Vehicle

    @classmethod
    def get_default_attributes(cls) -> dict:
        return {
            "chassis_no": fake.unique.bothify("CHAS-########-???").upper(),
            "vehicle_model_id": 1,
            "motor_serial_no": fake.unique.bothify("MOT-######").upper(),
            "battery_serial_no": fake.unique.bothify("BAT-######").upper(),
            "current_status": "IN_STOCK",
        }
