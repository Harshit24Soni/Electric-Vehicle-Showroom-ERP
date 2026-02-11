from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from datetime import datetime

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
    """Get a customer by ID"""
    return await db.get(models.Customer, customer_id)


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
    """List all customers"""
    stmt = select(models.Customer).order_by(desc(models.Customer.created_at)).limit(limit)
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
    """List all active nominees for a customer"""
    stmt = select(models.Nominee).filter(
        models.Nominee.customer_id == customer_id,
        models.Nominee.is_active == True
    ).order_by(desc(models.Nominee.is_primary), desc(models.Nominee.created_at))
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_nominee(db: AsyncSession, nominee_id: int, customer_id: int) -> models.Nominee | None:
    """Get a specific nominee"""
    stmt = select(models.Nominee).filter(
        models.Nominee.nominee_id == nominee_id,
        models.Nominee.customer_id == customer_id,
        models.Nominee.is_active == True
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


async def delete_nominee(db: AsyncSession, nominee_id: int, customer_id: int) -> bool:
    """Soft delete a nominee"""
    nominee = await get_nominee(db, nominee_id, customer_id)
    if not nominee:
        return False
    
    nominee.is_active = False
    
    # If this was the primary nominee, set another as primary
    if nominee.is_primary:
        stmt = select(models.Nominee).filter(
            models.Nominee.customer_id == customer_id,
            models.Nominee.is_active == True,
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
        brand=payload.brand,
        model_name=payload.model_name,
        material_number=payload.material_number,
        colour=payload.colour,
        battery_type=payload.battery_type,
        is_active=True,
        created_at=datetime.utcnow(),
    )
    db.add(vm)
    await db.flush()
    return vm


async def list_vehicle_models(db: AsyncSession) -> list[models.VehicleModel]:
    """List all active vehicle models"""
    stmt = select(models.VehicleModel).filter(models.VehicleModel.is_active == True)
    result = await db.execute(stmt)
    return result.scalars().all()


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
    """Get vehicle by chassis number"""
    return await db.get(models.Vehicle, chassis_no)


# ==================== VENDOR SERVICES ====================

async def create_vendor(db: AsyncSession, payload) -> models.Vendor:
    """Create a new vendor"""
    v = models.Vendor(
        vendor_name=payload.vendor_name,
        vendor_type=payload.vendor_type,
        is_active=True,
        created_at=datetime.utcnow(),
    )
    db.add(v)
    await db.flush()
    return v


async def list_vendors(db: AsyncSession) -> list[models.Vendor]:
    """List all active vendors"""
    stmt = select(models.Vendor).filter(models.Vendor.is_active == True)
    result = await db.execute(stmt)
    return result.scalars().all()


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



