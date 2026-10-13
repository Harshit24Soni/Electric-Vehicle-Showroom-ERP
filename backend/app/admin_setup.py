from typing import Optional
from starlette.requests import Request
from starlette.responses import JSONResponse
from sqlalchemy import select, or_, func
from sqladmin import ModelView
from sqladmin.application import Admin as _Admin
from sqladmin.authentication import AuthenticationBackend

from app.db.session import async_session_maker
from app.modules.staff.models import Staff
from app.modules.inventory.models import SparePart
from app.modules.auth.pin_utils import verify_pin


class AdminAuth(AuthenticationBackend):
    """
    Authentication backend for SQLAdmin ensuring only active ADMIN staff
    can access the administrative interface using email and PIN.
    """

    def __init__(self, secret_key: str, session_maker=None):
        super().__init__(secret_key=secret_key)
        self.session_maker = session_maker or async_session_maker

    async def login(self, request: Request) -> bool:
        form = await request.form()
        username = form.get("username") or form.get("email")
        password = form.get("password") or form.get("pin")

        if not username or not password:
            return False

        email = str(username).strip()
        pin = str(password).strip()

        async with (self.session_maker)() as session:
            stmt = select(Staff).where(
                or_(
                    Staff.email == email,
                    func.lower(Staff.email) == email.lower(),
                )
            )
            result = await session.execute(stmt)
            user = result.scalars().first()

            if not user or not user.pin_hash:
                return False

            if not user.is_active or getattr(user, "is_deleted", False):
                return False

            if not verify_pin(pin, user.pin_hash):
                return False

            # Only allow login if user.role == "ADMIN"
            if user.role != "ADMIN":
                return False

            request.session.update(
                {
                    "token": str(user.staff_id),
                    "user_id": user.staff_id,
                    "email": user.email,
                    "role": user.role,
                }
            )
            return True

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        try:
            if "session" not in request.scope:
                return False
            token = request.session.get("token")
            return bool(token)
        except Exception:
            return False

    async def get_user_id(self, request: Request) -> Optional[int]:
        try:
            if "session" in request.scope:
                user_id = request.session.get("user_id") or request.session.get("token")
                if user_id is not None:
                    return int(user_id)
        except Exception:
            pass
        return None


class StaffAdmin(ModelView, model=Staff):
    name = "Staff"
    name_plural = "Staff Members"
    icon = "fa-solid fa-users"
    column_list = [
        Staff.staff_id,
        Staff.full_name,
        Staff.email,
        Staff.mobile_no,
        Staff.designation,
    ]
    column_labels = {
        Staff.staff_id: "ID",
        Staff.mobile_no: "Phone",
        Staff.designation: "Role",
        Staff.full_name: "Name",
    }
    column_searchable_list = [Staff.email, Staff.full_name, Staff.mobile_no]
    column_sortable_list = [Staff.staff_id, Staff.designation]


class SparePartAdmin(ModelView, model=SparePart):
    name = "Spare Part"
    name_plural = "Spare Parts"
    icon = "fa-solid fa-gears"
    column_list = ["id", "part_number", "name", "stock_quantity"]
    can_delete = False


# Safe AJAX lookup handling to return HTTP 200 with empty results rather than 400 on sub-requests
_orig_ajax_lookup = _Admin.ajax_lookup


async def _safe_ajax_lookup(self, request: Request):
    name = request.query_params.get("name")
    term = request.query_params.get("term")
    identity = request.path_params.get("identity")
    model_view = self._find_model_view(identity)
    if name and term and name in getattr(model_view, "_form_ajax_refs", {}):
        return await _orig_ajax_lookup(self, request)
    return JSONResponse({"results": []})


_Admin.ajax_lookup = _safe_ajax_lookup
