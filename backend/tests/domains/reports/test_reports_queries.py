import pytest
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.reports import services as reports_services
from app.modules.billing.models import SalesInvoice
from app.modules.sales.models import Sale
from app.modules.master.models import Vehicle, VehicleModel, Brand, Staff, Customer


@pytest.mark.asyncio
async def test_reports_dashboard_stats_and_alerts(db_session: AsyncSession):
    # 1. Setup staff and customer
    staff = Staff(
        full_name="Report Agent", mobile_no="9876543230", email="report@erp.test", designation="ADMIN", pin_hash="dummy"
    )
    db_session.add(staff)
    await db_session.flush()

    customer = Customer(name="Report Customer", primary_phone="9876543231", created_by=staff.staff_id)
    db_session.add(customer)
    await db_session.flush()

    # 2. Setup brand and model
    brand = Brand(brand_name="Report Test Brand", created_by=staff.staff_id)
    db_session.add(brand)
    await db_session.flush()

    vm = VehicleModel(
        brand_id=brand.brand_id,
        model_name="Report EV Model",
        material_number="REP-001",
        colour="Midnight Black",
        created_by=staff.staff_id,
    )
    db_session.add(vm)
    await db_session.flush()

    # 3. Add an in-stock vehicle
    vehicle = Vehicle(
        chassis_no="REPORT-CHASSIS-001",
        vehicle_model_id=vm.vehicle_model_id,
        current_status="IN_STOCK",
        created_by=staff.staff_id,
    )
    db_session.add(vehicle)

    # 4. Add a completed sale and finalized invoice
    sale = Sale(
        customer_id=customer.customer_id,
        chassis_no="REPORT-CHASSIS-001",
        total_amount=200000.0,
        sale_status="DELIVERED",
        created_by_staff_id=staff.staff_id,
        created_by=staff.staff_id,
    )
    db_session.add(sale)
    await db_session.flush()

    invoice = SalesInvoice(
        sale_id=sale.sale_id,
        invoice_number="INV-REPORT-001",
        taxable_amount=169491.53,
        gst_rate=18.0,
        gst_amount=30508.47,
        total_amount=200000.0,
        is_final=True,
        created_by=staff.staff_id,
    )
    db_session.add(invoice)
    await db_session.flush()

    # 5. Test dashboard stats
    stats = await reports_services.get_dashboard_stats(db_session)
    assert stats.revenue == 200000.0
    assert stats.in_stock_inventory >= 1

    # 6. Test dashboard alerts
    alerts = await reports_services.get_dashboard_alerts(db_session)
    assert isinstance(alerts.aging_inventory, list)
    assert isinstance(alerts.upcoming_renewals, list)

    # 7. Test async sales register query
    today = date.today()
    rows = await reports_services.sales_register(
        db_session, from_date=today - timedelta(days=7), to_date=today + timedelta(days=7)
    )
    assert len(rows) >= 1
    first_row = rows[0]
    assert first_row.invoice_number == "INV-REPORT-001"
    assert first_row.total_amount == 200000.0
