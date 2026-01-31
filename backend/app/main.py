from fastapi import FastAPI

from backend.app.domains.staff.staff_routes import router as admin_staff_router
from app.auth.routes import router as auth_router

app = FastAPI(title="EV Showroom ERP Backend")


@app.get("/health")
def health_check():
    return {"status": "ok"}


app.include_router(auth_router)
app.include_router(admin_staff_router)
