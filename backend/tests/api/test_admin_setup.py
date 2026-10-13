import pytest
from contextlib import asynccontextmanager
from starlette.requests import Request
from httpx import AsyncClient

from app.admin_setup import AdminAuth, StaffAdmin, SparePartAdmin
from app.modules.staff.models import Staff
from app.modules.inventory.models import SparePart, SparePartCode, SpareStockBalance
from app.modules.auth.pin_utils import hash_pin


@pytest.fixture
def session_override(db_session):
    @asynccontextmanager
    async def _override(*args, **kwargs):
        yield db_session
    return _override


@pytest.fixture
async def sample_admin_staff(db_session):
    admin = Staff(
        full_name="Super Admin",
        email="superadmin@erp.com",
        mobile_no="9876543210",
        designation="ADMIN",
        pin_hash=hash_pin("123456"),
        is_active=True,
    )
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)
    return admin


@pytest.fixture
async def sample_non_admin_staff(db_session):
    staff = Staff(
        full_name="Sales Staff",
        email="sales@erp.com",
        mobile_no="9876543211",
        designation="SALES",
        pin_hash=hash_pin("123456"),
        is_active=True,
    )
    db_session.add(staff)
    await db_session.commit()
    await db_session.refresh(staff)
    return staff


@pytest.fixture
async def sample_spare_part(db_session):
    spare = SparePart(
        spare_name="Test Ceramic Brake Pad",
        category="Brakes",
        tracking_mode="QUANTITY",
        status="ACTIVE",
    )
    db_session.add(spare)
    await db_session.commit()
    await db_session.refresh(spare)
    return spare


@pytest.mark.asyncio
async def test_admin_auth_success(sample_admin_staff, session_override):
    auth = AdminAuth(secret_key="test-secret-key", session_maker=session_override)

    # Mock Starlette Request with session and form
    session_data = {}
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/admin/login",
        "headers": [],
        "session": session_data,
    }
    request = Request(scope)

    async def mock_form():
        return {"username": sample_admin_staff.email, "password": "123456"}

    request.form = mock_form

    success = await auth.login(request)
    assert success is True
    assert "token" in session_data
    assert session_data["role"] == "ADMIN"

    # Authenticate succeeds
    is_authenticated = await auth.authenticate(request)
    assert is_authenticated is True

    # Get user id succeeds
    user_id = await auth.get_user_id(request)
    assert user_id == sample_admin_staff.staff_id

    # Logout clears session
    await auth.logout(request)
    assert len(session_data) == 0


@pytest.mark.asyncio
async def test_admin_auth_rejects_non_admin(sample_non_admin_staff, session_override):
    auth = AdminAuth(secret_key="test-secret-key", session_maker=session_override)

    session_data = {}
    scope = {"type": "http", "method": "POST", "path": "/admin/login", "session": session_data}
    request = Request(scope)

    async def mock_form():
        return {"username": sample_non_admin_staff.email, "password": "123456"}

    request.form = mock_form

    success = await auth.login(request)
    assert success is False
    assert "token" not in session_data


@pytest.mark.asyncio
async def test_admin_auth_rejects_wrong_pin(sample_admin_staff, session_override):
    auth = AdminAuth(secret_key="test-secret-key", session_maker=session_override)

    session_data = {}
    scope = {"type": "http", "method": "POST", "path": "/admin/login", "session": session_data}
    request = Request(scope)

    async def mock_form():
        return {"username": sample_admin_staff.email, "password": "wrong_pin"}

    request.form = mock_form

    success = await auth.login(request)
    assert success is False
    assert "token" not in session_data


@pytest.mark.asyncio
async def test_admin_auth_rejects_nonexistent_user(session_override):
    auth = AdminAuth(secret_key="test-secret-key", session_maker=session_override)

    session_data = {}
    scope = {"type": "http", "method": "POST", "path": "/admin/login", "session": session_data}
    request = Request(scope)

    async def mock_form():
        return {"username": "nonexistent@erp.com", "password": "123456"}

    request.form = mock_form

    success = await auth.login(request)
    assert success is False
    assert "token" not in session_data


