import os
import secrets

from typing import Any, List, Union, Optional
from pydantic import AnyHttpUrl, field_validator, PostgresDsn, ValidationInfo
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "EV Showroom ERP"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_URL: Union[str, PostgresDsn]

    @field_validator("DATABASE_URL", mode="before")
    def assemble_db_connection(cls, v: Optional[str], info: ValidationInfo) -> Any:
        if isinstance(v, str):
             # Handle async driver automatically if not present
            if v.startswith("postgresql://"):
                return v.replace("postgresql://", "postgresql+asyncpg://")
        return v

    # Security
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 240  # 4 hours

    # Redis
    REDIS_URL: Optional[str] = None
    REDIS_PASSWORD: Optional[str] = None
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    LOGIN_RATE_LIMIT: int = 5
    RATE_LIMIT_WINDOW: int = 300

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), "../../.env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"  # Ignore extra fields in .env
    )

settings = Settings()
