from fastapi import APIRouter, Depends
from app.db.session import get_db
from app.shared.utils import export_csv
from app.domains.reports import services
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