def test_views_configuration():
    # StaffAdmin configuration using actual model attributes
    assert StaffAdmin.column_list == [
        Staff.staff_id,
        Staff.full_name,
        Staff.email,
        Staff.mobile_no,
        Staff.designation,
    ]
    assert StaffAdmin.column_labels == {
        Staff.staff_id: "ID",
        Staff.mobile_no: "Phone",
        Staff.designation: "Role",
        Staff.full_name: "Name",
    }
    assert StaffAdmin.column_searchable_list == [
        Staff.email,
        Staff.full_name,
        Staff.mobile_no,
    ]
    assert StaffAdmin.column_sortable_list == [
        Staff.staff_id,
        Staff.designation,
    ]

    # SparePartAdmin configuration
    assert SparePartAdmin.column_list == ["id", "part_number", "name", "stock_quantity"]
    assert SparePartAdmin.can_delete is False


def test_staff_and_spare_part_model_properties():
    # Test Staff synonyms
    staff = Staff(
        staff_id=42,
        email="test@erp.com",
        mobile_no="9999999999",
        designation="ADMIN",
    )
    assert staff.id == 42
    assert staff.phone == "9999999999"
    assert staff.role == "ADMIN"

    # Test SparePart (SpareMaster) synonyms & properties
    part = SparePart(
        spare_id=101,
        spare_name="Test Ceramic Brake Pad",
    )
    code = SparePartCode(code="PART-101", is_current=True)
    part.codes = [code]
    balance = SpareStockBalance(quantity=25, location="MAIN")
    part.balances = [balance]

    assert part.id == 101
    assert part.name == "Test Ceramic Brake Pad"
    assert part.part_number == "PART-101"
    assert part.stock_quantity == 25


@pytest.mark.asyncio
async def test_admin_model_view_endpoints_authenticated(
    client, sample_admin_staff, sample_spare_part, session_override
):
    from app.main import admin, admin_auth

    orig_admin_sm = admin.session_maker
    orig_auth_sm = admin_auth.session_maker
    orig_view_sms = {v: v.session_maker for v in admin.views}
    admin.session_maker = session_override
    admin_auth.session_maker = session_override
    for v in admin.views:
        v.session_maker = session_override
    try:
        # Authenticate via /admin/login
        login_res = await client.post(
            "/admin/login",
            data={"username": sample_admin_staff.email, "password": "123456"},
        )
        assert login_res.status_code == 302

        # 1. StaffAdmin list endpoint
        res_staff_list = await client.get(f"/admin/{StaffAdmin.identity}/list")
        assert res_staff_list.status_code == 200

        # 2. StaffAdmin detail endpoint
        res_staff_detail = await client.get(
            f"/admin/{StaffAdmin.identity}/details/{sample_admin_staff.staff_id}"
        )
        assert res_staff_detail.status_code == 200

        # 3. StaffAdmin AJAX lookup route
        res_staff_ajax = await client.get(f"/admin/{StaffAdmin.identity}/ajax/lookup")
        assert res_staff_ajax.status_code == 200

        # 4. SparePartAdmin list endpoint
        res_spare_list = await client.get(f"/admin/{SparePartAdmin.identity}/list")
        assert res_spare_list.status_code == 200

        # 5. SparePartAdmin detail endpoint
        res_spare_detail = await client.get(
            f"/admin/{SparePartAdmin.identity}/details/{sample_spare_part.spare_id}"
        )
        assert res_spare_detail.status_code == 200

        # 6. SparePartAdmin AJAX lookup route
        res_spare_ajax = await client.get(f"/admin/{SparePartAdmin.identity}/ajax/lookup")
        assert res_spare_ajax.status_code == 200
    finally:
        admin.session_maker = orig_admin_sm
        admin_auth.session_maker = orig_auth_sm
        for v, sm in orig_view_sms.items():
            v.session_maker = sm


@pytest.mark.asyncio
async def test_admin_model_view_endpoints_unauthenticated(client):
    # Unauthenticated access to staff list redirects to login
    res = await client.get(f"/admin/{StaffAdmin.identity}/list", follow_redirects=False)
    assert res.status_code in (302, 303)
    assert "/admin/login" in res.headers.get("location", "")
