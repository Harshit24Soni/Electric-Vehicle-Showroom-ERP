import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import text
from app.db.session import engine

async def clean():
    async with engine.begin() as conn:
        # 1. Drop new tables
        tables = [
            "payment_mode", "expense_category", "job_card_category", 
            "insurance_company", "bank", "document_type"
        ]
        for t in tables:
            await conn.execute(text(f"DROP TABLE IF EXISTS master.{t} CASCADE"))
            print(f"Dropped master.{t}")
        
        # 2. Drop columns/indices from Brand
        await conn.execute(text("ALTER TABLE master.brand DROP COLUMN IF EXISTS created_at CASCADE"))
        await conn.execute(text("ALTER TABLE master.brand DROP COLUMN IF EXISTS is_active CASCADE"))
        print("Dropped Brand columns")

        # 3. Drop columns/indices/constraints from Staff
        # Dropping column cascades to constraints usually? Yes.
        await conn.execute(text("ALTER TABLE master.staff DROP COLUMN IF EXISTS is_deleted CASCADE"))
        await conn.execute(text("ALTER TABLE master.staff DROP COLUMN IF EXISTS deleted_by CASCADE"))
        print("Dropped Staff columns")
        
        # 4. Drop indices manually if not cascaded (Explicit is better)
        await conn.execute(text("DROP INDEX IF EXISTS master.idx_staff_is_deleted"))
        # Brand doesn't have indices created by migration B2C... check file? No indices for Brand in B2C.
        
        # Reset version to a1b2c3d4e5f6
        await conn.execute(text("UPDATE alembic_version SET version_num = 'a1b2c3d4e5f6'"))
        print("Reset alembic_version to a1b2c3d4e5f6")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(clean())
