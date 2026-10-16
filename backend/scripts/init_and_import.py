import os
import sys
import asyncio
import logging

sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from sqlalchemy import select
from app.bootstrap import init_models
from app.db.base import Base
from app.db.session import engine, async_session_maker
from app.modules.master.models import Brand, VehicleModel, Staff
from app.auth.pin_utils import hash_pin
from app.modules.inventory.worksheet_service import execute_entire_sheet_import, find_default_workbook_path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run():
    logger.info("Initializing metadata & creating all tables...")
    init_models()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Tables created.")

    async with async_session_maker() as session:
        # 1. Seed Brand
        res = await session.execute(select(Brand).where(Brand.brand_name == "Ampere Electric"))
        brand = res.scalars().first()
        if not brand:
            brand = Brand(brand_name="Ampere Electric", is_active=True)
            session.add(brand)
            await session.flush()
            logger.info("Created brand: Ampere Electric")

        # 2. Seed Vehicle Models
        models_data = [
            ("Magnus Neo", "MAT-MAG-NEO"),
            ("Primus", "MAT-PRIMUS"),
            ("Magnus EX", "MAT-MAG-EX"),
            ("Reo Li Plus", "MAT-REO-LI"),
            ("Zeal", "MAT-ZEAL"),
            ("Reo 80", "MAT-REO-80"),
            ("Nexus", "MAT-NEXUS"),
            ("Accessories", "MAT-ACC"),
        ]
        for name, mat_no in models_data:
            stmt = select(VehicleModel).where(VehicleModel.model_name == name)
            existing = (await session.execute(stmt)).scalars().first()
            if not existing:
                model = VehicleModel(
                    brand_id=brand.brand_id,
                    model_name=name,
                    material_number=mat_no,
                    colour="Standard",
                    is_active=True,
                )
                session.add(model)
                logger.info(f"Created vehicle model: {name}")

        # 3. Seed Admin Staff
        stmt = select(Staff).where(Staff.email == "admin@evshowroom.com")
        staff = (await session.execute(stmt)).scalars().first()
        if not staff:
            admin_staff = Staff(
                full_name="System Administrator",
                email="admin@evshowroom.com",
                mobile_no="9999999999",
                designation="ADMIN",
                pin_hash=hash_pin("123456"),
                is_active=True,
            )
            session.add(admin_staff)
            logger.info("Created Admin Staff: admin@evshowroom.com / 9999999999 (PIN: 123456)")

        await session.commit()

    # 4. Ingest complete Master Inventory sheet
    logger.info("Ingesting all 3,890+ spare parts from 'Master Inventory' sheet...")
    wb_path = find_default_workbook_path()
    async with async_session_maker() as session:
        result = await execute_entire_sheet_import(file_path=wb_path, sheet_name="Master Inventory", db=session)
        logger.info(f"Ingestion result: {result}")

    # 5. Verify counts
    async with async_session_maker() as session:
        from app.modules.inventory.models import SpareMaster, SparePartCode, SparePartVehicleCompatibility, SpareSellingPriceHistory, SpareCostHistory
        from sqlalchemy import func
        count_spares = (await session.execute(select(func.count(SpareMaster.spare_id)))).scalar()
        count_codes = (await session.execute(select(func.count(SparePartCode.code_id)))).scalar()
        count_compat = (await session.execute(select(func.count(SparePartVehicleCompatibility.compatibility_id)))).scalar()
        count_prices = (await session.execute(select(func.count(SpareSellingPriceHistory.price_id)))).scalar()
        count_costs = (await session.execute(select(func.count(SpareCostHistory.cost_id)))).scalar()
        logger.info(f"Live Verification:")
        logger.info(f"  SpareMaster count: {count_spares}")
        logger.info(f"  SparePartCode count: {count_codes}")
        logger.info(f"  Model Compatibility count: {count_compat}")
        logger.info(f"  Selling Price History count: {count_prices}")
        logger.info(f"  Cost History count: {count_costs}")

if __name__ == "__main__":
    asyncio.run(run())
