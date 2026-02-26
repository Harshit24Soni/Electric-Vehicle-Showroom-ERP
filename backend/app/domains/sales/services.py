from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from datetime import datetime
from typing import Optional
from fastapi import HTTPException

from app.domains.sales import models
from app.domains.sales import schemas as sales_schemas
from app.domains.master import models as master_models
from app.domains.crm import models as crm_models
from app.domains.inventory import models as inventory_models

class SalesError(Exception):
    pass

async def create_sale(db: AsyncSession, payload, current_staff_id: int) -> models.Sale:
    """Create a new sale — supports direct sales (no lead required)"""
    
    is_direct = getattr(payload, 'is_direct_sale', False) or payload.lead_id is None

    # Verify Lead (if not direct sale)
    if not is_direct:
        lead = await db.get(crm_models.Lead, payload.lead_id)
        if not lead:
            raise SalesError("Lead not found")
    else:
        lead = None
        
    # Verify Customer
    customer = await db.get(master_models.Customer, payload.customer_id)
    if not customer:
        raise SalesError("Customer not found")
        
    # Verify Vehicle
    vehicle = await db.get(master_models.Vehicle, payload.chassis_no)
    if not vehicle:
        raise SalesError("Vehicle not found")
        
    if vehicle.current_status != 'IN_STOCK':
        raise SalesError(f"Vehicle is not available (Status: {vehicle.current_status})")
        
    # Margin Validation
    from app.domains.procurement import models as procurement_models
    stmt = select(procurement_models.VehiclePurchaseDetail).filter_by(chassis_no=payload.chassis_no)
    result = await db.execute(stmt)
    purchase_detail = result.scalars().first()
    cost_price = float(purchase_detail.cost_price) if purchase_detail and purchase_detail.cost_price else 0
    
    if float(payload.total_amount) < cost_price:
        raise HTTPException(status_code=400, detail="Cannot sell below procurement cost")
        
    # Create Sale
    sale = models.Sale(
        lead_id=payload.lead_id if not is_direct else None,
        customer_id=payload.customer_id,
        chassis_no=payload.chassis_no,
        sale_date=payload.sale_date,
        total_amount=payload.total_amount,
        sale_status="PENDING",
        remarks=payload.remarks,
        created_by_staff_id=current_staff_id,
        created_at=datetime.utcnow(),
        # New workflow fields
        sale_stage=models.SaleStage.ENQUIRY.value,
        stage_updated_at=datetime.utcnow(),
        is_direct_sale=is_direct,
    )
    db.add(sale)
    
    # Create Empty Checklist
    checklist = models.DeliveryChecklist(sale=sale)
    db.add(checklist)
    
    # Update Vehicle Status
    vehicle.current_status = 'BOOKED'
    
    # Update Lead Status to CONVERTED/WON (if not direct sale)
    if lead:
        stmt = select(crm_models.LeadStatusMaster).filter(crm_models.LeadStatusMaster.status_name.in_(['WON', 'CONVERTED']))
        result = await db.execute(stmt)
        status_obj = result.scalars().first()
        if status_obj:
            lead.lead_status_id = status_obj.status_id
        lead.is_converted = True
        lead.lead_status = "SOLD"
        
    await db.flush()

    # Create initial portal tracking
    portal = models.SalePortalTracking(
        sale_id=sale.sale_id,
    )
    db.add(portal)

    # Record initial stage history
    history = models.SaleStageHistory(
        sale_id=sale.sale_id,
        from_stage=None,
        to_stage=models.SaleStage.ENQUIRY.value,
        changed_by_staff_id=current_staff_id,
        remarks="Sale created",
    )
    db.add(history)
    await db.flush()

    return sale


