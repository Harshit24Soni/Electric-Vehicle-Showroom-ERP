import pytest
from datetime import date
from decimal import Decimal
from httpx import AsyncClient
from sqlalchemy import select
from app.modules.procurement.models import SparePurchase, SparePurchaseItem
from app.modules.inventory.models import SpareMaster, SparePartCode, SpareStockBalance, SpareStockMovement
from app.modules.master.models import Vendor


@pytest.fixture
async def vendor(db_session):
    stmt = select(Vendor).where(Vendor.vendor_name == "Reversal Test Vendor OEM")
    v = (await db_session.execute(stmt)).scalars().first()
    if not v:
        v = Vendor(
            vendor_name="Reversal Test Vendor OEM", vendor_type="OEM", gstin="33AAHCA0665K1ZQ", pan_no="AAHCA0665K"
        )
        db_session.add(v)
        await db_session.flush()
    return v


@pytest.fixture
async def spares(db_session):
    stmt = select(SparePartCode).where(SparePartCode.code == "TEST-REVERSAL-PART-1")
    code = (await db_session.execute(stmt)).scalars().first()
    if not code:
        s = SpareMaster(spare_name="Reversal Assembly", tracking_mode="QUANTITY", status="ACTIVE")
        db_session.add(s)
        await db_session.flush()
        code = SparePartCode(spare_id=s.spare_id, code="TEST-REVERSAL-PART-1", is_current=True)
        db_session.add(code)
        await db_session.flush()
    return code


@pytest.mark.asyncio
async def test_duplicate_invoice_rejection(admin_client: AsyncClient, db_session, vendor, spares):
    """Test that creating a PO or verifying with a duplicate invoice number raises 409 Conflict."""
    inv_number = "INV-DUP-TEST-999"

    # 1. Create first purchase
    create_payload = {
        "vendor_id": vendor.vendor_id,
        "vendor_invoice_no": inv_number,
        "purchase_date": "2026-10-20",
        "subtotal": 100.0,
        "tax_total": 18.0,
        "landed_cost_total": 118.0,
        "items": [
            {
                "spare_id": spares.spare_id,
                "part_code": "TEST-REVERSAL-PART-1",
                "quantity": 1,
                "unit_cost": "100.00",
                "tax_amount": "18.00",
                "total_cost": "118.00",
            }
        ],
    }
    res1 = await admin_client.post("/procurement/purchases/spares", json=create_payload)
    assert res1.status_code == 201

    # 2. Try creating a second purchase with identical vendor_id and vendor_invoice_no -> Must return 409
    res2 = await admin_client.post("/procurement/purchases/spares", json=create_payload)
    assert res2.status_code == 409
    assert "Duplicate Invoice" in res2.json()["detail"]


@pytest.mark.asyncio
async def test_po_deletion_reverts_inventory(admin_client: AsyncClient, db_session, vendor, spares):
    """Test that deleting a POSTED purchase order reverts unsold inventory units

    and writes an ADJUSTMENT movement with reference_type='PROCUREMENT_REVERSAL'.
    """
    spare_id = spares.spare_id
    inv_number = "INV-REVERT-TEST-001"

    # 1. Create and approve a purchase order
    purchase = SparePurchase(
        vendor_id=vendor.vendor_id,
        vendor_invoice_no=inv_number,
        purchase_date=date.today(),
        status="APPROVED",
        subtotal=Decimal("500.00"),
        tax_total=Decimal("90.00"),
        landed_cost_total=Decimal("590.00"),
    )
    db_session.add(purchase)
    await db_session.flush()

    item = SparePurchaseItem(
        spare_purchase_id=purchase.spare_purchase_id,
        spare_id=spare_id,
        part_code="TEST-REVERSAL-PART-1",
        quantity=10,
        unit_cost=Decimal("50.00"),
        tax_amount=Decimal("90.00"),
        gst_percentage=Decimal("18.00"),
        total_cost=Decimal("590.00"),
        verification_status="CONFIRMED",
    )
    db_session.add(item)
    await db_session.commit()
    await db_session.refresh(purchase, ["items"])

    # 2. Post to inventory
    post_payload = {"location": "MAIN_WAREHOUSE", "items": [{"purchase_item_id": item.purchase_item_id}]}
    post_res = await admin_client.post(
        f"/procurement/purchases/spares/{purchase.spare_purchase_id}/post", json=post_payload
    )
    assert post_res.status_code == 200
    assert post_res.json()["status"] == "POSTED"

    # Check initial stock
    bal_stmt = select(SpareStockBalance).filter_by(spare_id=spare_id, location="MAIN_WAREHOUSE")
    bal_before = (await db_session.execute(bal_stmt)).scalars().first()
    initial_qty = bal_before.quantity
    assert initial_qty >= 10

    # 3. Simulate consuming/selling 3 units so only 7 remain of the 10 posted
    bal_before.quantity -= 3
    await db_session.commit()

    # 4. Delete the purchase order via DELETE endpoint
    del_res = await admin_client.delete(f"/procurement/purchases/spares/{purchase.spare_purchase_id}")
    assert del_res.status_code == 204

    # 5. Check stock balance: It should have reverted exactly the remaining 7 units (not all 10, never negative)
    bal_stmt2 = select(SpareStockBalance).filter_by(spare_id=spare_id, location="MAIN_WAREHOUSE")
    bal_after = (await db_session.execute(bal_stmt2)).scalars().first()
    assert bal_after.quantity == initial_qty - 10  # Reduced by exactly the remaining 7 units

    # 6. Check reversal stock movement
    rev_stmt = select(SpareStockMovement).filter_by(
        reference_type="PROCUREMENT_REVERSAL", reference_id=purchase.spare_purchase_id
    )
    reversal_mov = (await db_session.execute(rev_stmt)).scalars().first()
    assert reversal_mov is not None
    assert reversal_mov.movement_type == "ADJUSTMENT"
    assert reversal_mov.quantity == -7
    assert "Reversal on PO" in reversal_mov.remarks
