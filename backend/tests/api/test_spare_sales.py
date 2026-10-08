import pytest
from httpx import AsyncClient
from app.modules.sales.models import SpareSale, SpareSaleItem
from sqlalchemy import select
from decimal import Decimal
from app.modules.inventory.models import SpareStockBalance, SpareBatch, SpareSerial, SpareStockMovement, SpareMaster, SparePartCode
from app.domains.master.models import Customer

@pytest.fixture
async def sample_customer(db_session):
    customer = Customer(
        name="Test Customer",
        primary_phone="9999999999"
    )
    db_session.add(customer)
    await db_session.commit()
    await db_session.refresh(customer)
    return customer

@pytest.fixture
async def sample_spare_part(db_session):
    spare = SpareMaster(
        spare_name="Test Spare",
        tracking_mode="QUANTITY",
        status="ACTIVE"
    )
    db_session.add(spare)
    await db_session.flush()
    code = SparePartCode(
        spare_id=spare.spare_id,
        code="SP-12345"
    )
    db_session.add(code)
    await db_session.commit()
    await db_session.refresh(spare)
    spare.current_part_code = "SP-12345"
    return spare

@pytest.fixture
async def sample_spare_sale(db_session, sample_customer, sample_spare_part):
    sale = SpareSale(
        customer_id=sample_customer.customer_id,
        status="DRAFT",
        subtotal=100.0,
        discount=10.0,
        tax=5.0,
        grand_total=95.0,
        created_by_staff_id=1,
        items=[
            SpareSaleItem(
                spare_id=sample_spare_part.spare_id,
                part_code=sample_spare_part.current_part_code,
                spare_name=sample_spare_part.spare_name,
                tracking_mode=sample_spare_part.tracking_mode,
                quantity=1,
                unit_selling_price=100.0,
                line_total=95.0,
                tax=5.0,
                discount=10.0
            )
        ]
    )
    db_session.add(sale)
    await db_session.commit()
    await db_session.refresh(sale)
    return sale

@pytest.mark.asyncio
async def test_create_draft_sale(admin_client: AsyncClient, sample_customer, sample_spare_part):
    payload = {
        "customer_id": sample_customer.customer_id,
        "items": [
            {
                "spare_id": sample_spare_part.spare_id,
                "part_code": sample_spare_part.current_part_code,
                "spare_name": sample_spare_part.spare_name,
                "tracking_mode": sample_spare_part.tracking_mode,
                "quantity": 2,
                "unit_selling_price": 50.0,
                "discount": 0.0,
                "tax": 10.0,
            }
        ],
        "remarks": "Test draft sale"
    }
    
    response = await admin_client.post("/sales/spares/", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] == "DRAFT"
    assert float(data["grand_total"]) == 110.0
    assert len(data["items"]) == 1

@pytest.mark.asyncio
async def test_confirm_sale_insufficient_stock(admin_client: AsyncClient, sample_spare_sale, db_session):
    # Ensure there is no stock for sample_spare_part
    response = await admin_client.post(f"/sales/spares/{sample_spare_sale.sale_id}/confirm")
    assert response.status_code == 400
    assert "Insufficient stock" in response.text

@pytest.mark.asyncio
async def test_confirm_sale_success(admin_client: AsyncClient, sample_spare_sale, sample_spare_part, db_session):
    # Add stock first
    balance = SpareStockBalance(
        spare_id=sample_spare_part.spare_id,
        location="MAIN",
        quantity=5
    )
    movement = SpareStockMovement(
        spare_id=sample_spare_part.spare_id,
        quantity=5,
        movement_type="PURCHASE",
        reference_type="INITIAL",
        reference_id=1,
        remarks="Initial Stock"
    )
    db_session.add(balance)
    db_session.add(movement)
    await db_session.commit()
    
    response = await admin_client.post(f"/sales/spares/{sample_spare_sale.sale_id}/confirm")
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] == "CONFIRMED"
    assert data["invoice_number"] is not None
    
    # Verify stock decreased
    await db_session.refresh(balance)
    assert balance.quantity == 4
    
    # Verify movement
    stmt = select(SpareStockMovement).where(SpareStockMovement.reference_id == sample_spare_sale.sale_id)
    movement = (await db_session.execute(stmt)).scalars().first()
    assert movement is not None
    assert movement.movement_type == "SALE"
    assert movement.quantity == -1

@pytest.mark.asyncio
async def test_cancel_sale(admin_client: AsyncClient, sample_spare_sale, sample_spare_part, db_session):
    # Add stock first
    balance = SpareStockBalance(
        spare_id=sample_spare_part.spare_id,
        location="MAIN",
        quantity=5
    )
    movement = SpareStockMovement(
        spare_id=sample_spare_part.spare_id,
        quantity=5,
        movement_type="PURCHASE",
        reference_type="INITIAL",
        reference_id=1,
        remarks="Initial Stock"
    )
    db_session.add(balance)
    db_session.add(movement)
    await db_session.commit()
    
    # Confirm
    resp1 = await admin_client.post(f"/sales/spares/{sample_spare_sale.sale_id}/confirm")
    assert resp1.status_code == 200
    await db_session.refresh(balance)
    assert balance.quantity == 4
    
    # Cancel
    resp2 = await admin_client.post(f"/sales/spares/{sample_spare_sale.sale_id}/cancel")
    assert resp2.status_code == 200
    
    # Verify stock restored
    await db_session.refresh(balance)
    assert balance.quantity == 5
