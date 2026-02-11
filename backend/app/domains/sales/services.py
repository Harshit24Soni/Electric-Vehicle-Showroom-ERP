from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from datetime import datetime
from typing import Optional

from app.domains.sales import models
from app.domains.master import models as master_models
from app.domains.crm import models as crm_models

class SalesError(Exception):
    pass

async def create_sale(db: AsyncSession, payload, current_staff_id: int) -> models.Sale:
    """Create a new sale"""
    
    # Verify Lead
    lead = await db.get(crm_models.Lead, payload.lead_id)
    if not lead:
        raise SalesError("Lead not found")
        
    # Verify Customer
    customer = await db.get(master_models.Customer, payload.customer_id)
    if not customer:
        raise SalesError("Customer not found")
        
    # Verify Vehicle
    vehicle = await db.get(master_models.Vehicle, payload.chassis_no)
    if not vehicle:
        raise SalesError("Vehicle not found")
        
    if vehicle.current_status != 'IN_STOCK': # Assuming default status is IN_STOCK
        # Wait, I should check master/models.py for status default. 
        # It was "IN_STOCK" in master/models.py view earlier.
        # But create_sale logic used 'AVAILABLE'. I should fix to 'IN_STOCK'.
        raise SalesError(f"Vehicle is not available (Status: {vehicle.current_status})")
        
    # Create Sale
    sale = models.Sale(
        lead_id=payload.lead_id,
        customer_id=payload.customer_id,
        chassis_no=payload.chassis_no,
        sale_date=payload.sale_date,
        total_amount=payload.total_amount,
        sale_status="PENDING",
        remarks=payload.remarks,
        created_by_staff_id=current_staff_id,
        created_at=datetime.utcnow()
    )
    db.add(sale)
    
    # Create Empty Checklist
    checklist = models.DeliveryChecklist(sale=sale)
    db.add(checklist)
    
    # Update Vehicle Status
    vehicle.current_status = 'BOOKED'
    
    # Update Lead Status to CONVERTED/WON
    # Check if a status named 'WON' or 'CONVERTED' exists
    # For now, assume CONVERTED exists or use ID 5 (from convert_lead logic)
    # Ideally fetch by name
    stmt = select(crm_models.LeadStatusMaster).filter(crm_models.LeadStatusMaster.status_name.in_(['WON', 'CONVERTED']))
    result = await db.execute(stmt)
    status_obj = result.scalars().first()
    if status_obj:
        lead.lead_status_id = status_obj.status_id
        
    await db.flush()
    return sale

async def get_sale(db: AsyncSession, sale_id: int) -> models.Sale | None:
    stmt = select(models.Sale).options(
        selectinload(models.Sale.lead),
        selectinload(models.Sale.customer),
        selectinload(models.Sale.vehicle),
        selectinload(models.Sale.receipts),
        selectinload(models.Sale.delivery_checklist),
        selectinload(models.Sale.service_schedules)
    ).filter(models.Sale.sale_id == sale_id)
    result = await db.execute(stmt)
    return result.scalars().first()

async def list_sales(db: AsyncSession) -> list[models.Sale]:
    stmt = select(models.Sale).options(
        selectinload(models.Sale.customer),
        selectinload(models.Sale.vehicle)
    ).order_by(desc(models.Sale.created_at))
    result = await db.execute(stmt)
    return result.scalars().all()

async def add_receipt(db: AsyncSession, payload, current_staff_id: int) -> models.PaymentReceipt:
    receipt = models.PaymentReceipt(
        sale_id=payload.sale_id,
        amount=payload.amount,
        payment_mode=payload.payment_mode,
        transaction_ref=payload.transaction_ref,
        receipt_date=payload.receipt_date,
        created_by_staff_id=current_staff_id,
        created_at=datetime.utcnow()
    )
    db.add(receipt)
    
    # Update Sale flag
    sale = await get_sale(db, payload.sale_id)
    if sale:
        sale.is_receipt_generated = True
        
    await db.flush()
    return receipt

async def generate_invoice(db: AsyncSession, sale_id: int) -> models.Sale:
    sale = await get_sale(db, sale_id)
    if not sale:
        raise SalesError("Sale not found")
        
    if sale.is_invoice_generated:
        return sale # Already generated
        
    # Generate Number: INV-YYYY-ID
    year = datetime.now().year
    sale.invoice_number = f"INV-{year}-{sale.sale_id:04d}"
    sale.is_invoice_generated = True
    sale.sale_status = "INVOICED"
    
    await db.flush()
    return sale

