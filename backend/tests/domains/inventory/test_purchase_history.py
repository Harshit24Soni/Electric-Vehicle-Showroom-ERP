import pytest
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.inventory.models import (
    SpareMaster,
    SparePartCode,
    SpareCostHistory,
)
from app.modules.inventory.purchase_history_service import get_part_purchase_history
from app.modules.master.models import Vendor
from app.modules.procurement.models import SparePurchase, SparePurchaseItem

pytestmark = pytest.mark.asyncio


@pytest.fixture
async def setup_purchase_history_data(db_session: AsyncSession):
    """Seed test vendors, spare part, and multiple procurement bills."""
    # 1. Vendor
    stmt = select(Vendor).where(Vendor.vendor_name == "Brembo Brakes India Ltd")
    vendor1 = (await db_session.execute(stmt)).scalars().first()
    if not vendor1:
        vendor1 = Vendor(
            vendor_name="Brembo Brakes India Ltd",
            vendor_type="OEM",
            gstin="27AABCB1234F1Z1",
            city="Pune",
            state="Maharashtra",
        )
        db_session.add(vendor1)
        await db_session.flush()

    stmt = select(Vendor).where(Vendor.vendor_name == "Bosch Chassis Systems Ltd")
    vendor2 = (await db_session.execute(stmt)).scalars().first()
    if not vendor2:
        vendor2 = Vendor(
            vendor_name="Bosch Chassis Systems Ltd",
            vendor_type="DISTRIBUTOR",
            gstin="29AABCB5678F1Z2",
            city="Bengaluru",
            state="Karnataka",
        )
        db_session.add(vendor2)
        await db_session.flush()

    # 2. Spare Master
    s_stmt = select(SparePartCode).where(SparePartCode.code == "SP-BRK-AUDIT-01")
    existing_code = (await db_session.execute(s_stmt)).scalars().first()
    if existing_code:
        spare = await db_session.get(SpareMaster, existing_code.spare_id)
    else:
        spare = SpareMaster(
            spare_name="Ceramic Front Brake Pad Assembly",
            category="Brakes",
            tracking_mode="QUANTITY",
            status="ACTIVE",
            hsn_code="87141090",
            gst_rate=Decimal("18.00"),
            base_cost=Decimal("450.00"),
            base_dlp=Decimal("500.00"),
            base_mrp=Decimal("750.00"),
            profit_margin_percent=Decimal("50.00"),
        )
        db_session.add(spare)
        await db_session.flush()

        code = SparePartCode(
            spare_id=spare.spare_id,
            code="SP-BRK-AUDIT-01",
            is_current=True,
            reason="Primary code",
        )
        db_session.add(code)
        await db_session.flush()

    # 3. Bill 1 (Older: 30 days ago, 10 units @ 420.00 from Brembo)
    date1 = date.today() - timedelta(days=30)
    purch1 = SparePurchase(
        vendor_id=vendor1.vendor_id,
        vendor_invoice_no="INV-BREMBO-0912",
        vendor_invoice_date=date1,
        purchase_date=date1,
        status="POSTED",
        subtotal=Decimal("4200.00"),
        tax_total=Decimal("756.00"),
        landed_cost_total=Decimal("4956.00"),
    )
    db_session.add(purch1)
    await db_session.flush()

    item1 = SparePurchaseItem(
        spare_purchase_id=purch1.spare_purchase_id,
        spare_id=spare.spare_id,
        part_code="SP-BRK-AUDIT-01",
        quantity=10,
        unit_cost=Decimal("420.00"),
        gst_percentage=Decimal("18.00"),
        tax_amount=Decimal("756.00"),
        total_cost=Decimal("4956.00"),
        verification_status="CONFIRMED",
    )
    db_session.add(item1)

    # 4. Bill 2 (Recent: 5 days ago, 25 units @ 480.00 from Bosch)
    date2 = date.today() - timedelta(days=5)
    purch2 = SparePurchase(
        vendor_id=vendor2.vendor_id,
        vendor_invoice_no="INV-BOSCH-8821",
        vendor_invoice_date=date2,
        purchase_date=date2,
        status="POSTED",
        subtotal=Decimal("12000.00"),
        tax_total=Decimal("2160.00"),
        landed_cost_total=Decimal("14160.00"),
    )
    db_session.add(purch2)
    await db_session.flush()

    item2 = SparePurchaseItem(
        spare_purchase_id=purch2.spare_purchase_id,
        spare_id=spare.spare_id,
        part_code="SP-BRK-AUDIT-01",
        quantity=25,
        unit_cost=Decimal("480.00"),
        gst_percentage=Decimal("18.00"),
        tax_amount=Decimal("2160.00"),
        total_cost=Decimal("14160.00"),
        verification_status="CONFIRMED",
    )
    db_session.add(item2)

    await db_session.commit()
    return spare, purch1, purch2


