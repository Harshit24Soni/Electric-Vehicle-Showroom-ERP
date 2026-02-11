import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

# Load env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if "postgresql://" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

async def run_migration():
    print(f"Connecting to DB...")
    engine = create_async_engine(DATABASE_URL)
    
    async with engine.begin() as conn:
        with open("migration_staff.sql", "r") as f:
            content = f.read()
            # Split by semicolon
            statements = content.split(';')
            
            for stmt in statements:
                stmt = stmt.strip()
                if not stmt:
                    continue
                    
                try:
                    print(f"Executing: {stmt[:50]}...")
                    await conn.execute(text(stmt))
                except Exception as e:
                    print(f"Migration Failed on statement: {stmt[:100]}...\nError: {e}")
                    raise
            
            print("Migration successful!")

if __name__ == "__main__":
    asyncio.run(run_migration())
