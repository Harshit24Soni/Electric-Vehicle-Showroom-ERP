import logging
from typing import Any, Optional
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger(__name__)


class RedisManager:
    """
    Asynchronous Redis connection lifecycle and cache manager using redis.asyncio.
    Provides pooled connection management, startup ping healthchecks, and graceful shutdowns.
    """

    def __init__(self, url: Optional[str] = None):
        self._url: str = url or str(settings.REDIS_URL)
        self._pool: Optional[aioredis.ConnectionPool] = None
        self._client: Optional[aioredis.Redis] = None

    async def init_redis(self) -> aioredis.Redis:
        """
        Initialize the Redis connection pool and execute an explicit ping check.
        Ensures fail-fast behavior on misconfigured infrastructure.
        """
        if self._client is not None:
            return self._client

        try:
            self._pool = aioredis.ConnectionPool.from_url(
                self._url,
                decode_responses=True,
                max_connections=20,
            )
            self._client = aioredis.Redis(connection_pool=self._pool)
            await self._client.ping()
            logger.info("Successfully initialized asynchronous Redis connection pool and verified ping.")
            return self._client
        except Exception as exc:
            logger.error(f"Failed to connect to Redis instance at {self._url}: {exc}")
            if settings.ENVIRONMENT in ("production", "staging"):
                raise
            return self._client

    async def close(self) -> None:
        """Gracefully terminate client connections and disconnect the connection pool."""
        if self._client:
            await self._client.aclose()
            self._client = None
        if self._pool:
            await self._pool.disconnect()
            self._pool = None
        logger.info("Asynchronous Redis connection pool successfully closed.")

    @property
    def client(self) -> Optional[aioredis.Redis]:
        """Access the underlying aioredis.Redis client instance."""
        return self._client

    async def get_client(self) -> aioredis.Redis:
        """Get or lazily initialize the asynchronous Redis client."""
        if self._client is None:
            await self.init_redis()
        return self._client

    # --------------------------------------------------------------------------
    # Resilient Asynchronous Cache Operations
    # --------------------------------------------------------------------------
    async def get(self, key: str) -> Optional[str]:
        """Fetch string value by key with fail-safe error isolation."""
        try:
            client = await self.get_client()
            if client:
                return await client.get(key)
        except Exception as exc:
            logger.warning(f"Redis GET failed for key '{key}': {exc}")
        return None

    async def set(self, key: str, value: Any, expire: Optional[int] = None) -> bool:
        """Set string or serialized value with optional TTL expiry in seconds."""
        try:
            client = await self.get_client()
            if client:
                await client.set(key, str(value), ex=expire)
                return True
        except Exception as exc:
            logger.warning(f"Redis SET failed for key '{key}': {exc}")
        return False

    async def delete(self, key: str) -> bool:
        """Delete key from Redis."""
        try:
            client = await self.get_client()
            if client:
                await client.delete(key)
                return True
        except Exception as exc:
            logger.warning(f"Redis DELETE failed for key '{key}': {exc}")
        return False

    async def expire(self, key: str, seconds: int) -> bool:
        """Set TTL on an existing key."""
        try:
            client = await self.get_client()
            if client:
                return bool(await client.expire(key, seconds))
        except Exception as exc:
            logger.warning(f"Redis EXPIRE failed for key '{key}': {exc}")
        return False

    async def ping(self) -> bool:
        """Execute a healthcheck ping against Redis."""
        try:
            client = await self.get_client()
            if client:
                return bool(await client.ping())
        except Exception as exc:
            logger.warning(f"Redis PING healthcheck failed: {exc}")
        return False


# Global singleton instance
redis_manager = RedisManager()


async def get_redis_client() -> aioredis.Redis:
    """FastAPI dependency yielding an active asynchronous Redis client."""
    return await redis_manager.get_client()


def get_redis():
    """
    Backwards compatibility: provides a synchronous redis client for legacy code
    while modern endpoints adopt redis_manager.
    """
    import redis as sync_redis
    return sync_redis.Redis.from_url(str(settings.REDIS_URL), decode_responses=True)
