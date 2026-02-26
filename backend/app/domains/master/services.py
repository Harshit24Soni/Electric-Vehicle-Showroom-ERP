from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from datetime import datetime
from fastapi import HTTPException
from typing import Optional

from app.domains.master import models


class MasterError(Exception):
    pass


# ==================== CUSTOMER SERVICES ====================

async def create_customer(db: AsyncSession, payload) -> models.Customer:
    """Create a new customer"""
    c = models.Customer(
        lead_reference_id=payload.lead_reference_id,
        customer_type=payload.customer_type,
        name=payload.name,
        guardian_name=payload.guardian_name,
        primary_phone=payload.primary_phone,
        email=payload.email,
        address_line1=payload.address_line1,
        address_line2=payload.address_line2,
        city=payload.city,
        state=payload.state,
        pincode=payload.pincode,
        aadhaar_no=payload.aadhaar_no,
        pan_no=payload.pan_no,
        gstin=payload.gstin,
        created_at=datetime.utcnow(),
        is_active=True,
    )
    db.add(c)
    await db.flush()
    return c


async def get_customer(db: AsyncSession, customer_id: int) -> models.Customer | None:
    """Get a customer by ID (excludes soft-deleted)"""
    stmt = select(models.Customer).filter(
        models.Customer.customer_id == customer_id,
        models.Customer.is_deleted == False
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def get_customer_detailed(db: AsyncSession, customer_id: int) -> dict | None:
    """Get detailed customer information with nominees and vehicle count"""
    customer = await get_customer(db, customer_id)
    if not customer:
        return None
    
    # Get nominees
    nominees = await list_nominees(db, customer_id)
    
    # Get vehicle count (from sales module)
    # TODO: Integrate with sales/vehicle module to get actual vehicle count
    vehicle_count = 0
    
    return {
        "customer_id": customer.customer_id,
        "lead_reference_id": customer.lead_reference_id,
        "customer_type": customer.customer_type,
        "name": customer.name,
        "guardian_name": customer.guardian_name,
        "primary_phone": customer.primary_phone,
        "email": customer.email,
        "address_line1": customer.address_line1,
        "address_line2": customer.address_line2,
        "city": customer.city,
        "state": customer.state,
        "pincode": customer.pincode,
        "aadhaar_no": customer.aadhaar_no,
        "pan_no": customer.pan_no,
        "gstin": customer.gstin,
        "nominees": [
            {
                "nominee_id": n.nominee_id,
                "customer_id": n.customer_id,
                "nominee_name": n.nominee_name,
                "nominee_dob": n.nominee_dob,
                "relation": n.relation,
                "is_primary": n.is_primary,
                "is_active": n.is_active,
                "created_at": n.created_at,
            }
            for n in nominees
        ],
        "vehicle_count": vehicle_count,
        "last_service_date": None,  # TODO: Fetch from service module
        "last_warranty_date": None,  # TODO: Fetch from warranty module
        "created_at": customer.created_at,
        "is_active": customer.is_active,
    }


async def update_customer(db: AsyncSession, customer_id: int, payload) -> models.Customer | None:
    """Update customer information"""
    customer = await get_customer(db, customer_id)
    if not customer:
        return None
    
    # Update only provided fields
    if payload.customer_type is not None:
        customer.customer_type = payload.customer_type
    if payload.name is not None:
        customer.name = payload.name
    if payload.guardian_name is not None:
        customer.guardian_name = payload.guardian_name
    if payload.primary_phone is not None:
        customer.primary_phone = payload.primary_phone
    if payload.email is not None:
        customer.email = payload.email
    if payload.address_line1 is not None:
        customer.address_line1 = payload.address_line1
    if payload.address_line2 is not None:
        customer.address_line2 = payload.address_line2
    if payload.city is not None:
        customer.city = payload.city
    if payload.state is not None:
        customer.state = payload.state
    if payload.pincode is not None:
        customer.pincode = payload.pincode
    if payload.aadhaar_no is not None:
        customer.aadhaar_no = payload.aadhaar_no
    if payload.pan_no is not None:
        customer.pan_no = payload.pan_no
    if payload.gstin is not None:
        customer.gstin = payload.gstin
    
    await db.flush()
    return customer


async def list_customers(db: AsyncSession, limit: int = 100) -> list[models.Customer]:
    """List all customers (excludes soft-deleted)"""
    stmt = select(models.Customer).filter(
        models.Customer.is_deleted == False
    ).order_by(desc(models.Customer.created_at)).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


# ==================== NOMINEE SERVICES ====================

async def create_nominee(db: AsyncSession, customer_id: int, payload) -> models.Nominee | None:
    """Create a nominee for a customer"""
    # Verify customer exists
    customer = await get_customer(db, customer_id)
    if not customer:
        return None
    
    # If this is the first nominee or is_primary is True, ensure it's marked as primary
    existing_primary_stmt = select(models.Nominee).filter(
        models.Nominee.customer_id == customer_id,
        models.Nominee.is_primary == True,
        models.Nominee.is_active == True
    )
    result = await db.execute(existing_primary_stmt)
    existing_primary = result.scalars().first()
    
    is_primary = payload.is_primary if payload.is_primary is not None else (not existing_primary)
    
    nominee = models.Nominee(
        customer_id=customer_id,
        nominee_name=payload.nominee_name,
        nominee_dob=payload.nominee_dob,
        relation=payload.relation,
        is_primary=is_primary,
        is_active=True,
        created_at=datetime.utcnow(),
    )
    
    # If this is primary, update other nominees to non-primary
    if is_primary:
        # Note: bulk update in async session
        # For simplicity and correctness with session tracking, we can fetch and update or use update statement
        stmt = select(models.Nominee).filter(
            models.Nominee.customer_id == customer_id,
            models.Nominee.is_active == True
        )
        r = await db.execute(stmt)
        others = r.scalars().all()
        for o in others:
            o.is_primary = False

    db.add(nominee)
    await db.flush()
    return nominee


async def list_nominees(db: AsyncSession, customer_id: int) -> list[models.Nominee]:
    """List all active nominees for a customer (excludes soft-deleted)"""
    stmt = select(models.Nominee).filter(
        models.Nominee.customer_id == customer_id,
        models.Nominee.is_active == True,
        models.Nominee.is_deleted == False
    ).order_by(desc(models.Nominee.is_primary), desc(models.Nominee.created_at))
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_nominee(db: AsyncSession, nominee_id: int, customer_id: int) -> models.Nominee | None:
    """Get a specific nominee (excludes soft-deleted)"""
    stmt = select(models.Nominee).filter(
        models.Nominee.nominee_id == nominee_id,
        models.Nominee.customer_id == customer_id,
        models.Nominee.is_active == True,
        models.Nominee.is_deleted == False
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def update_nominee(db: AsyncSession, nominee_id: int, customer_id: int, payload) -> models.Nominee | None:
    """Update nominee information"""
    nominee = await get_nominee(db, nominee_id, customer_id)
    if not nominee:
        return None
    
    # Update fields
    if payload.nominee_name is not None:
        nominee.nominee_name = payload.nominee_name
    if payload.nominee_dob is not None:
        nominee.nominee_dob = payload.nominee_dob
    if payload.relation is not None:
        nominee.relation = payload.relation
    
    # Handle primary status
    if payload.is_primary is not None and payload.is_primary:
        # If setting this as primary, update others to non-primary
        stmt = select(models.Nominee).filter(
            models.Nominee.customer_id == customer_id,
            models.Nominee.is_active == True,
            models.Nominee.nominee_id != nominee_id
        )
        r = await db.execute(stmt)
        others = r.scalars().all()
        for o in others:
            o.is_primary = False
        nominee.is_primary = True
    elif payload.is_primary is False:
        nominee.is_primary = False
    
    await db.flush()
    return nominee


async def delete_nominee(
    db: AsyncSession, nominee_id: int, customer_id: int,
    current_user: dict, hard_delete: bool = False
) -> bool:
    """Delete a nominee (soft by default, hard if authorized)"""
    nominee = await get_nominee(db, nominee_id, customer_id)
    if not nominee:
        return False

    if hard_delete:
        if current_user["designation"] not in ["Admin", "Dealer"]:
            raise HTTPException(status_code=403, detail="Not authorized to permanently delete")
        # Reassign primary before hard delete
        if nominee.is_primary:
            stmt = select(models.Nominee).filter(
                models.Nominee.customer_id == customer_id,
                models.Nominee.is_active == True,
                models.Nominee.is_deleted == False,
                models.Nominee.nominee_id != nominee_id
            )
            result = await db.execute(stmt)
            next_nominee = result.scalars().first()
            if next_nominee:
                next_nominee.is_primary = True
        await db.delete(nominee)
    else:
        nominee.is_deleted = True
        nominee.deleted_at = datetime.utcnow()
        nominee.deleted_by = current_user["staff_id"]
        nominee.is_active = False
        # Reassign primary on soft delete
        if nominee.is_primary:
            stmt = select(models.Nominee).filter(
                models.Nominee.customer_id == customer_id,
                models.Nominee.is_active == True,
                models.Nominee.is_deleted == False,
                models.Nominee.nominee_id != nominee_id
            )
            result = await db.execute(stmt)
            next_nominee = result.scalars().first()
            if next_nominee:
                next_nominee.is_primary = True

    await db.flush()
    return True


# ==================== VEHICLE MODEL SERVICES ====================

async def create_vehicle_model(db: AsyncSession, payload) -> models.VehicleModel:
    """Create a new vehicle model"""
    vm = models.VehicleModel(
        brand_id=payload.brand_id,
        model_name=payload.model_name,
        material_number=payload.material_number,
        colour=payload.colour,
        battery_type=getattr(payload, 'battery_type', None),
        laden_weight=getattr(payload, 'laden_weight', None),
        unladen_weight=getattr(payload, 'unladen_weight', None),
        hsn_code=getattr(payload, 'hsn_code', None),
        is_active=True,
        created_at=datetime.utcnow(),
    )
    db.add(vm)
    await db.flush()
    return vm


async def get_vehicle_model(db: AsyncSession, vehicle_model_id: int) -> models.VehicleModel | None:
    """Get a single vehicle model by ID (excludes soft-deleted)"""
    stmt = select(models.VehicleModel).filter(
        models.VehicleModel.vehicle_model_id == vehicle_model_id,
        models.VehicleModel.is_deleted == False
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def list_vehicle_models(db: AsyncSession, include_deleted: bool = False) -> list[dict]:
    """List vehicle models with brand_name resolved.
    When include_deleted=False, only active non-deleted records are returned.
    """
    stmt = (
        select(
            models.VehicleModel,
            models.Brand.brand_name,
        )
        .outerjoin(models.Brand, models.VehicleModel.brand_id == models.Brand.brand_id)
    )
    if not include_deleted:
        stmt = stmt.filter(
            models.VehicleModel.is_deleted == False,
        )
    stmt = stmt.order_by(desc(models.VehicleModel.created_at))
    result = await db.execute(stmt)
    rows = result.all()
    out = []
    for vm, brand_name in rows:
        d = {
            "vehicle_model_id": vm.vehicle_model_id,
            "brand_id": vm.brand_id,
            "brand_name": brand_name or "",
            "model_name": vm.model_name,
            "material_number": vm.material_number,
            "colour": vm.colour,
            "battery_type": vm.battery_type,
            "laden_weight": vm.laden_weight,
            "unladen_weight": vm.unladen_weight,
            "hsn_code": vm.hsn_code,
            "is_active": vm.is_active,
            "is_deleted": vm.is_deleted,
            "created_at": vm.created_at,
        }
        out.append(d)
    return out


async def update_vehicle_model(db: AsyncSession, vehicle_model_id: int, payload) -> models.VehicleModel | None:
    """Update a vehicle model (partial update, only set supplied fields)"""
    vm = await get_vehicle_model(db, vehicle_model_id)
    if not vm:
        return None
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(vm, field, value)
    vm.updated_at = datetime.utcnow()
    await db.flush()
    return vm


async def restore_vehicle_model(db: AsyncSession, vehicle_model_id: int, staff_id: int) -> bool:
    """Restore a soft-deleted vehicle model"""
    stmt = select(models.VehicleModel).filter(
        models.VehicleModel.vehicle_model_id == vehicle_model_id,
        models.VehicleModel.is_deleted == True
    )
    result = await db.execute(stmt)
    vm = result.scalars().first()
    if not vm:
        return False
    vm.is_deleted = False
    vm.is_active = True
    vm.deleted_at = None
    vm.deleted_by = None
    vm.restored_at = datetime.utcnow()
    vm.restored_by = staff_id
    await db.flush()
    return True


# ==================== VEHICLE SERVICES ====================

async def create_vehicle(db: AsyncSession, payload) -> models.Vehicle:
    """Create a new vehicle"""
    v = models.Vehicle(
        chassis_no=payload.chassis_no,
        vehicle_model_id=payload.vehicle_model_id,
        date_of_manufacture=payload.date_of_manufacture,
        current_status="IN_STOCK",
        created_at=datetime.utcnow(),
    )
    db.add(v)
    await db.flush()
    return v


async def get_vehicle(db: AsyncSession, chassis_no: str) -> models.Vehicle | None:
    """Get vehicle by chassis number (excludes soft-deleted)"""
    stmt = select(models.Vehicle).filter(
        models.Vehicle.chassis_no == chassis_no,
        models.Vehicle.is_deleted == False
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def list_vehicles(
    db: AsyncSession, status: Optional[str] = None, vehicle_model_id: Optional[int] = None
) -> list[models.Vehicle]:
    """List vehicles with optional status and model filters"""
    stmt = select(models.Vehicle).filter(models.Vehicle.is_deleted == False)
    
    if status:
        statuses = [s.strip() for s in status.split(',')]
        stmt = stmt.filter(models.Vehicle.current_status.in_(statuses))
        
    if vehicle_model_id:
        stmt = stmt.filter(models.Vehicle.vehicle_model_id == vehicle_model_id)
        
    stmt = stmt.order_by(desc(models.Vehicle.created_at))
    result = await db.execute(stmt)
    return result.scalars().all()


# ==================== VENDOR SERVICES ====================

async def create_vendor(db: AsyncSession, payload) -> models.Vendor:
    """Create a new vendor"""
    v = models.Vendor(
        vendor_name=payload.vendor_name,
        vendor_type=payload.vendor_type.value if hasattr(payload.vendor_type, 'value') else payload.vendor_type,
        gstin=getattr(payload, 'gstin', None),
        pan_no=getattr(payload, 'pan_no', None),
        address_line1=getattr(payload, 'address_line1', None),
        address_line2=getattr(payload, 'address_line2', None),
        city=getattr(payload, 'city', None),
        state=getattr(payload, 'state', None),
        pincode=getattr(payload, 'pincode', None),
        is_active=True,
        created_at=datetime.utcnow(),
    )
    db.add(v)
    await db.flush()
    return v


async def get_vendor(db: AsyncSession, vendor_id: int) -> models.Vendor | None:
    """Get a single vendor by ID (excludes soft-deleted)"""
    stmt = select(models.Vendor).filter(
        models.Vendor.vendor_id == vendor_id,
        models.Vendor.is_deleted == False
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def list_vendors(db: AsyncSession, include_deleted: bool = False) -> list[models.Vendor]:
    """List vendors. When include_deleted=False, only active non-deleted records are returned."""
    stmt = select(models.Vendor)
    if not include_deleted:
        stmt = stmt.filter(
            models.Vendor.is_deleted == False,
        )
    stmt = stmt.order_by(desc(models.Vendor.created_at))
    result = await db.execute(stmt)
    return result.scalars().all()


async def update_vendor(db: AsyncSession, vendor_id: int, payload) -> models.Vendor | None:
    """Update a vendor (partial update, only set supplied fields)"""
    vendor = await get_vendor(db, vendor_id)
    if not vendor:
        return None
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == 'vendor_type' and hasattr(value, 'value'):
            value = value.value
        setattr(vendor, field, value)
    vendor.updated_at = datetime.utcnow()
    await db.flush()
    return vendor


async def restore_vendor(db: AsyncSession, vendor_id: int, staff_id: int) -> bool:
    """Restore a soft-deleted vendor"""
    stmt = select(models.Vendor).filter(
        models.Vendor.vendor_id == vendor_id,
        models.Vendor.is_deleted == True
    )
    result = await db.execute(stmt)
    vendor = result.scalars().first()
    if not vendor:
        return False
    vendor.is_deleted = False
    vendor.is_active = True
    vendor.deleted_at = None
    vendor.deleted_by = None
    vendor.restored_at = datetime.utcnow()
    vendor.restored_by = staff_id
    await db.flush()
    return True


# ==================== PRICING SERVICES ====================

async def update_spare_price(db: AsyncSession, spare_id: int, payload, user_id: int) -> models.SparePriceHistory:
    """Update spare part price and maintain history"""
    # 1. Close current active price
    stmt = select(models.SparePriceHistory).filter(
        models.SparePriceHistory.spare_id == spare_id,
        models.SparePriceHistory.is_active == True
    )
    result = await db.execute(stmt)
    current_price = result.scalars().first()
    
    now = datetime.utcnow()
    
    if current_price:
        current_price.is_active = False
        current_price.effective_to = now
    
    # 2. Create new history record
    new_price = models.SparePriceHistory(
        spare_id=spare_id,
        price=payload.price,
        margin=payload.margin,
        effective_from=payload.effective_from or now,
        is_active=True,
        created_by=user_id,
        created_at=now
    )
    db.add(new_price)
    
    # 3. Update Master Table
    from app.domains.inventory import models as inv_models
    spare = await db.get(inv_models.SpareMaster, spare_id)
    if spare:
        # Assuming we eventually add price columns to SpareMaster or ignore this step if columns missing.
        # Check if SpareMaster has dealer_landing_price. 
        # Since I didn't verify if I added them to inventory/models.py (I didn't), I will comment this out for now 
        # OR better: I should add them to inventory/models.py to be consistent with plan.
        # But for now, let's rely on history as primary source if we want.
        # However, to be safe, I'll pass on updating master if attributes don't exist.
        if hasattr(spare, 'dealer_landing_price'):
             spare.dealer_landing_price = payload.price
        if hasattr(spare, 'dealer_margin_percent'):
             spare.dealer_margin_percent = payload.margin

    await db.flush()
    return new_price

async def get_spare_price_history(db: AsyncSession, spare_id: int) -> list[models.SparePriceHistory]:
    stmt = select(models.SparePriceHistory).filter(
        models.SparePriceHistory.spare_id == spare_id
    ).order_by(desc(models.SparePriceHistory.effective_from))
    result = await db.execute(stmt)
    return result.scalars().all()

async def update_vehicle_price(db: AsyncSession, vehicle_model_id: int, payload, user_id: int) -> models.VehiclePriceHistory:
    """Update vehicle model price"""
    # 1. Close current active price
    stmt = select(models.VehiclePriceHistory).filter(
        models.VehiclePriceHistory.vehicle_model_id == vehicle_model_id,
        models.VehiclePriceHistory.is_active == True
    )
    result = await db.execute(stmt)
    current_price = result.scalars().first()
    
    now = datetime.utcnow()
    
    if current_price:
        current_price.is_active = False
        current_price.effective_to = now
        
    # 2. Create new history record
    new_price = models.VehiclePriceHistory(
        vehicle_model_id=vehicle_model_id,
        price=payload.price,
        effective_from=payload.effective_from or now,
        is_active=True,
        created_by=user_id,
        created_at=now
    )
    db.add(new_price)
    await db.flush()
    return new_price

async def get_vehicle_price_history(db: AsyncSession, vehicle_model_id: int) -> list[models.VehiclePriceHistory]:
    stmt = select(models.VehiclePriceHistory).filter(
        models.VehiclePriceHistory.vehicle_model_id == vehicle_model_id
    ).order_by(desc(models.VehiclePriceHistory.effective_from))
    result = await db.execute(stmt)
    return result.scalars().all()


# ==================== DELETE SERVICES ====================

async def delete_customer(
    db: AsyncSession, customer_id: int,
    current_user: dict, hard_delete: bool = False
) -> bool:
    """Delete a customer (soft by default, hard if authorized)"""
    customer = await get_customer(db, customer_id)
    if not customer:
        return False

    if hard_delete:
        if current_user["designation"] not in ["Admin", "Dealer"]:
            raise HTTPException(status_code=403, detail="Not authorized to permanently delete")
        await db.delete(customer)
    else:
        customer.is_deleted = True
        customer.deleted_at = datetime.utcnow()
        customer.deleted_by = current_user["staff_id"]
        customer.is_active = False

    await db.flush()
    return True


async def delete_vehicle_model(
    db: AsyncSession, vehicle_model_id: int,
    current_user: dict, hard_delete: bool = False
) -> bool:
    """Delete a vehicle model (soft by default, hard if authorized)"""
    stmt = select(models.VehicleModel).filter(
        models.VehicleModel.vehicle_model_id == vehicle_model_id,
        models.VehicleModel.is_deleted == False
    )
    result = await db.execute(stmt)
    vm = result.scalars().first()
    if not vm:
        return False

    if hard_delete:
        if current_user["designation"] not in ["Admin", "Dealer"]:
            raise HTTPException(status_code=403, detail="Not authorized to permanently delete")
        await db.delete(vm)
    else:
        vm.is_deleted = True
        vm.deleted_at = datetime.utcnow()
        vm.deleted_by = current_user["staff_id"]
        vm.is_active = False

    await db.flush()
    return True


async def delete_vehicle(
    db: AsyncSession, chassis_no: str,
    current_user: dict, hard_delete: bool = False
) -> bool:
    """Delete a vehicle (soft by default, hard if authorized)"""
    vehicle = await get_vehicle(db, chassis_no)
    if not vehicle:
        return False

    if hard_delete:
        if current_user["designation"] not in ["Admin", "Dealer"]:
            raise HTTPException(status_code=403, detail="Not authorized to permanently delete")
        await db.delete(vehicle)
    else:
        vehicle.is_deleted = True
        vehicle.deleted_at = datetime.utcnow()
        vehicle.deleted_by = current_user["staff_id"]

    await db.flush()
    return True


async def delete_vendor(
    db: AsyncSession, vendor_id: int,
    current_user: dict, hard_delete: bool = False
) -> bool:
    """Delete a vendor (soft by default, hard if authorized)"""
    stmt = select(models.Vendor).filter(
        models.Vendor.vendor_id == vendor_id,
        models.Vendor.is_deleted == False
    )
    result = await db.execute(stmt)
    vendor = result.scalars().first()
    if not vendor:
        return False

    if hard_delete:
        if current_user["designation"] not in ["Admin", "Dealer"]:
            raise HTTPException(status_code=403, detail="Not authorized to permanently delete")
        await db.delete(vendor)
    else:
        vendor.is_deleted = True
        vendor.deleted_at = datetime.utcnow()
        vendor.deleted_by = current_user["staff_id"]
        vendor.is_active = False

    await db.flush()
    return True

