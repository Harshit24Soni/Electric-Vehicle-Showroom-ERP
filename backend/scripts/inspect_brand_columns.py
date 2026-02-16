
import asyncio
from sqlalchemy import text
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.db.session import engine

async def inspect():
    async with engine.begin() as conn:
        result = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'brand' AND table_schema = 'master'"))
        columns = [row['column_name'] for row in result.mappings()]
        print(f"Brand Columns: {columns}")

if __name__ == "__main__":
    asyncio.run(inspect())
