import os
from pathlib import Path
from dotenv import load_dotenv

# Optional local environment initialization for development
# Cloud orchestrators (Kubernetes, AWS ECS) inject environment variables directly into memory
for env_candidate in [Path(".env"), Path("backend/.env")]:
    if env_candidate.is_file():
        load_dotenv(dotenv_path=env_candidate)
        break

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.routes import router as auth_router
from app.modules.admin.routes import router as admin_staff_router
from app.modules.staff.routes import router as staff_router
from app.modules.inventory.routes import router as inventory_router
from app.modules.billing.routes import router as billing_router
from app.modules.finance.routes import router as finance_router
from app.modules.master.routes import router as master_router
from app.modules.reports.routes import router as reports_router
from app.modules.sales.routes import router as sales_router
from app.modules.sales.routes_spare import router as spare_sales_router
from app.modules.service.routes import router as service_router
from app.modules.crm.routes import router as crm_router
from app.modules.insurance.routes import router as insurance_router
from app.modules.warranty.routes import router as warranty_router
from app.modules.procurement.routes import router as procurement_router
from app.modules.followup.routes import router as followup_router
from app.modules.setup.routes import router as setup_router
from app.bootstrap import init_models, init_listeners
from app.core.config import settings

# Initialize database models and event listeners
init_models()
init_listeners()
app = FastAPI(title="EV Showroom ERP Backend")

# CORS — read allowed origins from settings
allowed_origins = [
    origin.strip()
    for origin in settings.ALLOWED_ORIGINS.split(",")
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


# Authentication
app.include_router(auth_router)

# Staff / Admin
app.include_router(admin_staff_router)
app.include_router(staff_router)

# Functional domains
app.include_router(inventory_router)
app.include_router(billing_router)
app.include_router(finance_router)
app.include_router(master_router)
app.include_router(reports_router)
app.include_router(sales_router)
app.include_router(spare_sales_router)
app.include_router(service_router)
app.include_router(crm_router)
app.include_router(insurance_router)
app.include_router(warranty_router)
app.include_router(procurement_router)
app.include_router(followup_router)

# Setup / Master Data Management
app.include_router(setup_router)

# SQLAdmin Panel
from sqladmin import Admin
from app.db.session import engine
from app.admin_setup import AdminAuth, StaffAdmin, SparePartAdmin

admin_auth = AdminAuth(secret_key=settings.JWT_SECRET_KEY)
admin = Admin(app=app, engine=engine, authentication_backend=admin_auth)
admin.add_view(StaffAdmin)
admin.add_view(SparePartAdmin)
