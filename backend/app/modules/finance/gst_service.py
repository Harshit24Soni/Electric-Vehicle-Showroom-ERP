"""Authoritative GST Ledger & Reconciliation Service for ERP V2.

Handles:
- Input Tax Credit (ITC) recording on inward procurement purchases.
- Output GST liability recording on sales invoices.
- Atomic utilization of eligible ITC against output tax liability.
- Cash payments and credit reversals.
- Tax period management, status transitions, and reconciliation dashboard metrics.
"""

from datetime import date, datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
import logging
from typing import Any, Dict, Optional
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.finance.models import (
    ITCCreditRecord,
    OutputTaxRecord,
    GSTUtilizationEntry,
    GSTReconciliationPeriod,
    ITCEligibilityStatus,
    ITCClaimStatus,
    OutputTaxStatus,
    PeriodClosingStatus,
)

logger = logging.getLogger(__name__)


def _round_currency(val: Any) -> Decimal:
    if val is None:
        return Decimal("0.00")
    return Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _current_tax_period(d: Optional[date] = None) -> str:
    target = d or date.today()
    return target.strftime("%Y-%m")


async def record_purchase_itc(
    db: AsyncSession,
    purchase_id: Optional[int],
    invoice_number: str,
    invoice_date: date,
    taxable_value: float | Decimal,
    cgst_amount: float | Decimal = Decimal("0.00"),
    sgst_amount: float | Decimal = Decimal("0.00"),
    igst_amount: float | Decimal = Decimal("0.00"),
    vendor_id: Optional[int] = None,
    vendor_name: Optional[str] = None,
    vendor_gstin: Optional[str] = None,
    eligibility_status: str = ITCEligibilityStatus.ELIGIBLE.value,
    tax_period: Optional[str] = None,
    reconciliation_notes: Optional[str] = None,
) -> ITCCreditRecord:
    """Records purchase-side input GST as an ITC Credit Record separate from inventory cost."""
    d_taxable = _round_currency(taxable_value)
    d_cgst = _round_currency(cgst_amount)
    d_sgst = _round_currency(sgst_amount)
    d_igst = _round_currency(igst_amount)
    d_total_tax = d_cgst + d_sgst + d_igst
    d_total_invoice = d_taxable + d_total_tax
    period = tax_period or _current_tax_period(invoice_date)

    claim_status = (
        ITCClaimStatus.AVAILABLE.value
        if eligibility_status == ITCEligibilityStatus.ELIGIBLE.value
        else ITCClaimStatus.UNCLAIMED.value
    )

    itc_record = ITCCreditRecord(
        purchase_id=purchase_id,
        invoice_number=invoice_number.strip(),
        invoice_date=invoice_date,
        vendor_id=vendor_id,
        vendor_name=vendor_name,
        vendor_gstin=vendor_gstin,
        taxable_value=float(d_taxable),
        cgst_amount=float(d_cgst),
        sgst_amount=float(d_sgst),
        igst_amount=float(d_igst),
        total_tax=float(d_total_tax),
        total_invoice_value=float(d_total_invoice),
        eligibility_status=eligibility_status,
        claim_status=claim_status,
        claimed_amount=float(d_total_tax) if claim_status == ITCClaimStatus.AVAILABLE.value else 0.0,
        utilized_amount=0.00,
        reversal_amount=0.00,
        tax_period=period,
        is_reconciled=False,
        reconciliation_notes=reconciliation_notes,
    )

    db.add(itc_record)
    await db.flush()
    return itc_record


async def record_sale_output_tax(
    db: AsyncSession,
    sale_id: Optional[int],
    invoice_number: str,
    invoice_date: date,
    taxable_value: float | Decimal,
    cgst_amount: float | Decimal = Decimal("0.00"),
    sgst_amount: float | Decimal = Decimal("0.00"),
    igst_amount: float | Decimal = Decimal("0.00"),
    customer_name: Optional[str] = None,
    tax_period: Optional[str] = None,
) -> OutputTaxRecord:
    """Records output GST liability on sales invoices."""
    d_taxable = _round_currency(taxable_value)
    d_cgst = _round_currency(cgst_amount)
    d_sgst = _round_currency(sgst_amount)
    d_igst = _round_currency(igst_amount)
    d_total_tax = d_cgst + d_sgst + d_igst
    d_total_invoice = d_taxable + d_total_tax
    period = tax_period or _current_tax_period(invoice_date)

    out_record = OutputTaxRecord(
        sale_id=sale_id,
        invoice_number=invoice_number.strip(),
        invoice_date=invoice_date,
        customer_name=customer_name,
        taxable_value=float(d_taxable),
        cgst_amount=float(d_cgst),
        sgst_amount=float(d_sgst),
        igst_amount=float(d_igst),
        total_tax=float(d_total_tax),
        total_invoice_value=float(d_total_invoice),
        tax_period=period,
        status=OutputTaxStatus.PENDING.value,
        itc_utilized_amount=0.00,
        cash_paid_amount=0.00,
        is_reconciled=False,
    )

    db.add(out_record)
    await db.flush()
    return out_record


