from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, update
from fastapi import HTTPException

from app.domains.procurement import models as procurement_models
from app.domains.procurement import schemas as procurement_schemas
from app.domains.inventory import models as inventory_models
from app.domains.master import models as master_models

async def create_spare_purchase(db: AsyncSession, data: procurement_schemas.SparePurchaseCreate):
    # 1. Create Purchase Record
    purchase = procurement_models.SparePurchase(
        vendor_id=data.vendor_id,
        vendor_invoice_no=data.vendor_invoice_no,
        vendor_invoice_date=data.vendor_invoice_date,
        purchase_date=data.purchase_date,
        remarks=data.remarks,
        include_in_accounting=data.include_in_accounting,
        created_at=datetime.utcnow()
    )
    db.add(purchase)
    await db.flush() # Get ID

    # 2. Process Items
    for item in data.items:
        # Calculate totals
        total_cost = item.unit_cost * item.quantity
        # Add tax if needed logic not full implemented in schema but schema has total_cost
        
        purchase_item = procurement_models.SparePurchaseItem(
            spare_purchase_id=purchase.spare_purchase_id,
            spare_id=item.spare_id,
            quantity=item.quantity,
            unit_cost=item.unit_cost,
            gst_percentage=item.gst_percentage,
            total_cost=total_cost
        )
        db.add(purchase_item)

        # 3. Inventory Update (Automatic)
        # Add to Stock Movement
        movement = inventory_models.SpareStockMovement(
            spare_id=item.spare_id,
            movement_type="PURCHASE",
            quantity=item.quantity,
            movement_datetime=datetime.utcnow(),
            reference_type="PROCUREMENT",
            reference_id=purchase.spare_purchase_id,
            remarks=f"Purchase from Vendor {data.vendor_id}"
        )
        db.add(movement)
        
        # Note: We do NOT update master price here. 
        # Price snapshot is stored in purchase_item.unit_cost.

    await db.commit()
    await db.refresh(purchase)
    return purchase

async def create_vehicle_purchase(db: AsyncSession, data: procurement_schemas.VehiclePurchaseCreate):
    # 1. Create Purchase Record
    purchase = procurement_models.VehiclePurchase(
        vendor_id=data.vendor_id,
        invoice_number=data.invoice_number,
        invoice_date=data.invoice_date,
        invoice_amount=data.invoice_amount,
        include_in_accounting=data.include_in_accounting,
        created_at=datetime.utcnow()
    )
    db.add(purchase)
    await db.flush()

    # 2. Process Vehicles
    for v_data in data.vehicles:
        # check chassis uniqueness
        existing = await db.execute(select(master_models.Vehicle).filter_by(chassis_no=v_data.chassis_no))
        if existing.scalars().first():
             raise HTTPException(status_code=400, detail=f"Chassis {v_data.chassis_no} already exists")

        # Create Vehicle Master Record
        new_vehicle = master_models.Vehicle(
            chassis_no=v_data.chassis_no,
            vehicle_model_id=v_data.vehicle_model_id,
            motor_serial_no=v_data.motor_serial_no,
            convertor_serial_no=v_data.convertor_serial_no,
            charger_serial_no=v_data.charger_serial_no,
            controller_serial_no=v_data.controller_serial_no,
            battery_serial_no=v_data.battery_serial_no,
            date_of_manufacture=v_data.date_of_manufacture,
            current_status="IN_STOCK",
            created_at=datetime.utcnow()
        )
        db.add(new_vehicle)
        
        # Purchase Detail
        detail = procurement_models.VehiclePurchaseDetail(
            vehicle_purchase_id=purchase.vehicle_purchase_id,
            chassis_no=v_data.chassis_no,
            cost_price=v_data.cost_price
        )
        db.add(detail)
        
        # Inventory Movement
        movement = inventory_models.VehicleStockMovement(
            chassis_no=v_data.chassis_no,
            movement_type="INWARD", # Or PURCHASE/INWARD defined in constraint
            # Inventory model constraint says: 'INWARD','AVAILABLE', etc. 
            # 'INWARD' seems appropriate for purchase.
            movement_datetime=datetime.utcnow(),
            reference_type="PROCUREMENT",
            reference_id=purchase.vehicle_purchase_id,
            remarks=f"Purchase from Vendor {data.vendor_id}"
        )
        db.add(movement)

    await db.commit()
    await db.refresh(purchase)
    return purchase


