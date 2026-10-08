from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_
from fastapi import HTTPException
from app.domains.service.models import ServiceJobCard, ServiceSpareConsumption
from datetime import datetime, timezone
from decimal import Decimal

from app.modules.inventory.models import SpareStockBalance, SpareBatch, SpareSerial, SpareMaster
from app.domains.inventory.services import add_spare_movement

class ServiceError(Exception):
    pass

class JobCardAlreadyOpenError(ServiceError):
    pass

class JobCardClosedError(ServiceError):
    pass

async def open_job_card(
    db: AsyncSession,
    *,
    chassis_no: str,
    is_free_service: bool,
    remarks: str | None = None,
) -> ServiceJobCard:
    """Open a new job card (checks for existing open, non-deleted cards)"""
    stmt = (
        select(ServiceJobCard)
        .filter(
            ServiceJobCard.chassis_no == chassis_no,
            ServiceJobCard.closed_at.is_(None),
            ServiceJobCard.is_deleted == False,
        )
    )
    result = await db.execute(stmt)
    existing = result.scalars().first()

    if existing:
        raise JobCardAlreadyOpenError(
            "An open job card already exists for this vehicle"
        )

    job = ServiceJobCard(
        chassis_no=chassis_no,
        is_free_service=is_free_service,
        remarks=remarks,
        opened_at=datetime.utcnow(),
    )
    db.add(job)
    await db.flush()
    return job

async def get_job_card(db: AsyncSession, job_card_id: int) -> ServiceJobCard | None:
    """Get a job card by ID (excludes soft-deleted)"""
    stmt = select(ServiceJobCard).filter(
        ServiceJobCard.job_card_id == job_card_id,
        ServiceJobCard.is_deleted == False
    )
    result = await db.execute(stmt)
    return result.scalars().first()

