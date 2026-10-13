from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, func, select
from sqlalchemy.orm import Mapped, declarative_mixin, declared_attr, mapped_column


def utc_now() -> datetime:
    """
    Returns timezone-aware current UTC datetime.
    Strictly replaces deprecated datetime.utcnow() and avoids local server time calls.
    """
    return datetime.now(timezone.utc)


def utc_now_naive() -> datetime:
    """
    Returns offset-naive current UTC datetime for TIMESTAMP WITHOUT TIME ZONE columns.
    Prevents asyncpg DataError: can't subtract offset-naive and offset-aware datetimes.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


@declarative_mixin
class AuditMixin:
    """
    Comprehensive audit trail mixin for SQLAlchemy 2.0+ models.
    Enforces timezone-aware UTC timestamps for creation and updates.
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=True,
    )

    @declared_attr
    def created_by(cls) -> Mapped[Optional[int]]:
        return mapped_column(
            BigInteger,
            ForeignKey("staff.staff_id", ondelete="SET NULL"),
            nullable=True,
        )

    @declared_attr
    def updated_by(cls) -> Mapped[Optional[int]]:
        return mapped_column(
            BigInteger,
            ForeignKey("staff.staff_id", ondelete="SET NULL"),
            nullable=True,
        )


@declarative_mixin
class SoftDeleteMixin:
    """
    Production-grade Soft Delete mixin with full restoration audit tracking.
    All timestamps strictly store timezone-aware UTC values.
    """

    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    @declared_attr
    def deleted_by(cls) -> Mapped[Optional[int]]:
        return mapped_column(
            BigInteger,
            ForeignKey("staff.staff_id", ondelete="SET NULL"),
            nullable=True,
        )

    # Restoration tracking
    restored_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    @declared_attr
    def restored_by(cls) -> Mapped[Optional[int]]:
        return mapped_column(
            BigInteger,
            ForeignKey("staff.staff_id", ondelete="SET NULL"),
            nullable=True,
        )

    @classmethod
    def active(cls, session=None):
        """
        Query helper returning active, non-deleted records.
        Compatible with both modern SQLAlchemy 2.0 select statements and session.query.
        """
        if session is not None and hasattr(session, "query"):
            return session.query(cls).filter(cls.is_deleted.is_(False))
        return select(cls).where(cls.is_deleted.is_(False))