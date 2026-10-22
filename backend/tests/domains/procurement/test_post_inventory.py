import pytest
from datetime import date
from decimal import Decimal
from httpx import AsyncClient
from sqlalchemy import select
from app.modules.procurement.models import SparePurchase, SparePurchaseItem
from app.modules.inventory.models import (
    SpareMaster,
    SparePartCode,
    SpareStockBalance,
    SpareStockMovement,
    SpareCostHistory,
    SpareSellingPriceHistory,
)
from app.modules.master.models import Vendor


@pytest.fixture
async def vendor(db_session):
    stmt = select(Vendor).where(Vendor.vendor_name == "Post Test Vendor OEM")
    v = (await db_session.execute(stmt)).scalars().first()
    if not v:
        v = Vendor(vendor_name="Post Test Vendor OEM", vendor_type="OEM", gstin="33AAHCA0665K1ZQ", pan_no="AAHCA0665K")
        db_session.add(v)
        await db_session.flush()
    return v


@pytest.fixture
async def spares(db_session):
    stmt = select(SparePartCode).where(SparePartCode.code == "TEST-POST-PART-1")
    code = (await db_session.execute(stmt)).scalars().first()
    if not code:
        s = SpareMaster(spare_name="Test Post Assembly", tracking_mode="QUANTITY", status="ACTIVE")
        db_session.add(s)
        await db_session.flush()
        code = SparePartCode(spare_id=s.spare_id, code="TEST-POST-PART-1", is_current=True)
        db_session.add(code)
        await db_session.flush()
    return code


@pytest.mark.asyncio
async def test_post_spare_purchase_to_inventory(admin_client: AsyncClient, db_session, vendor, spares):
    # 1. Create a draft purchase in APPROVED state
    spare_id = spares.spare_id
    purchase = SparePurchase(
        vendor_id=vendor.vendor_id,
        vendor_invoice_no="INV-POST-TEST-001",
        purchase_date=date.today(),
        status="APPROVED",
        subtotal=Decimal("1000.00"),
        tax_total=Decimal("180.00"),
        landed_cost_total=Decimal("1180.00"),
    )
    db_session.add(purchase)
    await db_session.flush()

    item = SparePurchaseItem(
        spare_purchase_id=purchase.spare_purchase_id,
        spare_id=spare_id,
        part_code="TEST-POST-PART-1",
        quantity=5,
        unit_cost=Decimal("200.00"),
        tax_amount=Decimal("180.00"),
        gst_percentage=Decimal("18.00"),
        total_cost=Decimal("1180.00"),
        verification_status="CONFIRMED",
    )
    db_session.add(item)
    await db_session.commit()
    await db_session.refresh(purchase, ["items"])

    # 2. Post to inventory with location at root (like the frontend modal sends)
    post_payload = {"location": "MAIN_WAREHOUSE", "items": [{"purchase_item_id": item.purchase_item_id}]}

    response = await admin_client.post(
        f"/procurement/purchases/spares/{purchase.spare_purchase_id}/post", json=post_payload
    )
    assert response.status_code == 200, response.text
    res_data = response.json()
    assert res_data["status"] == "POSTED"

    # 3. Verify stock balance was created/updated in database
    bal_stmt = select(SpareStockBalance).filter_by(spare_id=spare_id, location="MAIN_WAREHOUSE")
    balance = (await db_session.execute(bal_stmt)).scalars().first()
    assert balance is not None
    assert balance.quantity >= 5

    # 4. Verify movement entry exists
    mov_stmt = select(SpareStockMovement).filter_by(
        reference_type="PROCUREMENT", reference_id=purchase.spare_purchase_id
    )
    movement = (await db_session.execute(mov_stmt)).scalars().first()
    assert movement is not None
    assert movement.quantity == 5
    assert movement.movement_type == "PURCHASE"

    # 5. Verify SpareCostHistory WAC excludes recoverable input GST (taxable cost: 200.00), recorded separately in GST ledger
    from app.modules.inventory.models import SpareCostHistory

    cost_stmt = select(SpareCostHistory).filter_by(
        spare_id=spare_id, source_reference=f"PURCHASE-{purchase.spare_purchase_id}"
    )
    cost_hist = (await db_session.execute(cost_stmt)).scalars().first()
    assert cost_hist is not None
    assert float(cost_hist.billed_unit_price) == 200.0
    assert float(cost_hist.landed_cost) == 200.0
    assert float(cost_hist.wac_cost) == 200.0