async def create_sale_transaction(
    db: AsyncSession,
    payload: sales_schemas.SaleCreatePayload,
    current_user: dict,
) -> models.Sale:
    """Full Sales & Billing transaction — atomic.

    Steps:
      a. Verify vehicle is AVAILABLE / IN_STOCK.
      b. Create Sale.
      c. Mark vehicle SOLD + link customer.
      d. Generate SalesInvoice (SaleDocument).
      e. Record initial SalePayment (down payment).
      f. Insert OUTWARD VehicleStockMovement.
      g. Initialize SalePortalTracking.
      h. Commit atomically.
    """
    staff_id = current_user["staff_id"]

    # (a) Verify vehicle
    vehicle = await db.get(master_models.Vehicle, payload.chassis_no)
    if not vehicle:
        raise HTTPException(status_code=400, detail="Vehicle not found.")
    if vehicle.current_status not in ("IN_STOCK", "AVAILABLE"):
        raise HTTPException(
            status_code=400,
            detail=f"Vehicle not available for sale (current status: {vehicle.current_status}).",
        )

    # Verify customer exists
    customer = await db.get(master_models.Customer, payload.customer_id)
    if not customer:
        raise HTTPException(status_code=400, detail="Customer not found.")

    is_direct = getattr(payload, "is_direct_sale", True) or payload.lead_id is None

    # Margin Validation
    from app.domains.procurement import models as procurement_models
    stmt = select(procurement_models.VehiclePurchaseDetail).filter_by(chassis_no=payload.chassis_no)
    result = await db.execute(stmt)
    purchase_detail = result.scalars().first()
    cost_price = float(purchase_detail.cost_price) if purchase_detail and purchase_detail.cost_price else 0
    
    if float(payload.total_amount) < cost_price:
        raise HTTPException(status_code=400, detail="Cannot sell below procurement cost")

    # (b) Create Sale
    sale = models.Sale(
        lead_id=payload.lead_id if not is_direct else None,
        customer_id=payload.customer_id,
        chassis_no=payload.chassis_no,
        sale_date=payload.sale_date,
        total_amount=float(payload.total_amount),
        sale_status="INVOICED",
        remarks=payload.remarks,
        created_by_staff_id=staff_id,
        created_at=datetime.utcnow(),
        sale_stage=models.SaleStage.PAYMENT.value,
        stage_updated_at=datetime.utcnow(),
        is_direct_sale=is_direct,
        is_invoice_generated=True,
        is_receipt_generated=True,
    )
    db.add(sale)
    await db.flush()  # get sale_id

    # (c) Mark vehicle SOLD + link customer
    vehicle.current_status = "SOLD"
    vehicle.customer_id = payload.customer_id

    # (d) Generate invoice document
    year = datetime.now().year
    inv_number = f"INV-{year}-{sale.sale_id:04d}"
    sale.invoice_number = inv_number

    invoice_doc = models.SaleDocument(
        sale_id=sale.sale_id,
        document_type="INVOICE",
        document_number=inv_number,
        generated_by_staff_id=staff_id,
    )
    db.add(invoice_doc)

    # (e) Record down payment
    if payload.down_payment_amount and float(payload.down_payment_amount) > 0:
        payment = models.SalePayment(
            sale_id=sale.sale_id,
            payment_type="BOOKING",
            payment_mode=payload.payment_mode,
            amount=float(payload.down_payment_amount),
            bank_name=payload.financier_name if payload.payment_mode == "FINANCE" else None,
            remarks=f"Down payment at sale creation",
            created_by_staff_id=staff_id,
            payment_date=datetime.utcnow(),
        )
        db.add(payment)

    # (f) Outward stock movement
    movement = inventory_models.VehicleStockMovement(
        chassis_no=payload.chassis_no,
        movement_type="DELIVERED",
        from_location="SHOWROOM",
        to_location="CUSTOMER",
        reference_type="SALE",
        reference_id=sale.sale_id,
        movement_datetime=datetime.utcnow(),
        remarks=f"Sale #{sale.sale_id} — {inv_number}",
    )
    db.add(movement)

    # (g) Initialize portal tracking + delivery checklist
    portal = models.SalePortalTracking(sale_id=sale.sale_id)
    db.add(portal)

    checklist = models.DeliveryChecklist(sale_id=sale.sale_id)
    db.add(checklist)

    # Stage history
    history = models.SaleStageHistory(
        sale_id=sale.sale_id,
        from_stage=None,
        to_stage=models.SaleStage.PAYMENT.value,
        changed_by_staff_id=staff_id,
        remarks="Sale created with billing",
    )
    db.add(history)

    # (h) Commit atomically
    await db.commit()
    await db.refresh(sale)
    return sale

