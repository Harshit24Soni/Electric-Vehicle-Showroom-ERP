import pytest
from decimal import Decimal
from httpx import AsyncClient
from sqlalchemy import func, select

from app.modules.inventory.models import (
    SpareMaster,
    SparePartCode,
    SpareStockBalance,
    SpareStockMovement,
    DiscountRule,
    DiscountStackingMode,
)
from app.modules.inventory.discount_engine import (
    evaluate_applicable_discounts,
    calculate_discounted_line,
)
from app.modules.inventory.services import (
    add_spare_movement,
    InsufficientSpareStockError,
)


@pytest.fixture
async def setup_lifecycle_part(db_session):
    part_code = "CHECKLIST-PART-001"
    stmt = select(SparePartCode).where(SparePartCode.code == part_code)
    code = (await db_session.execute(stmt)).scalars().first()
    if not code:
        s = SpareMaster(
            spare_name="Checklist Lifecycle Assembly",
            tracking_mode="QUANTITY",
            status="ACTIVE",
            accounting_wac=Decimal("250.00"),
            manufacturer_dlp=Decimal("240.00"),
            manufacturer_mrp=Decimal("350.00"),
            base_cost=Decimal("250.00"),
            base_dlp=Decimal("240.00"),
            base_mrp=Decimal("350.00"),
            gst_rate=Decimal("18.00"),
        )
        db_session.add(s)
        await db_session.flush()
        code = SparePartCode(spare_id=s.spare_id, code=part_code, is_current=True)
        db_session.add(code)
        await db_session.flush()

        # 10 units in MAIN_WAREHOUSE @ 250.00
        bal = SpareStockBalance(
            spare_id=s.spare_id,
            location="MAIN_WAREHOUSE",
            quantity=10,
        )
        db_session.add(bal)
        await db_session.commit()
    else:
        stmt_spare = select(SpareMaster).where(SpareMaster.spare_id == code.spare_id)
        s = (await db_session.execute(stmt_spare)).scalars().first()
    return s, code


@pytest.mark.asyncio
async def test_stock_transfer_preserves_company_wac_and_valuation(db_session, setup_lifecycle_part):
    """
    Requirement 4: Stock transfer between locations must preserve company-wide
    stock valuation and accounting WAC.
    """
    spare, code = setup_lifecycle_part
    initial_wac = spare.accounting_wac  # 250.00

    bal_wh_stmt = select(SpareStockBalance).filter_by(spare_id=spare.spare_id, location="MAIN_WAREHOUSE")
    bal_wh = (await db_session.execute(bal_wh_stmt)).scalar_one()

    # Transfer 4 units from MAIN_WAREHOUSE to MAIN_SHOWROOM
    bal_wh.quantity -= 4
    bal_sh = SpareStockBalance(
        spare_id=spare.spare_id,
        location="MAIN_SHOWROOM",
        quantity=4,
    )
    db_session.add(bal_sh)
    movement = await add_spare_movement(
        db=db_session,
        spare_id=spare.spare_id,
        quantity=4,
        movement_type="ADJUSTMENT",
        from_location="MAIN_WAREHOUSE",
        to_location="MAIN_SHOWROOM",
        reference_type="INTERNAL",
        remarks="Showroom floor replenishment",
    )
    assert movement.quantity == 4
    assert movement.movement_type == "ADJUSTMENT"
    await db_session.commit()

    # Verify balances: 6 in Warehouse, 4 in Showroom
    bal_wh_stmt = select(SpareStockBalance).filter_by(spare_id=spare.spare_id, location="MAIN_WAREHOUSE")
    bal_wh = (await db_session.execute(bal_wh_stmt)).scalar_one()
    assert bal_wh.quantity == 6

    bal_sh_stmt = select(SpareStockBalance).filter_by(spare_id=spare.spare_id, location="MAIN_SHOWROOM")
    bal_sh = (await db_session.execute(bal_sh_stmt)).scalar_one()
    assert bal_sh.quantity == 4

    # Total company quantity = 6 + 4 = 10
    total_qty = bal_wh.quantity + bal_sh.quantity
    assert total_qty == 10

    # Company-wide WAC remains exactly 250.00
    await db_session.refresh(spare)
    assert spare.accounting_wac == initial_wac
    total_val = Decimal(str(total_qty)) * spare.accounting_wac
    assert total_val == Decimal("2500.00")


