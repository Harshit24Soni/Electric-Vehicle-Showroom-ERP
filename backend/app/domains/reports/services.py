from sqlalchemy.orm import Session
from app.domains.billing.models import SalesInvoice
from app.domains.sales.models import Sale

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