async def get_sale(db: AsyncSession, sale_id: int) -> models.Sale | None:
    """Get a sale by ID (excludes soft-deleted)"""
    stmt = select(models.Sale).options(
        selectinload(models.Sale.lead),
        selectinload(models.Sale.customer),
        selectinload(models.Sale.vehicle),
        selectinload(models.Sale.receipts),
        selectinload(models.Sale.delivery_checklist),
        selectinload(models.Sale.service_schedules),
        selectinload(models.Sale.stage_history),
        selectinload(models.Sale.sale_payments),
        selectinload(models.Sale.sale_documents),
        selectinload(models.Sale.portal_tracking),
    ).filter(
        models.Sale.sale_id == sale_id,
        models.Sale.is_deleted == False
    )
    result = await db.execute(stmt)
    return result.scalars().first()

async def list_sales(db: AsyncSession) -> list[models.Sale]:
    """List all sales (excludes soft-deleted)"""
    stmt = select(models.Sale).options(
        selectinload(models.Sale.customer),
        selectinload(models.Sale.vehicle)
    ).filter(
        models.Sale.is_deleted == False
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


# ==================== NEW WORKFLOW SERVICES ====================

async def advance_sale_stage(
    db: AsyncSession,
    sale_id: int,
    payload: sales_schemas.StageAdvanceRequest,
    current_staff_id: int,
) -> models.Sale:
    """Advance a sale to a new stage with audit trail"""
    sale = await get_sale(db, sale_id)
    if not sale:
        raise SalesError("Sale not found")

    from_stage = sale.sale_stage
    advanced = sale.advance_stage(payload.to_stage)
    if not advanced:
        raise SalesError(
            f"Cannot advance from {from_stage} to {payload.to_stage}. "
            f"Stage must be strictly forward."
        )

    # Record history
    history = models.SaleStageHistory(
        sale_id=sale_id,
        from_stage=from_stage,
        to_stage=payload.to_stage,
        changed_by_staff_id=current_staff_id,
        remarks=payload.remarks,
    )
    db.add(history)

    # Auto-update sale_status based on stage
    stage_status_map = {
        "INVOICE": "INVOICED",
        "DELIVERY": "DELIVERED",
        "COMPLETED": "DELIVERED",
    }
    if payload.to_stage in stage_status_map:
        sale.sale_status = stage_status_map[payload.to_stage]

    await db.flush()
    return sale


async def add_sale_payment(
    db: AsyncSession,
    sale_id: int,
    payload: sales_schemas.SalePaymentCreate,
    current_staff_id: int,
) -> models.SalePayment:
    """Add a payment to a sale"""
    sale = await get_sale(db, sale_id)
    if not sale:
        raise SalesError("Sale not found")

    payment = models.SalePayment(
        sale_id=sale_id,
        payment_type=payload.payment_type,
        payment_mode=payload.payment_mode,
        amount=float(payload.amount),
        reference_number=payload.reference_number,
        payment_date=payload.payment_date or datetime.utcnow(),
        bank_name=payload.bank_name,
        remarks=payload.remarks,
        created_by_staff_id=current_staff_id,
    )
    db.add(payment)
    await db.flush()
    return payment


async def generate_sale_document(
    db: AsyncSession,
    sale_id: int,
    payload: sales_schemas.SaleDocumentCreate,
    current_staff_id: int,
) -> models.SaleDocument:
    """Generate a document for a sale (with unique document number)"""
    sale = await get_sale(db, sale_id)
    if not sale:
        raise SalesError("Sale not found")

    # Generate unique document number
    year = datetime.now().year
    prefix_map = {
        "INVOICE": "INV",
        "RECEIPT": "RCP",
        "CHALLAN": "CH",
        "INSURANCE": "INS",
        "SERVICE_SCHEDULE": "SS",
    }
    prefix = prefix_map.get(payload.document_type, "DOC")
    doc_number = f"{prefix}-{year}-{sale_id:04d}"

    # Check if already exists for this sale+type
    stmt = select(models.SaleDocument).filter_by(
        sale_id=sale_id,
        document_type=payload.document_type,
    )
    result = await db.execute(stmt)
    existing = result.scalars().first()
    if existing:
        return existing  # Already generated

    document = models.SaleDocument(
        sale_id=sale_id,
        document_type=payload.document_type,
        document_number=doc_number,
        generated_by_staff_id=current_staff_id,
    )
    db.add(document)

    # Update sale document flags
    flag_map = {
        "INVOICE": "is_invoice_generated",
        "CHALLAN": "is_challan_generated",
        "INSURANCE": "is_insurance_generated",
        "SERVICE_SCHEDULE": "is_service_schedule_generated",
    }
    flag_attr = flag_map.get(payload.document_type)
    if flag_attr:
        setattr(sale, flag_attr, True)

    # For invoice, also set the invoice_number
    if payload.document_type == "INVOICE":
        sale.invoice_number = doc_number
    elif payload.document_type == "CHALLAN":
        sale.delivery_challan_number = doc_number

    await db.flush()
    return document


async def get_portal_tracking(db: AsyncSession, sale_id: int) -> models.SalePortalTracking | None:
    """Get portal tracking for a sale"""
    stmt = select(models.SalePortalTracking).filter_by(sale_id=sale_id)
    result = await db.execute(stmt)
    return result.scalars().first()


async def update_portal_tracking(
    db: AsyncSession,
    sale_id: int,
    payload: sales_schemas.PortalTrackingUpdate,
) -> models.SalePortalTracking:
    """Update portal tracking statuses"""
    portal = await get_portal_tracking(db, sale_id)
    if not portal:
        raise SalesError("Portal tracking not found for this sale")

    status_fields = {
        "insurance_status": ("insurance_completed_date", payload.insurance_status),
        "subsidy_status": ("subsidy_completed_date", payload.subsidy_status),
        "rto_status": ("rto_completed_date", payload.rto_status),
        "celex_status": ("celex_completed_date", payload.celex_status),
    }

    for status_field, (date_field, value) in status_fields.items():
        if value is not None:
            setattr(portal, status_field, value)
            if value == "COMPLETED":
                setattr(portal, date_field, datetime.utcnow())

    if payload.insurance_policy_number is not None:
        portal.insurance_policy_number = payload.insurance_policy_number
    if payload.subsidy_reference is not None:
        portal.subsidy_reference = payload.subsidy_reference
    if payload.registration_number is not None:
        portal.registration_number = payload.registration_number
    if payload.number_plate_ordered_date is not None:
        portal.number_plate_ordered_date = payload.number_plate_ordered_date
    if payload.number_plate_fixed_date is not None:
        portal.number_plate_fixed_date = payload.number_plate_fixed_date
    if payload.form_20_generated is not None:
        portal.form_20_generated = payload.form_20_generated
    if payload.helmet_invoice_generated is not None:
        portal.helmet_invoice_generated = payload.helmet_invoice_generated

    portal.updated_at = datetime.utcnow()
    portal.check_completion()

    await db.flush()
    return portal


async def get_sale_progress(db: AsyncSession, sale_id: int) -> dict:
    """Get comprehensive sale progress including stage, payments, documents, portal"""
    sale = await get_sale(db, sale_id)
    if not sale:
        raise SalesError("Sale not found")

    return {
        "sale_id": sale.sale_id,
        "sale_stage": sale.sale_stage,
        "completion_percentage": sale.completion_percentage,
        "is_direct_sale": sale.is_direct_sale,
        "stage_history": sale.stage_history or [],
        "payments": sale.sale_payments or [],
        "documents": sale.sale_documents or [],
        "portal_tracking": sale.portal_tracking,
    }


# ==================== DELETE SERVICES ====================

async def delete_sale(
    db: AsyncSession, sale_id: int,
    current_user: dict, hard_delete: bool = False
) -> bool:
    """Delete a sale (soft by default, hard if authorized)"""
    sale = await get_sale(db, sale_id)
    if not sale:
        return False

    if hard_delete:
        if current_user["designation"] not in ["Admin", "Dealer"]:
            raise HTTPException(status_code=403, detail="Not authorized to permanently delete")
        await db.delete(sale)
    else:
        sale.is_deleted = True
        sale.deleted_at = datetime.utcnow()
        sale.deleted_by = current_user["staff_id"]

    await db.flush()
    return True