@pytest.mark.asyncio
async def test_discount_allocation_inclusive_and_taxable_prices(db_session, setup_lifecycle_part):
    """
    Requirement 5: Verify discount allocation and GST calculations for
    inclusive prices, taxable prices, and multi-tier discount types.
    """
    spare, code = setup_lifecycle_part

    # Test 1: Percentage discount on GST-inclusive MRP
    # MRP = ₹350.00 (inclusive of 18% GST). Discount = 15% (₹52.50)
    # Final customer price = ₹297.50
    # Taxable revenue = 297.50 / 1.18 = ₹252.12. Output GST = ₹45.38
    res_incl = calculate_discounted_line(
        original_price=Decimal("350.00"),
        quantity=2,
        discount_type="PERCENTAGE",
        discount_value=Decimal("15.00"),
        gst_rate=Decimal("18.00"),
        is_inclusive_of_gst=True,
    )
    assert res_incl["final_customer_unit"] == 297.50
    assert res_incl["final_customer_amount"] == 595.00
    assert res_incl["taxable_amount"] == 504.24
    assert res_incl["gst_amount"] == 90.76

    # Test 2: Fixed amount discount per item
    # Fixed ₹50.00 off on ₹350.00 -> ₹300.00 unit customer price
    res_fixed = calculate_discounted_line(
        original_price=Decimal("350.00"),
        quantity=1,
        discount_type="FIXED_AMOUNT",
        discount_value=Decimal("50.00"),
        gst_rate=Decimal("18.00"),
        is_inclusive_of_gst=True,
    )
    assert res_fixed["final_customer_unit"] == 300.00
    assert res_fixed["taxable_amount"] == 254.24
    assert res_fixed["gst_amount"] == 45.76


@pytest.mark.asyncio
async def test_exclusive_vs_stackable_discount_rules(db_session, setup_lifecycle_part):
    """
    Requirement 5: Stacking rules and exclusivity behavior.
    When an EXCLUSIVE rule applies, stackable rules must not execute.
    """
    spare, code = setup_lifecycle_part

    # Rule 1: Stackable 5%
    r_stackable = DiscountRule(
        rule_name="Loyalty 5% Stackable",
        target_type="CUSTOMER",
        discount_type="PERCENTAGE",
        discount_value=Decimal("5.00"),
        spare_id=spare.spare_id,
        stacking_mode=DiscountStackingMode.STACKABLE.value,
        priority=1,
    )
    # Rule 2: Exclusive 20% Mega Deal
    r_exclusive = DiscountRule(
        rule_name="Mega Deal 20% Exclusive",
        target_type="CUSTOMER",
        discount_type="PERCENTAGE",
        discount_value=Decimal("20.00"),
        spare_id=spare.spare_id,
        stacking_mode=DiscountStackingMode.EXCLUSIVE.value,
        priority=10,
    )
    db_session.add_all([r_stackable, r_exclusive])
    await db_session.commit()

    lines = [
        {"spare_id": spare.spare_id, "quantity": 1, "unit_price": Decimal("350.00"), "gst_rate": Decimal("18.00")}
    ]
    applicable = await evaluate_applicable_discounts(db_session, "CUSTOMER", lines)
    assert len(applicable) == 1
    applied = applicable[0]["applied_rule_ids"]

    # Only the exclusive rule should apply
    assert r_exclusive.rule_id in applied
    assert r_stackable.rule_id not in applied
    assert applicable[0]["allocated_discount"] == 70.00  # 20% of 350.00


