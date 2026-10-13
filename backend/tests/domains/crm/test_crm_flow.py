import pytest
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.crm import services as crm_services
from app.modules.crm import schemas as crm_schemas
from app.modules.crm.models import LeadStatusMaster
from app.modules.master.models import VehicleModel, Brand, Staff

@pytest.mark.asyncio
async def test_crm_lead_creation_and_conversion(db_session: AsyncSession):
    # 1. Setup staff first
    staff = Staff(
        full_name="CRM Agent",
        mobile_no="9876543210",
        email="agent@crm.test",
        designation="ADMIN",
        pin_hash="dummy"
    )
    db_session.add(staff)
    await db_session.flush()

    # 2. Setup brand and vehicle model
    brand = Brand(brand_name="CRM Test Brand", created_by=staff.staff_id)
    db_session.add(brand)
    await db_session.flush()

    vm = VehicleModel(
        brand_id=brand.brand_id,
        model_name="CRM EV Model",
        material_number="CRM-001",
        colour="Electric Blue",
        created_by=staff.staff_id
    )
    db_session.add(vm)

    status_master = LeadStatusMaster(
        status_name="NEW",
        display_order=1
    )
    db_session.add(status_master)
    await db_session.flush()

    # 3. Create Lead
    lead_payload = crm_schemas.LeadCreate(
        name="John Doe",
        phone="9876543211",
        email="john@doe.test",
        vehicle_model_id=vm.vehicle_model_id,
        lead_source="WALK_IN",
        lead_status_id=status_master.status_id,
        owner_staff_id=staff.staff_id,
        lead_status="HOT"
    )

    lead = await crm_services.create_lead(db_session, payload=lead_payload, current_staff_id=staff.staff_id)
    assert lead.lead_id is not None
    assert lead.name == "John Doe"
    assert lead.lead_status == "HOT"

    # 4. Convert Lead to Customer + Nominee in atomic transaction
    convert_payload = crm_schemas.LeadConvertPayload(
        name="John Doe Senior",
        phone="9876543211",
        customer_type="INDIVIDUAL",
        address_line1="123 EV Boulevard",
        city="Pune",
        state="Maharashtra",
        pincode="411001",
        aadhaar_no="123456789012",
        pan_no="ABCDE1234F",
        nominee=crm_schemas.NomineeInput(
            nominee_name="Jane Doe",
            nominee_dob=date(2000, 1, 1),
            relation="DAUGHTER"
        )
    )

    result = await crm_services.convert_lead_to_customer(
        db_session,
        lead_id=lead.lead_id,
        payload=convert_payload,
        current_user={"staff_id": staff.staff_id, "designation": "ADMIN"}
    )

    assert result["customer_id"] is not None
    assert result["nominee_id"] is not None
    assert lead.is_converted is True

    # 5. Soft delete lead
    deleted = await crm_services.delete_lead(
        db_session,
        lead_id=lead.lead_id,
        current_user={"staff_id": staff.staff_id, "designation": "ADMIN"}
    )
    assert deleted is True
    assert lead.is_deleted is True
    assert lead.deleted_at is not None
