"""
Centralized model registration for SQLAlchemy.

Import all domain models here so they are registered with the Base metadata.
This avoids scattered cross-domain imports and ensures all models are available
for Alembic migrations and relationship resolution.
"""
from sqlalchemy.orm import configure_mappers
from app.db.base import Base

# Import all domain models to register them with Base
from app.modules.sales.models import *  # noqa: F401, F403
from app.domains.crm.models import *  # noqa: F401, F403
from app.domains.procurement.models import *  # noqa: F401, F403
from app.modules.inventory.models import *  # noqa: F401, F403
from app.modules.finance.models import *  # noqa: F401, F403
from app.modules.billing.models import *  # noqa: F401, F403
from app.domains.service.models import *  # noqa: F401, F403
from app.domains.warranty.models import *  # noqa: F401, F403
from app.domains.insurance.models import *  # noqa: F401, F403
from app.domains.master.models import *  # noqa: F401, F403
from app.domains.followup.models import *  # noqa: F401, F403


def init_models():
    """Initialize all models and configure mappers for SQLAlchemy."""
    configure_mappers()
    return Base.metadata

def init_listeners():
    """Initialize all event bus listeners."""
    from app.modules.inventory.listeners import register_inventory_listeners
    from app.domains.crm.listeners import register_crm_listeners
    from app.domains.master.listeners import register_master_listeners
    from app.modules.billing.listeners import register_billing_listeners
    from app.modules.finance.listeners import register_finance_listeners
    
    register_inventory_listeners()
    register_crm_listeners()
    register_master_listeners()
    register_billing_listeners()
    register_finance_listeners()
