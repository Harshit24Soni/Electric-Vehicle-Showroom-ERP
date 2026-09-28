from typing import Callable, Any, Dict, List
from fastapi import HTTPException, status, Depends

# Decoupling Strategy:
# Feature toggles are centralized here to allow granular, gradual rollouts 
# of new domains (like the Modular Inventory) without affecting existing logic.
# By making this a FastAPI dependency, we cleanly inject authorization checks
# directly into the route definitions, keeping business logic agnostic of feature states.

# Mock feature flags dictionary. In a real system, this could be a DB table or Redis cache.
# Format: { "feature_name": { "enabled_tenants": ["tenant_id"], "enabled_roles": ["role_name"] } }
FEATURE_FLAGS: Dict[str, Dict[str, List[str]]] = {
    "new_inventory_module": {
        "enabled_tenants": ["*"],  # '*' wildcard means all tenants
        "enabled_roles": ["admin", "inventory_manager"]
    }
}

# Mock user context for demonstration
class UserContext:
    def __init__(self, tenant_id: str, role: str):
        self.tenant_id = tenant_id
        self.role = role

async def get_current_user_context() -> UserContext:
    """
    Placeholder dependency to extract the current user's context (tenant and role).
    In a real app, this would decode a JWT or query the session.
    """
    # Hardcoded for demonstration purposes
    return UserContext(tenant_id="tenant_1", role="admin")


def require_feature(feature_name: str) -> Callable:
    """
    FastAPI dependency factory that checks if a specific feature is enabled
    for the current user's tenant and role.
    
    Usage:
        @app.get("/some-endpoint", dependencies=[Depends(require_feature("new_inventory_module"))])
    """
    async def feature_checker(user: UserContext = Depends(get_current_user_context)) -> None:
        flag = FEATURE_FLAGS.get(feature_name)
        
        # Default deny if the feature is not explicitly configured
        if not flag:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Feature '{feature_name}' is disabled."
            )
            
        tenant_allowed = (
            "*" in flag.get("enabled_tenants", []) or 
            user.tenant_id in flag.get("enabled_tenants", [])
        )
        
        role_allowed = (
            "*" in flag.get("enabled_roles", []) or 
            user.role in flag.get("enabled_roles", [])
        )
        
        if not (tenant_allowed and role_allowed):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Feature '{feature_name}' is not enabled for your account or role."
            )
            
    return feature_checker
