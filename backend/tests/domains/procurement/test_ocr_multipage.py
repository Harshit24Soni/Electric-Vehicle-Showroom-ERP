import pytest
import json
from decimal import Decimal
from httpx import AsyncClient


@pytest.fixture
async def vendor(db_session):
    from app.modules.master.models import Vendor

    v = Vendor(vendor_name="Greaves Electric Mobility Limited", vendor_type="OEM", gstin="33AAHCA0665K1ZQ", pan_no="AAHCA0665K")
    db_session.add(v)
    await db_session.flush()
    return v


@pytest.fixture
async def spares(db_session):
    from app.modules.inventory.models import SpareMaster, SparePartCode
    from sqlalchemy import select

    # Check if TEST-PART-1 exists, else create
    stmt = select(SparePartCode).where(SparePartCode.code == "TEST-PART-1")
    code = (await db_session.execute(stmt)).scalars().first()
    if not code:
        s = SpareMaster(spare_name="Brake Assembly", tracking_mode="QUANTITY", status="ACTIVE")
        db_session.add(s)
        await db_session.flush()
        code = SparePartCode(spare_id=s.spare_id, code="TEST-PART-1", is_current=True)
        db_session.add(code)
        await db_session.flush()
    return code


@pytest.mark.asyncio
async def test_ocr_multipage_accumulation(admin_client: AsyncClient, db_session, vendor, spares):
    # Simulate multi-page upload with two files
    files = [
        ("files", ("page1.png", b"fake image page 1", "image/png")),
        ("files", ("page2.png", b"fake image page 2", "image/png")),
    ]
    data = {"vendor_id": vendor.vendor_id}

    response = await admin_client.post("/procurement/purchases/spares/ocr", data=data, files=files)
    assert response.status_code == 201

    res_data = response.json()
    assert res_data["vendor_id"] == vendor.vendor_id
    assert "page1.png, page2.png" in res_data["invoice_document_id"]
    assert len(res_data["items"]) >= 1

    # Check GST fields are populated on line items
    item = res_data["items"][0]
    assert item["gst_percentage"] is not None
    assert Decimal(str(item["gst_percentage"])) == Decimal("18.00")
    assert item["total_cost"] is not None
    assert Decimal(str(item["total_cost"])) > Decimal("0")

    # Check remarks contains structured JSON metadata
    remarks = res_data.get("remarks")
    assert remarks is not None
    meta = json.loads(remarks)
    assert "tax_compliance" in meta or "financial_summary" in meta
