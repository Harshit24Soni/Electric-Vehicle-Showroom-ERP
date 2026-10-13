import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.modules.inventory.models import (
    PriceList,
    PriceListVersion,
    PriceListItem,
    SpareCostHistory,
    SpareSellingPriceHistory,
    SparePartCode
)
from app.modules.inventory.services import InventoryError

logger = logging.getLogger(__name__)


async def create_price_list(
    db: AsyncSession,
    *,
    source_name: str,
    remarks: Optional[str] = None
) -> PriceList:
    """Create a new pricing list header with transactional safety."""
    try:
        pl = PriceList(
            source_name=source_name,
            remarks=remarks
        )
        db.add(pl)
        await db.flush()
        return pl
    except Exception as exc:
        await db.rollback()
        logger.error("Failed to create price list '%s': %s", source_name, exc, exc_info=True)
        raise


async def add_price_list_version(
    db: AsyncSession,
    price_list_id: int,
    *,
    version_reference: str,
    effective_from: datetime,
    received_date: datetime,
    items_data: List[Dict[str, Any]]
) -> PriceListVersion:
    """Add a new version to an existing price list with its line items."""
    try:
        pl = await db.get(PriceList, price_list_id)
        if not pl:
            raise InventoryError(f"Price List {price_list_id} not found")

        version = PriceListVersion(
            price_list_id=price_list_id,
            version_reference=version_reference,
            effective_from=effective_from.replace(tzinfo=None) if effective_from.tzinfo else effective_from,
            received_date=received_date.replace(tzinfo=None) if received_date.tzinfo else received_date,
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
    except Exception as exc:
        await db.rollback()
        logger.error(
            "Failed to add price list version '%s' to list %s: %s",
            version_reference, price_list_id, exc, exc_info=True
        )
        raise


async def get_price_list(db: AsyncSession, price_list_id: int) -> Optional[PriceList]:
    """Retrieve a single price list including versions and version items."""
    stmt = select(PriceList).options(
        selectinload(PriceList.versions).selectinload(PriceListVersion.items)
    ).filter(PriceList.price_list_id == price_list_id)
    result = await db.execute(stmt)
    return result.scalars().first()


async def list_price_lists(db: AsyncSession) -> List[PriceList]:
    """List all active non-deleted price lists ordered by ID descending."""
    stmt = select(PriceList).options(
        selectinload(PriceList.versions)
    ).filter(PriceList.is_deleted == False).order_by(PriceList.price_list_id.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def add_spare_selling_price(
    db: AsyncSession,
    spare_id: int,
    selling_price: Decimal | float,
    reason: Optional[str] = None
) -> SpareSellingPriceHistory:
    """Update current selling price by terminating active price and creating a new record."""
    try:
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
    except Exception as exc:
        await db.rollback()
        logger.error(
            "Failed to set selling price for spare %s: %s",
            spare_id, exc, exc_info=True
        )
        raise


async def add_spare_cost(
    db: AsyncSession,
    spare_id: int,
    quantity: int,
    billed_unit_price: Decimal | float,
    additional_costs: Decimal | float = 0.0,
    source_reference: Optional[str] = None
) -> SpareCostHistory:
    """Record new landed cost item for a spare part."""
    try:
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
    except Exception as exc:
        await db.rollback()
        logger.error("Failed to add spare cost for spare %s: %s", spare_id, exc, exc_info=True)
        raise


async def get_current_selling_price(db: AsyncSession, spare_id: int) -> Optional[float]:
    """Retrieve the currently effective selling price for a spare part."""
    stmt = select(SpareSellingPriceHistory.selling_price).filter(
        SpareSellingPriceHistory.spare_id == spare_id,
        SpareSellingPriceHistory.effective_to.is_(None),
        SpareSellingPriceHistory.is_deleted == False
    )
    result = await db.execute(stmt)
    return result.scalar()


async def get_current_cost(db: AsyncSession, spare_id: int) -> Optional[float]:
    """Retrieve the latest landed cost for a spare part."""
    stmt = select(SpareCostHistory.landed_cost).filter(
        SpareCostHistory.spare_id == spare_id,
        SpareCostHistory.is_deleted == False
    ).order_by(desc(SpareCostHistory.effective_date))
    result = await db.execute(stmt)
    return result.scalar()


async def calculate_margin(db: AsyncSession, spare_id: int) -> Dict[str, Optional[float]]:
    """Compute the profit and margin percentage for a spare part safely."""
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
        profit_percentage = (profit / c) * Decimal("100")
    else:
        profit_percentage = Decimal("0")

    return {
        "selling_price": float(sp),
        "cost": float(c),
        "profit": float(profit),
        "profit_percentage": float(profit_percentage)
    }


async def get_price_history(db: AsyncSession, spare_id: int) -> List[PriceListItem]:
    """Retrieve historical price list entries associated with the spare's part codes."""
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


async def get_selling_price_history(db: AsyncSession, spare_id: int) -> List[SpareSellingPriceHistory]:
    """Retrieve all historical selling price records for a given spare."""
    stmt = select(SpareSellingPriceHistory).filter(
        SpareSellingPriceHistory.spare_id == spare_id,
        SpareSellingPriceHistory.is_deleted == False
    ).order_by(desc(SpareSellingPriceHistory.effective_from))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_cost_history(db: AsyncSession, spare_id: int) -> List[SpareCostHistory]:
    """Retrieve all landed cost history records for a given spare."""
    stmt = select(SpareCostHistory).filter(
        SpareCostHistory.spare_id == spare_id,
        SpareCostHistory.is_deleted == False
    ).order_by(desc(SpareCostHistory.effective_date))
    result = await db.execute(stmt)
    return list(result.scalars().all())
