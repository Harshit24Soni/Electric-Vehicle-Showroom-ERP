from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from decimal import Decimal

from app.modules.inventory.models import (
    PriceList,
    PriceListVersion,
    PriceListItem,
    SpareCostHistory,
    SpareSellingPriceHistory,
    SparePartCode
)
from app.domains.inventory.services import InventoryError

async def create_price_list(
    db: AsyncSession,
    *,
    source_name: str,
    remarks: str | None = None
) -> PriceList:
    pl = PriceList(
        source_name=source_name,
        remarks=remarks
    )
    db.add(pl)
    await db.flush()
    return pl

async def add_price_list_version(
    db: AsyncSession,
    price_list_id: int,
    *,
    version_reference: str,
    effective_from: datetime,
    received_date: datetime,
    items_data: list[dict]
) -> PriceListVersion:
    pl = await db.get(PriceList, price_list_id)
    if not pl:
        raise InventoryError("Price List not found")
        
    version = PriceListVersion(
        price_list_id=price_list_id,
        version_reference=version_reference,
        effective_from=effective_from.replace(tzinfo=None),
        received_date=received_date.replace(tzinfo=None),
        status="PUBLISHED"
    )
    db.add(version)
    await db.flush()
    
    for item_data in items_data:
        item = PriceListItem(
            version_id=version.version_id,
            part_code=item_data["part_code"],
            part_name=item_data.get("part_name"),
            mrp=item_data.get("mrp"),
            dlp=item_data.get("dlp"),
            gst_rate=item_data.get("gst_rate")
        )
        db.add(item)
        
    await db.flush()
    return version

async def get_price_list(db: AsyncSession, price_list_id: int) -> PriceList | None:
    stmt = select(PriceList).options(
        selectinload(PriceList.versions).selectinload(PriceListVersion.items)
    ).filter(PriceList.price_list_id == price_list_id)
    result = await db.execute(stmt)
    return result.scalars().first()

async def list_price_lists(db: AsyncSession) -> list[PriceList]:
    stmt = select(PriceList).options(
        selectinload(PriceList.versions)
    ).filter(PriceList.is_deleted == False).order_by(PriceList.price_list_id.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def add_spare_selling_price(
    db: AsyncSession,
    spare_id: int,
    selling_price: Decimal | float,
    reason: str | None = None
) -> SpareSellingPriceHistory:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    
    stmt = select(SpareSellingPriceHistory).filter(
        SpareSellingPriceHistory.spare_id == spare_id,
        SpareSellingPriceHistory.effective_to.is_(None),
        SpareSellingPriceHistory.is_deleted == False
    )
    result = await db.execute(stmt)
    current = result.scalars().first()
    if current:
        current.effective_to = now
        
    new_price = SpareSellingPriceHistory(
        spare_id=spare_id,
        selling_price=selling_price,
        effective_from=now,
        reason=reason
    )
    db.add(new_price)
    await db.flush()
    return new_price

async def add_spare_cost(
    db: AsyncSession,
    spare_id: int,
    quantity: int,
    billed_unit_price: Decimal | float,
    additional_costs: Decimal | float = 0.0,
    source_reference: str | None = None
) -> SpareCostHistory:
    landed_cost = Decimal(str(billed_unit_price)) + Decimal(str(additional_costs))
    
    cost = SpareCostHistory(
        spare_id=spare_id,
        quantity=quantity,
        billed_unit_price=billed_unit_price,
        additional_costs=additional_costs,
        landed_cost=landed_cost,
        source_reference=source_reference
    )
    db.add(cost)
    await db.flush()
    return cost

async def get_current_selling_price(db: AsyncSession, spare_id: int) -> float | None:
    stmt = select(SpareSellingPriceHistory.selling_price).filter(
        SpareSellingPriceHistory.spare_id == spare_id,
        SpareSellingPriceHistory.effective_to.is_(None),
        SpareSellingPriceHistory.is_deleted == False
    )
    result = await db.execute(stmt)
    return result.scalar()

async def get_current_cost(db: AsyncSession, spare_id: int) -> float | None:
    stmt = select(SpareCostHistory.landed_cost).filter(
        SpareCostHistory.spare_id == spare_id,
        SpareCostHistory.is_deleted == False
    ).order_by(desc(SpareCostHistory.effective_date))
    result = await db.execute(stmt)
    return result.scalar()

async def calculate_margin(db: AsyncSession, spare_id: int) -> dict:
    selling_price = await get_current_selling_price(db, spare_id)
    cost = await get_current_cost(db, spare_id)
    
    if selling_price is None or cost is None:
        return {
            "selling_price": selling_price,
            "cost": cost,
            "profit": None,
            "profit_percentage": None
        }
    
    sp = Decimal(str(selling_price))
    c = Decimal(str(cost))
    
    profit = sp - c
    if c > 0:
        profit_percentage = (profit / c) * Decimal('100')
    else:
        profit_percentage = Decimal('0')
        
    return {
        "selling_price": float(sp),
        "cost": float(c),
        "profit": float(profit),
        "profit_percentage": float(profit_percentage)
    }

async def get_price_history(db: AsyncSession, spare_id: int) -> list[PriceListItem]:
    codes_stmt = select(SparePartCode.code).filter(SparePartCode.spare_id == spare_id)
    codes_result = await db.execute(codes_stmt)
    codes = codes_result.scalars().all()
    
    if not codes:
        return []
        
    stmt = select(PriceListItem).join(PriceListVersion).filter(
        PriceListItem.part_code.in_(codes),
        PriceListItem.is_deleted == False,
        PriceListVersion.is_deleted == False
    ).order_by(desc(PriceListVersion.effective_from))
    
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def get_selling_price_history(db: AsyncSession, spare_id: int) -> list[SpareSellingPriceHistory]:
    stmt = select(SpareSellingPriceHistory).filter(
        SpareSellingPriceHistory.spare_id == spare_id,
        SpareSellingPriceHistory.is_deleted == False
    ).order_by(desc(SpareSellingPriceHistory.effective_from))
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def get_cost_history(db: AsyncSession, spare_id: int) -> list[SpareCostHistory]:
    stmt = select(SpareCostHistory).filter(
        SpareCostHistory.spare_id == spare_id,
        SpareCostHistory.is_deleted == False
    ).order_by(desc(SpareCostHistory.effective_date))
    result = await db.execute(stmt)
    return list(result.scalars().all())
