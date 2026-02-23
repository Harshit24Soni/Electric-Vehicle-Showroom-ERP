from datetime import datetime
from sqlalchemy import TIMESTAMP, ForeignKey, Boolean, BigInteger
from sqlalchemy.orm import Mapped, mapped_column, declarative_mixin, declared_attr

@declarative_mixin
class AuditMixin:
    """Comprehensive audit trails for all core tables."""
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), onupdate=datetime.utcnow, nullable=True)
    
    @declared_attr
    def created_by(cls) -> Mapped[int | None]:
        return mapped_column(BigInteger, ForeignKey("master.staff.staff_id", ondelete="SET NULL"), nullable=True)

    @declared_attr
    def updated_by(cls) -> Mapped[int | None]:
        return mapped_column(BigInteger, ForeignKey("master.staff.staff_id", ondelete="SET NULL"), nullable=True)


@declarative_mixin
class SoftDeleteMixin:
    """Robust Soft Delete architecture setting up future permanent deletion."""
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    
    @declared_attr
    def deleted_by(cls) -> Mapped[int | None]:
        return mapped_column(BigInteger, ForeignKey("master.staff.staff_id", ondelete="SET NULL"), nullable=True)

    # Restoration tracking
    restored_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    
    @declared_attr
    def restored_by(cls) -> Mapped[int | None]:
        return mapped_column(BigInteger, ForeignKey("master.staff.staff_id", ondelete="SET NULL"), nullable=True)

    @classmethod
    def active(cls, session):
        """Helper method to easily query only non-deleted records."""
        return session.query(cls).filter(cls.is_deleted == False)