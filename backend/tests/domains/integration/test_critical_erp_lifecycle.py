import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.modules.master.models import Vehicle
from app.modules.inventory.models import SpareStockBalance, SpareCostHistory
from app.modules.sales.models import Sale
from app.modules.billing import services as billing_services
from app.modules.finance.models import VehicleFinance
from app.core.event_bus import SaleTransactionCompletedEvent
from tests.factories.customer import CustomerFactory
from tests.factories.spare import VendorFactory, SpareMasterFactory
from tests.factories.vehicle import BrandFactory, VehicleModelFactory


@pytest.mark.asyncio
async def test_procurement_to_inventory_lifecycle(admin_client: AsyncClient, db_session: AsyncSession):
    """
    Test End-to-End Procurement Flow:
    1. Create Vendor & Spare Master.
    2. Upload simulated OCR purchase invoice receipt.
    3. Verify and Approve purchase draft.
    4. Post approved receipt to inventory stock.
    5. Assert stock balances and movement audit ledgers are updated.
    """
    # 1. Setup vendor and spare part
    vendor = await VendorFactory.create(db_session, vendor_name="Lucas TVS OEM", gstin="27AAACL1234F1Z5")
    spare = await SpareMasterFactory.create(
        db_session, spare_name="Regenerative Brake Sensor", tracking_mode="QUANTITY"
    )

    from app.modules.inventory.models import SparePartCode

    code = SparePartCode(spare_id=spare.spare_id, code="RBS-2026-X", is_current=True)
    db_session.add(code)
    await db_session.flush()

    # 2. Upload OCR Purchase receipt
    files = {"file": ("invoice_rbs.pdf", b"%PDF-1.4 simulated pdf invoice content", "application/pdf")}
    data = {"vendor_id": str(vendor.vendor_id)}

    ocr_response = await admin_client.post("/procurement/purchases/spares/ocr", data=data, files=files)
    assert ocr_response.status_code == 201
    purchase_data = ocr_response.json()
    purchase_id = purchase_data["spare_purchase_id"]
    assert purchase_data["status"] == "OCR_PROCESSED"

    # 3. Verify draft purchase with exact line items
    verify_payload = {
        "vendor_id": vendor.vendor_id,
        "vendor_invoice_no": "INV-LUCAS-8899",
        "vendor_invoice_date": "2026-10-13",
        "purchase_date": "2026-10-13",
        "remarks": "Verified by inventory manager",
        "include_in_accounting": True,
        "status": "VERIFIED",
        "subtotal": 5000.00,
        "tax_total": 900.00,
        "landed_cost_total": 5900.00,
        "items": [
            {
                "spare_id": spare.spare_id,
                "part_code": "RBS-2026-X",
                "part_description": "Regenerative Brake Sensor",
                "quantity": 10,
                "unit_cost": "500.00",
                "discount": "0.00",
                "tax_amount": "900.00",
                "verification_status": "CONFIRMED",
            }
        ],
    }
    verify_res = await admin_client.put(f"/procurement/purchases/spares/{purchase_id}/verify", json=verify_payload)
    assert verify_res.status_code == 200
    assert verify_res.json()["status"] == "VERIFIED"

    # 4. Approve purchase
    approve_res = await admin_client.post(f"/procurement/purchases/spares/{purchase_id}/approve")
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "APPROVED"

    # 5. Post approved receipt to inventory stock
    post_payload = {
        "items": [{"purchase_item_id": verify_res.json()["items"][0]["purchase_item_id"], "location": "MAIN"}]
    }
    post_res = await admin_client.post(f"/procurement/purchases/spares/{purchase_id}/post", json=post_payload)
    assert post_res.status_code == 200
    assert post_res.json()["status"] == "POSTED"

    # 6. Verify inventory balance update
    stmt = select(SpareStockBalance).filter_by(spare_id=spare.spare_id, location="MAIN")
    bal_res = await db_session.execute(stmt)
    balance = bal_res.scalars().first()
    assert balance is not None
    assert balance.quantity == 10

    # Verify inventory cost history was logged
    cost_stmt = select(SpareCostHistory).filter_by(spare_id=spare.spare_id)
    cost_res = await db_session.execute(cost_stmt)
    costs = cost_res.scalars().all()
    assert len(costs) >= 1
    assert costs[0].quantity == 10


