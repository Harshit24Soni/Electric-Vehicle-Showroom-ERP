"""Authoritative Supplier & Customer Discount Engine for ERP V2.

Handles:
- Line-level and invoice/basket-level discounts (percentage, fixed amount, quantity slab, threshold basket).
- Explicit threshold calculation (pre-tax vs. GST-inclusive).
- Stacking and exclusivity rules (STACKABLE, EXCLUSIVE, PRIORITY).
- Statutory tax treatment: discounts granted at/before invoice reduce taxable value before GST computation.
- Profit protection guardrails ensuring customer discounts do not breach dealership profit limits.
"""

from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
import logging
from typing import Any, Dict, List, Optional
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.inventory.models import (
    DiscountRule,
    DiscountType,
    DiscountStackingMode,
    SpareMaster,
)
from app.modules.inventory.profitability_service import calculate_profitability, ProfitabilityValidationError

logger = logging.getLogger(__name__)


def _round_currency(val: Any) -> Decimal:
    if val is None:
        return Decimal("0.00")
    return Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_discounted_line(
    original_price: float | Decimal,
    quantity: int = 1,
    discount_type: str = "PERCENTAGE",
    discount_value: float | Decimal = Decimal("0.00"),
    gst_rate: float | Decimal = Decimal("18.00"),
    is_inclusive_of_gst: bool = True,
) -> Dict[str, Any]:
    """Helper to calculate discounted line figures for GST and customer pricing."""
    orig = _round_currency(original_price)
    qty = max(1, int(quantity))
    disc_val = _round_currency(discount_value)
    rate = Decimal(str(gst_rate))

    if discount_type == "PERCENTAGE":
        discount_amount_per_unit = (orig * (disc_val / Decimal("100.00"))).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
    else:
        discount_amount_per_unit = min(orig, disc_val)

    final_customer_unit = max(Decimal("0.00"), orig - discount_amount_per_unit)
    total_customer_amount = (final_customer_unit * qty).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    tax_factor = Decimal("1.00") + (rate / Decimal("100.00"))
    taxable_unit = (final_customer_unit / tax_factor).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    taxable_amount = (taxable_unit * qty).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    gst_amount = total_customer_amount - taxable_amount

    return {
        "original_price": float(orig),
        "discount_amount_per_unit": float(discount_amount_per_unit),
        "final_customer_unit": float(final_customer_unit),
        "final_customer_amount": float(total_customer_amount),
        "taxable_amount": float(taxable_amount),
        "gst_amount": float(gst_amount),
    }


