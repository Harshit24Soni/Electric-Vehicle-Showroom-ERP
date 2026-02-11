import logging
from typing import Callable

from fastapi import Request, HTTPException, status, Depends

logger = logging.getLogger(__name__)


def rate_limit(max_requests: int = 5, window: int = 60) -> Callable:
    """
    Factory that returns a FastAPI dependency for rate limiting.

    Usage:
        @router.post("/login", dependencies=[Depends(rate_limit(max_requests=5, window=300))])
        async def login(...): ...
    """

    async def _rate_limit_dep(request: Request):
        try:
            from app.core.redis import get_redis

            client_ip = request.client.host if request.client else "unknown"
            key = f"rate_limit:{client_ip}:{request.url.path}"

            r = get_redis()
            current = r.get(key)

            if current and int(current) >= max_requests:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests. Please try again later.",
                )

            pipe = r.pipeline()
            pipe.incr(key)
            pipe.expire(key, window)
            pipe.execute()

        except HTTPException:
            raise  # Re-raise 429 errors
        except Exception as e:
            # Fail open: if Redis is down, allow the request through
            logger.warning(f"Rate limiter unavailable: {e}")

    return _rate_limit_dep
