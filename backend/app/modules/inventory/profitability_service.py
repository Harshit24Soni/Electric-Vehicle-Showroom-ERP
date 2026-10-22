"""Authoritative Pricing, Profitability & Risk Evaluation Service for ERP V2.

Consolidates all margin, profit protection, and alert generation logic.
Guarantees:
- Net revenue excludes output GST.
- COGS uses actual perpetual WAC.
- MRP is treated as the legal/retail price ceiling.
- Loss-making sales are blocked by default unless authorized via an auditable LossSaleException.
- Price & cost changes are immutably logged into PriceChangeAuditEvent.
"""

from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
import logging
from typing import Any, Dict, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.inventory.models import (
    SpareMaster,
    SpareCostHistory,
    PricingAlert,
    LossSaleException,
    PriceChangeAuditEvent,
    AlertSeverity,
    AlertStatus,
)

logger = logging.getLogger(__name__)

# Configurable policy thresholds
MINIMUM_ACCEPTABLE_MARGIN_PERCENT = Decimal("5.00")
WAC_SURGE_THRESHOLD_PERCENT = Decimal("15.00")


class ProfitabilityValidationError(Exception):
    """Raised when a proposed transaction violates dealership profit or MRP policy."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.details = details or {}


def _round_currency(val: Any) -> Decimal:
    if val is None:
        return Decimal("0.00")
    return Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_profitability(
    unit_selling_price: float | Decimal,
    wac_cost: float | Decimal,
    quantity: int = 1,
    gst_rate: float | Decimal = Decimal("18.00"),
    unit_discount: float | Decimal = Decimal("0.00"),
) -> Dict[str, Any]:
    """Calculates canonical transaction profitability.

    Formulas:
      gross_customer_price = unit_selling_price - unit_discount
      taxable_revenue_per_unit = gross_customer_price / (1 + gst_rate / 100)
      output_gst_per_unit = gross_customer_price - taxable_revenue_per_unit
      net_sales_revenue = taxable_revenue_per_unit * quantity
      cogs = wac_cost * quantity
      expected_gross_profit = net_sales_revenue - cogs
      gross_margin_percent = (expected_gross_profit / net_sales_revenue) * 100
    """
    d_price = _round_currency(unit_selling_price)
    d_disc = _round_currency(unit_discount)
    d_wac = _round_currency(wac_cost)
    d_gst = Decimal(str(gst_rate)) if gst_rate is not None else Decimal("18.00")
    qty = max(1, int(quantity))

    effective_unit_price = max(Decimal("0.00"), d_price - d_disc)

    # Taxable revenue excluding output GST
    tax_factor = Decimal("1.00") + (d_gst / Decimal("100.00"))
    taxable_unit_rev = (effective_unit_price / tax_factor).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    output_gst_unit = effective_unit_price - taxable_unit_rev

    net_sales_rev = (taxable_unit_rev * qty).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    cogs = (d_wac * qty).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    gross_profit = net_sales_rev - cogs

    if net_sales_rev > Decimal("0.00"):
        margin_pct = ((gross_profit / net_sales_rev) * Decimal("100.00")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
    else:
        margin_pct = Decimal("-100.00") if cogs > Decimal("0.00") else Decimal("0.00")

    return {
        "unit_selling_price": float(d_price),
        "unit_discount": float(d_disc),
        "effective_unit_price": float(effective_unit_price),
        "taxable_unit_revenue": float(taxable_unit_rev),
        "output_gst_per_unit": float(output_gst_unit),
        "total_customer_price": float(effective_unit_price * qty),
        "net_sales_revenue": float(net_sales_rev),
        "cogs": float(cogs),
        "expected_gross_profit": float(gross_profit),
        "gross_margin_percent": float(margin_pct),
        "is_loss": gross_profit < Decimal("0.00"),
        "is_low_margin": (
            gross_profit >= Decimal("0.00") and margin_pct < MINIMUM_ACCEPTABLE_MARGIN_PERCENT
        ),
    }


async def evaluate_part_pricing_risk(
    db: AsyncSession,
    spare_id: int,
) -> Optional[PricingAlert]:
    """Evaluates an active spare part against pricing risks and updates alerts."""
    stmt = select(SpareMaster).where(SpareMaster.spare_id == spare_id)
    spare = (await db.execute(stmt)).scalar_one_or_none()
    if not spare:
        return None

    wac = _round_currency(spare.accounting_wac or spare.base_cost or 0.0)
    mrp = _round_currency(spare.manufacturer_mrp or spare.base_mrp or 0.0)
    gst_rate = Decimal(str(spare.gst_rate or 18.0))
    part_code = spare.part_number or str(spare.spare_id)

    # 1. Missing or invalid price data
    if mrp <= Decimal("0.00") or wac <= Decimal("0.00"):
        return await _create_or_update_alert(
            db=db,
            spare_id=spare_id,
            part_code=part_code,
            alert_type="MISSING_PRICE_DATA",
            severity=AlertSeverity.CRITICAL.value if wac > 0 and mrp <= 0 else AlertSeverity.WARNING.value,
            current_wac=wac,
            current_mrp=mrp,
            margin_percent=None,
            message=f"Spare {part_code} is missing critical pricing data (WAC: {wac}, MRP: {mrp}).",
            calculation_details={"wac": float(wac), "mrp": float(mrp)},
        )

    # Calculate profitability at legal revised MRP
    profit_data = calculate_profitability(
        unit_selling_price=mrp,
        wac_cost=wac,
        quantity=1,
        gst_rate=gst_rate,
    )
    expected_profit = Decimal(str(profit_data["expected_gross_profit"]))
    margin_pct = Decimal(str(profit_data["gross_margin_percent"]))

    # 2. Negative profit at retail MRP
    if expected_profit < Decimal("0.00"):
        return await _create_or_update_alert(
            db=db,
            spare_id=spare_id,
            part_code=part_code,
            alert_type="NEGATIVE_PROFIT",
            severity=AlertSeverity.CRITICAL.value,
            current_wac=wac,
            current_mrp=mrp,
            margin_percent=margin_pct,
            message=(
                f"CRITICAL: Part {part_code} sells at a loss of INR {abs(expected_profit)} at MRP INR {mrp} "
                f"(COGS: INR {wac}, Net Rev: INR {profit_data['net_sales_revenue']})."
            ),
            calculation_details=profit_data,
        )

    # 3. Low margin below configured threshold
    if margin_pct < MINIMUM_ACCEPTABLE_MARGIN_PERCENT:
        return await _create_or_update_alert(
            db=db,
            spare_id=spare_id,
            part_code=part_code,
            alert_type="LOW_MARGIN",
            severity=AlertSeverity.HIGH.value,
            current_wac=wac,
            current_mrp=mrp,
            margin_percent=margin_pct,
            message=(
                f"HIGH: Part {part_code} margin is {margin_pct}%, below the required minimum "
                f"of {MINIMUM_ACCEPTABLE_MARGIN_PERCENT}% at MRP INR {mrp}."
            ),
            calculation_details=profit_data,
        )

    # 4. Check for WAC Surge from prior cost history
    hist_stmt = (
        select(SpareCostHistory)
        .where(
            SpareCostHistory.spare_id == spare_id,
            SpareCostHistory.is_deleted.is_(False),
            SpareCostHistory.wac_cost.isnot(None),
        )
        .order_by(SpareCostHistory.effective_date.desc(), SpareCostHistory.cost_id.desc())
        .limit(2)
    )
    cost_records = (await db.execute(hist_stmt)).scalars().all()
    if len(cost_records) >= 2 and cost_records[1].wac_cost and float(cost_records[1].wac_cost) > 0:
        prev_wac = _round_currency(cost_records[1].wac_cost)
        if prev_wac > Decimal("0.00"):
            jump_pct = (((wac - prev_wac) / prev_wac) * Decimal("100.00")).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            if jump_pct >= WAC_SURGE_THRESHOLD_PERCENT:
                return await _create_or_update_alert(
                    db=db,
                    spare_id=spare_id,
                    part_code=part_code,
                    alert_type="WAC_SURGE",
                    severity=AlertSeverity.WARNING.value,
                    current_wac=wac,
                    current_mrp=mrp,
                    margin_percent=margin_pct,
                    message=(
                        f"WARNING: WAC for part {part_code} jumped by {jump_pct}% from INR {prev_wac} to INR {wac}."
                    ),
                    calculation_details={
                        "prior_wac": float(prev_wac),
                        "current_wac": float(wac),
                        "increase_percent": float(jump_pct),
                    },
                )

    # If no risk conditions apply, resolve any existing open alerts for this part
    await _resolve_open_alerts(db, spare_id, "Risk condition no longer present; part is compliant.")
    return None


async def _create_or_update_alert(
    db: AsyncSession,
    spare_id: int,
    part_code: str,
    alert_type: str,
    severity: str,
    current_wac: Decimal,
    current_mrp: Decimal,
    margin_percent: Optional[Decimal],
    message: str,
    calculation_details: Dict[str, Any],
) -> PricingAlert:
    """Creates a new alert or updates/reopens an existing alert with deduplication."""
    fingerprint = f"{spare_id}:{alert_type}"

    stmt = select(PricingAlert).where(PricingAlert.risk_fingerprint == fingerprint)
    existing = (await db.execute(stmt)).scalar_one_or_none()

    now_dt = datetime.now(timezone.utc).replace(tzinfo=None)
    if existing:
        existing.part_code = part_code
        existing.severity = severity
        existing.current_wac = float(current_wac)
        existing.current_mrp = float(current_mrp)
        existing.expected_margin_percent = float(margin_percent) if margin_percent is not None else None
        existing.message = message
        existing.calculation_details = calculation_details
        if existing.status == AlertStatus.RESOLVED.value:
            # Reopen if the risk returned
            existing.status = AlertStatus.OPEN.value
            existing.resolved_at = None
            existing.resolved_by = None
            existing.resolution_reason = None
        existing.updated_at = now_dt
        await db.flush()
        return existing

    new_alert = PricingAlert(
        spare_id=spare_id,
        part_code=part_code,
        alert_type=alert_type,
        severity=severity,
        current_wac=float(current_wac),
        current_mrp=float(current_mrp),
        expected_margin_percent=float(margin_percent) if margin_percent is not None else None,
        message=message,
        calculation_details=calculation_details,
        status=AlertStatus.OPEN.value,
        risk_fingerprint=fingerprint,
        created_at=now_dt,
        updated_at=now_dt,
    )
    db.add(new_alert)
    await db.flush()
    return new_alert


async def _resolve_open_alerts(db: AsyncSession, spare_id: int, reason: str):
    now_dt = datetime.now(timezone.utc).replace(tzinfo=None)
    stmt = select(PricingAlert).where(
        PricingAlert.spare_id == spare_id,
        PricingAlert.status.in_([AlertStatus.OPEN.value, AlertStatus.ACKNOWLEDGED.value, AlertStatus.ESCALATED.value]),
    )
    open_alerts = (await db.execute(stmt)).scalars().all()
    for al in open_alerts:
        al.status = AlertStatus.RESOLVED.value
        al.resolved_at = now_dt
        al.resolution_reason = reason
        al.updated_at = now_dt
    if open_alerts:
        await db.flush()


async def validate_sale_profitability(
    db: AsyncSession,
    spare_id: int,
    proposed_unit_price: float | Decimal,
    quantity: int = 1,
    unit_discount: float | Decimal = Decimal("0.00"),
    gst_rate: Optional[float | Decimal] = None,
    exception_id: Optional[int] = None,
    requesting_staff_id: Optional[int] = None,
) -> Dict[str, Any]:
    """Validates proposed sale against legal MRP ceiling and dealership profit protection."""
    stmt = select(SpareMaster).where(SpareMaster.spare_id == spare_id)
    spare = (await db.execute(stmt)).scalar_one_or_none()
    if not spare:
        raise ProfitabilityValidationError(f"Spare part ID {spare_id} not found.")

    wac = _round_currency(spare.accounting_wac or spare.base_cost or 0.0)
    mrp = _round_currency(spare.manufacturer_mrp or spare.base_mrp or 0.0)
    rate = Decimal(str(gst_rate if gst_rate is not None else (spare.gst_rate or 18.0)))
    part_code = spare.part_number or str(spare_id)

    d_price = _round_currency(proposed_unit_price)
    d_disc = _round_currency(unit_discount)

    # 1. Enforce MRP ceiling: proposed price cannot exceed valid revised MRP
    if mrp > Decimal("0.00") and d_price > mrp:
        raise ProfitabilityValidationError(
            f"Proposed selling price INR {d_price} exceeds legal revised manufacturer MRP INR {mrp} "
            f"for part {part_code}.",
            details={"spare_id": spare_id, "part_code": part_code, "proposed_price": float(d_price), "mrp": float(mrp)},
        )

    # 2. Compute proposed transaction profitability
    profit_data = calculate_profitability(
        unit_selling_price=d_price,
        wac_cost=wac,
        quantity=quantity,
        gst_rate=rate,
        unit_discount=d_disc,
    )

    # 3. Loss-making guardrail
    if profit_data["is_loss"]:
        if not exception_id:
            raise ProfitabilityValidationError(
                f"Negative profit sale blocked by profit protection policy. Part {part_code} produces an expected "
                f"loss of INR {abs(profit_data['expected_gross_profit'])} (Margin: {profit_data['gross_margin_percent']}%). "
                f"An authorized Loss Exception is required to proceed.",
                details=profit_data,
            )

        # Validate provided exception
        exc_stmt = select(LossSaleException).where(LossSaleException.exception_id == exception_id)
        loss_exc = (await db.execute(exc_stmt)).scalar_one_or_none()
        if not loss_exc:
            raise ProfitabilityValidationError(f"Loss exception ID {exception_id} is invalid or was not found.")

        # Disallow self-authorization
        if requesting_staff_id and loss_exc.authorized_by_staff_id == requesting_staff_id:
            raise ProfitabilityValidationError("Users cannot authorize their own loss-making transaction exception.")

    return profit_data


async def record_price_change_audit(
    db: AsyncSession,
    spare_id: int,
    part_code: str,
    change_type: str,
    old_value: Optional[float | Decimal],
    new_value: Optional[float | Decimal],
    source_document: Optional[str] = None,
    reason: Optional[str] = None,
    actor_staff_id: Optional[int] = None,
    actor_name: Optional[str] = None,
    profit_impact_margin: Optional[float | Decimal] = None,
) -> PriceChangeAuditEvent:
    """Records an immutable timestamped audit trail event for any price, cost, or policy change."""
    d_old = _round_currency(old_value) if old_value is not None else None
    d_new = _round_currency(new_value) if new_value is not None else None
    diff_amt = None
    diff_pct = None

    if d_old is not None and d_new is not None:
        diff_amt = d_new - d_old
        if d_old > Decimal("0.00"):
            diff_pct = ((diff_amt / d_old) * Decimal("100.00")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    now_dt = datetime.now(timezone.utc).replace(tzinfo=None)

    audit_event = PriceChangeAuditEvent(
        spare_id=spare_id,
        part_code=part_code,
        change_type=change_type,
        old_value=float(d_old) if d_old is not None else None,
        new_value=float(d_new) if d_new is not None else None,
        difference_amount=float(diff_amt) if diff_amt is not None else None,
        difference_percent=float(diff_pct) if diff_pct is not None else None,
        source_document=source_document,
        reason=reason,
        actor_staff_id=actor_staff_id,
        actor_name=actor_name,
        effective_timestamp=now_dt,
        recorded_timestamp=now_dt,
        profit_impact_margin=float(profit_impact_margin) if profit_impact_margin is not None else None,
        created_at=now_dt,
        updated_at=now_dt,
    )
    db.add(audit_event)
    await db.flush()
    return audit_event
