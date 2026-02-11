import redis
import os
import json

from dotenv import load_dotenv

load_dotenv()

# Redis Configuration with Authentication
REDIS_URL = os.getenv("REDIS_URL", None)
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))

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
