from typing import Any, Union, Optional
from pydantic import field_validator, PostgresDsn, ValidationInfo
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "EV Showroom ERP"
    DEBUG: bool = False
    ENVIRONMENT: str

    # Database (strictly required; no hardcoded fallback)
    DATABASE_URL: Union[str, PostgresDsn]
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    @field_validator("DATABASE_URL", mode="before")
    def assemble_db_connection(cls, v: Optional[str], info: ValidationInfo) -> Any:
        if isinstance(v, str):
            # Handle async driver automatically if not present
            if v.startswith("postgresql://"):
                return v.replace("postgresql://", "postgresql+asyncpg://")
        return v

    # Security (strictly required; no hardcoded fallback)
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 240  # 4 hours

    # Redis (strictly required; no hardcoded fallback)
    REDIS_URL: str
    REDIS_HOST: Optional[str] = None
    REDIS_PORT: Optional[int] = None
    REDIS_DB: Optional[int] = None
    REDIS_PASSWORD: Optional[str] = None

    # CORS
    ALLOWED_ORIGINS: str = (
        "https://electric-vehicle-showroom-erp.vercel.app,http://localhost:3000,http://localhost:5173"
    )

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    LOGIN_RATE_LIMIT: int = 5
    RATE_LIMIT_WINDOW: int = 300

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