async def generate_challan(db: AsyncSession, sale_id: int) -> models.Sale:
    sale = await get_sale(db, sale_id)
    if not sale:
        raise SalesError("Sale not found")
        
    if sale.is_challan_generated:
        return sale
        
    year = datetime.now().year
    sale.delivery_challan_number = f"CH-{year}-{sale.sale_id:04d}"
    sale.is_challan_generated = True
    
    await db.flush()
    return sale

from datetime import datetime, timedelta

async def generate_service_schedule(db: AsyncSession, sale_id: int):
    sale = await get_sale(db, sale_id)
    if not sale:
        raise SalesError("Sale not found")
        
    if sale.is_service_schedule_generated:
        return sale
        
    # Create 3 Free Services
    # 1st Service: 30 days
    # 2nd Service: 90 days
    # 3rd Service: 180 days
    
    sale_date = sale.sale_date if isinstance(sale.sale_date, datetime) else datetime.combine(sale.sale_date, datetime.min.time())
    
    schedules = [
        models.ServiceSchedule(
            sale_id=sale_id,
            service_number=1,
            service_type="FREE",
            due_date=(sale_date + timedelta(days=30)).date(),
            status="PENDING"
        ),
        models.ServiceSchedule(
            sale_id=sale_id,
            service_number=2,
            service_type="FREE",
            due_date=(sale_date + timedelta(days=90)).date(),
            status="PENDING"
        ),
        models.ServiceSchedule(
            sale_id=sale_id,
            service_number=3,
            service_type="FREE",
            due_date=(sale_date + timedelta(days=180)).date(),
            status="PENDING"
        )
    ]
    
    db.add_all(schedules)
    sale.is_service_schedule_generated = True
    
    await db.flush()
    return sale

async def get_delivery_status(db: AsyncSession, sale_id: int) -> dict:
    sale = await get_sale(db, sale_id)
    if not sale:
        raise SalesError("Sale not found")
        
    documents = {
        "invoice": sale.is_invoice_generated,
        "receipt": sale.is_receipt_generated,
        "challan": sale.is_challan_generated,
        "service_schedule": sale.is_service_schedule_generated,
        # "insurance": sale.is_insurance_generated # Insurance is NOT blocking for delivery per plan
    }
    
    # Check strict delivery rules: Receipt, Invoice, Challan, Service Schedule
    required = ["invoice", "receipt", "challan", "service_schedule"]
    allowed = all(documents.get(k, False) for k in required)
    
    return {
        "allowed": allowed,
        "documents": documents
    }

async def update_checklist(db: AsyncSession, sale_id: int, payload) -> models.DeliveryChecklist:
    stmt = select(models.DeliveryChecklist).filter_by(sale_id=sale_id)
    result = await db.execute(stmt)
    checklist = result.scalars().first()
    
    if not checklist:
        # Create if missing (should exist on create_sale)
        checklist = models.DeliveryChecklist(sale_id=sale_id)
        db.add(checklist)
        
    if payload.insurance_completed is not None:
        checklist.insurance_completed = payload.insurance_completed
    if payload.insurance_details is not None:
        checklist.insurance_details = payload.insurance_details
        
    if payload.subsidy_completed is not None:
        checklist.subsidy_completed = payload.subsidy_completed
    if payload.subsidy_details is not None:
        checklist.subsidy_details = payload.subsidy_details
        
    if payload.rto_completed is not None:
        checklist.rto_completed = payload.rto_completed
    if payload.rto_details is not None:
        checklist.rto_details = payload.rto_details
        
    if payload.celex_plate_ordered is not None:
        checklist.celex_plate_ordered = payload.celex_plate_ordered
    if payload.celex_subsidy_completed is not None:
        checklist.celex_subsidy_completed = payload.celex_subsidy_completed
    if payload.celex_details is not None:
        checklist.celex_details = payload.celex_details
        
    if payload.plate_fixation_date is not None:
        checklist.plate_fixation_date = payload.plate_fixation_date
        
    await db.flush()
    return checklist
