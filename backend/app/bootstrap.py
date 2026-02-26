"""
Centralized model registration for SQLAlchemy.

Import all domain models here so they are registered with the Base metadata.
This avoids scattered cross-domain imports and ensures all models are available
for Alembic migrations and relationship resolution.
"""
from sqlalchemy.orm import configure_mappers
from app.db.base import Base

# Import all domain models to register them with Base
from app.domains.sales.models import *  # noqa: F401, F403
from app.domains.crm.models import *  # noqa: F401, F403
from app.domains.procurement.models import *  # noqa: F401, F403
from app.domains.inventory.models import *  # noqa: F401, F403
from app.domains.finance.models import *  # noqa: F401, F403
from app.domains.billing.models import *  # noqa: F401, F403
from app.domains.service.models import *  # noqa: F401, F403
from app.domains.warranty.models import *  # noqa: F401, F403
from app.domains.insurance.models import *  # noqa: F401, F403
from app.domains.master.models import *  # noqa: F401, F403
from app.domains.followup.models import *  # noqa: F401, F403


def init_models():
    """Initialize all models and configure mappers for SQLAlchemy."""
    configure_mappers()
    return Base.metadata
