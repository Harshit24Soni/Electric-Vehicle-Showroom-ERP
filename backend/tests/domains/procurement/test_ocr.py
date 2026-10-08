import pytest
from httpx import AsyncClient
from decimal import Decimal
from datetime import datetime

from app.domains.procurement.models import SparePurchase, SparePurchaseItem

@pytest.fixture
async def vendor(db_session):
    from app.domains.master.models import Vendor
    v = Vendor(vendor_name="Test Supplier", vendor_type="OEM", gstin="29GGGGG1314R9Z6", pan_no="GGGGG1314R")
    db_session.add(v)
    await db_session.flush()
    return v

@pytest.fixture
async def spare(db_session):
    from app.modules.inventory.models import SpareMaster, SparePartCode
    s = SpareMaster(spare_name="Mysterious Part", tracking_mode="QUANTITY", status="ACTIVE")
    db_session.add(s)
    await db_session.flush()
    
    code = SparePartCode(spare_id=s.spare_id, code="UNKNOWN-XYZ", is_current=True)
    db_session.add(code)
    await db_session.flush()
    return s

@pytest.mark.asyncio
async def test_ocr_upload(admin_client: AsyncClient, db_session, vendor, spare):
    # Prepare fake file
    files = {'file': ('unknown.pdf', b'fake pdf content', 'application/pdf')}
    data = {'vendor_id': vendor.vendor_id}
    
    # Upload
    response = await admin_client.post("/procurement/purchases/spares/ocr", data=data, files=files)
    print("OCR Response:", response.status_code, response.text)
    assert response.status_code == 201
    
    res_data = response.json()
    assert res_data["status"] == "OCR_PROCESSED"
    assert res_data["verification_status"] == "PENDING_VERIFICATION"
    
    purchase_id = res_data["spare_purchase_id"]
    
    # Verify items
    items = res_data["items"]
    assert len(items) == 1
    item = items[0]
    assert item["part_code"] == "UNKNOWN-XYZ"
    assert item["verification_status"] == "EXTRACTED"
    
    # Verify purchase workflow
    verify_payload = {
        "vendor_id": vendor.vendor_id,
        "vendor_invoice_no": "INV-001",
        "vendor_invoice_date": "2026-10-04",
        "purchase_date": "2026-10-04",
        "remarks": "Verified by hand",
        "include_in_accounting": True,
        "status": "VERIFIED",
        "subtotal": 100.00,
        "tax_total": 18.00,
        "landed_cost_total": 118.00,
        "items": [
            {
                "spare_id": spare.spare_id,
                "part_code": "UNKNOWN-XYZ",
                "part_description": "Mysterious Part",
                "quantity": 1,
                "unit_cost": "100.00",
                "discount": "0.0",
                "tax_amount": "18.00",
                "verification_status": "CONFIRMED"
            }
        ]
    }
    
    # Verify
    verify_res = await admin_client.put(f"/procurement/purchases/spares/{purchase_id}/verify", json=verify_payload)
    assert verify_res.status_code == 200
    assert verify_res.json()["status"] == "VERIFIED"
    
    # Approve
    approve_res = await admin_client.post(f"/procurement/purchases/spares/{purchase_id}/approve")
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "APPROVED"