async def list_job_cards(db: AsyncSession) -> list[ServiceJobCard]:
    """List all job cards (excludes soft-deleted)"""
    stmt = select(ServiceJobCard).filter(
        ServiceJobCard.is_deleted == False
    ).order_by(ServiceJobCard.opened_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

async def list_job_card_consumptions(db: AsyncSession, job_card_id: int) -> list[ServiceSpareConsumption]:
    stmt = select(ServiceSpareConsumption).filter(
        ServiceSpareConsumption.job_card_id == job_card_id,
        ServiceSpareConsumption.is_deleted == False
    ).order_by(ServiceSpareConsumption.consumption_id.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

async def create_draft_consumption(
    db: AsyncSession,
    *,
    job_card_id: int,
    spare_id: int,
    quantity: int,
    tracking_mode: str = "QUANTITY",
    batch_id: int | None = None,
    serial_id: int | None = None,
) -> ServiceSpareConsumption:
    
    if quantity <= 0:
        raise ServiceError("Quantity must be greater than zero")

    job = await get_job_card(db, job_card_id)
    if not job:
        raise ServiceError("Job card not found")

    if job.closed_at:
        raise JobCardClosedError("Cannot add spares to a closed job card")

    # Capture snapshots
    master = await db.get(SpareMaster, spare_id)
    if not master:
        raise ServiceError("Spare not found")

    part_code = "UNKNOWN"
    from app.modules.inventory.models import SparePartCode
    code_stmt = select(SparePartCode).where(SparePartCode.spare_id == spare_id, SparePartCode.is_current == True)
    code_result = await db.execute(code_stmt)
    current_code = code_result.scalar_one_or_none()
    if current_code:
        part_code = current_code.code

    description = master.spare_name
    unit_cost = 0.0

    consumption = ServiceSpareConsumption(
        job_card_id=job_card_id,
        spare_id=spare_id,
        tracking_mode=tracking_mode,
        quantity=quantity,
        batch_id=batch_id,
        serial_id=serial_id,
        status="DRAFT",
        part_code_snapshot=part_code,
        description_snapshot=description,
        unit_cost_snapshot=unit_cost,
        total_cost=0.0
    )
    db.add(consumption)
    await db.flush()
    return consumption

async def confirm_consumption(
    db: AsyncSession,
    *,
    consumption_id: int,
    staff_id: int
) -> ServiceSpareConsumption:
    # 1. Lock consumption
    stmt = select(ServiceSpareConsumption).where(
        ServiceSpareConsumption.consumption_id == consumption_id
    ).with_for_update()
    consumption = (await db.execute(stmt)).scalar_one_or_none()
    
    if not consumption:
        raise ServiceError("Consumption record not found")
    
    if consumption.status != "DRAFT":
        raise ServiceError("Only DRAFT consumptions can be confirmed")
        
    job = await get_job_card(db, consumption.job_card_id)
    if job.closed_at:
        raise JobCardClosedError("Job card is already closed")

    unit_cost = Decimal('0.0')

    # 2. Consume from inventory based on tracking mode
    if consumption.tracking_mode == "BATCH":
        if not consumption.batch_id:
            raise ServiceError("Batch ID is required for BATCH tracked spare.")
        stmt_batch = select(SpareBatch).where(
            and_(SpareBatch.batch_id == consumption.batch_id, SpareBatch.status == "ACTIVE")
        ).with_for_update()
        batch = (await db.execute(stmt_batch)).scalar_one_or_none()
        if not batch or batch.available_quantity < consumption.quantity:
            raise ServiceError(f"Insufficient quantity in batch {consumption.batch_id}")
        batch.available_quantity -= consumption.quantity
        unit_cost = batch.unit_cost

    elif consumption.tracking_mode == "SERIALIZED":
        if not consumption.serial_id:
            raise ServiceError("Serial ID is required for SERIALIZED tracked spare.")
        if consumption.quantity != 1:
            raise ServiceError("Quantity must be 1 for SERIALIZED tracked spare.")
        stmt_serial = select(SpareSerial).where(
            and_(SpareSerial.serial_id == consumption.serial_id, SpareSerial.status == "IN_STOCK")
        ).with_for_update()
        serial = (await db.execute(stmt_serial)).scalar_one_or_none()
        if not serial:
            raise ServiceError(f"Serial {consumption.serial_id} is not in stock or invalid.")
        serial.status = "CONSUMED"
        unit_cost = serial.unit_cost

    else:
        # QUANTITY
        # For quantity tracked, we just check balance and use 0 cost since cost is WAC per location but we might not have it strictly defined
        pass

    # Lock stock balance
    stmt_balance = select(SpareStockBalance).where(
        SpareStockBalance.spare_id == consumption.spare_id
    ).with_for_update()
    balance = (await db.execute(stmt_balance)).scalar_one_or_none()
    
    if not balance or balance.quantity < consumption.quantity:
        raise ServiceError(f"Insufficient stock balance for spare {consumption.spare_id}")
        
    if consumption.tracking_mode == "QUANTITY" and unit_cost == Decimal('0.0'):
        # Fallback to current WAC or something if available on master? Not needed for now
        pass
        
    balance.quantity -= consumption.quantity

    # 3. Create stock movement
    movement = await add_spare_movement(
        db=db,
        spare_id=consumption.spare_id,
        quantity=-consumption.quantity,
        movement_type="SERVICE_CONSUMPTION",
        serial_id=consumption.serial_id,
        reference_type="SERVICE_JOB_CARD",
        reference_id=consumption.job_card_id,
        remarks=f"Consumed via Job Card {consumption.job_card_id}"
    )

    # 4. Update consumption record
    consumption.status = "CONSUMED"
    consumption.unit_cost_snapshot = float(unit_cost)
    consumption.total_cost = float(unit_cost) * consumption.quantity
    consumption.consumed_by = staff_id
    consumption.consumed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    consumption.stock_movement_id = movement.movement_id

    await db.flush()
    return consumption

async def reverse_consumption(
    db: AsyncSession,
    *,
    consumption_id: int,
    staff_id: int
) -> ServiceSpareConsumption:
    stmt = select(ServiceSpareConsumption).where(
        ServiceSpareConsumption.consumption_id == consumption_id
    ).with_for_update()
    consumption = (await db.execute(stmt)).scalar_one_or_none()
    
    if not consumption:
        raise ServiceError("Consumption record not found")
        
    if consumption.status != "CONSUMED":
        raise ServiceError("Only CONSUMED records can be reversed")

    job = await get_job_card(db, consumption.job_card_id)
    if job.closed_at:
        raise JobCardClosedError("Job card is already closed")

    # Return to inventory
    if consumption.tracking_mode == "BATCH":
        stmt_batch = select(SpareBatch).where(SpareBatch.batch_id == consumption.batch_id).with_for_update()
        batch = (await db.execute(stmt_batch)).scalar_one_or_none()
        if batch:
            batch.available_quantity += consumption.quantity
            
    elif consumption.tracking_mode == "SERIALIZED":
        stmt_serial = select(SpareSerial).where(SpareSerial.serial_id == consumption.serial_id).with_for_update()
        serial = (await db.execute(stmt_serial)).scalar_one_or_none()
        if serial:
            serial.status = "IN_STOCK"

    stmt_balance = select(SpareStockBalance).where(SpareStockBalance.spare_id == consumption.spare_id).with_for_update()
    balance = (await db.execute(stmt_balance)).scalar_one_or_none()
    if balance:
        balance.quantity += consumption.quantity
    else:
        balance = SpareStockBalance(spare_id=consumption.spare_id, location="MAIN", quantity=consumption.quantity)
        db.add(balance)

    movement = await add_spare_movement(
        db=db,
        spare_id=consumption.spare_id,
        quantity=consumption.quantity,
        movement_type="SERVICE_CONSUMPTION", # or ADJUSTMENT? Let's use SERVICE_CONSUMPTION but positive
        serial_id=consumption.serial_id,
        reference_type="SERVICE_JOB_CARD",
        reference_id=consumption.job_card_id,
        remarks=f"Reversed Job Card {consumption.job_card_id} consumption"
    )

    consumption.status = "REVERSED"
    await db.flush()
    return consumption

async def remove_draft_consumption(
    db: AsyncSession,
    *,
    consumption_id: int,
) -> bool:
    stmt = select(ServiceSpareConsumption).where(
        ServiceSpareConsumption.consumption_id == consumption_id
    ).with_for_update()
    consumption = (await db.execute(stmt)).scalar_one_or_none()
    
    if not consumption:
        return False
        
    if consumption.status != "DRAFT":
        raise ServiceError("Only DRAFT consumptions can be removed")
        
    await db.delete(consumption)
    await db.flush()
    return True


async def close_job_card(
    db: AsyncSession,
    job: ServiceJobCard
):
    if job.closed_at:
        raise JobCardClosedError("Job card already closed")

    job.closed_at = datetime.utcnow()
    await db.flush()


# ==================== DELETE SERVICES ====================

async def delete_job_card(
    db: AsyncSession, job_card_id: int,
    current_user: dict, hard_delete: bool = False
) -> bool:
    """Delete a job card (soft by default, hard if authorized)"""
    job = await get_job_card(db, job_card_id)
    if not job:
        return False

    if hard_delete:
        if current_user["designation"] not in ["Admin", "Dealer"]:
            raise HTTPException(status_code=403, detail="Not authorized to permanently delete")
        await db.delete(job)
    else:
        job.is_deleted = True
        job.deleted_at = datetime.utcnow()
        job.deleted_by = current_user["staff_id"]

    await db.flush()
    return True
