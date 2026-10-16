import os
import asyncio
import pytest
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
    # 1. Safety Guard: Never allow schema drop in production or remote database
    from app.core.config import settings

    db_url_str = str(settings.DATABASE_URL).lower()
    if settings.ENVIRONMENT in ("production", "prod", "staging"):
        pytest.skip(f"Destructive migration test skipped: ENVIRONMENT is '{settings.ENVIRONMENT}'")

    prohibited_hosts = ["supabase.co", "pooler.supabase.com", "rds.amazonaws.com", "render.com"]
    for host in prohibited_hosts:
        if host in db_url_str:
            raise RuntimeError(
                f"SAFETY GUARD TRIGGERED: Refusing to drop schema. DATABASE_URL points to remote host '{host}'"
            )

    is_safe_test_db = (
        "localhost" in db_url_str
        or "127.0.0.1" in db_url_str
        or "postgres" in db_url_str
        or "_test" in db_url_str
        or "test" in db_url_str
    )
    if not is_safe_test_db:
        raise RuntimeError(
            f"SAFETY GUARD TRIGGERED: DATABASE_URL '{db_url_str}' does not appear to be an isolated test database."
        )

    # Drop all tables to simulate empty DB
    async with engine.begin() as conn:

        def recreate_schema(sync_conn):
            sync_conn.execute(text("DROP SCHEMA public CASCADE"))
            sync_conn.execute(text("CREATE SCHEMA public"))

        await conn.run_sync(recreate_schema)

    await engine.dispose()  # Close connections so subprocess doesn't hang

    # 2. Run Alembic Upgrade Head in subprocess
    import sys
    import subprocess

    result = await asyncio.to_thread(
        subprocess.run,
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=os.path.join(os.path.dirname(__file__), "../../..", "backend"),
        capture_output=True,
        text=True,
        env={**os.environ},
    )
    assert result.returncode == 0, f"Alembic failed: {result.stderr}"

    # 3. Verify schema usable by querying a table
    from app.core.config import settings
    from app.db.session import create_async_engine

    new_engine = create_async_engine(str(settings.DATABASE_URL))
    async with new_engine.connect() as conn:
        res = await conn.execute(text("SELECT COUNT(*) FROM staff"))
        count = res.scalar()
        assert count == 0
    await new_engine.dispose()
