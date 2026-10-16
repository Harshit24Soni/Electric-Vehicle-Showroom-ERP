import asyncio
import os
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

from pathlib import Path
from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[2]

# Force test environment BEFORE loading app
os.environ["ENVIRONMENT"] = "test"

# Load consolidated environment configuration dynamically
for env_candidate in [REPO_ROOT / ".env", Path(".env")]:
    if env_candidate.is_file():
        load_dotenv(dotenv_path=env_candidate, override=False)
        break

from app.main import app  # noqa: E402
from app.db.session import get_db, engine  # noqa: E402
from app.db.base import Base  # noqa: E402


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_db():
    """Create all tables in the test database once per session."""
    try:
        async with asyncio.timeout(30):
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
    except Exception as exc:
        print(f"Warning: Failed to setup test DB: {exc}")
    yield
    try:
        from app.core.redis import redis_manager
        from app.core.event_bus import event_bus

        event_bus.stop()
        await redis_manager.close()
    except Exception:
        pass
    # Avoid dropping development database tables on teardown


@pytest_asyncio.fixture
async def db_session():
    """Provides a transactional database session for each test."""
    connection = await engine.connect()
    transaction = await connection.begin()

    AsyncSessionLocal = sessionmaker(
        bind=connection, class_=AsyncSession, expire_on_commit=False, autocommit=False, autoflush=False
    )

    session = AsyncSessionLocal()

    yield session

    await session.close()
    await transaction.rollback()
    await connection.close()


@pytest_asyncio.fixture
async def client(db_session):
    """Provides an unauthenticated API client."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as c:
        yield c

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def admin_client(client, db_session):
    """Provides an authenticated admin API client."""
    from app.modules.master.models import Staff
    from app.auth.dependencies import get_current_staff

    stmt = select(Staff).where(Staff.designation == "ADMIN")
    staff = (await db_session.execute(stmt)).scalars().first()
    if not staff:
        staff = Staff(
            full_name="System Admin",
            mobile_no="9000999999",
            email="admin_test@erp.test",
            designation="ADMIN",
            pin_hash="dummy",
        )
        db_session.add(staff)
        await db_session.flush()

    async def override_get_current_staff():
        return {"staff_id": staff.staff_id, "designation": "ADMIN", "dealer_id": 1}

    app.dependency_overrides[get_current_staff] = override_get_current_staff
    yield client
    if get_current_staff in app.dependency_overrides:
        del app.dependency_overrides[get_current_staff]


@pytest_asyncio.fixture
async def dealer_client(client, db_session):
    """Provides an authenticated dealer API client."""
    from app.auth.token_utils import create_access_token

    token = create_access_token({"sub": "dealer@erp.com", "role": "DEALER"})
    client.headers = {"Authorization": f"Bearer {token}"}
    return client


@pytest_asyncio.fixture
async def staff_client(client, db_session):
    """Provides an authenticated staff API client."""
    from app.auth.token_utils import create_access_token

    token = create_access_token({"sub": "staff@erp.com", "role": "STAFF"})
    client.headers = {"Authorization": f"Bearer {token}"}
    return client
