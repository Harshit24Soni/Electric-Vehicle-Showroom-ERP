from pydantic import BaseModel, Field
from typing import Optional
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.sales.models import Sale

# Decoupling Strategy (DDD Phase 1):
# Contracts define the PUBLIC INTERFACE for the Sales module.
# Other modules must interact with Sales through these schemas and functions,
# rather than importing internal ORM models or database tables directly.

class SaleSummaryResponse(BaseModel):
    sale_id: int
    customer_id: int
    chassis_no: str
    sale_date: date
    total_amount: float
    sale_status: str
    sale_stage: Optional[str] = None
    invoice_number: Optional[str] = None

async def get_sale_summary(db: AsyncSession, sale_id: int) -> Optional[SaleSummaryResponse]:
    """Synchronous cross-module read to fetch sale summary contract."""
    sale = await db.get(Sale, sale_id)
    if not sale or sale.is_deleted:
        return None
    return SaleSummaryResponse(
        sale_id=sale.sale_id,
        customer_id=sale.customer_id,
        chassis_no=sale.chassis_no,
        sale_date=sale.sale_date,
        total_amount=float(sale.total_amount),
        sale_status=sale.sale_status,
        sale_stage=sale.sale_stage,
        invoice_number=sale.invoice_number,
    )

async def verify_sale_exists(db: AsyncSession, sale_id: int) -> bool:
    """Synchronous cross-module read to verify if a sale exists and is active."""
    sale = await db.get(Sale, sale_id)
    return sale is not None and not sale.is_deleted