@pytest.mark.asyncio
async def test_post_purchase_receipt_averages_dlp_and_mrp_with_dealer_margin(
    admin_client: AsyncClient, db_session, vendor
):
    from app.modules.inventory.purchase_history_service import get_part_purchase_history

    # 1. Create a spare with existing stock and canonical pricing
    spare = SpareMaster(
        spare_name="Averaging Test Brake Rotor",
        tracking_mode="QUANTITY",
        status="ACTIVE",
        accounting_wac=Decimal("400.00"),
        base_cost=Decimal("400.00"),
        base_dlp=Decimal("400.00"),
        base_mrp=Decimal("500.00"),
        manufacturer_dlp=Decimal("400.00"),
        manufacturer_mrp=Decimal("500.00"),
        profit_margin_percent=Decimal("25.00"),
    )
    db_session.add(spare)
    await db_session.flush()

    code = SparePartCode(
        spare_id=spare.spare_id,
        code="TEST-AVG-DLP-001",
        is_current=True,
    )
    db_session.add(code)

    # 3 units pre-existing in SHOWROOM at WAC 400.00
    initial_balance = SpareStockBalance(
        spare_id=spare.spare_id,
        location="MAIN_SHOWROOM",
        quantity=3,
    )
    db_session.add(initial_balance)
    await db_session.commit()

    # 2. Inward 1 unit at taxable cost 300.00 (tax 60.00 recorded separately to ITC)
    purchase = SparePurchase(
        vendor_id=vendor.vendor_id,
        vendor_invoice_no="INV-AVG-TEST-002",
        purchase_date=date.today(),
        status="APPROVED",
        subtotal=Decimal("300.00"),
        tax_total=Decimal("60.00"),
        landed_cost_total=Decimal("360.00"),
    )
    db_session.add(purchase)
    await db_session.flush()

    item = SparePurchaseItem(
        spare_purchase_id=purchase.spare_purchase_id,
        spare_id=spare.spare_id,
        part_code="TEST-AVG-DLP-001",
        quantity=1,
        unit_cost=Decimal("300.00"),
        tax_amount=Decimal("60.00"),
        gst_percentage=Decimal("20.00"),
        total_cost=Decimal("360.00"),
        verification_status="CONFIRMED",
    )
    db_session.add(item)
    await db_session.commit()

    # 3. Post to inventory
    post_payload = {"location": "MAIN_WAREHOUSE", "items": [{"purchase_item_id": item.purchase_item_id}]}
    response = await admin_client.post(
        f"/procurement/purchases/spares/{purchase.spare_purchase_id}/post", json=post_payload
    )
    assert response.status_code == 200, response.text

    # 4. Canonical Verification:
    # Prior Stock: 3 units @ 400.00 = 1200.00
    # Inward: 1 unit @ taxable 300.00 = 300.00
    # Total Stock: 4 units
    # Expected WAC = (1200 + 300) / 4 = 1500 / 4 = 375.00
    # Manufacturer DLP & MRP are preserved from catalog, not overwritten by margin formulas
    await db_session.refresh(spare)
    assert float(spare.accounting_wac) == 375.0
    assert float(spare.base_dlp) == 400.0
    assert float(spare.base_mrp) == 500.0
    assert float(spare.manufacturer_mrp) == 500.0

    # Check SpareCostHistory record
    cost_stmt = select(SpareCostHistory).filter_by(
        spare_id=spare.spare_id, source_reference=f"PURCHASE-{purchase.spare_purchase_id}"
    )
    cost_hist = (await db_session.execute(cost_stmt)).scalars().first()
    assert cost_hist is not None
    assert float(cost_hist.landed_cost) == 300.0
    assert float(cost_hist.wac_cost) == 375.0

    # Check get_part_purchase_history summary service
    summary = await get_part_purchase_history(db_session, "TEST-AVG-DLP-001")
    assert summary.current_stock == 4
    assert summary.weighted_average_cost == 375.0
    assert summary.averaged_dlp == 400.0
    assert summary.current_mrp == 500.0
