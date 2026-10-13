import logging
from typing import Callable, Optional
from fastapi import HTTPException, Request, status
from app.core.config import settings

logger = logging.getLogger(__name__)


def extract_client_ip(request: Request) -> str:
    """
    Extract the originating client IP address, handling reverse proxies
    via X-Forwarded-For or X-Real-IP headers safely.
    """
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        # Take the earliest client IP before proxy hops
        client_ip = forwarded_for.split(",")[0].strip()
        # Strip optional port suffix if present
        if ":" in client_ip and not client_ip.startswith("["):
            client_ip = client_ip.split(":")[0]
        return client_ip

    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()

    if request.client and request.client.host:
        return request.client.host

    return "unknown"


def rate_limit(max_requests: Optional[int] = None, window: Optional[int] = None) -> Callable:
    """
    Factory creating an asynchronous FastAPI dependency for IP/endpoint rate-limiting.
    Uses async Redis atomic pipelines with strict fail-open resilience.

    Usage:
        @router.post("/login-pin", dependencies=[Depends(rate_limit(max_requests=10, window=300))])
        async def login(...): ...
    """
    limit = max_requests if max_requests is not None else getattr(settings, "LOGIN_RATE_LIMIT", 5)
    time_window = window if window is not None else getattr(settings, "RATE_LIMIT_WINDOW", 300)

    async def _rate_limit_dep(request: Request) -> None:
        if not getattr(settings, "RATE_LIMIT_ENABLED", True):
            return

        try:
            from app.core.redis import redis_manager

            client_ip = extract_client_ip(request)
            sanitized_path = request.url.path.strip("/")
            key = f"rate_limit:{client_ip}:{sanitized_path}"

            r = await redis_manager.get_client()
            if r is not None:
                pipe = r.pipeline()
                pipe.incr(key)
                pipe.expire(key, time_window)
                results = await pipe.execute()

                current_count = results[0]

                if current_count > limit:
                    logger.warning(
                        f"[RateLimit] Throttled client IP {client_ip} on '{request.url.path}' "
                        f"({current_count}/{limit} requests in {time_window}s window)"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Too many requests. Please try again later.",
                        headers={"Retry-After": str(time_window)},
                    )

        except HTTPException:
            raise  # Re-raise 429 throttling errors
        except Exception as exc:
            # Strict fail-open behavior: infrastructure issues must not disrupt legitimate users
            logger.warning(f"[RateLimit] Redis rate limiter unavailable, failing open: {exc}")

    return _rate_limit_dep
