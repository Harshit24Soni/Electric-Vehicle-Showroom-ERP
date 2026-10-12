import os
from pathlib import Path
from typing import Any, List, Union, Optional
from pydantic import AnyHttpUrl, field_validator, PostgresDsn, ValidationInfo
from pydantic_settings import BaseSettings, SettingsConfigDict

# Verify .env file exists on disk; application must fail to start if the .env file is missing
_env_file = Path(".env")
if not _env_file.is_file():
    _alt_file = Path("backend/.env")
    if not _alt_file.is_file():
        raise FileNotFoundError(
            "Configuration error: Missing required '.env' file. "
            "The application cannot start without a valid .env configuration file."
        )


class Settings(BaseSettings):
    # App
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "EV Showroom ERP"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Database (strictly required from .env; no hardcoded fallback)
    DATABASE_URL: Union[str, PostgresDsn]

    @field_validator("DATABASE_URL", mode="before")
    def assemble_db_connection(cls, v: Optional[str], info: ValidationInfo) -> Any:
        if isinstance(v, str):
            # Handle async driver automatically if not present
            if v.startswith("postgresql://"):
                return v.replace("postgresql://", "postgresql+asyncpg://")
        return v

    # Security (strictly required from .env; no hardcoded fallback)
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 240  # 4 hours

    # Redis (strictly required from .env; no hardcoded fallback values)
    REDIS_HOST: str
    REDIS_PORT: int
    REDIS_DB: int
    REDIS_PASSWORD: Optional[str] = None
    REDIS_URL: Optional[str] = None

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    LOGIN_RATE_LIMIT: int = 5
    RATE_LIMIT_WINDOW: int = 300

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"  # Ignore extra fields in .env
    )


settings = Settings()