@pytest.mark.asyncio
async def test_vehicle_intake_to_sale_and_finance_ledger_lifecycle(admin_client: AsyncClient, db_session: AsyncSession):
    """
    Test End-to-End Vehicle Sales & Finance Flow:
    1. OEM Vehicle intake bulk-registers vehicles into inventory as IN_STOCK.
    2. Customer books and purchases vehicle.
    3. Vehicle is delivered and sales invoice is generated with GST ledger calculations.
    4. Financing event completes, registering ledger entry in vehicle_finance table.
    """
    # 1. Setup vendor, brand, and vehicle model
    vendor = await VendorFactory.create(db_session, vendor_name="Tata Motors OEM", gstin="27AAATM9988G1Z1")
    brand = await BrandFactory.create(db_session, brand_name="Electra Pro")
    model = await VehicleModelFactory.create(
        db_session, brand_id=brand.brand_id, model_name="Electra Sport X", material_number="MAT-ELSP-01"
    )

    # 2. Intake vehicles from OEM
    chassis_code = "E2E-CHASSIS-INTAKE-001"
    intake_payload = {
        "vendor_id": vendor.vendor_id,
        "oem_invoice_no": "OEM-INV-9901",
        "oem_invoice_date": "2026-10-13",
        "vehicles": [
            {
                "chassis_no": chassis_code,
                "vehicle_model_id": model.vehicle_model_id,
                "color": "Midnight Blue",
                "motor_no": "MOT-ELSP-001",
                "battery_serial_no": "BAT-ELSP-001",
                "purchase_price": "120000.0",
            }
        ],
    }
    intake_res = await admin_client.post("/procurement/purchases/vehicles/intake", json=intake_payload)
    assert intake_res.status_code == 201

    # Verify vehicle was registered as IN_STOCK
    veh_stmt = select(Vehicle).filter_by(chassis_no=chassis_code)
    veh_result = await db_session.execute(veh_stmt)
    vehicle = veh_result.scalars().first()
    assert vehicle is not None
    assert vehicle.current_status == "IN_STOCK"

    # 3. Customer Creation
    customer = await CustomerFactory.create(db_session, name="Vikram Mehta", primary_phone="9988776655")

    # Fetch admin staff
    from app.modules.master.models import Staff
    staff_res = await db_session.execute(select(Staff).where(Staff.designation == "ADMIN"))
    staff = staff_res.scalars().first()
    staff_id = staff.staff_id if staff else 1

    # 4. Create Sale
    sale = Sale(
        customer_id=customer.customer_id,
        chassis_no=chassis_code,
        total_amount=150000.0,
        sale_status="PENDING",
        created_by_staff_id=staff_id,
        created_by=staff_id,
    )
    db_session.add(sale)
    await db_session.flush()

    # 5. Mark as DELIVERED & Generate Invoicing
    sale.sale_status = "DELIVERED"
    vehicle.current_status = "SOLD"
    await db_session.flush()

    invoice = await billing_services.generate_invoice(
        db_session, sale_id=sale.sale_id, taxable_amount=127118.64, gst_rate=18.0, remarks="Customer delivery invoice"
    )

    assert invoice.invoice_id is not None
    assert invoice.sale_id == sale.sale_id
    assert invoice.total_amount == 150000.0
    assert invoice.gst_amount == pytest.approx(22881.36, rel=1e-2)
    assert invoice.is_final is False

    # Finalize invoice
    final_invoice = await billing_services.finalize_invoice(db_session, invoice=invoice)
    assert final_invoice.is_final is True

    # 6. Process Finance Payment and Trigger Finance Ledger
    from app.modules.finance.listeners import on_sale_transaction_completed_finance

    finance_event = SaleTransactionCompletedEvent(
        sale_id=sale.sale_id,
        customer_id=customer.customer_id,
        chassis_no=chassis_code,
        staff_id=staff_id,
        payment_mode="FINANCE",
        financier_name="Tata Capital EV Finance",
        total_amount=150000.0,
        down_payment_amount=30000.0,
    )

    # Execute finance listener directly with active db_session
    await on_sale_transaction_completed_finance(finance_event, db=db_session)

    # 7. Assert finance ledger entry is created with correct terms
    fin_stmt = select(VehicleFinance).filter_by(sale_id=sale.sale_id)
    fin_result = await db_session.execute(fin_stmt)
    finance_record = fin_result.scalars().first()

    assert finance_record is not None
    assert finance_record.financer_name == "Tata Capital EV Finance"
    assert finance_record.loan_amount == 120000.0
    assert finance_record.down_payment == 30000.0
    assert finance_record.finance_status == "INITIATED"
