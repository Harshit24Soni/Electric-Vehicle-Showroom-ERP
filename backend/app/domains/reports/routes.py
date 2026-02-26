from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.shared.utils import export_csv
from app.domains.reports import services
from app.domains.reports.schemas import DashboardStatsResponse, DashboardAlertsResponse
from app.auth.dependencies import get_current_staff
from app.auth.roles import require_roles
from datetime import date

router = APIRouter(
    prefix="/reports",
    tags=["Reports"],
    dependencies=[
        Depends(get_current_staff),
        Depends(require_roles("DEALER", "ADMIN", "ACCOUNTS")),
    ],
)



@router.get("/sales-register")
def export_sales_register(
    from_date: date,
    to_date: date,
    db=Depends(get_db),
    _staff=Depends(get_current_staff),
):
    rows = services.sales_register(
        db=db,
        from_date=from_date,
        to_date=to_date,
    )

    return export_csv(
        headers=[
            "Invoice No",
            "Invoice Date",
            "Taxable Amount",
            "GST Rate",
            "GST Amount",
            "Total Amount",
            "Chassis No",
        ],
        rows=rows,
        filename="sales_register.csv",
    )

from fastapi.responses import JSONResponse

@router.get("/sales-summary")
def get_sales_summary(
    from_date: date,
    to_date: date,
    db=Depends(get_db),
    _staff=Depends(get_current_staff),
):
    rows = services.sales_register(
        db=db,
        from_date=from_date,
        to_date=to_date,
    )
    
    summary = []
    for row in rows:
        summary.append({
            "invoice_number": row.invoice_number,
            "invoice_date": row.invoice_date.isoformat() if row.invoice_date else None,
            "taxable_amount": float(row.taxable_amount) if row.taxable_amount else 0,
            "gst_rate": float(row.gst_rate) if row.gst_rate else 0,
            "gst_amount": float(row.gst_amount) if row.gst_amount else 0,
            "total_amount": float(row.total_amount) if row.total_amount else 0,
            "chassis_no": row.chassis_no
        })
        
    return JSONResponse(content={"items": summary})

@router.get("/finance-register")
def export_finance_register(db=Depends(get_db), _staff=Depends(get_current_staff)):
    rows = services.finance_register(db=db)

    return export_csv(
        headers=[
            "Sale ID",
            "Financer",
            "Loan Amount",
            "Down Payment",
            "Status",
            "Reference No",
            "Updated At",
        ],
        rows=rows,
        filename="finance_register.csv",
    )

@router.get("/dashboard-stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    return await services.get_dashboard_stats(db)


@router.get("/alerts", response_model=DashboardAlertsResponse)
async def get_dashboard_alerts(db: AsyncSession = Depends(get_db)):
    return await services.get_dashboard_alerts(db)


