from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.routes import router as auth_router
from app.domains.admin.routes import router as admin_staff_router
from app.domains.staff.routes import router as staff_router
from app.domains.inventory.routes import router as inventory_router
from app.domains.billing.routes import router as billing_router
from app.domains.finance.routes import router as finance_router
from app.domains.master.routes import router as master_router
from app.domains.reports.routes import router as reports_router
from app.domains.sales.routes import router as sales_router
from app.domains.service.routes import router as service_router
from app.domains.crm.routes import router as crm_router
from app.domains.insurance.routes import router as insurance_router
from app.domains.warranty.routes import router as warranty_router


app = FastAPI(title="EV Showroom ERP Backend")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://0.0.0.0:3000"],
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
app.include_router(service_router)
app.include_router(crm_router)
app.include_router(insurance_router)
app.include_router(warranty_router)
