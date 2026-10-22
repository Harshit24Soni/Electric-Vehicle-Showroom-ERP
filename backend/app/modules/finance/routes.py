from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.finance import services
from app.modules.finance import schemas
from app.db.session import get_db
from app.auth.dependencies import get_current_staff

router = APIRouter(
    prefix="/finance",
    tags=["Finance"],
    dependencies=[Depends(get_current_staff)],
)


@router.post("/", response_model=schemas.FinanceResponse, status_code=status.HTTP_201_CREATED)
async def create_finance_api(
    data: schemas.FinanceCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    try:
        finance = await services.create_finance(
            db=db,
            sale_id=data.sale_id,
            financer_name=data.financer_name,
            financer_contact=data.financer_contact,
            loan_amount=data.loan_amount,
            down_payment=data.down_payment,
            remarks=data.remarks,
        )
        return finance
    except services.FinanceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/", response_model=list[schemas.FinanceResponse])
async def list_finances(
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    """List all finance records"""
    return await services.list_finances(db)


@router.put("/{finance_id}/status", status_code=status.HTTP_200_OK)
async def update_finance_status_api(
    finance_id: int,
    data: schemas.FinanceStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    finance = await services.get_finance(db, finance_id)
    if not finance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finance record not found")

    await services.update_finance_status(
        db=db,
        finance=finance,
        finance_status=data.finance_status,
        reference_number=data.reference_number,
        remarks=data.remarks,
    )

    return {"message": "Finance status updated"}


@router.delete("/{finance_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_finance(
    finance_id: int,
    hard_delete: bool = Query(False, description="Permanently delete (Admin/Dealer only)"),
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff),
):
    """Delete a finance record (soft delete by default)"""
    success = await services.delete_finance(db, finance_id, current_staff, hard_delete)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finance record not found")
    return None


# ==============================================================================
# GST LEDGER & RECONCILIATION ENDPOINTS
# ==============================================================================


@router.get("/gst/dashboard")
@router.get("/gst/summary")
async def get_gst_summary_api(
    tax_period: Optional[str] = Query(None, description="Tax period filter, e.g. 2026-10"),
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    """Retrieve full GST reconciliation dashboard summary."""
    from app.modules.finance import gst_service

    return await gst_service.get_gst_dashboard_summary(db, tax_period=tax_period)


@router.get("/gst/itc-records")
async def list_itc_records_api(
    tax_period: Optional[str] = Query(None),
    eligibility: Optional[str] = Query(None),
    claim_status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    """List purchase-side Input Tax Credit (ITC) records."""
    from sqlalchemy import select
    from app.modules.finance.models import ITCCreditRecord

    stmt = select(ITCCreditRecord).where(ITCCreditRecord.is_deleted.is_(False))
    if tax_period:
        stmt = stmt.where(ITCCreditRecord.tax_period == tax_period)
    if eligibility:
        stmt = stmt.where(ITCCreditRecord.eligibility_status == eligibility)
    if claim_status:
        stmt = stmt.where(ITCCreditRecord.claim_status == claim_status)
    stmt = stmt.order_by(ITCCreditRecord.invoice_date.desc(), ITCCreditRecord.itc_id.desc())

    records = (await db.execute(stmt)).scalars().all()
    return records


@router.get("/gst/output-records")
async def list_output_tax_records_api(
    tax_period: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    """List sales-side Output GST liability records."""
    from sqlalchemy import select
    from app.modules.finance.models import OutputTaxRecord

    stmt = select(OutputTaxRecord).where(OutputTaxRecord.is_deleted.is_(False))
    if tax_period:
        stmt = stmt.where(OutputTaxRecord.tax_period == tax_period)
    if status_filter:
        stmt = stmt.where(OutputTaxRecord.status == status_filter)
    stmt = stmt.order_by(OutputTaxRecord.invoice_date.desc(), OutputTaxRecord.output_tax_id.desc())

    records = (await db.execute(stmt)).scalars().all()
    return records


@router.post("/gst/offset")
async def offset_tax_with_itc_api(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff),
):
    """Offset output tax liability with available eligible ITC."""
    from app.modules.finance import gst_service

    output_tax_id = payload.get("output_tax_id")
    itc_id = payload.get("itc_id")
    amount = payload.get("amount")
    tax_component = payload.get("tax_component", "IGST")
    remarks = payload.get("remarks")

    if not output_tax_id:
        raise HTTPException(status_code=400, detail="output_tax_id is required")

    staff_id = (
        current_staff.get("staff_id") if isinstance(current_staff, dict) else getattr(current_staff, "staff_id", None)
    )

    try:
        entry = await gst_service.offset_tax_liability_with_itc(
            db=db,
            output_tax_id=output_tax_id,
            itc_id=itc_id,
            amount_to_offset=amount,
            tax_component=tax_component,
            staff_id=staff_id,
            remarks=remarks,
        )
        await db.commit()
        return {"message": "ITC offset successful", "utilization_id": entry.utilization_id}
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/gst/pay-cash")
async def pay_tax_cash_api(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff),
):
    """Record cash / bank payment towards output tax liability."""
    from app.modules.finance import gst_service

    output_tax_id = payload.get("output_tax_id")
    amount = payload.get("amount")
    payment_ref = payload.get("payment_reference")

    if not output_tax_id or not amount:
        raise HTTPException(status_code=400, detail="output_tax_id and amount are required")

    staff_id = (
        current_staff.get("staff_id") if isinstance(current_staff, dict) else getattr(current_staff, "staff_id", None)
    )

    try:
        rec = await gst_service.record_cash_tax_payment(
            db=db,
            output_tax_id=output_tax_id,
            amount=amount,
            payment_reference=payment_ref,
            staff_id=staff_id,
        )
        await db.commit()
        return {"message": "Cash tax payment recorded", "output_tax_id": rec.output_tax_id, "status": rec.status}
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/gst/close-period")
async def close_tax_period_api(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff),
):
    """Close and seal a tax reconciliation period."""
    from app.modules.finance import gst_service

    period_code = payload.get("period_code")
    if not period_code:
        raise HTTPException(status_code=400, detail="period_code is required (e.g. '2026-10')")

    staff_id = (
        current_staff.get("staff_id") if isinstance(current_staff, dict) else getattr(current_staff, "staff_id", None)
    )

    period = await gst_service.close_reconciliation_period(db=db, period_code=period_code, staff_id=staff_id)
    await db.commit()
    return {"message": "Period closed", "period_code": period.period_code, "status": period.status}
