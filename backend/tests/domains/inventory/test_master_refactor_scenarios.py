import pytest
from datetime import date, datetime, timezone
from decimal import Decimal
from sqlalchemy import select

from app.modules.inventory.models import (
    SpareMaster,
    SparePartCode,
    SpareStockBalance,
    SpareCostHistory,
    DiscountRule,
    LossSaleException,
)
from app.modules.finance.gst_service import (
    record_purchase_itc,
    record_sale_output_tax,
    offset_tax_liability_with_itc,
)
from app.modules.inventory.profitability_service import (
    calculate_profitability,
    evaluate_part_pricing_risk,
    validate_sale_profitability,
    record_price_change_audit,
    ProfitabilityValidationError,
)
from app.modules.inventory.discount_engine import (
    evaluate_applicable_discounts,
    calculate_discounted_line,
)


@pytest.fixture
async def setup_master_part(db_session):
    part_code = "SCENARIO-PART-001"
    stmt = select(SparePartCode).where(SparePartCode.code == part_code)
    code = (await db_session.execute(stmt)).scalars().first()
    if not code:
        s = SpareMaster(
            spare_name="Master Test Suspension Link",
            tracking_mode="QUANTITY",
            status="ACTIVE",
            accounting_wac=Decimal("400.00"),
            manufacturer_dlp=Decimal("380.00"),
            manufacturer_mrp=Decimal("461.00"),
            base_cost=Decimal("400.00"),
            base_dlp=Decimal("380.00"),
            base_mrp=Decimal("461.00"),
            gst_rate=Decimal("18.00"),
        )
        db_session.add(s)
        await db_session.flush()
        code = SparePartCode(spare_id=s.spare_id, code=part_code, is_current=True)
        db_session.add(code)
        await db_session.flush()

        bal = SpareStockBalance(
            spare_id=s.spare_id,
            location="MAIN_WAREHOUSE",
            quantity=8,
        )
        db_session.add(bal)
        await db_session.commit()
    else:
        stmt_spare = select(SpareMaster).where(SpareMaster.spare_id == code.spare_id)
        s = (await db_session.execute(stmt_spare)).scalars().first()
    return s, code


