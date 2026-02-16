from datetime import datetime
from sqlalchemy import TIMESTAMP, ForeignKey, BigInteger
from sqlalchemy.orm import Mapped, mapped_column, declarative_mixin


@declarative_mixin
class SoftDeleteMixin:
    """
    Mixin for soft-deleting records.

    Adds a `deleted_at` column. Records with a non-null `deleted_at`
    are considered deleted but retained in the database.

    Usage:
        # Query only active records:
        active_sales = Sale.active(db)

        # Soft-delete a record:
        sale.deleted_at = datetime.utcnow()
        db.commit()
    """
    deleted_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP, nullable=True, default=None
    )

    @classmethod
    def active(cls, session):
        """Query only active (non-deleted) records."""
        return session.query(cls).filter(cls.deleted_at.is_(None))


@declarative_mixin
class AuditMixin:
    """
    Mixin for audit columns (created_at, updated_at, created_by, updated_by).
    """
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)
    updated_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, onupdate=datetime.utcnow)
    
    # Use string reference to avoid circular import/definition issues
    created_by: Mapped[int | None] = mapped_column(ForeignKey("master.staff.staff_id"), nullable=True)
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("master.staff.staff_id"), nullable=True)

