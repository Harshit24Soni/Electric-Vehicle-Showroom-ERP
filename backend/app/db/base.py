from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

# SQLAlchemy 2.0+ explicit naming conventions for deterministic migrations
POSTGRES_NAMING_CONVENTIONS = {
    "ix": "%(column_0_label)s_idx",
    "uq": "%(table_name)s_%(column_0_name)s_key",
    "ck": "%(table_name)s_%(constraint_name)s_check",
    "fk": "%(table_name)s_%(column_0_name)s_fkey",
    "pk": "%(table_name)s_pkey",
}


class Base(DeclarativeBase):
    """
    Declarative Base class for all SQLAlchemy 2.0+ domain models.
    Enforces unified naming conventions across indexes, foreign keys, and unique constraints.
    """

    metadata = MetaData(naming_convention=POSTGRES_NAMING_CONVENTIONS)