async def create_temporary_item(db: AsyncSession, data: procurement_schemas.TemporaryItemCreate, user_id: int) -> inventory_models.SpareMaster:
    """Create a temporary spare item"""
    # Check if code exists
    existing = await db.execute(select(inventory_models.SpareMaster).filter_by(spare_code=data.spare_code))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Spare code already exists")
    
    # Create Master
    item = inventory_models.SpareMaster(
        spare_code=data.spare_code,
        spare_name=data.spare_name,
        category=data.category,
        is_serialized=False, # Default
        is_temporary=True,
        is_verified=False,
        remarks=data.remarks,
        # dealer_landing_price = data.price # If we added column to model
    )
    db.add(item)
    await db.flush() # get ID
    
    # If price provided, set history
    if data.price is not None:
        from app.domains.master import models as master_models
        price_hist = master_models.SparePriceHistory(
            spare_id=item.spare_id,
            price=data.price,
            margin=0, # Default margin
            effective_from=datetime.utcnow(),
            is_active=True,
            created_by=user_id
        )
        db.add(price_hist)

    await db.commit()
    await db.refresh(item)
    return item

async def list_temporary_items(db: AsyncSession) -> list[inventory_models.SpareMaster]:
    """List unverified temporary items (excludes soft-deleted)"""
    stmt = select(inventory_models.SpareMaster).filter(
        inventory_models.SpareMaster.is_temporary == True,
        inventory_models.SpareMaster.is_verified == False,
        inventory_models.SpareMaster.is_deleted == False
    )
    result = await db.execute(stmt)
    return result.scalars().all()

