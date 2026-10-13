import asyncio
from datetime import datetime, timezone
import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.core.event_bus import DomainEvent, EventBus
from app.core.feature_toggles import FeatureFlagManager, UserContext, require_feature
from app.core.redis import RedisManager
from app.db.base import Base
from app.db.mixins import AuditMixin, SoftDeleteMixin, utc_now
from fastapi import HTTPException
from sqlalchemy.orm import Mapped


# ------------------------------------------------------------------------------
# 1. Configuration Validation Tests
# ------------------------------------------------------------------------------
def test_config_strict_validation():
    """Verify strictly required fields and automatic PostgreSQL driver upgrade."""
    cfg = Settings(
        ENVIRONMENT="development",
        DATABASE_URL="postgresql://user:pass@localhost:5432/ev_test",
        REDIS_URL="redis://localhost:6379/0",
        JWT_SECRET_KEY="dev_secret_key_minimum_length_required",
        ALLOWED_ORIGINS="http://localhost:3000, http://localhost:5173 ",
    )
    # Automatically upgraded to asyncpg driver
    assert str(cfg.DATABASE_URL).startswith("postgresql+asyncpg://")
    assert cfg.cors_origins == ["http://localhost:3000", "http://localhost:5173"]


def test_config_rejects_empty_database_url():
    """Verify rejection of empty or placeholder database URLs."""
    with pytest.raises(ValidationError):
        Settings(
            ENVIRONMENT="development",
            DATABASE_URL="",
            REDIS_URL="redis://localhost:6379/0",
            JWT_SECRET_KEY="some_secret_key",
        )

    with pytest.raises(ValidationError):
        Settings(
            ENVIRONMENT="development",
            DATABASE_URL="<INSERT_VALUE_HERE>",
            REDIS_URL="redis://localhost:6379/0",
            JWT_SECRET_KEY="some_secret_key",
        )


def test_config_rejects_insecure_secret_in_production():
    """Verify that weak placeholder secrets are forbidden in production mode."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            DEBUG=False,
            DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/ev_prod",
            REDIS_URL="redis://localhost:6379/0",
            JWT_SECRET_KEY="CHANGE_ME_TO_A_STRONG_RANDOM_SECRET_KEY",
        )
    assert "Insecure JWT_SECRET_KEY detected in production" in str(exc_info.value)

    # Rejection of keys shorter than 32 characters in production
    with pytest.raises(ValidationError) as exc_info2:
        Settings(
            ENVIRONMENT="production",
            DEBUG=False,
            DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/ev_prod",
            REDIS_URL="redis://localhost:6379/0",
            JWT_SECRET_KEY="short_key_under_32_chars!",
        )
    assert "at least 32 characters" in str(exc_info2.value)


# ------------------------------------------------------------------------------
# 2. Asynchronous EventBus & Exception Isolation Tests
# ------------------------------------------------------------------------------
class CustomOrderEvent(DomainEvent):
    order_id: int
    amount: float


@pytest.mark.asyncio
async def test_event_bus_exception_isolation():
    """
    Verify that when one listener raises an unhandled exception,
    all other listeners execute successfully and the publisher does NOT crash.
    """
    bus = EventBus()
    successful_runs = []

    async def healthy_async_listener(event: CustomOrderEvent):
        successful_runs.append("healthy_async")

    def failing_sync_listener(event: CustomOrderEvent):
        raise RuntimeError("Simulated unhandled failure in domain listener")

    async def second_healthy_listener(event: CustomOrderEvent):
        successful_runs.append("second_healthy")

    bus.subscribe(CustomOrderEvent, healthy_async_listener)
    bus.subscribe(CustomOrderEvent, failing_sync_listener)
    bus.subscribe(CustomOrderEvent, second_healthy_listener)

    # Publish should complete without raising the RuntimeError
    test_event = CustomOrderEvent(order_id=101, amount=999.50)
    await bus.publish(test_event)

    # Both healthy listeners must have executed
    assert "healthy_async" in successful_runs
    assert "second_healthy" in successful_runs
    assert len(successful_runs) == 2


# ------------------------------------------------------------------------------
# 3. Enterprise Feature Toggle Manager Tests
# ------------------------------------------------------------------------------
def test_feature_flag_manager():
    """Verify default enterprise flags, RBAC tenant/role filtering, and toggling."""
    manager = FeatureFlagManager()

    # Built-in enterprise flags must exist
    assert manager.is_enabled("wac_inventory_costing") is True
    assert manager.is_enabled("ocr_procurement_scanning") is True

    # Role-based restriction
    assert manager.is_enabled("ocr_procurement_scanning", role="procurement_manager") is True
    assert manager.is_enabled("ocr_procurement_scanning", role="guest_viewer") is False

    # Dynamic toggle
    manager.disable("wac_inventory_costing")
    assert manager.is_enabled("wac_inventory_costing") is False

    manager.enable("wac_inventory_costing")
    assert manager.is_enabled("wac_inventory_costing") is True


@pytest.mark.asyncio
async def test_require_feature_dependency():
    """Verify require_feature dependency properly enforces 403 Forbidden on disabled flags."""
    from app.core.feature_toggles import feature_flags

    feature_flags.disable("ocr_procurement_scanning")

    # Mock user context
    user = UserContext(tenant_id="tenant_1", role="admin")

    checker = require_feature("ocr_procurement_scanning")
    with pytest.raises(HTTPException) as exc:
        await checker(user=user)
    assert exc.value.status_code == 403

    # Clean up state
    feature_flags.enable("ocr_procurement_scanning")


# ------------------------------------------------------------------------------
# 4. Database Mixins & UTC Timezone Tests
# ------------------------------------------------------------------------------
def test_utc_now_timezone_aware():
    """Ensure utc_now returns timezone-aware UTC datetime and no local times."""
    now = utc_now()
    assert now.tzinfo is not None
    assert now.tzinfo == timezone.utc


def test_soft_delete_and_audit_attributes():
    """Ensure mixins properly declare all required tracking columns."""

    class SampleModel(Base, AuditMixin, SoftDeleteMixin):
        __tablename__ = "sample_test_model"
        from sqlalchemy import Integer
        from sqlalchemy.orm import mapped_column

        id: Mapped[int] = mapped_column(Integer, primary_key=True)

    assert hasattr(SampleModel, "created_at")
    assert hasattr(SampleModel, "updated_at")
    assert hasattr(SampleModel, "created_by")
    assert hasattr(SampleModel, "updated_by")

    assert hasattr(SampleModel, "is_deleted")
    assert hasattr(SampleModel, "deleted_at")
    assert hasattr(SampleModel, "restored_at")
    assert hasattr(SampleModel, "active")


# ------------------------------------------------------------------------------
# 5. RedisManager Lifecycle Tests
# ------------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_redis_manager_lifecycle():
    """Verify RedisManager initialization, properties, and graceful closure."""
    manager = RedisManager(url="redis://127.0.0.1:6379/15")
    assert manager._url == "redis://127.0.0.1:6379/15"
    assert manager.client is None

    # Test clean shutdown without prior initialization does not throw
    await manager.close()
    assert manager.client is None
