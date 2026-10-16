import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.modules.inventory.models import SpareMaster, SparePartCode, PriceListItem
from app.modules.master.models import Brand, VehicleModel

pytestmark = pytest.mark.asyncio


async def setup_vehicle_models(db: AsyncSession) -> list[VehicleModel]:
    """Helper fixture to seed brand and vehicle models idempotently."""
    stmt = select(Brand).where(Brand.brand_name == "Ampere Electric")
    brand = (await db.execute(stmt)).scalars().first()
    if not brand:
        brand = Brand(brand_name="Ampere Electric")
        db.add(brand)
        await db.flush()

    models_data = [
        ("Magnus Neo", "MAT-MAG-TEST-01", "Ocean Blue"),
        ("Primus", "MAT-PRM-TEST-01", "Ruby Red"),
        ("Nexus", "MAT-NEX-TEST-01", "Stealth Grey"),
    ]
    vms = []
    for name, mat_no, colour in models_data:
        m_stmt = select(VehicleModel).where(VehicleModel.model_name == name, VehicleModel.is_deleted.is_(False))
        existing_vm = (await db.execute(m_stmt)).scalars().first()
        if not existing_vm:
            existing_vm = VehicleModel(
                brand_id=brand.brand_id,
                model_name=name,
                material_number=mat_no,
                colour=colour,
            )
            db.add(existing_vm)
            await db.flush()
        vms.append(existing_vm)
    await db.commit()
    return vms


async def test_get_master_sheet_empty(admin_client: AsyncClient):
    """GET /api/v1/inventory/master-sheet returns a list."""
    response = await admin_client.get("/api/v1/inventory/master-sheet")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


async def test_get_active_vehicle_models(admin_client: AsyncClient, db_session: AsyncSession):
    """GET /api/v1/inventory/master-sheet/models returns active vehicle model names."""
    await setup_vehicle_models(db_session)

    response = await admin_client.get("/api/v1/inventory/master-sheet/models")
    assert response.status_code == 200
    models = response.json()
    assert "Magnus Neo" in models
    assert "Primus" in models
    assert "Nexus" in models


