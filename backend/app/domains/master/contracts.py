from sqlalchemy.ext.asyncio import AsyncSession
from app.domains.master.models import Customer, Vehicle

async def verify_customer_exists(db: AsyncSession, customer_id: int) -> bool:
    """Verify customer exists."""
    customer = await db.get(Customer, customer_id)
    return customer is not None

async def verify_vehicle_available(db: AsyncSession, chassis_no: str) -> tuple[bool, str | None]:
    """Verify vehicle exists and is IN_STOCK or AVAILABLE. Returns (exists_and_available, current_status)"""
    vehicle = await db.get(Vehicle, chassis_no)
    if not vehicle:
        return False, None
    return vehicle.current_status in ('IN_STOCK', 'AVAILABLE'), vehicle.current_status
