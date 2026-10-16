import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.core.config import settings

logger = logging.getLogger(__name__)

# Normalize database URL for asynchronous pg driver
db_url = str(settings.DATABASE_URL)
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Configure SQLAlchemy 2.0 Async Engine with production pooling parameters
engine = create_async_engine(
    db_url,
    echo=getattr(settings, "DB_ECHO", False),
    pool_pre_ping=True,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_recycle=getattr(settings, "DB_POOL_RECYCLE", 1800),
    pool_timeout=getattr(settings, "DB_POOL_TIMEOUT", 15),
)

# Async Session Factory using SQLAlchemy 2.0+ standard async_sessionmaker
async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Backward-compatibility alias
AsyncSessionLocal = async_session_maker


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency yielding a transactional async database session.
    Guarantees safe session closure and rollback on exceptions inside a strict try/except/finally block.
    """
    session: AsyncSession = async_session_maker()
    try:
        yield session
        await session.commit()
    except Exception as exc:
        await session.rollback()
        logger.error(f"[Database] Session rolled back due to error: {exc}", exc_info=True)
        raise
    finally:
        await session.close()


async def dispose_engine() -> None:
    """Disposes the async engine and its connection pools on application shutdown."""
    if engine:
        await engine.dispose()
        logger.info("[Database] Engine and connection pools successfully disposed.")