async def test_get_part_purchase_history_service(db_session: AsyncSession, setup_purchase_history_data):
    """Direct service unit test verifying bill details and aggregated metrics."""
    spare, purch1, purch2 = setup_purchase_history_data

    summary = await get_part_purchase_history(db_session, "SP-BRK-AUDIT-01")

    assert summary.part_code == "SP-BRK-AUDIT-01"
    assert summary.part_name == "Ceramic Front Brake Pad Assembly"
    assert summary.category == "Brakes"
    assert summary.hsn_code == "87141090"

    # Bills count and ordering: most recent first (INV-BOSCH-8821, then INV-BREMBO-0912)
    assert summary.total_bills_count == 2
    assert len(summary.bills) == 2
    assert summary.bills[0].bill_number == "INV-BOSCH-8821"
    assert summary.bills[0].vendor_name == "Bosch Chassis Systems Ltd"
    assert summary.bills[0].quantity == 25
    assert summary.bills[0].unit_rate == 480.0
    assert summary.bills[0].total_amount == 14160.0

    assert summary.bills[1].bill_number == "INV-BREMBO-0912"
    assert summary.bills[1].vendor_name == "Brembo Brakes India Ltd"
    assert summary.bills[1].quantity == 10
    assert summary.bills[1].unit_rate == 420.0
    assert summary.bills[1].total_amount == 4956.0

    # Aggregated KPIs
    assert summary.total_quantity_bought == 35  # 25 + 10
    assert summary.total_spend == 19116.0  # 14160 + 4956
    assert summary.lowest_purchase_rate == 420.0
    assert summary.highest_purchase_rate == 480.0
    assert summary.last_purchase_rate == 480.0
    assert summary.last_bill_number == "INV-BOSCH-8821"
    assert summary.last_vendor_name == "Bosch Chassis Systems Ltd"

    # Weighted Average Cost: 19116 / 35 = 546.17 (landed)
    assert summary.weighted_average_cost is not None
    assert summary.weighted_average_cost > 0


async def test_purchase_history_for_unbought_part(db_session: AsyncSession):
    """Test a part that exists in master sheet but has no purchase invoices yet."""
    spare = SpareMaster(
        spare_name="Rare Unbought Component",
        category="Electrical",
        tracking_mode="QUANTITY",
        status="ACTIVE",
        base_cost=Decimal("350.00"),
    )
    db_session.add(spare)
    await db_session.flush()

    code = SparePartCode(
        spare_id=spare.spare_id,
        code="SP-UNBOUGHT-999",
        is_current=True,
    )
    db_session.add(code)
    await db_session.commit()

    summary = await get_part_purchase_history(db_session, "SP-UNBOUGHT-999")

    assert summary.part_code == "SP-UNBOUGHT-999"
    assert summary.total_bills_count == 0
    assert summary.total_quantity_bought == 0
    assert summary.total_spend == 0.0
    assert summary.bills == []
    # Fallback to base_cost when no bills exist
    assert summary.last_purchase_rate == 350.0
    assert summary.weighted_average_cost == 350.0


async def test_api_master_sheet_purchase_history(admin_client: AsyncClient, setup_purchase_history_data):
    """Test GET /api/v1/inventory/master-sheet/{part_code}/purchase-history."""
    response = await admin_client.get("/api/v1/inventory/master-sheet/SP-BRK-AUDIT-01/purchase-history")
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["part_code"] == "SP-BRK-AUDIT-01"
    assert data["total_bills_count"] == 2
    assert data["total_quantity_bought"] == 35
    assert len(data["bills"]) == 2
    assert data["bills"][0]["bill_number"] == "INV-BOSCH-8821"
    assert data["bills"][0]["quantity"] == 25
    assert data["bills"][0]["unit_rate"] == 480.0
    assert data["bills"][1]["bill_number"] == "INV-BREMBO-0912"
    assert data["bills"][1]["quantity"] == 10
    assert data["bills"][1]["unit_rate"] == 420.0


