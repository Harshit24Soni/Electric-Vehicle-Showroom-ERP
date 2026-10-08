import uuid
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import joinedload
from app.modules.sales.models import SpareSale, SpareSaleItem
from app.modules.sales.schemas_spare import SpareSaleCreate, SpareSaleItemCreate
from app.modules.inventory.models import (
    SpareMaster, SpareStockBalance, SpareBatch, SpareSerial, 
    SpareStockMovement
)
from app.domains.inventory.services import add_spare_movement
from typing import List

class SpareSaleError(Exception):
    pass

async def list_spare_sales(db: AsyncSession) -> List[SpareSale]:
    stmt = select(SpareSale).options(joinedload(SpareSale.items)).order_by(SpareSale.sale_id.desc())
    result = await db.execute(stmt)
    return result.unique().scalars().all()

async def get_spare_sale(db: AsyncSession, sale_id: int) -> SpareSale:
    stmt = select(SpareSale).options(joinedload(SpareSale.items)).where(SpareSale.sale_id == sale_id)
    result = await db.execute(stmt)
    return result.unique().scalar_one_or_none()

async def create_draft_sale(db: AsyncSession, payload: SpareSaleCreate, staff_id: int) -> SpareSale:
    subtotal = Decimal('0.0')
    total_discount = Decimal('0.0')
    total_tax = Decimal('0.0')
    
    sale_items = []
    for item in payload.items:
        line_tot = (item.unit_selling_price * item.quantity) - item.discount + item.tax
        
        sale_items.append(SpareSaleItem(
            spare_id=item.spare_id,
            part_code=item.part_code,
            spare_name=item.spare_name,
            tracking_mode=item.tracking_mode,
            batch_id=item.batch_id,
            serial_id=item.serial_id,
            quantity=item.quantity,
            unit_selling_price=item.unit_selling_price,
            discount=item.discount,
            tax=item.tax,
            line_total=line_tot,
            # We don't snapshot cost yet until confirmation, or we can just leave it empty
        ))
        subtotal += (item.unit_selling_price * item.quantity)
        total_discount += item.discount
        total_tax += item.tax
        
    grand_total = subtotal - total_discount + total_tax
    
    sale = SpareSale(
        customer_id=payload.customer_id,
        status="DRAFT",
        subtotal=subtotal,
        discount=total_discount,
        tax=total_tax,
        grand_total=grand_total,
        remarks=payload.remarks,
        created_by_staff_id=staff_id,
        items=sale_items
    )
    
    db.add(sale)
    await db.commit()
    await db.refresh(sale)
    return await get_spare_sale(db, sale.sale_id)

async def confirm_sale(db: AsyncSession, sale_id: int, staff_id: int) -> SpareSale:
    sale = await get_spare_sale(db, sale_id)
    if not sale:
        raise SpareSaleError("Sale not found")
    if sale.status != "DRAFT":
        raise SpareSaleError(f"Sale is in {sale.status} state, cannot confirm.")
        
    # Atomic validation and stock movement
    for item in sale.items:
        # Check stock balance
        stmt = select(SpareStockBalance).where(SpareStockBalance.spare_id == item.spare_id).with_for_update()
        balance = (await db.execute(stmt)).scalar_one_or_none()
        if not balance or balance.quantity < item.quantity:
            raise SpareSaleError(f"Insufficient stock for spare_id {item.spare_id}")
            
        balance.quantity -= item.quantity
            
        unit_cost = Decimal('0.0')
        item.unit_cost = unit_cost
            
        if item.tracking_mode == "BATCH":
            if not item.batch_id:
                raise SpareSaleError("Batch ID is required for BATCH tracked spare.")
            stmt = select(SpareBatch).where(and_(SpareBatch.batch_id == item.batch_id, SpareBatch.status == "ACTIVE")).with_for_update()
            batch = (await db.execute(stmt)).scalar_one_or_none()
            if not batch or batch.available_quantity < item.quantity:
                raise SpareSaleError(f"Insufficient quantity in batch {item.batch_id}")
            batch.available_quantity -= item.quantity
            unit_cost = batch.unit_cost
            item.unit_cost = unit_cost
            
        elif item.tracking_mode == "SERIALIZED":
            if not item.serial_id:
                raise SpareSaleError("Serial ID is required for SERIALIZED spare.")
            if item.quantity != 1:
                raise SpareSaleError("Quantity must be 1 for a single serialized item.")
            stmt = select(SpareSerial).where(and_(SpareSerial.serial_id == item.serial_id, SpareSerial.status == "IN_STOCK")).with_for_update()
            serial = (await db.execute(stmt)).scalar_one_or_none()
            if not serial:
                raise SpareSaleError(f"Serial {item.serial_id} is not in stock or does not exist.")
            serial.status = "SOLD"
            unit_cost = serial.unit_cost
            item.unit_cost = unit_cost

        await add_spare_movement(
            db=db,
            movement_type="SALE",
            reference_type="SALE",
            reference_id=sale.sale_id,
            spare_id=item.spare_id,
            quantity=-item.quantity,
            serial_id=item.serial_id,
            remarks=f"Sale #{sale.sale_id} Confirmation"
        )
        
    sale.status = "CONFIRMED"
    sale.invoice_number = f"INV-SP-{sale.sale_id:06d}"
    await db.commit()
    return await get_spare_sale(db, sale.sale_id)

async def cancel_sale(db: AsyncSession, sale_id: int, staff_id: int) -> SpareSale:
    sale = await get_spare_sale(db, sale_id)
    if not sale:
        raise SpareSaleError("Sale not found")
        
    if sale.status == "CANCELLED":
        raise SpareSaleError("Sale is already cancelled")
        
    if sale.status == "DRAFT":
        sale.status = "CANCELLED"
        await db.commit()
        return sale
        
    # If confirmed, reverse the stock movements
    if sale.status == "CONFIRMED":
        for item in sale.items:
            # Revert batches and serials
            if item.tracking_mode == "BATCH":
                stmt = select(SpareBatch).where(SpareBatch.batch_id == item.batch_id).with_for_update()
                batch = (await db.execute(stmt)).scalar_one_or_none()
                if batch:
                    batch.available_quantity += item.quantity
            elif item.tracking_mode == "SERIALIZED":
                stmt = select(SpareSerial).where(SpareSerial.serial_id == item.serial_id).with_for_update()
                serial = (await db.execute(stmt)).scalar_one_or_none()
                if serial:
                    serial.status = "IN_STOCK"
                    
            # Update stock balance
            stmt_balance = select(SpareStockBalance).where(SpareStockBalance.spare_id == item.spare_id).with_for_update()
            balance = (await db.execute(stmt_balance)).scalar_one_or_none()
            if balance:
                balance.quantity += item.quantity
            else:
                balance = SpareStockBalance(spare_id=item.spare_id, location="MAIN", quantity=item.quantity)
                db.add(balance)

            await add_spare_movement(
                db=db,
                movement_type="ADJUSTMENT",
                reference_type="SALE",
                reference_id=sale.sale_id,
                spare_id=item.spare_id,
                quantity=item.quantity, # positive adds to stock
                serial_id=item.serial_id,
                remarks=f"Sale #{sale.sale_id} Cancellation"
            )
            
        sale.status = "CANCELLED"
        await db.commit()
        return await get_spare_sale(db, sale.sale_id)
