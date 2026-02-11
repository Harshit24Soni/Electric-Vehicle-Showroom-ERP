import asyncio
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import text
from app.db.session import engine
from app.db.base import Base
# Import models to ensure they are registered with Base metadata
from app.domains.sales import models
from app.domains.master import models as master_models
from app.domains.crm import models as crm_models
from app.domains.staff import models as staff_models

async def create_sales_tables():
    print("Starting Sales tables creation...")
    
    async with engine.begin() as conn:
        # Create schema if not exists
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS sales"))
        
        # Create tables using metadata
        # We can use run_sync to use synchronous metadata.create_all
        await conn.run_sync(Base.metadata.create_all)
        
    print("Sales tables creation attempted (create_all). Verifying...")
    
    async with engine.begin() as conn:
        result = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='sales'"))
        tables = [row[0] for row in result]
        print(f"Tables in 'sales' schema: {tables}")

if __name__ == "__main__":
    asyncio.run(create_sales_tables())