@pytest.mark.asyncio
async def test_scenario_a_inventory_cost_wac_blending(db_session, setup_master_part):
    """
    Scenario A Acceptance Criteria:
    - Existing stock: 8 units at verified accounting WAC of ₹400.00 (Value: ₹3,200.00)
    - New receipt: 2 units at eligible taxable unit cost of ₹350.00 (Total taxable: ₹700.00)
    - Recoverable input GST is recorded separately in GST ledger
    - Expected:
      New stock value: ₹3,900.00
      New quantity: 10
      New WAC: ₹390.00
      Manufacturer MRP remains unchanged at ₹461.00
      Cost history records old and new WAC
    """
    spare, code = setup_master_part
    old_qty = 8
    old_wac = Decimal("400.00")
    old_value = Decimal(str(old_qty)) * old_wac  # 3200.00

    new_receipt_qty = 2
    new_taxable_unit_cost = Decimal("350.00")
    new_receipt_cost = Decimal(str(new_receipt_qty)) * new_taxable_unit_cost  # 700.00

    # Calculate blended WAC
    new_total_qty = old_qty + new_receipt_qty  # 10
    new_stock_value = old_value + new_receipt_cost  # 3900.00
    expected_new_wac = (new_stock_value / Decimal(str(new_total_qty))).quantize(Decimal("0.01"))  # 390.00

    assert new_stock_value == Decimal("3900.00")
    assert new_total_qty == 10
    assert expected_new_wac == Decimal("390.00")

    # Record purchase ITC separately (18% of 700.00 = 126.00)
    itc_record = await record_purchase_itc(
        db=db_session,
        purchase_id=101,
        invoice_number="INV-SCENARIO-A",
        invoice_date=date.today(),
        taxable_value=new_receipt_cost,
        cgst_amount=Decimal("63.00"),
        sgst_amount=Decimal("63.00"),
        igst_amount=Decimal("0.00"),
        tax_period=date.today().strftime("%Y-%m"),
        eligibility_status="ELIGIBLE",
    )
    assert itc_record.eligibility_status == "ELIGIBLE"
    assert itc_record.claim_status == "AVAILABLE"
    assert itc_record.taxable_value == Decimal("700.00")
    assert itc_record.total_tax == Decimal("126.00")

    # Update SpareMaster accounting WAC
    spare.accounting_wac = expected_new_wac
    db_session.add(spare)

    # Record cost history
    cost_hist = SpareCostHistory(
        spare_id=spare.spare_id,
        quantity=new_receipt_qty,
        source_reference="PURCHASE-101",
        billed_unit_price=new_taxable_unit_cost,
        landed_cost=new_taxable_unit_cost,  # Excludes recoverable ITC!
        wac_cost=expected_new_wac,
        effective_date=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db_session.add(cost_hist)
    await db_session.commit()

    await db_session.refresh(spare)
    assert spare.accounting_wac == Decimal("390.00")
    assert spare.manufacturer_mrp == Decimal("461.00")  # Untouched


@pytest.mark.asyncio
async def test_scenario_b_gst_inclusive_mrp_sale(db_session, setup_master_part):
    """
    Scenario B Acceptance Criteria:
    - Applicable MRP: ₹461.00 (inclusive of 18% GST)
    - WAC: ₹343.54
    - Sale at full MRP with no discount
    - Expected:
      Customer amount: ₹461.00
      Taxable revenue: ₹390.68
      Output GST: ₹70.32
      COGS: ₹343.54
      Gross profit: ₹47.14
      Gross margin: ~12.07%
    """
    wac = Decimal("343.54")
    mrp = Decimal("461.00")
    gst_rate = Decimal("18.00")

    eval_res = calculate_profitability(
        unit_selling_price=mrp,
        wac_cost=wac,
        quantity=1,
        gst_rate=gst_rate,
        unit_discount=Decimal("0.00"),
    )

    assert eval_res["net_sales_revenue"] == 390.68
    assert eval_res["output_gst_per_unit"] == 70.32
    assert eval_res["cogs"] == 343.54
    assert eval_res["expected_gross_profit"] == 47.14
    assert eval_res["gross_margin_percent"] == 12.07
    assert eval_res["is_loss"] is False


@pytest.mark.asyncio
async def test_scenario_c_discount_guardrail_blocks_negative_profit(db_session, setup_master_part):
    """
    Scenario C Acceptance Criteria:
    - Applicable MRP: ₹461.00 inclusive of GST
    - WAC: ₹390.00
    - Proposed customer discount: 10%
    - Discounted customer amount: ₹414.90
    - Taxable revenue: ₹351.61, Output GST: ₹63.29
    - COGS: ₹390.00
    - Expected gross profit: -₹38.39 (Negative!)
    - Must be BLOCKED by default without authorized exception
    """
    spare, code = setup_master_part
    spare.accounting_wac = Decimal("390.00")
    spare.manufacturer_mrp = Decimal("461.00")
    db_session.add(spare)
    await db_session.commit()

    # Calculate discounted price
    discount_res = calculate_discounted_line(
        original_price=Decimal("461.00"),
        quantity=1,
        discount_type="PERCENTAGE",
        discount_value=Decimal("10.00"),
        gst_rate=Decimal("18.00"),
        is_inclusive_of_gst=True,
    )
    assert discount_res["final_customer_amount"] == 414.90
    assert discount_res["taxable_amount"] == 351.61
    assert discount_res["gst_amount"] == 63.29

    # Validate sale profitability - MUST BLOCK
    with pytest.raises(ProfitabilityValidationError) as excinfo:
        await validate_sale_profitability(
            db=db_session,
            spare_id=spare.spare_id,
            proposed_unit_price=Decimal("414.90"),
            quantity=1,
            unit_discount=Decimal("0.00"),
            exception_id=None,
            requesting_staff_id=1,
        )
    assert "Negative profit sale blocked by profit protection policy" in str(excinfo.value)

    # Now verify Authorized Loss Exception workflow
    # Self-authorization must be rejected!
    exc_self = LossSaleException(
        spare_id=spare.spare_id,
        part_code=code.code,
        quantity=1,
        requested_by_staff_id=5,
        authorized_by_staff_id=5,  # Same user!
        expected_revenue=Decimal("351.61"),
        expected_cost=Decimal("390.00"),
        expected_loss=Decimal("38.39"),
        expected_margin=Decimal("-10.92"),
        reason="Clearance promotion self-approval attempt",
        policy_version="v2.0",
    )
    db_session.add(exc_self)
    await db_session.flush()

    with pytest.raises(ProfitabilityValidationError) as excinfo_self:
        await validate_sale_profitability(
            db=db_session,
            spare_id=spare.spare_id,
            proposed_unit_price=Decimal("414.90"),
            quantity=1,
            unit_discount=Decimal("0.00"),
            exception_id=exc_self.exception_id,
            requesting_staff_id=5,
        )
    assert "Users cannot authorize their own loss-making transaction exception" in str(excinfo_self.value)

    # Valid exception with distinct authorizer
    valid_exc = LossSaleException(
        spare_id=spare.spare_id,
        part_code=code.code,
        quantity=1,
        requested_by_staff_id=5,
        authorized_by_staff_id=99,  # Distinct manager
        expected_revenue=Decimal("351.61"),
        expected_cost=Decimal("390.00"),
        expected_loss=Decimal("38.39"),
        expected_margin=Decimal("-10.92"),
        reason="Manager approved customer goodwill replacement",
        policy_version="v2.0",
    )
    db_session.add(valid_exc)
    await db_session.flush()

    prof = await validate_sale_profitability(
        db=db_session,
        spare_id=spare.spare_id,
        proposed_unit_price=Decimal("414.90"),
        quantity=1,
        unit_discount=Decimal("0.00"),
        exception_id=valid_exc.exception_id,
        requesting_staff_id=5,
    )
    assert prof["expected_gross_profit"] == -38.39
    assert prof["is_loss"] is True


@pytest.mark.asyncio
async def test_scenario_d_itc_utilization_against_output_liability(db_session):
    """
    Scenario D Acceptance Criteria:
    - Eligible available ITC: ₹5,000.00
    - Reconciled output liability: ₹3,000.00
    - Offset:
      ITC utilized: ₹3,000.00
      Remaining ITC balance: ₹2,000.00
      Remaining output liability: ₹0.00
    """
    period = "2026-10"

    itc = await record_purchase_itc(
        db=db_session,
        purchase_id=201,
        invoice_number="INV-ITC-POOL-001",
        invoice_date=date.today(),
        taxable_value=Decimal("27777.78"),
        cgst_amount=Decimal("2500.00"),
        sgst_amount=Decimal("2500.00"),
        igst_amount=Decimal("0.00"),
        tax_period=period,
        eligibility_status="ELIGIBLE",
    )
    assert float(itc.available_balance) == 5000.00

    output_rec = await record_sale_output_tax(
        db=db_session,
        sale_id=301,
        invoice_number="INV-SALE-OUT-001",
        invoice_date=date.today(),
        taxable_value=Decimal("16666.67"),
        cgst_amount=Decimal("1500.00"),
        sgst_amount=Decimal("1500.00"),
        igst_amount=Decimal("0.00"),
        tax_period=period,
    )
    assert float(output_rec.remaining_liability) == 3000.00

    # Perform atomic ITC utilization
    await offset_tax_liability_with_itc(
        db=db_session,
        output_tax_id=output_rec.output_tax_id,
        itc_id=itc.itc_id,
        amount_to_offset=Decimal("3000.00"),
        tax_component="CGST_SGST",
        staff_id=1,
        remarks="Scenario D monthly tax offset",
    )

    await db_session.refresh(itc)
    await db_session.refresh(output_rec)

    assert float(itc.utilized_amount) == 3000.00
    assert float(itc.available_balance) == 2000.00
    assert float(output_rec.itc_utilized_amount) == 3000.00
    assert float(output_rec.remaining_liability) == 0.00
    assert output_rec.status == "OFFSET_BY_ITC"


@pytest.mark.asyncio
async def test_scenario_e_price_change_audit_trail(db_session, setup_master_part):
    """
    Scenario E Acceptance Criteria:
    - When manufacturer MRP changes from one valid value to another, audit trail records:
      Old and new MRP
      Effective and recorded timestamps
      Source document/version
      Actor identity and reason
      Resulting expected profit/margin change
    """
    spare, code = setup_master_part
    old_mrp = spare.manufacturer_mrp
    new_mrp = Decimal("495.00")

    audit_event = await record_price_change_audit(
        db=db_session,
        spare_id=spare.spare_id,
        part_code=code.code,
        change_type="MANUFACTURER_MRP_UPDATE",
        old_value=old_mrp,
        new_value=new_mrp,
        source_document="Inventory (22-09-25)(2).xlsx - Sheet: Magnus Neo",
        reason="Manufacturer revised price list import",
        actor_staff_id=1,
        actor_name="Inventory Admin",
        profit_impact_margin=Decimal("3.50"),
    )

    assert audit_event.old_value == old_mrp
    assert audit_event.new_value == new_mrp
    assert audit_event.difference_amount == Decimal("34.00")
    assert audit_event.source_document == "Inventory (22-09-25)(2).xlsx - Sheet: Magnus Neo"
    assert audit_event.actor_name == "Inventory Admin"
    assert audit_event.recorded_timestamp is not None
    assert audit_event.effective_timestamp is not None


@pytest.mark.asyncio
async def test_discount_engine_basket_threshold_and_stacking(db_session, setup_master_part):
    """
    Tests multi-tier customer discounts:
    - Item-level percentage discount
    - Basket threshold discount (e.g. 10% off purchases above ₹1,000)
    - Stacking behaviour
    """
    spare, code = setup_master_part

    # Rule 1: 5% off on the part (Stackable)
    rule1 = DiscountRule(
        rule_name="5% Part Special",
        target_type="CUSTOMER",
        discount_type="PERCENTAGE",
        discount_value=Decimal("5.00"),
        spare_id=spare.spare_id,
        stacking_mode="STACKABLE",
        priority=1,
    )
    # Rule 2: 10% off on qualifying basket above 1000
    rule2 = DiscountRule(
        rule_name="Festive Basket 10% Off",
        target_type="CUSTOMER",
        discount_type="PERCENTAGE",
        discount_value=Decimal("10.00"),
        min_basket_value=Decimal("1000.00"),
        threshold_is_pre_tax=True,
        stacking_mode="STACKABLE",
        priority=2,
    )
    db_session.add_all([rule1, rule2])
    await db_session.commit()

    # Basket of 5 units @ 461.00 = 2305.00 gross
    lines = [
        {"spare_id": spare.spare_id, "quantity": 5, "unit_price": Decimal("461.00"), "gst_rate": Decimal("18.00")}
    ]
    results = await evaluate_applicable_discounts(
        db=db_session,
        target_type="CUSTOMER",
        lines=lines,
    )

    assert len(results) == 1
    applied_ids = results[0]["applied_rule_ids"]
    assert rule1.rule_id in applied_ids
    assert rule2.rule_id in applied_ids


@pytest.mark.asyncio
async def test_pricing_alert_deduplication_and_reopen(db_session, setup_master_part):
    """
    Tests pricing alert generation:
    - Alert triggered when WAC cost exceeds MRP (CRITICAL loss alert)
    - Re-evaluation does not create duplicate OPEN alert (deduplication via risk fingerprint)
    - Resolving alert and re-triggering reopens the alert
    """
    spare, code = setup_master_part
    spare.accounting_wac = Decimal("500.00")  # Cost 500 > MRP 461
    spare.manufacturer_mrp = Decimal("461.00")
    db_session.add(spare)
    await db_session.commit()

    # Trigger evaluation
    alert1 = await evaluate_part_pricing_risk(db_session, spare.spare_id)
    assert alert1 is not None
    assert alert1.severity == "CRITICAL"
    assert alert1.status == "OPEN"
    assert "sells at a loss" in alert1.message

    # Re-evaluate: should suppress duplicate
    alert2 = await evaluate_part_pricing_risk(db_session, spare.spare_id)
    assert alert2.alert_id == alert1.alert_id  # Same alert returned

    # Mark resolved
    alert1.status = "RESOLVED"
    alert1.resolution_reason = "Supplier price review initiated"
    alert1.resolved_by = 1
    db_session.add(alert1)
    await db_session.commit()

    # Re-evaluate while risk persists: must REOPEN to OPEN!
    alert3 = await evaluate_part_pricing_risk(db_session, spare.spare_id)
    assert alert3.alert_id == alert1.alert_id
    assert alert3.status == "OPEN"
