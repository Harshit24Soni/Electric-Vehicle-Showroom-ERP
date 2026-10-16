import pytest
from decimal import Decimal
from httpx import AsyncClient
from sqlalchemy import select
from app.modules.procurement.models import SparePurchase, SparePurchaseItem
from app.modules.inventory.models import SpareMaster, SparePartCode, SpareStockBalance, SpareStockMovement
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


from datetime import date

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
    post_payload = {
        "location": "MAIN_WAREHOUSE",
        "items": [
            {
                "purchase_item_id": item.purchase_item_id
            }
        ]
    }

    response = await admin_client.post(
        f"/procurement/purchases/spares/{purchase.spare_purchase_id}/post",
        json=post_payload
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
        reference_type="PROCUREMENT",
        reference_id=purchase.spare_purchase_id
    )
    movement = (await db_session.execute(mov_stmt)).scalars().first()
    assert movement is not None
    assert movement.quantity == 5
    assert movement.movement_type == "PURCHASE"
