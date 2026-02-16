import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import text
from app.db.session import engine

async def reset():
    async with engine.begin() as conn:
        await conn.execute(text("UPDATE alembic_version SET version_num = 'b2c3d4e5f6g7'"))
        print("Reset alembic_version to b2c3d4e5f6g7")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(reset())