async def offset_tax_liability_with_itc(
    db: AsyncSession,
    output_tax_id: int,
    itc_id: Optional[int] = None,
    amount_to_offset: Optional[float | Decimal] = None,
    tax_component: str = "IGST",
    staff_id: Optional[int] = None,
    remarks: Optional[str] = None,
) -> GSTUtilizationEntry:
    """Atomically utilizes available eligible ITC to settle an output tax liability."""
    out_stmt = select(OutputTaxRecord).where(OutputTaxRecord.output_tax_id == output_tax_id).with_for_update()
    out_record = (await db.execute(out_stmt)).scalar_one_or_none()
    if not out_record:
        raise ValueError(f"Output tax record {output_tax_id} not found.")

    pending_output = _round_currency(out_record.total_tax) - _round_currency(out_record.itc_utilized_amount) - _round_currency(out_record.cash_paid_amount)
    if pending_output <= Decimal("0.00"):
        raise ValueError(f"Output tax record {output_tax_id} is already settled.")

    # Select candidate ITC record
    if itc_id:
        itc_stmt = select(ITCCreditRecord).where(ITCCreditRecord.itc_id == itc_id).with_for_update()
        itc_record = (await db.execute(itc_stmt)).scalar_one_or_none()
        if not itc_record:
            raise ValueError(f"ITC record {itc_id} not found.")
    else:
        # Pick earliest available eligible ITC record
        itc_stmt = (
            select(ITCCreditRecord)
            .where(
                ITCCreditRecord.eligibility_status == ITCEligibilityStatus.ELIGIBLE.value,
                ITCCreditRecord.claim_status.in_([ITCClaimStatus.AVAILABLE.value, ITCClaimStatus.UTILIZED.value]),
                ITCCreditRecord.is_deleted.is_(False),
                ITCCreditRecord.claimed_amount > ITCCreditRecord.utilized_amount,
            )
            .order_by(ITCCreditRecord.invoice_date.asc(), ITCCreditRecord.itc_id.asc())
            .with_for_update()
        )
        itc_record = (await db.execute(itc_stmt)).scalars().first()
        if not itc_record:
            raise ValueError("No available eligible ITC credit records found for offsetting.")

    available_itc = _round_currency(itc_record.claimed_amount) - _round_currency(itc_record.utilized_amount) - _round_currency(itc_record.reversal_amount)
    if available_itc <= Decimal("0.00"):
        raise ValueError(f"ITC record {itc_record.itc_id} has no remaining available credit balance.")

    # Determine amount to utilize
    if amount_to_offset is not None:
        target_amt = _round_currency(amount_to_offset)
        if target_amt > available_itc:
            raise ValueError(f"Requested offset amount INR {target_amt} exceeds available ITC INR {available_itc}.")
        if target_amt > pending_output:
            raise ValueError(f"Requested offset amount INR {target_amt} exceeds pending liability INR {pending_output}.")
        util_amount = target_amt
    else:
        util_amount = min(available_itc, pending_output)

    # Update ITC record
    itc_record.utilized_amount = float(_round_currency(itc_record.utilized_amount) + util_amount)
    if _round_currency(itc_record.utilized_amount) >= _round_currency(itc_record.claimed_amount):
        itc_record.claim_status = ITCClaimStatus.UTILIZED.value

    # Update Output tax record
    out_record.itc_utilized_amount = float(_round_currency(out_record.itc_utilized_amount) + util_amount)
    total_settled = _round_currency(out_record.itc_utilized_amount) + _round_currency(out_record.cash_paid_amount)
    if total_settled >= _round_currency(out_record.total_tax):
        out_record.status = OutputTaxStatus.OFFSET_BY_ITC.value
    else:
        out_record.status = OutputTaxStatus.PARTIALLY_SETTLED.value

    now_dt = datetime.now(timezone.utc).replace(tzinfo=None)
    entry = GSTUtilizationEntry(
        itc_id=itc_record.itc_id,
        output_tax_id=out_record.output_tax_id,
        amount_utilized=float(util_amount),
        tax_component=tax_component.upper(),
        tax_period=out_record.tax_period,
        utilization_date=now_dt,
        authorized_by_staff_id=staff_id,
        remarks=remarks or f"Offset Output Tax #{out_record.invoice_number} with ITC #{itc_record.invoice_number}",
    )
    db.add(entry)
    await db.flush()
    return entry


