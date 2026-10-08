import os
import asyncio
import pytest
from alembic.config import Config
from alembic import command
from sqlalchemy import text
from app.db.session import engine

# Skip full migration tests locally if we are rolling back transactions,
# as alembic requires actual connection not wrapped in tx.
# But for test purposes, we can verify alembic upgrades work on empty db.

@pytest.mark.asyncio
async def test_database_migrations():
    """
    Test 1 & 2: Empty DB -> Alembic Upgrade Head -> Resulting schema is usable.
    """
    # 1. Drop all tables to simulate empty DB
    async with engine.begin() as conn:
        def recreate_schema(sync_conn):
            sync_conn.execute(text("DROP SCHEMA public CASCADE"))
            sync_conn.execute(text("CREATE SCHEMA public"))
        await conn.run_sync(recreate_schema)
        
    await engine.dispose() # Close connections so subprocess doesn't hang

    # 2. Run Alembic Upgrade Head in subprocess
    import sys
    import subprocess
    result = await asyncio.to_thread(
        subprocess.run,
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=os.path.join(os.path.dirname(__file__), "../../..", "backend"),
        capture_output=True,
        text=True,
        env={**os.environ}
    )
    assert result.returncode == 0, f"Alembic failed: {result.stderr}"
    
    # 3. Verify schema usable by querying a table
    from app.db.session import create_async_engine
    new_engine = create_async_engine(os.environ["DATABASE_URL"])
    async with new_engine.connect() as conn:
        res = await conn.execute(text("SELECT COUNT(*) FROM staff"))
        count = res.scalar()
        assert count == 0
    await new_engine.dispose()