async def approve_temporary_item(db: AsyncSession, spare_id: int) -> inventory_models.SpareMaster:
    """Approve a temporary item (Admin only)"""
    item = await db.get(inventory_models.SpareMaster, spare_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    item.is_verified = True
    # We might keep is_temporary=True to mark origin, or set to False. 
    # "Convert to master entries" implies is_temporary -> False.
    item.is_temporary = False
    await db.commit()
    await db.refresh(item)
    return item

async def list_spare_purchases(db: AsyncSession):
    """List all spare purchases with items (excludes soft-deleted)"""
    from sqlalchemy.orm import selectinload
    stmt = select(procurement_models.SparePurchase).options(
        selectinload(procurement_models.SparePurchase.items)
    ).filter(
        procurement_models.SparePurchase.is_deleted == False
    ).order_by(procurement_models.SparePurchase.created_at.desc())
    
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_spare_purchase(db: AsyncSession, spare_purchase_id: int):
    """Get a spare purchase by ID (excludes soft-deleted)"""
    from sqlalchemy.orm import selectinload
    stmt = select(procurement_models.SparePurchase).options(
        selectinload(procurement_models.SparePurchase.items)
    ).filter(
        procurement_models.SparePurchase.spare_purchase_id == spare_purchase_id,
        procurement_models.SparePurchase.is_deleted == False
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def list_vehicle_purchases(db: AsyncSession):
    """List all vehicle purchases with details (excludes soft-deleted)"""
    from sqlalchemy.orm import selectinload
    stmt = select(procurement_models.VehiclePurchase).options(
        selectinload(procurement_models.VehiclePurchase.details)
    ).filter(
        procurement_models.VehiclePurchase.is_deleted == False
    ).order_by(procurement_models.VehiclePurchase.created_at.desc())
    
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_vehicle_purchase(db: AsyncSession, vehicle_purchase_id: int):
    """Get a vehicle purchase by ID (excludes soft-deleted)"""
    from sqlalchemy.orm import selectinload
    stmt = select(procurement_models.VehiclePurchase).options(
        selectinload(procurement_models.VehiclePurchase.details)
    ).filter(
        procurement_models.VehiclePurchase.vehicle_purchase_id == vehicle_purchase_id,
        procurement_models.VehiclePurchase.is_deleted == False
    )
    result = await db.execute(stmt)
    return result.scalars().first()


# ==================== DELETE SERVICES ====================

async def delete_spare_purchase(
    db: AsyncSession, spare_purchase_id: int,
    current_user: dict, hard_delete: bool = False
) -> bool:
    """Delete a spare purchase (soft by default, hard if authorized)"""
    purchase = await get_spare_purchase(db, spare_purchase_id)
    if not purchase:
        return False

    if hard_delete:
        if current_user["designation"] not in ["Admin", "Dealer"]:
            raise HTTPException(status_code=403, detail="Not authorized to permanently delete")
        await db.delete(purchase)
    else:
        purchase.is_deleted = True
        purchase.deleted_at = datetime.utcnow()
        purchase.deleted_by = current_user["staff_id"]

    await db.flush()
    return True


async def delete_vehicle_purchase(
    db: AsyncSession, vehicle_purchase_id: int,
    current_user: dict, hard_delete: bool = False
) -> bool:
    """Delete a vehicle purchase (soft by default, hard if authorized)"""
    purchase = await get_vehicle_purchase(db, vehicle_purchase_id)
    if not purchase:
        return False

    if hard_delete:
        if current_user["designation"] not in ["Admin", "Dealer"]:
            raise HTTPException(status_code=403, detail="Not authorized to permanently delete")
        await db.delete(purchase)
    else:
        purchase.is_deleted = True
        purchase.deleted_at = datetime.utcnow()
        purchase.deleted_by = current_user["staff_id"]

    await db.flush()
    return True


# ==================== VEHICLE INTAKE (OEM) ====================

async def process_vehicle_intake(
    db: AsyncSession,
    payload: procurement_schemas.VehicleIntakePayload,
    current_user: dict,
) -> dict:
    """Bulk-register vehicles from an OEM invoice.

    Atomic transaction:
      a. Create VehiclePurchase (parent invoice).
      b. For each vehicle:
         - Guard: reject duplicate chassis_no.
         - Insert master.vehicle with status IN_STOCK.
         - Insert VehiclePurchaseDetail.
         - Insert VehicleStockMovement (INWARD).
      c. Commit atomically.
    """
    # (a) Create parent purchase record
    total_amount = sum(v.purchase_price for v in payload.vehicles)
    purchase = procurement_models.VehiclePurchase(
        vendor_id=payload.vendor_id,
        invoice_number=payload.oem_invoice_no,
        invoice_date=payload.oem_invoice_date,
        invoice_amount=total_amount,
        include_in_accounting=True,
        created_at=datetime.utcnow(),
        created_by=current_user["staff_id"],
    )
    db.add(purchase)
    await db.flush()

    # (b) Process each vehicle
    for v_item in payload.vehicles:
        # Guard: chassis must not already exist
        existing = await db.execute(
            select(master_models.Vehicle).filter_by(chassis_no=v_item.chassis_no)
        )
        if existing.scalars().first():
            raise HTTPException(
                status_code=400,
                detail=f"Chassis '{v_item.chassis_no}' already exists in inventory.",
            )

        # Insert into master.vehicle
        new_vehicle = master_models.Vehicle(
            chassis_no=v_item.chassis_no,
            vehicle_model_id=v_item.vehicle_model_id,
            motor_serial_no=v_item.motor_no,
            battery_serial_no=v_item.battery_serial_no,
            current_status="IN_STOCK",
            created_at=datetime.utcnow(),
            created_by=current_user["staff_id"],
        )
        db.add(new_vehicle)

        # Purchase detail
        detail = procurement_models.VehiclePurchaseDetail(
            vehicle_purchase_id=purchase.vehicle_purchase_id,
            chassis_no=v_item.chassis_no,
            cost_price=v_item.purchase_price,
        )
        db.add(detail)

        # Inventory movement
        movement = inventory_models.VehicleStockMovement(
            chassis_no=v_item.chassis_no,
            movement_type="INWARD",
            movement_datetime=datetime.utcnow(),
            reference_type="PROCUREMENT",
            reference_id=purchase.vehicle_purchase_id,
            remarks=f"OEM Intake — Invoice {payload.oem_invoice_no}",
        )
        db.add(movement)

    # (c) Commit atomically
    await db.commit()

    return {
        "message": f"Successfully received {len(payload.vehicles)} vehicle(s) into inventory.",
        "vehicle_purchase_id": purchase.vehicle_purchase_id,
        "vehicles_added": len(payload.vehicles),
    }

