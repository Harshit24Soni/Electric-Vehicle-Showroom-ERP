from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, desc
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta, timezone

from app.modules.inventory.models import (
    SpareStockBalance, SpareMaster, SpareBatch, SpareSerial, SpareStockMovement, SpareCostHistory, SparePartCode
)
from app.domains.inventory.schemas_stock import (
    InventoryDashboardResponse, StockByLocationResponse, StockItemResponse, StockListResponse,
    BatchItemResponse, BatchListResponse, SerialItemResponse, SerialListResponse,
    MovementHistoryItemResponse, MovementHistoryListResponse
)

async def get_inventory_dashboard(db: AsyncSession) -> InventoryDashboardResponse:
    # total active spares
    active_spares = await db.scalar(select(func.count(SpareMaster.spare_id)).filter_by(status="ACTIVE"))
    
    # total stock value: sum of (balance.quantity * latest_wac)
    # This is a bit complex in a single query since WAC is in CostHistory.
    # Let's compute it in python for simplicity if not too many, or do an approximation.
    
    # Actually, SpareCostHistory has the wac_cost. 
    # For now, let's just return 0 for value if too complex, but let's try a simple query.
    # We will compute it simply:
    spares = await db.scalars(select(SpareMaster).filter_by(status="ACTIVE"))
    total_val = 0.0
    for spare in spares:
        stock = await db.scalar(select(func.sum(SpareStockBalance.quantity)).filter_by(spare_id=spare.spare_id)) or 0
        if stock > 0:
            last_cost = await db.scalar(select(SpareCostHistory.wac_cost).filter_by(spare_id=spare.spare_id).order_by(SpareCostHistory.effective_date.desc()).limit(1))
            wac = float(last_cost) if last_cost else 0.0
            total_val += stock * wac
            
    # movements last 30 days
    last_30d = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=30)
    movements_30d = await db.scalar(select(func.count(SpareStockMovement.movement_id)).filter(SpareStockMovement.movement_datetime >= last_30d))
    
    return InventoryDashboardResponse(
        total_active_spares=active_spares or 0,
        total_stock_value=total_val,
        total_movements_last_30d=movements_30d or 0
    )

async def get_stock_by_location(db: AsyncSession, location: str = None) -> list[StockByLocationResponse]:
    # Group by location
    query = select(
        SpareStockBalance.location, 
        func.sum(SpareStockBalance.quantity).label("total_qty")
    ).group_by(SpareStockBalance.location)
    
    if location:
        query = query.filter(SpareStockBalance.location == location)
        
    result = await db.execute(query)
    rows = result.all()
    
    out = []
    for row in rows:
        loc = row.location
        qty = row.total_qty
        # Compute value roughly. For a real ERP we'd have a materialized view.
        # We will set total_value to 0 for this aggregate endpoint to avoid N+1 issues.
        out.append(StockByLocationResponse(location=loc, total_quantity=qty, total_value=0))
    return out

async def list_stock(db: AsyncSession, spare_id: int = None, location: str = None) -> StockListResponse:
    query = select(SpareStockBalance).options(selectinload(SpareStockBalance.spare))
    if spare_id:
        query = query.filter_by(spare_id=spare_id)
    if location:
        query = query.filter_by(location=location)
        
    result = await db.execute(query)
    balances = result.scalars().all()
    
    items = []
    for bal in balances:
        last_cost = await db.scalar(select(SpareCostHistory.wac_cost).filter_by(spare_id=bal.spare_id).order_by(SpareCostHistory.effective_date.desc()).limit(1))
        wac = float(last_cost) if last_cost else 0.0
        
        part_code_obj = await db.scalar(select(SparePartCode.code).filter_by(spare_id=bal.spare_id).limit(1))
        
        items.append(StockItemResponse(
            spare_id=bal.spare_id,
            spare_name=bal.spare.spare_name,
            part_code=part_code_obj,
            tracking_mode=bal.spare.tracking_mode,
            location=bal.location,
            quantity=bal.quantity,
            unit_cost=wac,
            total_value=wac * bal.quantity
        ))
    return StockListResponse(items=items)

