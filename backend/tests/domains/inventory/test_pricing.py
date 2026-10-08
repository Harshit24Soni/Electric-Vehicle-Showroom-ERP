import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone, timedelta
from app.domains.inventory import pricing_services, services
from app.modules.inventory.models import SpareMaster, SparePartCode, PriceList, SpareSellingPriceHistory, SpareCostHistory
from decimal import Decimal

@pytest.mark.asyncio
async def test_mrp_vs_cost(db_session: AsyncSession):
    # Requirement: MRP < Cost must be valid
    
    # 1. Create a spare
    spare = await services.create_spare(
        db_session,
        spare_name="Test Part for Pricing",
        initial_code="TEST-MRP-COST",
        tracking_mode="QUANTITY"
    )
    
    # 2. Add Selling Price (MRP proxy or actual)
    await pricing_services.add_spare_selling_price(
        db_session,
        spare_id=spare.spare_id,
        selling_price=Decimal("1000.00"),
        reason="Initial MRP"
    )
    
    # 3. Add Cost which is greater than MRP
    cost = await pricing_services.add_spare_cost(
        db_session,
        spare_id=spare.spare_id,
        quantity=10,
        billed_unit_price=Decimal("1200.00"),
        additional_costs=Decimal("50.00"),
        source_reference="INV-001"
    )
    
    assert cost.landed_cost == Decimal("1250.00")
    
    # 4. Check margin
    margin = await pricing_services.calculate_margin(db_session, spare.spare_id)
    assert margin["selling_price"] == 1000.00
    assert margin["cost"] == 1250.00
    assert margin["profit"] == -250.00
    assert margin["profit_percentage"] == -20.0  # -250 / 1250 * 100
    

@pytest.mark.asyncio
async def test_price_history_never_overwritten(db_session: AsyncSession):
    # Requirement: Price history must never be overwritten.
    
    pl = await pricing_services.create_price_list(db_session, source_name="OEM")
    
    v1 = await pricing_services.add_price_list_version(
        db_session,
        price_list_id=pl.price_list_id,
        version_reference="v1",
        effective_from=datetime.now(timezone.utc).replace(tzinfo=None),
        received_date=datetime.now(timezone.utc).replace(tzinfo=None),
        items_data=[
            {"part_code": "HISTORY-CODE", "mrp": 1000, "dlp": 800, "gst_rate": 18}
        ]
    )
    
    v2 = await pricing_services.add_price_list_version(
        db_session,
        price_list_id=pl.price_list_id,
        version_reference="v2",
        effective_from=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=30),
        received_date=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=30),
        items_data=[
            {"part_code": "HISTORY-CODE", "mrp": 1200, "dlp": 900, "gst_rate": 18}
        ]
    )
    
    spare = await services.create_spare(
        db_session,
        spare_name="Test Part History",
        initial_code="HISTORY-CODE",
        tracking_mode="QUANTITY"
    )
    
    history = await pricing_services.get_price_history(db_session, spare.spare_id)
    assert len(history) == 2
    mrps = {h.mrp for h in history}
    assert mrps == {Decimal("1000.00"), Decimal("1200.00")}

@pytest.mark.asyncio
async def test_actual_cost_separation(db_session: AsyncSession):
    # Requirement: Price List DLP = 500, Actual Billed Cost = 470
    spare = await services.create_spare(
        db_session,
        spare_name="Test Cost Separation",
        initial_code="COST-SEP-CODE",
        tracking_mode="QUANTITY"
    )
    
    pl = await pricing_services.create_price_list(db_session, source_name="OEM")
    await pricing_services.add_price_list_version(
        db_session,
        price_list_id=pl.price_list_id,
        version_reference="v1",
        effective_from=datetime.now(timezone.utc).replace(tzinfo=None),
        received_date=datetime.now(timezone.utc).replace(tzinfo=None),
        items_data=[
            {"part_code": "COST-SEP-CODE", "mrp": 700, "dlp": 500, "gst_rate": 18}
        ]
    )
    
    cost = await pricing_services.add_spare_cost(
        db_session,
        spare_id=spare.spare_id,
        quantity=5,
        billed_unit_price=Decimal("470.00"),
        additional_costs=Decimal("0.00"),
        source_reference="INV-002"
    )
    
    # Cost should be 470, while DLP in history is 500. They are separate values.
    assert cost.billed_unit_price == Decimal("470.00")
    
    history = await pricing_services.get_price_history(db_session, spare.spare_id)
    assert history[0].dlp == Decimal("500.00")

@pytest.mark.asyncio
async def test_api_create_price_list(admin_client: AsyncClient, db_session: AsyncSession):
    resp = await admin_client.post(
        "/inventory/pricing/price-lists",
        json={
            "source_name": "OEM Master",
            "remarks": "Test List",
            "initial_version": {
                "version_reference": "2026-Jan",
                "effective_from": "2026-01-01T00:00:00Z",
                "received_date": "2025-12-25T00:00:00Z",
                "items": [
                    {"part_code": "API-TEST-CODE", "mrp": 100, "dlp": 80}
                ]
            }
        }
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["source_name"] == "OEM Master"
    assert len(data["versions"]) == 1
    assert data["versions"][0]["version_reference"] == "2026-Jan"
    assert len(data["versions"][0]["items"]) == 1
    assert data["versions"][0]["items"][0]["part_code"] == "API-TEST-CODE"
