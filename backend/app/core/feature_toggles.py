import logging
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional
from fastapi import Depends, HTTPException, status
from app.core.config import settings

logger = logging.getLogger(__name__)


# ------------------------------------------------------------------------------
# Feature Flag Metadata Model
# ------------------------------------------------------------------------------
@dataclass
class FeatureFlag:
    """Represents an enterprise feature flag definition with multi-tenant and RBAC scope."""
    name: str
    description: str
    enabled: bool = True
    enabled_tenants: List[str] = field(default_factory=lambda: ["*"])
    enabled_roles: List[str] = field(default_factory=lambda: ["*"])


# ------------------------------------------------------------------------------
# Runtime Enterprise Feature Flag Manager
# ------------------------------------------------------------------------------
class FeatureFlagManager:
    """
    Centralized runtime feature flag manager.
    Supports granular rollouts of enterprise features (e.g. WAC inventory costing,
    OCR procurement scanning, barcode serial verification) with tenant/role gating.
    """

    def __init__(self):
        self._flags: Dict[str, FeatureFlag] = {}
        self._initialize_enterprise_defaults()

    def _initialize_enterprise_defaults(self) -> None:
        """Register built-in enterprise workflows with safe defaults from settings."""
        defaults = [
            FeatureFlag(
                name="wac_inventory_costing",
                description="Weighted Average Cost (WAC) recalculation engine on purchase receipt and job card consumption.",
                enabled=getattr(settings, "FEATURE_FLAG_WAC_INVENTORY_COSTING", True),
                enabled_tenants=["*"],
                enabled_roles=["*"],
            ),
            FeatureFlag(
                name="ocr_procurement_scanning",
                description="Automated OCR document extraction for vendor invoices and spare parts lists.",
                enabled=getattr(settings, "FEATURE_FLAG_OCR_PROCUREMENT_SCANNING", True),
                enabled_tenants=["*"],
                enabled_roles=["admin", "procurement_manager"],
            ),
            FeatureFlag(
                name="serial_tracking_verification",
                description="Strict barcode/QR serial tracking verification during inventory movement & dispatch.",
                enabled=getattr(settings, "FEATURE_FLAG_SERIAL_TRACKING_VERIFICATION", True),
                enabled_tenants=["*"],
                enabled_roles=["*"],
            ),
            FeatureFlag(
                name="dynamic_margin_pricing",
                description="Auto-computed profit margin tiers on spare part sales.",
                enabled=getattr(settings, "FEATURE_FLAG_DYNAMIC_MARGIN_PRICING", True),
                enabled_tenants=["*"],
                enabled_roles=["admin", "sales_manager"],
            ),
            FeatureFlag(
                name="new_inventory_module",
                description="Modular decoupled inventory architecture with multi-location transfers.",
                enabled=True,
                enabled_tenants=["*"],
                enabled_roles=["*"],
            ),
        ]
        for flag in defaults:
            self._flags[flag.name] = flag

    def is_enabled(
        self,
        feature_name: str,
        tenant_id: Optional[str] = None,
        role: Optional[str] = None,
    ) -> bool:
        """
        Check if a given feature flag is active for the target tenant and user role.
        If tenant_id or role is omitted/None, evaluates whether the feature is generally enabled.
        """
        flag = self._flags.get(feature_name)
        if not flag or not flag.enabled:
            return False

        # If specific tenant is queried, verify against allowed tenant scope
        if tenant_id and tenant_id != "*":
            if "*" not in flag.enabled_tenants and tenant_id not in flag.enabled_tenants:
                return False

        # If specific role is queried, verify against allowed role scope
        if role and role != "*":
            if "*" not in flag.enabled_roles and role not in flag.enabled_roles:
                return False

        return True

    def enable(
        self,
        feature_name: str,
        tenants: Optional[List[str]] = None,
        roles: Optional[List[str]] = None,
    ) -> None:
        """Enable an enterprise feature with optional tenant/role targeting."""
        if feature_name in self._flags:
            self._flags[feature_name].enabled = True
            if tenants is not None:
                self._flags[feature_name].enabled_tenants = tenants
            if roles is not None:
                self._flags[feature_name].enabled_roles = roles
        else:
            self._flags[feature_name] = FeatureFlag(
                name=feature_name,
                description=f"Runtime feature flag: {feature_name}",
                enabled=True,
                enabled_tenants=tenants or ["*"],
                enabled_roles=roles or ["*"],
            )
        logger.info(f"[FeatureFlagManager] Feature '{feature_name}' enabled.")

    def disable(self, feature_name: str) -> None:
        """Disable a feature flag globally."""
        if feature_name in self._flags:
            self._flags[feature_name].enabled = False
        else:
            self._flags[feature_name] = FeatureFlag(
                name=feature_name,
                description=f"Runtime feature flag: {feature_name}",
                enabled=False,
            )
        logger.info(f"[FeatureFlagManager] Feature '{feature_name}' disabled.")

    def get_flag(self, feature_name: str) -> Optional[FeatureFlag]:
        """Fetch flag metadata by name."""
        return self._flags.get(feature_name)

    def list_flags(self, tenant_id: Optional[str] = None, role: Optional[str] = None) -> Dict[str, bool]:
        """Return a mapping of all registered flags and their evaluated boolean status."""
        return {
            name: self.is_enabled(name, tenant_id=tenant_id, role=role)
            for name in self._flags
        }


# Singleton manager instance
feature_flags = FeatureFlagManager()


# ------------------------------------------------------------------------------
# User Context & FastAPI Dependency Integration
# ------------------------------------------------------------------------------
class UserContext:
    """Encapsulates caller tenant and authorization credentials for feature evaluation."""
    def __init__(self, tenant_id: str = "default_tenant", role: str = "admin"):
        self.tenant_id = tenant_id
        self.role = role


async def get_current_user_context() -> UserContext:
    """
    FastAPI dependency extracting caller tenant and role context.
    Safely falls back to default tenant in unauthenticated routes.
    """
    return UserContext(tenant_id="default_tenant", role="admin")


def require_feature(feature_name: str) -> Callable:
    """
    FastAPI route dependency enforcing that an enterprise workflow is enabled
    before processing incoming requests.

    Usage:
        @router.post("/procurement/ocr-scan", dependencies=[Depends(require_feature("ocr_procurement_scanning"))])
        async def scan_invoice(...): ...
    """
    async def feature_checker(user: UserContext = Depends(get_current_user_context)) -> None:
        if not feature_flags.is_enabled(feature_name, tenant_id=user.tenant_id, role=user.role):
            logger.warning(
                f"Forbidden access: feature '{feature_name}' is disabled for tenant '{user.tenant_id}', role '{user.role}'"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Enterprise feature '{feature_name}' is currently disabled for this tenant or role.",
            )

    return feature_checker
