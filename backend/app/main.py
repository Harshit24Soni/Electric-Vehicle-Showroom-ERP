import logging
import warnings
from contextlib import asynccontextmanager
from pathlib import Path
from dotenv import load_dotenv

# Filter out openpyxl user warnings globally (e.g., malformed date serials)
warnings.filterwarnings("ignore", category=UserWarning, module="openpyxl")

# Optional local environment initialization for development
for env_candidate in [
    Path("../.env"),
    Path(".env"),
    Path("backend/.env"),
    Path("../.env.test"),
    Path(".env.test"),
    Path("backend/.env.test"),
]:
    if env_candidate.is_file():
        load_dotenv(dotenv_path=env_candidate)
        break

from fastapi import FastAPI, Request  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402
from sqladmin import Admin  # noqa: E402

from app.admin_setup import AdminAuth, StaffAdmin, SparePartAdmin  # noqa: E402
from app.auth.routes import router as auth_router  # noqa: E402
from app.modules.admin.routes import router as admin_staff_router  # noqa: E402
from app.modules.staff.routes import router as staff_router  # noqa: E402
from app.modules.inventory.routes import router as inventory_router  # noqa: E402
from app.modules.inventory.routes_master_sheet import router as master_sheet_router  # noqa: E402
from app.modules.inventory.routes_worksheet_import import router as worksheet_import_router  # noqa: E402
from app.modules.billing.routes import router as billing_router  # noqa: E402
from app.modules.finance.routes import router as finance_router  # noqa: E402
from app.modules.master.routes import router as master_router  # noqa: E402
from app.modules.reports.routes import router as reports_router  # noqa: E402
from app.modules.sales.routes import router as sales_router  # noqa: E402
from app.modules.sales.routes_spare import router as spare_sales_router  # noqa: E402
from app.modules.service.routes import router as service_router  # noqa: E402
from app.modules.crm.routes import router as crm_router  # noqa: E402
from app.modules.insurance.routes import router as insurance_router  # noqa: E402
from app.modules.warranty.routes import router as warranty_router  # noqa: E402
from app.modules.procurement.routes import router as procurement_router  # noqa: E402
from app.modules.followup.routes import router as followup_router  # noqa: E402
from app.modules.setup.routes import router as setup_router  # noqa: E402
from app.bootstrap import init_models, init_listeners  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.core.redis import redis_manager  # noqa: E402
from app.core.event_bus import event_bus  # noqa: E402
from app.db.session import engine, dispose_engine  # noqa: E402

logger = logging.getLogger(__name__)

# Initialize database models and event listeners at module load for Alembic / Admin compatibility
init_models()
init_listeners()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager managing async Redis connections,
    in-memory event bus background workers, and database connection pools.
    """
    logger.info("Starting up Electric Vehicle Showroom ERP backend...")
    event_bus.start()
    try:
        await redis_manager.init_redis()
    except Exception as exc:
        logger.warning(f"Redis initialization warning on application startup: {exc}")

    yield

    logger.info("Shutting down Electric Vehicle Showroom ERP backend...")
    event_bus.stop()
    await redis_manager.close()
    await dispose_engine()


app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

# CORS Configuration - Dynamically ingested from settings with development LAN & localhost regex fallback
default_dev_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]
cors_origins = list(dict.fromkeys(list(settings.cors_origins) + default_dev_origins))

# In non-production, permit all localhost, loopback, LAN IP addresses (192.168.x.x, 10.x.x.x, 172.16-31.x.x) and Vercel domains
DEV_ORIGIN_REGEX = (
    r"https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?|"
    r"https:\/\/electric-vehicle-showroom-erp.*\.vercel\.app"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=DEV_ORIGIN_REGEX if settings.ENVIRONMENT != "production" else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """
    Guarantees unhandled 500 exceptions return CORS headers so browsers do not mask
    server errors behind deceptive generic 'CORS policy' network block errors.
    """
    logger.exception(f"Unhandled server error processing {request.method} {request.url.path}: {exc}")
    origin = request.headers.get("origin")
    headers = {
        "Access-Control-Allow-Credentials": "true",
    }
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error occurred.",
            "error": str(exc) if settings.DEBUG else None,
        },
        headers=headers,
    )


@app.get("/health")
def health_check():
    """Service health probe endpoint."""
    return {
        "status": "ok",
        "environment": settings.ENVIRONMENT,
    }


# Authentication
app.include_router(auth_router)

# Staff / Admin
app.include_router(admin_staff_router)
app.include_router(staff_router)

# Functional domains
app.include_router(inventory_router)
app.include_router(master_sheet_router, prefix="/api/v1/inventory/master-sheet")
app.include_router(master_sheet_router, prefix="/api/inventory/master-sheet")
app.include_router(master_sheet_router, prefix="/inventory/master-sheet")
app.include_router(worksheet_import_router, prefix="/api/v1/inventory/worksheet-import")
app.include_router(worksheet_import_router, prefix="/api/inventory/worksheet-import")
app.include_router(worksheet_import_router, prefix="/inventory/worksheet-import")
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
admin_auth = AdminAuth(secret_key=settings.JWT_SECRET_KEY)
admin = Admin(app=app, engine=engine, authentication_backend=admin_auth)
admin.add_view(StaffAdmin)
admin.add_view(SparePartAdmin)
