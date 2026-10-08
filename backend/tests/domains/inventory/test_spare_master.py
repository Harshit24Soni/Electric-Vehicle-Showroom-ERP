import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.modules.inventory.models import SpareMaster, SparePartCode, SparePartVehicleCompatibility
from app.domains.master.models import VehicleModel

pytestmark = pytest.mark.asyncio

async def test_create_spare_master(admin_client: AsyncClient, db_session: AsyncSession):
    response = await admin_client.post(
        "/inventory/spares",
        json={
            "spare_name": "Test Spare Part",
            "initial_code": "SP-001",
            "tracking_mode": "QUANTITY",
            "category": "Brakes",
            "remarks": "Test remarks"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["spare_name"] == "Test Spare Part"
    assert data["tracking_mode"] == "QUANTITY"
    assert data["status"] == "ACTIVE"
    assert len(data["codes"]) == 1
    assert data["codes"][0]["code"] == "SP-001"
    
    # Verify in DB
    spare = await db_session.get(SpareMaster, data["spare_id"])
    assert spare is not None
    assert spare.tracking_mode == "QUANTITY"
    
async def test_create_spare_duplicate_code(admin_client: AsyncClient, db_session: AsyncSession):
    # First create
    await admin_client.post(
        "/inventory/spares",
        json={
            "spare_name": "Test Spare Part 1",
            "initial_code": "SP-002",
            "tracking_mode": "QUANTITY"
        }
    )
    # Second create with same code
    response = await admin_client.post(
        "/inventory/spares",
        json={
            "spare_name": "Test Spare Part 2",
            "initial_code": "SP-002",
            "tracking_mode": "QUANTITY"
        }
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]

async def test_add_retire_part_code(admin_client: AsyncClient, db_session: AsyncSession):
    # Create spare
    resp1 = await admin_client.post(
        "/inventory/spares",
        json={
            "spare_name": "Test Spare Part",
            "initial_code": "SP-OLD",
            "tracking_mode": "QUANTITY"
        }
    )
    spare_id = resp1.json()["spare_id"]
    old_code_id = resp1.json()["codes"][0]["code_id"]
    
    # Add new code
    resp2 = await admin_client.post(
        f"/inventory/spares/{spare_id}/codes",
        json={
            "code": "SP-NEW",
            "reason": "Supersession"
        }
    )
    assert resp2.status_code == 200
    data = resp2.json()
    assert len(data["codes"]) == 2
    
    # Retire old code
    resp3 = await admin_client.delete(f"/inventory/spares/{spare_id}/codes/{old_code_id}")
    assert resp3.status_code == 200
    data = resp3.json()
    codes = sorted(data["codes"], key=lambda c: c["code_id"])
    assert codes[0]["is_current"] == False  # Old code
    assert codes[1]["is_current"] == True   # New code

async def test_compatibility(admin_client: AsyncClient, db_session: AsyncSession):
    # Setup vehicle model
    from app.domains.master.models import Brand
    brand = Brand(brand_name="Test Brand")
    db_session.add(brand)
    await db_session.flush()
    
    model = VehicleModel(brand_id=brand.brand_id, model_name="Test Model", material_number="MAT-001", colour="Red")
    db_session.add(model)
    await db_session.flush()
    model_id = model.vehicle_model_id
    
    # Create spare
    resp1 = await admin_client.post(
        "/inventory/spares",
        json={
            "spare_name": "Compatible Part",
            "initial_code": "SP-COMPAT",
            "tracking_mode": "QUANTITY"
        }
    )
    spare_id = resp1.json()["spare_id"]
    
    # Add compatibility
    resp2 = await admin_client.post(
        f"/inventory/spares/{spare_id}/compatibilities",
        json={
            "vehicle_model_id": model_id
        }
    )
    assert resp2.status_code == 200
    assert len(resp2.json()["compatibilities"]) == 1
    compat_id = resp2.json()["compatibilities"][0]["compatibility_id"]
    
    # Remove compatibility
    resp3 = await admin_client.delete(f"/inventory/spares/{spare_id}/compatibilities/{compat_id}")
    assert resp3.status_code == 200
    assert len(resp3.json()["compatibilities"]) == 0
