from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract, and_, or_
from datetime import date, datetime, timedelta

from app.domains.billing.models import SalesInvoice
from app.domains.sales.models import Sale, ServiceSchedule
from app.domains.crm.models import Lead
from app.domains.master.models import Vehicle, VehicleModel
from app.domains.insurance.models import Policy
from app.domains.reports.schemas import (
    DashboardStatsResponse,
    DashboardAlertsResponse,
    AgingInventoryAlert,
    UpcomingRenewalAlert,
)

def sales_register(
    db: Session,
    *,
    from_date,
    to_date,
):
    return (
        db.query(
            SalesInvoice.invoice_number,
            SalesInvoice.invoice_date,
            SalesInvoice.taxable_amount,
            SalesInvoice.gst_rate,
            SalesInvoice.gst_amount,
            SalesInvoice.total_amount,
            Sale.chassis_no,
        )
        .join(Sale, Sale.sale_id == SalesInvoice.sale_id)
        .filter(
            SalesInvoice.invoice_date.between(from_date, to_date),
            SalesInvoice.is_final.is_(True),
        )
        .order_by(SalesInvoice.invoice_date)
        .all()
    )

from app.domains.finance.models import VehicleFinance

def finance_register(db: Session):
    return (
        db.query(
            VehicleFinance.sale_id,
            VehicleFinance.financer_name,
            VehicleFinance.loan_amount,
            VehicleFinance.down_payment,
            VehicleFinance.finance_status,
            VehicleFinance.reference_number,
            VehicleFinance.updated_at,
        )
        .order_by(VehicleFinance.updated_at.desc())
        .all()
    )

from app.domains.service.models import ServiceJobCard, ServiceSpareConsumption

def service_register(db: Session):
    return (
        db.query(
            ServiceJobCard.job_card_id,
            ServiceJobCard.chassis_no,
            ServiceJobCard.is_free_service,
            ServiceJobCard.opened_at,
            ServiceJobCard.closed_at,
            ServiceSpareConsumption.spare_id,
            ServiceSpareConsumption.quantity,
        )
        .join(
            ServiceSpareConsumption,
            ServiceSpareConsumption.job_card_id == ServiceJobCard.job_card_id,
        )
        .all()
    )

async def get_dashboard_stats(db: AsyncSession) -> DashboardStatsResponse:
    today = date.today()
    
    # 1. Current Month Revenue
    revenue_query = select(func.sum(SalesInvoice.total_amount)).where(
        extract('month', SalesInvoice.invoice_date) == today.month,
        extract('year', SalesInvoice.invoice_date) == today.year,
        SalesInvoice.is_final == True,
        SalesInvoice.is_deleted == False
    )
    revenue = await db.scalar(revenue_query)
    revenue = revenue or 0.0

    # 2. Active Leads
    active_leads_query = select(func.count(Lead.lead_id)).where(
        Lead.lead_status.notin_(['LOST', 'SOLD', 'CONVERTED']),
        Lead.is_deleted == False
    )
    active_leads = await db.scalar(active_leads_query)
    active_leads = active_leads or 0

    # 3. Lead Conversion Ratio
    total_leads_query = select(func.count(Lead.lead_id)).where(Lead.is_deleted == False)
    total_leads = await db.scalar(total_leads_query)
    total_leads = total_leads or 0

    converted_leads_query = select(func.count(Lead.lead_id)).where(
        Lead.is_converted == True, 
        Lead.is_deleted == False
    )
    converted_leads = await db.scalar(converted_leads_query)
    converted_leads = converted_leads or 0

    conversion_ratio = 0.0
    if total_leads > 0:
        conversion_ratio = round((converted_leads / total_leads) * 100, 2)

    # 4. Available Inventory
    inventory_query = select(func.count(Vehicle.chassis_no)).where(
        Vehicle.current_status == 'IN_STOCK',
        Vehicle.is_deleted == False
    )
    in_stock_inventory = await db.scalar(inventory_query)
    in_stock_inventory = in_stock_inventory or 0

    return DashboardStatsResponse(
        revenue=revenue,
        active_leads=active_leads,
        conversion_ratio=conversion_ratio,
        in_stock_inventory=in_stock_inventory
    )

async def get_dashboard_alerts(db: AsyncSession) -> DashboardAlertsResponse:
    today = date.today()
    thirty_days_later = today + timedelta(days=30)
    
    # 1. Aging Inventory
    aging_query = select(Vehicle, VehicleModel.model_name).join(
        VehicleModel, Vehicle.vehicle_model_id == VehicleModel.vehicle_model_id
    ).where(
        Vehicle.current_status == 'IN_STOCK',
        Vehicle.is_deleted == False
    )
    
    aging_results = await db.execute(aging_query)
    aging_inventory = []
    
    for vehicle, model_name in aging_results.all():
        days_in_stock = (datetime.utcnow() - vehicle.created_at).days
        if days_in_stock > 60:
            aging_inventory.append(AgingInventoryAlert(
                chassis_no=vehicle.chassis_no,
                model_name=model_name,
                days_in_stock=days_in_stock,
                age_category=">60 Days"
            ))
        elif days_in_stock > 30:
            aging_inventory.append(AgingInventoryAlert(
                chassis_no=vehicle.chassis_no,
                model_name=model_name,
                days_in_stock=days_in_stock,
                age_category=">30 Days"
            ))
            
    # Sort aging inventory descending by days
    aging_inventory.sort(key=lambda x: x.days_in_stock, reverse=True)

    # 2. Upcoming Renewals (Policies + Service Schedules)
    upcoming_renewals = []
    
    # Insurance Policies
    policy_query = select(Policy).where(
        Policy.policy_end_date.between(today, thirty_days_later),
        Policy.is_active == True,
        Policy.is_deleted == False
    )
    policies = (await db.execute(policy_query)).scalars().all()
    for policy in policies:
        upcoming_renewals.append(UpcomingRenewalAlert(
            chassis_no=policy.chassis_no,
            type="INSURANCE",
            due_date=policy.policy_end_date,
            details=f"Policy {policy.policy_number} expiring"
        ))

    # Service Schedules
    schedule_query = select(ServiceSchedule, Sale.chassis_no).join(
        Sale, ServiceSchedule.sale_id == Sale.sale_id
    ).where(
        ServiceSchedule.due_date.between(today, thirty_days_later),
        ServiceSchedule.status.notin_(['COMPLETED', 'CANCELLED', 'SKIPPED']),
        ServiceSchedule.is_deleted == False
    )
    schedules = (await db.execute(schedule_query)).all()
    
    for schedule, chassis_no in schedules:
        upcoming_renewals.append(UpcomingRenewalAlert(
            chassis_no=chassis_no,
            type="SERVICE",
            due_date=schedule.due_date,
            details=f"Service #{schedule.service_number} ({schedule.service_type})"
        ))
        
    # Sort renewals ascending by date
    upcoming_renewals.sort(key=lambda x: x.due_date)

    return DashboardAlertsResponse(
        aging_inventory=aging_inventory[:10], # Limit to top 10
        upcoming_renewals=upcoming_renewals[:10]
    )