async def evaluate_applicable_discounts(
    db: AsyncSession,
    target_type: str,  # 'SUPPLIER' or 'CUSTOMER'
    lines: List[Dict[str, Any]],
    entity_id: Optional[int] = None,  # vendor_id or customer_id
) -> List[Dict[str, Any]]:
    """Evaluates and allocates applicable discount rules across invoice lines.

    Each line dict is expected to contain:
      - spare_id: int
      - unit_price: float | Decimal
      - quantity: int
      - gst_rate: float | Decimal (default 18.0)
      - vehicle_model_id: Optional[int]

    Returns processed lines with:
      - line_gross_amount
      - allocated_discount
      - taxable_value (after deductible discount)
      - gst_amount
      - line_total
      - applied_rule_ids
    """
    now_dt = datetime.now(timezone.utc).replace(tzinfo=None)

    # 1. Fetch active rules
    stmt = (
        select(DiscountRule)
        .where(
            DiscountRule.target_type == target_type,
            DiscountRule.is_active.is_(True),
            DiscountRule.is_deleted.is_(False),
            or_(DiscountRule.start_date.is_(None), DiscountRule.start_date <= now_dt),
            or_(DiscountRule.expiry_date.is_(None), DiscountRule.expiry_date >= now_dt),
        )
        .order_by(DiscountRule.priority.desc(), DiscountRule.rule_id.asc())
    )
    rules = (await db.execute(stmt)).scalars().all()

    # Pre-calculate basket totals
    total_pre_tax_basket = Decimal("0.00")
    total_qty_basket = 0
    for line in lines:
        u_price = _round_currency(line.get("unit_price", 0.0))
        qty = max(1, int(line.get("quantity", 1)))
        total_pre_tax_basket += u_price * qty
        total_qty_basket += qty

    # Check for exclusive rules first
    exclusive_rule = next((r for r in rules if r.stacking_mode == DiscountStackingMode.EXCLUSIVE.value), None)

    results = []
    for line in lines:
        spare_id = line["spare_id"]
        unit_price = _round_currency(line.get("unit_price", 0.0))
        qty = max(1, int(line.get("quantity", 1)))
        gst_rate = Decimal(str(line.get("gst_rate", 18.0)))
        model_id = line.get("vehicle_model_id")

        line_gross = (unit_price * qty).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        line_discount = Decimal("0.00")
        applied_rules = []

        applicable_rules = [exclusive_rule] if exclusive_rule else rules

        for rule in applicable_rules:
            if not rule:
                continue

            # Check entity targeting
            if rule.applicable_entity_id and rule.applicable_entity_id != entity_id:
                continue

            # Check product targeting
            if rule.spare_id and rule.spare_id != spare_id:
                continue
            if rule.vehicle_model_id and rule.vehicle_model_id != model_id:
                continue

            # Check quantity condition
            if rule.min_quantity > 0 and qty < rule.min_quantity:
                continue

            # Check basket threshold condition
            if rule.min_basket_value > Decimal("0.00"):
                thresh = Decimal(str(rule.min_basket_value))
                if total_pre_tax_basket < thresh:
                    continue

            # Calculate rule discount
            rule_val = Decimal(str(rule.discount_value))
            disc_amt = Decimal("0.00")

            if rule.discount_type == DiscountType.PERCENTAGE.value:
                disc_amt = (line_gross * (rule_val / Decimal("100.00"))).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP
                )
            elif rule.discount_type == DiscountType.FIXED_AMOUNT.value:
                disc_amt = min(line_gross, (rule_val * qty).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
            elif rule.discount_type == DiscountType.QUANTITY_SLAB.value:
                disc_amt = (line_gross * (rule_val / Decimal("100.00"))).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP
                )
            elif rule.discount_type == DiscountType.THRESHOLD_BASKET.value:
                # Proportionally allocate basket percentage to line
                disc_amt = (line_gross * (rule_val / Decimal("100.00"))).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP
                )

            # Cap at max discount if configured
            if rule.max_discount_amount:
                max_amt = Decimal(str(rule.max_discount_amount))
                disc_amt = min(disc_amt, max_amt)

            line_discount += disc_amt
            applied_rules.append(rule.rule_id)

            if rule.stacking_mode == DiscountStackingMode.EXCLUSIVE.value:
                break

        # Ensure discount does not exceed gross amount
        line_discount = min(line_gross, line_discount)

        # In GST, discount given at or before invoice reduces taxable value
        taxable_value = line_gross - line_discount
        tax_amt = (taxable_value * (gst_rate / Decimal("100.00"))).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        line_total = taxable_value + tax_amt

        results.append(
            {
                "spare_id": spare_id,
                "quantity": qty,
                "unit_price": float(unit_price),
                "line_gross_amount": float(line_gross),
                "allocated_discount": float(line_discount),
                "effective_unit_discount": float((line_discount / qty).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
                "taxable_value": float(taxable_value),
                "gst_rate": float(gst_rate),
                "gst_amount": float(tax_amt),
                "line_total": float(line_total),
                "applied_rule_ids": applied_rules,
            }
        )

    return results


async def validate_discounted_customer_sale(
    db: AsyncSession,
    spare_id: int,
    unit_selling_price: float | Decimal,
    quantity: int,
    unit_discount: float | Decimal,
    customer_id: Optional[int] = None,
    exception_id: Optional[int] = None,
    staff_id: Optional[int] = None,
) -> Dict[str, Any]:
    """Validates that a discounted sale does not produce an unauthorized loss."""
    stmt = select(SpareMaster).where(SpareMaster.spare_id == spare_id)
    spare = (await db.execute(stmt)).scalar_one_or_none()
    if not spare:
        raise ValueError(f"Spare part ID {spare_id} not found.")

    wac = _round_currency(spare.accounting_wac or spare.base_cost or 0.0)
    gst_rate = Decimal(str(spare.gst_rate or 18.0))

    # Evaluate profitability
    profit_data = calculate_profitability(
        unit_selling_price=unit_selling_price,
        wac_cost=wac,
        quantity=quantity,
        gst_rate=gst_rate,
        unit_discount=unit_discount,
    )

    if profit_data["is_loss"] and not exception_id:
        raise ProfitabilityValidationError(
            f"Discount of INR {unit_discount} per unit reduces margin to {profit_data['gross_margin_percent']}% "
            f"(Loss: INR {abs(profit_data['expected_gross_profit'])}). Sale blocked by profit protection policy.",
            details=profit_data,
        )

    return profit_data