@pytest.mark.asyncio
async def test_transaction_rollback_preserves_stock_and_gst_integrity(db_session, setup_lifecycle_part):
    """
    Requirement 6: Test atomic rollback behavior. If an operation fails mid-transaction,
    no partial stock movement or unbacked output tax record is committed.
    """
    spare, code = setup_lifecycle_part
    target_spare_id = spare.spare_id

    # Ensure baseline balance exists
    bal_res = await db_session.execute(
        select(SpareStockBalance).filter_by(spare_id=target_spare_id, location="MAIN_WAREHOUSE")
    )
    bal = bal_res.scalar_one_or_none()
    if not bal:
        bal = SpareStockBalance(spare_id=target_spare_id, location="MAIN_WAREHOUSE", quantity=10)
        db_session.add(bal)
        await db_session.flush()

    bal_before = bal.quantity
    movement_count_before = (
        await db_session.execute(
            select(func.count(SpareStockMovement.movement_id)).where(SpareStockMovement.spare_id == target_spare_id)
        )
    ).scalar_one()

    # Attempt a movement that fails due to insufficient stock inside an isolated savepoint
    try:
        async with db_session.begin_nested():
            await add_spare_movement(
                db=db_session,
                spare_id=target_spare_id,
                quantity=-999999,  # Impossible negative consumption
                movement_type="ADJUSTMENT",
                remarks="Exploratory negative test",
            )
    except InsufficientSpareStockError:
        pass

    # Balance and movements must be completely unchanged
    bal_after = (
        await db_session.execute(
            select(SpareStockBalance).filter_by(spare_id=target_spare_id, location="MAIN_WAREHOUSE")
        )
    ).scalar_one().quantity
    movement_count_after = (
        await db_session.execute(
            select(func.count(SpareStockMovement.movement_id)).where(SpareStockMovement.spare_id == target_spare_id)
        )
    ).scalar_one()

    assert bal_after == bal_before
    assert movement_count_after == movement_count_before


@pytest.mark.asyncio
async def test_rbac_security_on_cost_profit_and_loss_authorization(admin_client: AsyncClient, setup_lifecycle_part):
    """
    Requirement 7: Verify RBAC for cost, profit, and loss-sale authorization.
    Unauthenticated requests must be blocked.
    """
    from app.main import app
    from app.auth.dependencies import get_current_staff

    # 1. Unauthenticated request without staff override
    override = app.dependency_overrides.pop(get_current_staff, None)
    try:
        resp_alerts = await admin_client.get("/inventory/pricing-alerts")
        assert resp_alerts.status_code in (401, 403)

        resp_alerts_alias = await admin_client.get("/inventory/pricing/alerts")
        assert resp_alerts_alias.status_code in (401, 403)

        # Unauthenticated request to GST ledger summary
        resp_gst = await admin_client.get("/finance/gst/dashboard")
        assert resp_gst.status_code in (401, 403)

        # Unauthenticated request to authorize loss sale must be rejected
        resp_loss = await admin_client.post("/inventory/loss-exceptions", json={
            "spare_id": 1,
            "part_code": "TEST",
            "reason": "Test unauthenticated loss authorization",
        })
        assert resp_loss.status_code in (401, 403)
    finally:
        if override:
            app.dependency_overrides[get_current_staff] = override

    # 2. Authenticated Admin can access GST dashboard
    resp_admin_gst = await admin_client.get("/finance/gst/dashboard")
    assert resp_admin_gst.status_code == 200
    data = resp_admin_gst.json()
    assert "total_input_gst_recorded" in data
    assert "total_output_gst_liability" in data
    assert "remaining_output_liability" in data

    # 3. Authenticated Admin can access pricing alerts
    resp_admin_alerts = await admin_client.get("/inventory/pricing-alerts")
    assert resp_admin_alerts.status_code == 200