async def record_cash_tax_payment(
    db: AsyncSession,
    output_tax_id: int,
    amount: float | Decimal,
    payment_reference: Optional[str] = None,
    staff_id: Optional[int] = None,
) -> OutputTaxRecord:
    """Records a direct cash / bank payment towards an output tax liability."""
    stmt = select(OutputTaxRecord).where(OutputTaxRecord.output_tax_id == output_tax_id).with_for_update()
    out_record = (await db.execute(stmt)).scalar_one_or_none()
    if not out_record:
        raise ValueError(f"Output tax record {output_tax_id} not found.")

    d_amt = _round_currency(amount)
    out_record.cash_paid_amount = float(_round_currency(out_record.cash_paid_amount) + d_amt)
    total_settled = _round_currency(out_record.itc_utilized_amount) + _round_currency(out_record.cash_paid_amount)

    if total_settled >= _round_currency(out_record.total_tax):
        out_record.status = OutputTaxStatus.PAID_CASH.value
    else:
        out_record.status = OutputTaxStatus.PARTIALLY_SETTLED.value

    await db.flush()
    return out_record


async def get_gst_dashboard_summary(
    db: AsyncSession,
    tax_period: Optional[str] = None,
) -> Dict[str, Any]:
    """Computes a traceable, multi-dimensional GST reconciliation summary."""
    itc_filter = [ITCCreditRecord.is_deleted.is_(False)]
    out_filter = [OutputTaxRecord.is_deleted.is_(False)]

    if tax_period:
        itc_filter.append(ITCCreditRecord.tax_period == tax_period)
        out_filter.append(OutputTaxRecord.tax_period == tax_period)

    # 1. Total Input GST Recorded
    itc_stmt = select(
        func.coalesce(func.sum(ITCCreditRecord.total_tax), 0.0),
        func.coalesce(func.sum(ITCCreditRecord.claimed_amount), 0.0),
        func.coalesce(func.sum(ITCCreditRecord.utilized_amount), 0.0),
        func.coalesce(func.sum(ITCCreditRecord.reversal_amount), 0.0),
    ).where(and_(*itc_filter))
    itc_row = (await db.execute(itc_stmt)).one()
    tot_input_tax = Decimal(str(itc_row[0]))
    tot_utilized = Decimal(str(itc_row[2]))
    tot_reversed = Decimal(str(itc_row[3]))

    # Eligible ITC
    elig_stmt = select(func.coalesce(func.sum(ITCCreditRecord.total_tax), 0.0)).where(
        and_(*itc_filter, ITCCreditRecord.eligibility_status == ITCEligibilityStatus.ELIGIBLE.value)
    )
    eligible_itc = Decimal(str((await db.execute(elig_stmt)).scalar() or 0.0))

    # Ineligible / blocked ITC
    inelig_stmt = select(func.coalesce(func.sum(ITCCreditRecord.total_tax), 0.0)).where(
        and_(
            *itc_filter,
            ITCCreditRecord.eligibility_status.in_(
                [ITCEligibilityStatus.INELIGIBLE.value, ITCEligibilityStatus.BLOCKED.value]
            ),
        )
    )
    ineligible_itc = Decimal(str((await db.execute(inelig_stmt)).scalar() or 0.0))

    # Pending verification
    pending_stmt = select(func.coalesce(func.sum(ITCCreditRecord.total_tax), 0.0)).where(
        and_(*itc_filter, ITCCreditRecord.eligibility_status == ITCEligibilityStatus.PENDING_VERIFICATION.value)
    )
    pending_itc = Decimal(str((await db.execute(pending_stmt)).scalar() or 0.0))

    # Available ITC for utilization
    available_itc = max(Decimal("0.00"), eligible_itc - tot_utilized - tot_reversed)

    # 2. Output GST Liabilities
    out_stmt = select(
        func.coalesce(func.sum(OutputTaxRecord.total_tax), 0.0),
        func.coalesce(func.sum(OutputTaxRecord.itc_utilized_amount), 0.0),
        func.coalesce(func.sum(OutputTaxRecord.cash_paid_amount), 0.0),
    ).where(and_(*out_filter))
    out_row = (await db.execute(out_stmt)).one()
    tot_output_tax = Decimal(str(out_row[0]))
    out_itc_utilized = Decimal(str(out_row[1]))
    out_cash_paid = Decimal(str(out_row[2]))

    # Remaining liability payable
    remaining_output_liability = max(Decimal("0.00"), tot_output_tax - out_itc_utilized - out_cash_paid)

    # Estimated net GST payable in cash if available ITC is utilized
    estimated_net_payable = max(Decimal("0.00"), remaining_output_liability - available_itc)
    estimated_itc_carry_forward = max(Decimal("0.00"), available_itc - remaining_output_liability)

    return {
        "tax_period": tax_period or "ALL",
        "total_input_gst_recorded": float(tot_input_tax),
        "eligible_itc": float(eligible_itc),
        "ineligible_or_blocked_itc": float(ineligible_itc),
        "itc_pending_verification": float(pending_itc),
        "available_eligible_itc": float(available_itc),
        "total_output_gst_liability": float(tot_output_tax),
        "itc_utilized_against_liability": float(tot_utilized),
        "tax_paid_in_cash": float(out_cash_paid),
        "credit_reversals_adjustments": float(tot_reversed),
        "remaining_output_liability": float(remaining_output_liability),
        "estimated_net_gst_payable_cash": float(estimated_net_payable),
        "estimated_itc_carry_forward": float(estimated_itc_carry_forward),
    }


