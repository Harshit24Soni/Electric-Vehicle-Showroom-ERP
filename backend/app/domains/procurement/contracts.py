from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.domains.procurement import models

async def get_vehicle_cost_price(db: AsyncSession, chassis_no: str) -> float:
    """Contract to get the cost price of a vehicle by chassis number."""
    stmt = select(models.VehiclePurchaseDetail).filter_by(chassis_no=chassis_no)
    result = await db.execute(stmt)
    purchase_detail = result.scalars().first()
    if purchase_detail and purchase_detail.cost_price:
        return float(purchase_detail.cost_price)
    return 0.0
