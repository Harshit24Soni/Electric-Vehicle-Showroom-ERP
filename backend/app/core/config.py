import os
import sys
from typing import Any, List, Literal, Optional, Tuple
from pydantic import field_validator, model_validator, ValidationInfo
from pydantic_settings import BaseSettings, SettingsConfigDict


def _get_env_files() -> Tuple[str, ...]:
    """
    Determine the appropriate environment files to load.
    Test files (.env.test) must only be loaded during automated testing.
    In all other runtime modes (dev, staging, prod, migrations, seeds),
    the primary .env configuration is loaded.
    """
    is_test = (
        os.getenv("ENVIRONMENT") == "test"
        or "pytest" in sys.modules
        or bool(os.getenv("PYTEST_CURRENT_TEST"))
    )
    if is_test:
        return (".env.test", "backend/.env.test")
    return (".env", "backend/.env")



class Settings(BaseSettings):
    """
    Centralized, strongly-typed application configuration powered by Pydantic Settings v2.
    Strictly validates infrastructure URLs, cryptographic keys, and runtime parameters.
    """

    # --------------------------------------------------------------------------
    # Application & Environment
    # --------------------------------------------------------------------------
    PROJECT_NAME: str = "EV Showroom ERP"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: Literal["development", "staging", "production", "test"] = "development"
    DEBUG: bool = False

    # --------------------------------------------------------------------------
    # Database Settings (Strictly Required - Zero Hardcoded Fallbacks)
    # --------------------------------------------------------------------------
    DATABASE_URL: str
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_RECYCLE: int = 3600
    DB_POOL_TIMEOUT: int = 30

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def validate_database_url(cls, v: Any, info: ValidationInfo) -> str:
        if not v or not isinstance(v, str) or v.strip() in ("", "<INSERT_VALUE_HERE>"):
            raise ValueError("DATABASE_URL is strictly required and must not be empty or a placeholder.")

        url_str = v.strip()
        # Automatically upgrade standard postgresql:// to async driver postgresql+asyncpg://
        if url_str.startswith("postgresql://"):
            url_str = url_str.replace("postgresql://", "postgresql+asyncpg://", 1)

        valid_prefixes = ("postgresql+asyncpg://", "postgresql://", "sqlite+aiosqlite://")
        if not any(url_str.startswith(prefix) for prefix in valid_prefixes):
            raise ValueError(
                f"Invalid DATABASE_URL scheme. Expected one of {valid_prefixes}, received: {url_str[:20]}..."
            )
        return url_str

    # --------------------------------------------------------------------------
    # Security & Authentication (Strictly Required)
    # --------------------------------------------------------------------------
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 240  # 4 hours

    @field_validator("JWT_SECRET_KEY", mode="before")
    @classmethod
    def validate_jwt_secret_key(cls, v: Any, info: ValidationInfo) -> str:
        if not v or not isinstance(v, str) or v.strip() in ("", "<INSERT_VALUE_HERE>"):
            raise ValueError("JWT_SECRET_KEY is strictly required and cannot be empty or a placeholder.")
        return v.strip()

    # --------------------------------------------------------------------------
    # Redis Cache & Broker (Strictly Required)
    # --------------------------------------------------------------------------
    REDIS_URL: str
    REDIS_HOST: Optional[str] = None
    REDIS_PORT: Optional[int] = 6379
    REDIS_DB: Optional[int] = 0
    REDIS_PASSWORD: Optional[str] = None

    @field_validator("REDIS_URL", mode="before")
    @classmethod
    def validate_redis_url(cls, v: Any, info: ValidationInfo) -> str:
        if not v or not isinstance(v, str) or v.strip() in ("", "<INSERT_VALUE_HERE>"):
            raise ValueError("REDIS_URL is strictly required and cannot be empty or a placeholder.")

        clean_url = v.strip()
        is_tls = "--tls" in clean_url or clean_url.startswith("rediss://")
        # Strip accidental redis-cli command copy-paste prefixes
        if "redis://" in clean_url:
            clean_url = "redis://" + clean_url.split("redis://", 1)[1]
        elif "rediss://" in clean_url:
            clean_url = "rediss://" + clean_url.split("rediss://", 1)[1]

        if is_tls and clean_url.startswith("redis://"):
            clean_url = clean_url.replace("redis://", "rediss://", 1)

        if not (clean_url.startswith("redis://") or clean_url.startswith("rediss://")):
            raise ValueError(f"REDIS_URL must begin with 'redis://' or 'rediss://', received: {clean_url[:15]}...")
        return clean_url

    # --------------------------------------------------------------------------
    # CORS Configuration
    # --------------------------------------------------------------------------
    ALLOWED_ORIGINS: str = (
        "https://electric-vehicle-showroom-erp.vercel.app,http://localhost:3000,http://localhost:5173"
    )

    @property
    def cors_origins(self) -> List[str]:
        """Parsed, trimmed list of allowed CORS origins."""
        if not self.ALLOWED_ORIGINS:
            return []
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    # --------------------------------------------------------------------------
    # Rate Limiting
    # --------------------------------------------------------------------------
    RATE_LIMIT_ENABLED: bool = True
    LOGIN_RATE_LIMIT: int = 5
    RATE_LIMIT_WINDOW: int = 300

    # --------------------------------------------------------------------------
    # Enterprise Feature Flags Defaults
    # --------------------------------------------------------------------------
    FEATURE_FLAG_WAC_INVENTORY_COSTING: bool = True
    FEATURE_FLAG_OCR_PROCUREMENT_SCANNING: bool = True
    FEATURE_FLAG_SERIAL_TRACKING_VERIFICATION: bool = True
    FEATURE_FLAG_DYNAMIC_MARGIN_PRICING: bool = True
    DEFAULT_GST_RATE_PERCENT: float = 18.0

    # --------------------------------------------------------------------------
    # Cross-Field Production Validation
    # --------------------------------------------------------------------------
    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        """Strictly enforce security policies in production and staging environments."""
        if self.ENVIRONMENT in ("production", "staging"):
            if self.DEBUG:
                raise ValueError(f"DEBUG mode must be disabled in {self.ENVIRONMENT} environment.")

            # Disallow insecure placeholder secrets
            insecure_patterns = [
                "change_me",
                "secret",
                "test",
                "placeholder",
                "dummy",
                "default",
                "password",
            ]
            key_lower = self.JWT_SECRET_KEY.lower()
            if any(pattern in key_lower for pattern in insecure_patterns):
                raise ValueError(
                    f"Insecure JWT_SECRET_KEY detected in {self.ENVIRONMENT} environment. "
                    "Provide a cryptographically secure random secret."
                )

            if len(self.JWT_SECRET_KEY) < 32:
                raise ValueError(
                    f"JWT_SECRET_KEY must be at least 32 characters in {self.ENVIRONMENT} environment for HS256."
                )

        return self

    model_config = SettingsConfigDict(
        env_file=_get_env_files(),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )


# Instantiate singleton with safe test harness detection
settings = Settings()
