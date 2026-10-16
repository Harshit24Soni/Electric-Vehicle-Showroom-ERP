import asyncio
import logging
from sqlalchemy import text
from app.db.session import async_session_maker
from app.db.mixins import utc_now_naive

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODELS_TO_SEED = [
    {"name": "Magnus Neo", "code": "MAG-NEO", "colour": "Ocean Blue"},
    {"name": "Primus", "code": "PRIMUS", "colour": "Ruby Red"},
    {"name": "Magnus EX", "code": "MAG-EX", "colour": "Galactic Grey"},
    {"name": "Reo Li Plus", "code": "REO-LI-PLUS", "colour": "Polar White"},
    {"name": "Zeal", "code": "ZEAL", "colour": "Glossy Black"},
    {"name": "Reo 80", "code": "REO-80", "colour": "Cherry Red"},
    {"name": "Nexus", "code": "NEXUS", "colour": "Stealth Silver"},
    {"name": "Accessories", "code": "ACCESSORIES", "colour": "Standard"},
]

DDL_STATEMENTS = [
    # 1. Enhance module_spare_master
    """
    ALTER TABLE module_spare_master 
    ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5, 2) DEFAULT 18.00,
    ADD COLUMN IF NOT EXISTS base_cost NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS base_dlp NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS base_ex_showroom NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS base_mrp NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS profit_margin_percent NUMERIC(6, 2);
    """,
    # 2. Enhance module_spare_part_vehicle_compatibility
    """
    ALTER TABLE module_spare_part_vehicle_compatibility
    ADD COLUMN IF NOT EXISTS ex_factory_price NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS dlp NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS ex_showroom_price NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS customer_mrp NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5, 2) DEFAULT 18.00,
    ADD COLUMN IF NOT EXISTS profit_margin_percent NUMERIC(6, 2),
    ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;
    """,
    # 3. Truncate existing inventory data cleanly
    """
    TRUNCATE TABLE 
        module_spare_stock_movement,
        module_spare_stock_balance,
        module_spare_serial,
        module_spare_batch,
        module_spare_cost_history,
        module_spare_selling_price_history,
        module_spare_part_vehicle_compatibility,
        module_price_list_item,
        module_spare_part_code,
        module_spare_master
    RESTART IDENTITY CASCADE;
    """,
]

async def migrate_and_seed():
    async with async_session_maker() as session:
        logger.info("Executing DDL schema upgrades...")
        for stmt in DDL_STATEMENTS:
            await session.execute(text(stmt))
        await session.commit()
        logger.info("Schema upgrade and table reset complete.")

        from app.modules.master.models import Brand, VehicleModel
        from sqlalchemy import select

        # Seed Brand via ORM
        brand_stmt = select(Brand).where(Brand.brand_name == "Greaves Electric Mobility")
        brand = (await session.execute(brand_stmt)).scalar_one_or_none()
        if not brand:
            brand = Brand(brand_name="Greaves Electric Mobility", is_active=True)
            session.add(brand)
            await session.flush()
        logger.info("Brand Greaves Electric Mobility active (ID: %s)", brand.brand_id)

        # Seed Vehicle Models via ORM
        for m in MODELS_TO_SEED:
            vm_stmt = select(VehicleModel).where(VehicleModel.model_name == m["name"])
            vm = (await session.execute(vm_stmt)).scalar_one_or_none()
            if not vm:
                vm = VehicleModel(
                    brand_id=brand.brand_id,
                    model_name=m["name"],
                    material_number=f"MAT-{m['code']}",
                    colour=m["colour"],
                    is_active=True,
                )
                session.add(vm)
                logger.info("Seeded model: %s", m["name"])
        await session.commit()
        logger.info("Vehicle models successfully verified and seeded.")

if __name__ == "__main__":
    asyncio.run(migrate_and_seed())
