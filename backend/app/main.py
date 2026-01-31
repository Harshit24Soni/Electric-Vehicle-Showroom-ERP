from fastapi import FastAPI

from app.domains.admin.routes import router as admin_staff_router
from app.domains.staff.routes import router as auth_router

app = FastAPI(title="EV Showroom ERP Backend")


@app.get("/health")
def health_check():
    return {"status": "ok"}


app.include_router(auth_router)
app.include_router(admin_staff_router)

from app.domains.inventory.routes import router as inventory_router

app.include_router(inventory_router)
