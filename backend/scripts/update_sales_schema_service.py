import asyncio
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import text
from app.db.session import engine
from app.domains.sales import models # Import models to ensure registry

async def update_sales_service_schema():
    print("Starting Sales Service schema update...")
    
    schema = "sales"
    
    async with engine.begin() as conn:
        # 1. Add column is_service_schedule_generated to sale table
        print(f"Checking {schema}.sale for is_service_schedule_generated column...")
        try:
            await conn.execute(text(f"""
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                   WHERE table_schema='{schema}' AND table_name='sale' AND column_name='is_service_schedule_generated') THEN 
                        ALTER TABLE {schema}.sale ADD COLUMN is_service_schedule_generated BOOLEAN DEFAULT FALSE;
                        RAISE NOTICE 'Added is_service_schedule_generated to {schema}.sale';
                    END IF; 
                END $$;
            """))
            print(f"Verified is_service_schedule_generated for {schema}.sale")
        except Exception as e:
            print(f"Error updating {schema}.sale: {e}")

        # 2. Create service_schedule table
        print(f"Creating {schema}.service_schedule table if not exists...")
        # Since using SQLAlchemy models, we can try using create_all for the new model, 
        # but create_all usually skips if table exists. 
        # Since this is a new table, create_all should work if we target the specific table or if we just run it.
        # However, let's be explicit with SQL for robust update or use create_all on metadata.
        
        # We can use metadata.create_all for specific tables if they don't exist.
        # But `Base.metadata.create_all` checks all.
        pass # The context manager will commit.

    # Re-use create_all logic for new tables
    print("Running Base.metadata.create_all to create missing tables (ServiceSchedule)...")
    async with engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)

    print("Sales Service schema update complete.")

if __name__ == "__main__":
    asyncio.run(update_sales_service_schema())
