from fastapi import FastAPI
from sqlalchemy import text

from app.db.session import engine

app = FastAPI(title="EV Showroom ERP Backend")

@app.get("/health")
def health_check():
    return {"status": "ok"}

from app.api.v1.auth.routes import router as auth_router

app.include_router(auth_router)

from app.api.v1.admin.staff import router as admin_staff_router

app.include_router(admin_staff_router)