async def close_reconciliation_period(
    db: AsyncSession,
    period_code: str,
    staff_id: Optional[int] = None,
) -> GSTReconciliationPeriod:
    """Closes and seals a tax reconciliation period."""
    summary = await get_gst_dashboard_summary(db, tax_period=period_code)

    stmt = select(GSTReconciliationPeriod).where(GSTReconciliationPeriod.period_code == period_code)
    period_rec = (await db.execute(stmt)).scalar_one_or_none()

    now_dt = datetime.now(timezone.utc).replace(tzinfo=None)
    if not period_rec:
        period_rec = GSTReconciliationPeriod(
            period_code=period_code,
            start_date=date.fromisoformat(f"{period_code}-01"),
            end_date=date.fromisoformat(f"{period_code}-28"),
            status=PeriodClosingStatus.CLOSED.value,
            total_input_itc_recorded=summary["total_input_gst_recorded"],
            total_eligible_itc=summary["eligible_itc"],
            total_ineligible_itc=summary["ineligible_or_blocked_itc"],
            total_output_tax=summary["total_output_gst_liability"],
            total_itc_utilized=summary["itc_utilized_against_liability"],
            total_cash_paid=summary["tax_paid_in_cash"],
            itc_carried_forward=summary["estimated_itc_carry_forward"],
            closed_at=now_dt,
            closed_by_staff_id=staff_id,
        )
        db.add(period_rec)
    else:
        period_rec.status = PeriodClosingStatus.CLOSED.value
        period_rec.total_input_itc_recorded = summary["total_input_gst_recorded"]
        period_rec.total_eligible_itc = summary["eligible_itc"]
        period_rec.total_ineligible_itc = summary["ineligible_or_blocked_itc"]
        period_rec.total_output_tax = summary["total_output_gst_liability"]
        period_rec.total_itc_utilized = summary["itc_utilized_against_liability"]
        period_rec.total_cash_paid = summary["tax_paid_in_cash"]
        period_rec.itc_carried_forward = summary["estimated_itc_carry_forward"]
        period_rec.closed_at = now_dt
        period_rec.closed_by_staff_id = staff_id

    await db.flush()
    return period_rec
