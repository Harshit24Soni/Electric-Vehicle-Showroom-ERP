import pytest
from httpx import AsyncClient
from app.domains.service.models import ServiceJobCard, ServiceSpareConsumption
from app.modules.inventory.models import SpareStockMovement, SpareStockBalance, SpareMaster
from sqlalchemy import select

@pytest.fixture
async def sample_spare_part(db_session):
    part = SpareMaster(
        spare_name="Test Spare",
        category="CONSUMABLE",
        tracking_mode="QUANTITY",
        status="ACTIVE"
    )
    db_session.add(part)
    await db_session.flush()

    from app.modules.inventory.models import SparePartCode
    code = SparePartCode(
        spare_id=part.spare_id,
        code="TEST-SPARE-001",
        is_current=True
    )
    db_session.add(code)
    await db_session.flush()

    balance = SpareStockBalance(
        spare_id=part.spare_id,
        location="MAIN",
        quantity=10,
    )
    db_session.add(balance)
    await db_session.flush()

    movement = SpareStockMovement(
        spare_id=part.spare_id,
        movement_type="PURCHASE",
        reference_type="DIRECT",
        reference_id=1,
        from_location="SUPPLIER",
        to_location="MAIN",
        quantity=10,
        unit_cost=100.0,
        total_cost=1000.0,
    )
    db_session.add(movement)
    await db_session.flush()

    from app.domains.master.models import Vehicle, VehicleModel, Brand
    brand = Brand(brand_name="Test Brand")
    db_session.add(brand)
    await db_session.flush()

    v_model = VehicleModel(
        model_name="Test Model",
        brand_id=brand.brand_id,
        material_number="MAT123",
        colour="Red",
        is_active=True
    )
    db_session.add(v_model)
    await db_session.flush()

    vehicle = Vehicle(
        chassis_no="VIN123TEST",
        vehicle_model_id=v_model.vehicle_model_id,
        current_status="IN_STOCK"
    )
    db_session.add(vehicle)
    await db_session.flush()

    return part

@pytest.mark.asyncio
async def test_job_card_spare_workflow(
    admin_client: AsyncClient,
    db_session,
    sample_spare_part
):
    # 1. Open Job Card
    res = await admin_client.post("/service/job-card", json={
        "chassis_no": "VIN123TEST",
        "is_free_service": False,
        "remarks": "Test Service"
    })
    
    assert res.status_code == 201
    job_card_id = res.json()["job_card_id"]

    spare_id = sample_spare_part.spare_id
    
    # 2. Draft consumption
    res = await admin_client.post(f"/service/job-cards/{job_card_id}/spares", json={
        "spare_id": spare_id,
        "quantity": 2,
        "tracking_mode": "QUANTITY"
    })
    
    assert res.status_code == 201
    consumption = res.json()
    assert consumption["status"] == "DRAFT"
    assert consumption["quantity"] == 2
    consumption_id = consumption["consumption_id"]
    
    # 3. Confirm consumption
    res = await admin_client.post(
        f"/service/job-cards/{job_card_id}/spares/{consumption_id}/consume"
    )
    assert res.status_code == 200
    confirmed = res.json()
    assert confirmed["status"] == "CONSUMED"
    assert confirmed["stock_movement_id"] is not None
    
    # 4. Check stock decreases
    stmt = select(SpareStockBalance).where(SpareStockBalance.spare_id == spare_id)
    balance = (await db_session.execute(stmt)).scalar_one()
    assert balance.quantity == 8
    
    # 5. Reverse consumption
    res = await admin_client.post(
        f"/service/job-cards/{job_card_id}/spares/{consumption_id}/reverse"
    )
    assert res.status_code == 200
    reversed_cons = res.json()
    assert reversed_cons["status"] == "REVERSED"

    stmt = select(SpareStockBalance).where(SpareStockBalance.spare_id == spare_id)
    balance = (await db_session.execute(stmt)).scalar_one()
    assert balance.quantity == 10
