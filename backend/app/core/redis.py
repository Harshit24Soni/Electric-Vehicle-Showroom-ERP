import redis
import json
from app.core.config import settings

# Redis Configuration with Authentication (loaded strictly from settings)
REDIS_URL = settings.REDIS_URL
REDIS_PASSWORD = settings.REDIS_PASSWORD
REDIS_HOST = settings.REDIS_HOST
REDIS_PORT = settings.REDIS_PORT
REDIS_DB = settings.REDIS_DB

if REDIS_URL:
    # Use full URL if provided (includes password, SSL, etc.)
    pool = redis.ConnectionPool.from_url(
        REDIS_URL,
        decode_responses=True,
    )
else:
    # Build from individual variables
    pool = redis.ConnectionPool(
        host=REDIS_HOST,
        port=REDIS_PORT,
        db=REDIS_DB,
        password=REDIS_PASSWORD,
        decode_responses=True,
    )


def get_redis():
    """Get a Redis connection from the pool"""
    return redis.Redis(connection_pool=pool)
