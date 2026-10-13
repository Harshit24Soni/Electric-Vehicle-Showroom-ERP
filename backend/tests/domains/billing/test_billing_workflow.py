import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.billing import services as billing_services
from app.modules.sales.models import Sale
from app.modules.master.models import Customer, Vehicle, Staff, Brand, VehicleModel


@pytest.mark.asyncio
async def test_billing_invoice_lifecycle(db_session: AsyncSession):
    # 1. Setup staff, customer, brand, model
    staff = Staff(
        full_name="Billing Agent",
        mobile_no="9876543220",
        email="billing@erp.test",
        designation="ADMIN",
        pin_hash="dummy",
    )
    db_session.add(staff)
    await db_session.flush()

    customer = Customer(name="Billing Customer", primary_phone="9876543221", created_by=staff.staff_id)
    db_session.add(customer)
    await db_session.flush()

    brand = Brand(brand_name="Billing Brand", created_by=staff.staff_id)
    db_session.add(brand)
    await db_session.flush()

    vm = VehicleModel(
        brand_id=brand.brand_id,
        model_name="Billing EV",
        material_number="BIL-001",
        colour="White",
        created_by=staff.staff_id,
    )
    db_session.add(vm)
    await db_session.flush()

    vehicle = Vehicle(
        chassis_no="BILLING-CHASSIS-999",
        vehicle_model_id=vm.vehicle_model_id,
        current_status="SOLD",
        created_by=staff.staff_id,
    )
    db_session.add(vehicle)

    sale = Sale(
        customer_id=customer.customer_id,
        chassis_no="BILLING-CHASSIS-999",
        total_amount=150000.0,
        sale_status="PENDING",
        created_by_staff_id=staff.staff_id,
        created_by=staff.staff_id,
    )
    db_session.add(sale)
    await db_session.flush()

    # 2. Cannot generate invoice if vehicle is not delivered
    with pytest.raises(billing_services.BillingError, match="Invoice can only be generated after vehicle delivery"):
        await billing_services.generate_invoice(
            db_session, sale_id=sale.sale_id, taxable_amount=100000.0, gst_rate=18.0
        )

    # 3. Mark sale as DELIVERED
    sale.sale_status = "DELIVERED"
    await db_session.flush()

    invoice = await billing_services.generate_invoice(
        db_session, sale_id=sale.sale_id, taxable_amount=100000.0, gst_rate=18.0, remarks="Initial Invoice"
    )

    assert invoice.invoice_id is not None
    assert invoice.taxable_amount == 100000.0
    assert invoice.gst_amount == 18000.0
    assert invoice.total_amount == 118000.0
    assert invoice.is_final is False
    assert invoice.revision_no == 1

    # 4. Duplicate invoice generation raises error
    with pytest.raises(billing_services.InvoiceAlreadyExistsError):
        await billing_services.generate_invoice(
            db_session, sale_id=sale.sale_id, taxable_amount=100000.0, gst_rate=18.0
        )

    # 5. Revise invoice
    revised = await billing_services.revise_invoice(
        db_session, invoice=invoice, taxable_amount=110000.0, gst_rate=18.0, remarks="Revised after discount removal"
    )
    assert revised.revision_no == 2
    assert revised.taxable_amount == 110000.0
    assert revised.total_amount == 129800.0

    # 6. Finalize invoice
    finalized = await billing_services.finalize_invoice(db_session, invoice=revised)
    assert finalized.is_final is True

    # 7. Editing finalized invoice must fail
    with pytest.raises(billing_services.InvoiceNotEditableError):
        await billing_services.revise_invoice(db_session, invoice=finalized, taxable_amount=120000.0, gst_rate=18.0)
