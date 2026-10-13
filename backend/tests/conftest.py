import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from pathlib import Path
from dotenv import load_dotenv

# Force test environment BEFORE loading app
os.environ["ENVIRONMENT"] = "test"

# Load environment configuration dynamically without hardcoded credentials
for env_candidate in [Path(".env.test"), Path("backend/.env.test"), Path(".env"), Path("backend/.env")]:
    if env_candidate.is_file():
        load_dotenv(dotenv_path=env_candidate, override=False)
        break

from app.main import app
from app.db.session import get_db, engine
from app.db.base import Base


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_db():
    """Create all tables in the test database once per session."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture
async def db_session():
    """Provides a transactional database session for each test."""
    connection = await engine.connect()
    transaction = await connection.begin()
    
    AsyncSessionLocal = sessionmaker(
        bind=connection,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False
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
    
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as c:
        yield c
        
    app.dependency_overrides.clear()

@pytest_asyncio.fixture
async def admin_client(client, db_session):
    """Provides an authenticated admin API client."""
    from app.auth.dependencies import get_current_staff
    async def override_get_current_staff():
        return {"staff_id": 1, "designation": "ADMIN", "dealer_id": 1}
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