async def test_post_master_sheet_item_atomic_creation(admin_client: AsyncClient, db_session: AsyncSession):
    """POST /api/v1/inventory/master-sheet creates spare master, part code, pricing, and vehicle compatibility atomically."""
    await setup_vehicle_models(db_session)

    payload = {
        "part_code": "SP-BRK-999",
        "description": "Ceramic Disc Brake Caliper",
        "category": "Brakes",
        "tracking_mode": "QUANTITY",
        "hsn_code": "87141090",
        "gst_rate": 18.0,
        "ex_factory": 850.0,
        "dlp": 1000.0,
        "mrp": 1450.0,
        "compatible_models": ["Magnus Neo", "Primus"],
        "model_prices": {
            "Magnus Neo": 1450.0,
            "Primus": 1500.0,
        },
        "remarks": "High performance brake caliper",
    }

    response = await admin_client.post("/api/v1/inventory/master-sheet", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert data["part_code"] == "SP-BRK-999"
    assert data["description"] == "Ceramic Disc Brake Caliper"
    assert data["category"] == "Brakes"
    assert data["hsn_code"] == "87141090"
    assert data["gst_rate"] == 18.0
    assert data["dlp"] == 1000.0
    assert data["mrp"] == 1450.0
    assert "Magnus Neo" in data["compatible_models"]
    assert "Primus" in data["compatible_models"]
    assert data["model_prices"]["Magnus Neo"] == 1450.0
    assert data["model_prices"]["Primus"] == 1500.0
    # Flattened dynamic column checks
    assert data["Magnus Neo"] == 1450.0
    assert data["Primus"] == 1500.0

    # Verify DB records
    spare = await db_session.get(SpareMaster, data["spare_id"])
    assert spare is not None
    assert spare.spare_name == "Ceramic Disc Brake Caliper"

    # Check PriceListItem created
    pli_stmt = select(PriceListItem).where(PriceListItem.part_code == "SP-BRK-999")
    pli_res = await db_session.execute(pli_stmt)
    pli = pli_res.scalar_one_or_none()
    assert pli is not None
    assert float(pli.mrp) == 1450.0
    assert float(pli.dlp) == 1000.0


async def test_post_master_sheet_duplicate_rejected(admin_client: AsyncClient, db_session: AsyncSession):
    """POST /api/v1/inventory/master-sheet rejects duplicate part codes with HTTP 400."""
    payload = {
        "part_code": "SP-DUP-001",
        "description": "Original Part",
        "category": "Electrical",
    }
    r1 = await admin_client.post("/api/v1/inventory/master-sheet", json=payload)
    assert r1.status_code == 201

    # Second attempt with same part code
    r2 = await admin_client.post("/api/v1/inventory/master-sheet", json=payload)
    assert r2.status_code == 400
    assert "already exists" in r2.json()["detail"]


async def test_put_master_sheet_item_update(admin_client: AsyncClient, db_session: AsyncSession):
    """PUT /api/v1/inventory/master-sheet/{part_code} updates pricing, description, and model compatibility instantly."""
    await setup_vehicle_models(db_session)

    # 1. Create part
    create_payload = {
        "part_code": "SP-UPD-001",
        "description": "Standard Headlight Bulb",
        "category": "Lighting",
        "dlp": 200.0,
        "mrp": 350.0,
    }
    await admin_client.post("/api/v1/inventory/master-sheet", json=create_payload)

    # 2. Update part
    update_payload = {
        "description": "LED Projector Headlight Bulb 50W",
        "mrp": 550.0,
        "dlp": 320.0,
        "hsn_code": "85122010",
        "compatible_models": ["Nexus"],
        "model_prices": {
            "Nexus": 550.0,
        },
    }
    put_res = await admin_client.put("/api/v1/inventory/master-sheet/SP-UPD-001", json=update_payload)
    assert put_res.status_code == 200
    updated = put_res.json()

    assert updated["description"] == "LED Projector Headlight Bulb 50W"
    assert updated["mrp"] == 550.0
    assert updated["dlp"] == 320.0
    assert updated["hsn_code"] == "85122010"
    assert updated["compatible_models"] == ["Nexus"]
    assert updated["model_prices"]["Nexus"] == 550.0


async def test_put_master_sheet_not_found(admin_client: AsyncClient):
    """PUT /api/v1/inventory/master-sheet/{part_code} returns HTTP 404 for unknown parts."""
    response = await admin_client.put(
        "/api/v1/inventory/master-sheet/NON-EXISTENT",
        json={"description": "Ghost Part"},
    )
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


async def test_delete_master_sheet_item(admin_client: AsyncClient, db_session: AsyncSession):
    """DELETE /api/v1/inventory/master-sheet/{part_code} safely soft-deletes a part."""
    # 1. Create part
    payload = {
        "part_code": "SP-DEL-001",
        "description": "Part to be deleted",
        "category": "Temporary",
    }
    await admin_client.post("/api/v1/inventory/master-sheet", json=payload)

    # 2. Delete part
    del_res = await admin_client.delete("/api/v1/inventory/master-sheet/SP-DEL-001")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # 3. Verify it does not appear in active get_master_sheet
    list_res = await admin_client.get("/api/v1/inventory/master-sheet")
    active_codes = [item["part_code"] for item in list_res.json()]
    assert "SP-DEL-001" not in active_codes

    # 4. Verify in DB is marked deleted
    code_stmt = select(SparePartCode).where(SparePartCode.code == "SP-DEL-001")
    code_res = await db_session.execute(code_stmt)
    code_obj = code_res.scalar_one_or_none()
    assert code_obj.is_deleted is True


async def test_get_master_sheet_search_and_filters(admin_client: AsyncClient, db_session: AsyncSession):
    """GET /api/v1/inventory/master-sheet filters by search query and category."""
    # Create two parts in different categories
    p1 = {
        "part_code": "SP-FLT-A01",
        "description": "Oil Filter Element",
        "category": "Filters",
        "mrp": 150.0,
    }
    p2 = {
        "part_code": "SP-FLT-B02",
        "description": "Air Filter Assembly",
        "category": "Filters",
        "mrp": 250.0,
    }
    p3 = {
        "part_code": "SP-SUS-C03",
        "description": "Rear Shock Absorber",
        "category": "Suspension",
        "mrp": 1200.0,
    }
    for p in [p1, p2, p3]:
        await admin_client.post("/api/v1/inventory/master-sheet", json=p)

    # Search for "SP-SUS-C03"
    search_res = await admin_client.get("/api/v1/inventory/master-sheet?search=SP-SUS-C03")
    assert search_res.status_code == 200
    items = search_res.json()
    assert len(items) == 1
    assert items[0]["part_code"] == "SP-SUS-C03"

    # Filter by category "Filters"
    cat_res = await admin_client.get("/api/v1/inventory/master-sheet?category=Filters")
    assert cat_res.status_code == 200
    filter_items = cat_res.json()
    assert all(item["category"] == "Filters" for item in filter_items)
    filter_codes = [item["part_code"] for item in filter_items]
    assert "SP-FLT-A01" in filter_codes
    assert "SP-FLT-B02" in filter_codes
    assert "SP-SUS-C03" not in filter_codes