async def test_api_spares_purchase_history(admin_client: AsyncClient, setup_purchase_history_data):
    """Test GET /inventory/spares/{spare_id}/purchase-history."""
    spare, _, _ = setup_purchase_history_data
    response = await admin_client.get(f"/inventory/spares/{spare.spare_id}/purchase-history")
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["spare_id"] == spare.spare_id
    assert data["part_code"] == "SP-BRK-AUDIT-01"
    assert data["total_bills_count"] == 2
    assert data["bills"][0]["is_po_bill"] is True
    assert data["bills"][0]["source_type"] == "PO_BILL"


async def test_purchase_history_differentiates_import_studio_and_po_bills(db_session: AsyncSession):
    """
    Test that data entered via Import Studio / Worksheet Ingestion is categorized as
    DIRECT_ENTRY / IMPORT_STUDIO, is_po_bill=False, and does not inflate total_bills_count.
    """
    # 1. Create a spare
    spare = SpareMaster(
        spare_name="Heavy Duty Motor Controller 48V",
        category="Electrical",
        tracking_mode="QUANTITY",
        status="ACTIVE",
        base_cost=Decimal("2200.00"),
    )
    db_session.add(spare)
    await db_session.flush()

    code = SparePartCode(
        spare_id=spare.spare_id,
        code="SP-CTRL-DIFF-01",
        is_current=True,
    )
    db_session.add(code)
    await db_session.flush()

    # 2. Add an Import Studio entry (Worksheet Batch Ingestion via SpareCostHistory)
    cost_entry = SpareCostHistory(
        spare_id=spare.spare_id,
        quantity=0,
        billed_unit_price=Decimal("2200.00"),
        landed_cost=Decimal("2250.00"),
        source_reference="Worksheet Batch Ingestion",
        effective_date=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=20),
    )
    db_session.add(cost_entry)

    # 3. Add an authentic PO bill (SparePurchase from OEM Vendor)
    stmt = select(Vendor).where(Vendor.vendor_name == "Brembo Brakes India Ltd")
    vendor = (await db_session.execute(stmt)).scalars().first()
    if not vendor:
        vendor = Vendor(
            vendor_name="Brembo Brakes India Ltd",
            vendor_type="OEM",
            gstin="27AABCB1234F1Z1",
            city="Pune",
            state="Maharashtra",
        )
        db_session.add(vendor)
        await db_session.flush()

    purch = SparePurchase(
        vendor_id=vendor.vendor_id,
        vendor_invoice_no="INV-PO-OFFICIAL-101",
        vendor_invoice_date=date.today(),
        purchase_date=date.today(),
        status="POSTED",
        subtotal=Decimal("23000.00"),
        tax_total=Decimal("4140.00"),
        landed_cost_total=Decimal("27140.00"),
    )
    db_session.add(purch)
    await db_session.flush()

    item = SparePurchaseItem(
        spare_purchase_id=purch.spare_purchase_id,
        spare_id=spare.spare_id,
        part_code="SP-CTRL-DIFF-01",
        quantity=10,
        unit_cost=Decimal("2300.00"),
        gst_percentage=Decimal("18.00"),
        tax_amount=Decimal("4140.00"),
        total_cost=Decimal("27140.00"),
        verification_status="CONFIRMED",
    )
    db_session.add(item)
    await db_session.commit()

    # 4. Query purchase history
    summary = await get_part_purchase_history(db_session, "SP-CTRL-DIFF-01")

    # CRUCIAL ASSERTION:
    # total_bills_count must be 1 (ONLY the authentic PO bill!), NOT 2!
    assert summary.total_bills_count == 1
    assert summary.direct_entries_count == 1
    assert summary.total_records_count == 2
    assert summary.total_quantity_bought == 10
    assert summary.total_spend == 27140.0

    # Inspect records
    po_record = next(b for b in summary.bills if b.is_po_bill)
    studio_record = next(b for b in summary.bills if not b.is_po_bill)

    # PO Record assertions
    assert po_record.is_po_bill is True
    assert po_record.source_type == "PO_BILL"
    assert po_record.bill_number == "INV-PO-OFFICIAL-101"
    assert po_record.quantity == 10
    assert po_record.unit_rate == 2300.0

    # Studio Record assertions
    assert studio_record.is_po_bill is False
    assert studio_record.source_type == "IMPORT_STUDIO"
    assert studio_record.source_label == "Import Studio (Rate Ingestion)"
    assert studio_record.vendor_name == "Worksheet Ingestion Studio"
    assert studio_record.quantity == 0
    assert studio_record.unit_rate == 2200.0
