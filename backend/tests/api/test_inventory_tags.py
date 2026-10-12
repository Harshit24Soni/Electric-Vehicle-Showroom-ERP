import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_and_scan_tag(admin_client, db_session):
    # 1. Create a spare (Quantity tracked)
    spare_payload = {
        "spare_name": "Test Tag Part",
        "initial_code": "TTP-001",
        "category": "Testing",
        "tracking_mode": "QUANTITY"
    }
    resp = await admin_client.post("/inventory/spares", json=spare_payload)
    assert resp.status_code == 201
    spare_id = resp.json()["spare_id"]
    
    # 2. Add some stock balance directly to DB for test
    from app.modules.inventory.models import SpareStockBalance
    balance = SpareStockBalance(spare_id=spare_id, location="MAIN_STORE", quantity=10)
    db_session.add(balance)
    await db_session.commit()
    
    # 3. Create a tag
    tag_payload = {
        "spare_id": spare_id,
        "tracking_mode": "QUANTITY",
        "quantity": 1
    }
    resp = await admin_client.post("/inventory/tags/bulk", json=tag_payload)
    assert resp.status_code == 200
    tags = resp.json()
    assert len(tags) == 1
    tag_id = tags[0]["tag_id"]
    identifier = tags[0]["tag_identifier"]
    assert identifier.startswith("SPT-")
    
    # 4. Scan tag
    resp = await admin_client.get(f"/inventory/tags/scan/{identifier}")
    assert resp.status_code == 200
    scan_data = resp.json()
    assert scan_data["spare_name"] == "Test Tag Part"
    assert scan_data["available_quantity"] == 10
    assert scan_data["location"] == "MAIN_STORE"
    
    # 5. Get QR
    resp = await admin_client.get(f"/inventory/tags/{tag_id}/qr")
    assert resp.status_code == 200
    assert "qr_base64" in resp.json()

    # 6. Reprint Tag
    resp = await admin_client.post(f"/inventory/tags/{tag_id}/reprint")
    assert resp.status_code == 200
    assert resp.json()["print_count"] == 1

    # 7. Revoke Tag
    resp = await admin_client.put(f"/inventory/tags/{tag_id}/revoke")
    assert resp.status_code == 200
    assert resp.json()["status"] == "REVOKED"