async def list_batches(db: AsyncSession, spare_id: int = None, location: str = None) -> BatchListResponse:
    # Actually batches don't inherently have a location in SpareBatch model, 
    # but the stock is in SpareStockBalance. Let's return batches.
    query = select(SpareBatch).options(selectinload(SpareBatch.spare))
    if spare_id:
        query = query.filter_by(spare_id=spare_id)
        
    result = await db.execute(query)
    batches = result.scalars().all()
    
    items = []
    for b in batches:
        # Get stock for this batch. Wait, SpareStockBalance is per spare_id & location.
        # To get batch stock, we'd need to look at movements or a BatchStockBalance table. 
        # Since Phase 4 backend didn't add BatchStockBalance, we can compute it from movements.
        move_res = await db.execute(
            select(SpareStockMovement.to_location, func.sum(SpareStockMovement.quantity).label("qty"))
            .filter_by(batch_id=b.batch_id)
            .group_by(SpareStockMovement.to_location)
        )
        
        for m_row in move_res.all():
            qty = m_row.qty
            if qty > 0:
                if location and m_row.to_location != location:
                    continue
                items.append(BatchItemResponse(
                    batch_id=b.batch_id,
                    spare_id=b.spare_id,
                    spare_name=b.spare.spare_name,
                    batch_number=b.batch_number,
                    location=m_row.to_location,
                    quantity=qty,
                    unit_cost=b.unit_cost,
                    total_value=float(b.unit_cost) * qty,
                    expiry_date=b.expiry_date
                ))
    return BatchListResponse(items=items)

async def list_serials(db: AsyncSession, spare_id: int = None, location: str = None, serial_number: str = None) -> SerialListResponse:
    query = select(SpareSerial).options(selectinload(SpareSerial.spare))
    if spare_id:
        query = query.filter_by(spare_id=spare_id)
    if location:
        query = query.filter_by(location=location)
    if serial_number:
        query = query.filter(SpareSerial.serial_number.ilike(f"%{serial_number}%"))
        
    result = await db.execute(query)
    serials = result.scalars().all()
    
    items = []
    for s in serials:
        items.append(SerialItemResponse(
            serial_id=s.serial_id,
            spare_id=s.spare_id,
            spare_name=s.spare.spare_name,
            serial_number=s.serial_number,
            location=s.location,
            status=s.status,
            unit_cost=s.unit_cost
        ))
    return SerialListResponse(items=items)

async def list_movements(db: AsyncSession, page: int = 1, size: int = 50, spare_id: int = None) -> MovementHistoryListResponse:
    query = select(SpareStockMovement).options(
        selectinload(SpareStockMovement.spare),
        selectinload(SpareStockMovement.batch),
        selectinload(SpareStockMovement.serial)
    )
    if spare_id:
        query = query.filter_by(spare_id=spare_id)
        
    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    
    query = query.order_by(desc(SpareStockMovement.movement_datetime)).offset((page-1)*size).limit(size)
    result = await db.execute(query)
    movements = result.scalars().all()
    
    items = []
    for m in movements:
        items.append(MovementHistoryItemResponse(
            movement_id=m.movement_id,
            movement_datetime=m.movement_datetime,
            movement_type=m.movement_type,
            spare_id=m.spare_id,
            spare_name=m.spare.spare_name,
            quantity=m.quantity,
            from_location=m.from_location,
            to_location=m.to_location,
            batch_number=m.batch.batch_number if m.batch else None,
            serial_number=m.serial.serial_number if m.serial else None,
            unit_cost=m.unit_cost,
            total_cost=m.total_cost,
            reference_type=m.reference_type,
            reference_id=str(m.reference_id) if m.reference_id is not None else None,
            remarks=m.remarks
        ))
        
    return MovementHistoryListResponse(
        items=items,
        total=total,
        page=page,
        size=size
    )
