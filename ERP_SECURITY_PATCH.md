# ERP System - Security Fixes & Architecture Improvements

**Purpose**: Comprehensive security hardening and architectural cleanup for the ERP system.  
**Execution**: All fixes should be implemented in one pass by the AI agent.

---

## 🔴 CRITICAL SECURITY VULNERABILITIES

### 1. Redis Cache Exposed Without Authentication
**Location**: `backend/app/core/redis.py`

**Issue**: Redis connection lacks password authentication and SSL encryption, allowing anyone on the network to read/write cache data.

**Fix**:
```python
# In backend/app/core/redis.py
REDIS_URL = os.getenv("REDIS_URL", "redis://:password@host:6379/0?ssl=true")
```

**Required .env update**:
```bash
REDIS_URL=redis://:your_secure_password@localhost:6379/0?ssl=true
REDIS_PASSWORD=your_secure_password_here
```

---

### 2. Authentication Token Expiry Too Long
**Location**: `backend/app/auth/token_utils.py`

**Issue**: Current token expiry is set to allow staff to stay logged in for entire showroom duration, creating security risk if device is lost/stolen.

**Fix**: Reduce session timeout to 4 hours
```python
# In backend/app/auth/token_utils.py
ACCESS_TOKEN_EXPIRE_MINUTES = 240  # 4 hours
REFRESH_TOKEN_EXPIRE_DAYS = 7  # Keep refresh token longer for convenience
```

**Rationale**: 4-hour sessions balance security with usability - staff can work uninterrupted during shifts but tokens expire if device is left unattended.

---

### 3. Frontend Role Protection Only (Client-Side Bypass)
**Location**: `frontend/src/components/layout/ProtectedRoute.tsx`

**Issue**: Role-based access control enforced only in React frontend. Users can bypass by directly calling backend API endpoints.

**Fix**:
1. **Backend**: Add role verification to ALL protected routes via dependencies
```python
# In backend/app/auth/dependencies.py
from functools import wraps
from fastapi import Depends, HTTPException, status

def require_roles(allowed_roles: list[str]):
    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker

# Example usage in routes:
@router.get("/admin-only")
def admin_route(user: dict = Depends(require_roles(["admin"]))):
    pass
```

2. **Apply to all sensitive routes** in:
   - `backend/app/domains/admin/routes.py`
   - `backend/app/domains/finance/routes.py`
   - `backend/app/domains/reports/routes.py`
   - Any other privileged endpoints

3. **Frontend keeps ProtectedRoute.tsx** for UX (hiding inaccessible UI) but security is enforced server-side

---

### 4. No Rate Limiting (Brute Force Vulnerability)
**Location**: Missing entirely

**Issue**: No rate limiting on authentication endpoints allows unlimited login attempts and potential DDoS.

**Fix**: Implement Redis-based rate limiting
```python
# Create new file: backend/app/middleware/rate_limit.py
from fastapi import Request, HTTPException, status
from app.core.redis import redis_client
import time

async def rate_limit(request: Request, max_requests: int = 5, window: int = 60):
    """
    Rate limit: max_requests per window seconds
    Default: 5 requests per 60 seconds
    """
    client_ip = request.client.host
    key = f"rate_limit:{client_ip}:{request.url.path}"
    
    current = await redis_client.get(key)
    
    if current and int(current) >= max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later."
        )
    
    pipe = redis_client.pipeline()
    pipe.incr(key)
    pipe.expire(key, window)
    await pipe.execute()

# Apply to auth routes
# In backend/app/auth/routes.py
from app.middleware.rate_limit import rate_limit

@router.post("/login")
async def login(
    credentials: LoginSchema,
    request: Request,
    _: None = Depends(lambda r: rate_limit(r, max_requests=5, window=300))  # 5 attempts per 5 min
):
    pass
```

---

### 5. Financial Fields Use Float (Rounding Errors)
**Locations**: 
- `backend/app/domains/finance/schemas.py`
- `backend/app/domains/finance/models.py`
- `backend/app/domains/sales/schemas.py`
- `backend/app/domains/billing/schemas.py`

**Issue**: Float data types cause rounding errors in financial calculations (e.g., `loan_amount: float`, `taxable_amount: float`).

**Fix**:
1. **Update Pydantic schemas**:
```python
from decimal import Decimal

class FinanceSchema(BaseModel):
    loan_amount: Decimal
    taxable_amount: Decimal
    interest_rate: Decimal
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)  # Serialize to JSON as float
        }
```

2. **Update SQLAlchemy models**:
```python
from sqlalchemy import Numeric

class FinanceModel(Base):
    loan_amount = Column(Numeric(12, 2), nullable=False)  # 12 digits, 2 decimal places
    taxable_amount = Column(Numeric(12, 2), nullable=False)
    interest_rate = Column(Numeric(5, 4), nullable=False)  # e.g., 7.5% = 0.0750
```

3. **Apply to all money fields** across:
   - Finance domain
   - Sales domain
   - Billing domain
   - Procurement domain
   - Service domain

---

## 🟠 HIGH-RISK ARCHITECTURE VIOLATIONS

### 6. Domain Isolation Broken (Modular Monolith Violation)
**Locations**: 
- `backend/scripts/create_sales_tables.py`
- `backend/inspect_models.py`
- `backend/check_procurement.py`

**Issue**: Scripts directly import models from multiple domains, creating tight coupling and hidden dependencies.

**Example violation**:
```python
# ❌ BAD: Direct cross-domain imports
from app.domains.sales.models import Sale
from app.domains.crm.models import Lead
from app.domains.procurement.models import Purchase
```

**Fix**: Create centralized bootstrap for model registration

1. **Create bootstrap file**:
```python
# backend/app/bootstrap.py
from sqlalchemy.orm import configure_mappers
from app.db.base import Base

# Import all models in one place
from app.domains.sales.models import *
from app.domains.crm.models import *
from app.domains.procurement.models import *
from app.domains.inventory.models import *
from app.domains.finance.models import *
from app.domains.billing.models import *
from app.domains.service.models import *
from app.domains.warranty.models import *
from app.domains.insurance.models import *
from app.domains.master.models import *
from app.domains.staff.models import *

def init_models():
    """Initialize all models for SQLAlchemy"""
    configure_mappers()
    return Base.metadata

# Usage in main.py
# from app.bootstrap import init_models
# metadata = init_models()
```

2. **Update scripts to use bootstrap**:
```python
# ✅ GOOD: Use bootstrap
from app.bootstrap import init_models

metadata = init_models()
# Now all models are registered
```

3. **Delete direct cross-domain imports** from:
   - `backend/scripts/create_sales_tables.py`
   - `backend/inspect_models.py`
   - `backend/check_procurement.py`
   - `backend/scripts/add_crm_creator.py`
   - `backend/scripts/update_db_schema.py`

---

### 7. Raw SQL Migrations (Data Corruption Risk)
**Locations**:
- `backend/migration_staff.sql`
- `backend/migration.sql`
- `backend/run_migration.py`
- `backend/scripts/*.py` (database schema modification scripts)

**Issues**:
- No version control
- No rollback capability
- Manual execution prone to errors
- Split by semicolon (`;`) is fragile
- Not idempotent - running twice causes errors

**Fix**: Migrate to Alembic for proper database versioning

1. **Install Alembic**:
```bash
pip install alembic
```

2. **Initialize Alembic**:
```bash
cd backend
alembic init alembic
```

3. **Configure Alembic** (`backend/alembic.ini`):
```ini
sqlalchemy.url = postgresql://user:password@localhost/erp_db
```

4. **Create initial migration** from current schema:
```bash
# This captures current state from migration.sql
alembic revision --autogenerate -m "initial_schema"
```

5. **Convert existing SQL files to Alembic revisions**:
```python
# backend/alembic/versions/001_staff_migration.py
def upgrade():
    # Content from migration_staff.sql converted to Alembic operations
    op.add_column('staff', sa.Column('new_field', sa.String(100)))
    
def downgrade():
    # Rollback operations
    op.drop_column('staff', 'new_field')
```

6. **Delete obsolete files**:
   - `backend/migration_staff.sql`
   - `backend/migration.sql`
   - `backend/run_migration.py`

7. **Future migrations**:
```bash
# Generate migration from model changes
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback if needed
alembic downgrade -1
```

---

### 8. Business Logic in Routes (Testability Issue)
**Locations**: Multiple `routes.py` files across domains

**Issue**: Business logic mixed with HTTP handling makes code untestable and violates separation of concerns.

**Example violation**:
```python
# ❌ BAD: Logic in route
@router.post("/sales")
async def create_sale(sale: SaleCreate, db: Session = Depends(get_db)):
    # Business logic directly in route
    customer = db.query(Customer).filter_by(id=sale.customer_id).first()
    if not customer:
        raise HTTPException(404, "Customer not found")
    
    total = sum(item.price * item.quantity for item in sale.items)
    tax = total * 0.18
    
    new_sale = Sale(customer_id=sale.customer_id, total=total, tax=tax)
    db.add(new_sale)
    db.commit()
    return new_sale
```

**Fix**: Move logic to services

```python
# ✅ GOOD: Thin route, logic in service
# In backend/app/domains/sales/routes.py
@router.post("/sales")
async def create_sale(sale: SaleCreate, db: Session = Depends(get_db)):
    return await SalesService.create_sale(db, sale)

# In backend/app/domains/sales/services.py
class SalesService:
    @staticmethod
    async def create_sale(db: Session, sale: SaleCreate) -> Sale:
        # Validation
        customer = db.query(Customer).filter_by(id=sale.customer_id).first()
        if not customer:
            raise ValueError("Customer not found")
        
        # Calculation
        total = sum(item.price * item.quantity for item in sale.items)
        tax = total * Decimal("0.18")
        
        # Persistence
        new_sale = Sale(customer_id=sale.customer_id, total=total, tax=tax)
        db.add(new_sale)
        db.commit()
        db.refresh(new_sale)
        return new_sale
```

**Apply to all domains**:
- Sales
- CRM
- Procurement
- Inventory
- Finance
- Billing
- Service
- Warranty
- Insurance
- Master

---

## 🟡 MEDIUM-PRIORITY FIXES

### 9. SoftDeleteMixin Incomplete (Deleted Data Leak)
**Location**: `backend/app/db/mixins.py`

**Issue**: Mixin only adds `deleted_at` column but doesn't filter out deleted records by default.

**Current implementation**:
```python
# ❌ INCOMPLETE
class SoftDeleteMixin:
    deleted_at = Column(DateTime, nullable=True)
```

**Fix**: Add query filtering
```python
# ✅ COMPLETE
from sqlalchemy import DateTime, Column, event
from sqlalchemy.orm import Query

class SoftDeleteMixin:
    deleted_at = Column(DateTime, nullable=True)
    
    @staticmethod
    def _apply_soft_delete_filter(query: Query):
        """Automatically filter out soft-deleted records"""
        for desc in query.column_descriptions:
            entity = desc['entity']
            if entity and hasattr(entity, 'deleted_at'):
                query = query.filter(entity.deleted_at.is_(None))
        return query

# Register global filter
@event.listens_for(Query, "before_compile", retval=True)
def receive_before_compile(query):
    return SoftDeleteMixin._apply_soft_delete_filter(query)
```

**Alternative approach** (if global filter causes issues):
```python
# Use loader option on models
from sqlalchemy.orm import declarative_mixin, declared_attr

@declarative_mixin
class SoftDeleteMixin:
    deleted_at = Column(DateTime, nullable=True)
    
    @classmethod
    def active(cls, session):
        """Query only active (non-deleted) records"""
        return session.query(cls).filter(cls.deleted_at.is_(None))

# Usage
active_sales = Sale.active(db)
```

---

### 10. Scripts Modify sys.path (Import Chaos)
**Locations**:
- `backend/check_procurement.py`
- `backend/inspect_models.py`

**Issue**: Scripts manually manipulate `sys.path` causing import inconsistencies between environments.

**Current pattern**:
```python
# ❌ BAD
import sys
sys.path.insert(0, '/path/to/backend')
from app.domains.procurement.models import Purchase
```

**Fix**: Use Python's module execution

1. **Move all scripts to package**:
```bash
mkdir -p backend/app/scripts
mv backend/check_procurement.py backend/app/scripts/
mv backend/inspect_models.py backend/app/scripts/
# All scripts from backend/scripts/ already in correct location
```

2. **Run as modules**:
```bash
# Instead of: python check_procurement.py
python -m app.scripts.check_procurement

# Instead of: python inspect_models.py
python -m app.scripts.inspect_models
```

3. **Remove sys.path manipulation** from all scripts

---

### 11. CSV Export Without Sanitization (Formula Injection)
**Locations**: Reports domain and export functionality

**Issue**: CSV exports may include unsanitized user input, allowing formula injection attacks.

**Example vulnerability**:
```python
# ❌ VULNERABLE
def export_to_csv(data):
    writer.writerow([item.name, item.description, item.amount])
    # If name = "=1+1", Excel executes it!
```

**Fix**: Sanitize CSV output
```python
# ✅ SAFE
def sanitize_csv_field(value: str) -> str:
    """Prevent CSV formula injection"""
    if isinstance(value, str) and value.startswith(('=', '+', '-', '@', '\t', '\r')):
        return "'" + value  # Prefix with single quote
    return value

def export_to_csv(data):
    writer.writerow([
        sanitize_csv_field(item.name),
        sanitize_csv_field(item.description),
        sanitize_csv_field(item.amount)
    ])
```

**Apply to**:
- `backend/app/domains/reports/services.py`
- Any export functionality

---

### 12. Placeholder/Incomplete File
**Location**: `backend/app/domains/master/models_placeholder_skip.py`

**Issue**: File appears unfinished or was a temporary placeholder that should be removed or completed.

**Action**: 
- **If unused**: Delete file entirely
- **If needed**: Complete implementation and rename to proper convention
- Review with team to understand original intent

---

## 📋 REQUIRED .ENV CONFIGURATION

Create/update `backend/.env` with the following required variables:

```bash
# Database Configuration
DATABASE_URL=postgresql://app_user:secure_password@localhost:5432/erp_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=erp_db
DB_USER=app_user
DB_PASSWORD=secure_password_here

# Redis Configuration
REDIS_URL=redis://:redis_password@localhost:6379/0?ssl=true
REDIS_PASSWORD=redis_password_here
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Security & Authentication
SECRET_KEY=generate_strong_random_key_minimum_32_characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=240  # 4 hours
REFRESH_TOKEN_EXPIRE_DAYS=7

# TOTP/2FA Configuration
TOTP_ISSUER=ERP_System
TOTP_INTERVAL=30

# Application Settings
DEBUG=False
ENVIRONMENT=production
ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com
CORS_ALLOW_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_ENABLED=true
LOGIN_RATE_LIMIT=5  # attempts per window
RATE_LIMIT_WINDOW=300  # 5 minutes in seconds

# File Upload
MAX_UPLOAD_SIZE=10485760  # 10MB in bytes
ALLOWED_EXTENSIONS=pdf,jpg,jpeg,png,xlsx,csv

# Logging
LOG_LEVEL=INFO
LOG_FILE=app.log
```

**Update `.env.example`** with sanitized template:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
REDIS_URL=redis://:password@localhost:6379/0?ssl=true
SECRET_KEY=your_secret_key_here_minimum_32_chars
ACCESS_TOKEN_EXPIRE_MINUTES=240
# ... (all other variables with placeholder values)
```

---

## 🏗️ TARGET ARCHITECTURE

**Final directory structure**:
```
backend/
├── app/
│   ├── core/
│   │   ├── config.py
│   │   └── redis.py
│   ├── db/
│   │   ├── base.py
│   │   ├── session.py
│   │   └── mixins.py
│   ├── shared/
│   │   └── utils.py
│   ├── middleware/
│   │   └── rate_limit.py (NEW)
│   ├── auth/
│   │   ├── dependencies.py
│   │   ├── token_utils.py
│   │   ├── roles.py
│   │   └── routes.py
│   ├── domains/
│   │   ├── sales/
│   │   │   ├── models.py
│   │   │   ├── schemas.py
│   │   │   ├── services.py
│   │   │   └── routes.py
│   │   ├── procurement/
│   │   ├── crm/
│   │   ├── inventory/
│   │   ├── finance/
│   │   ├── billing/
│   │   ├── service/
│   │   ├── warranty/
│   │   ├── insurance/
│   │   ├── master/
│   │   ├── staff/
│   │   └── reports/
│   ├── scripts/ (NEW LOCATION)
│   │   ├── __init__.py
│   │   ├── check_procurement.py
│   │   ├── inspect_models.py
│   │   └── ...
│   ├── bootstrap.py (NEW)
│   └── main.py
├── alembic/ (NEW)
│   ├── versions/
│   │   └── 001_initial_migration.py
│   └── env.py
├── alembic.ini (NEW)
├── .env
├── .env.example
├── requirements.txt
└── README.md
```

**Files to DELETE**:
```
❌ backend/check_procurement.py (move to app/scripts/)
❌ backend/inspect_models.py (move to app/scripts/)
❌ backend/migration_staff.sql (convert to Alembic)
❌ backend/migration.sql (convert to Alembic)
❌ backend/run_migration.py (replaced by Alembic)
❌ backend/models_list.txt (likely obsolete)
❌ backend/app/domains/master/models_placeholder_skip.py (incomplete)
```

---

## ✅ IMPLEMENTATION CHECKLIST

Execute all fixes in the following order:

### Phase 1: Security Critical
- [ ] Add Redis password and SSL configuration
- [ ] Reduce token expiry to 4 hours
- [ ] Implement backend role-based access control on all protected endpoints
- [ ] Add rate limiting middleware and apply to auth endpoints
- [ ] Convert all financial float fields to Decimal/Numeric

### Phase 2: Architecture Fixes
- [ ] Create `app/bootstrap.py` for centralized model registration
- [ ] Remove direct cross-domain imports from all scripts
- [ ] Install and configure Alembic
- [ ] Convert SQL migrations to Alembic revisions
- [ ] Delete raw SQL migration files

### Phase 3: Code Quality
- [ ] Extract business logic from routes to services across all domains
- [ ] Complete SoftDeleteMixin implementation with automatic filtering
- [ ] Move scripts to `app/scripts/` package
- [ ] Remove sys.path manipulation from scripts
- [ ] Add CSV sanitization to export functions
- [ ] Delete or complete `models_placeholder_skip.py`

### Phase 4: Configuration
- [ ] Create comprehensive `.env` file with all required variables
- [ ] Update `.env.example` template
- [ ] Add environment validation on startup
- [ ] Document all environment variables in README

### Phase 5: Validation
- [ ] Test all authentication flows with new token expiry
- [ ] Verify role-based access control on all endpoints
- [ ] Test rate limiting on login endpoint
- [ ] Verify Redis connection with authentication
- [ ] Run Alembic migrations on test database
- [ ] Test soft delete filtering on all models
- [ ] Verify financial calculations with Decimal precision

---

## 🔒 SECURITY PRINCIPLES

**Enforce these rules**:

1. **Defense in Depth**: Never rely on single layer (frontend + backend auth)
2. **Least Privilege**: Grant minimum permissions required
3. **Fail Securely**: Default to denying access when uncertain
4. **No Security by Obscurity**: Don't hide issues, fix them
5. **Assume Breach**: Design as if attackers are already inside
6. **Validate Everything**: Never trust client-side data
7. **Encrypt in Transit**: Always use SSL/TLS for sensitive connections
8. **Audit Everything**: Log security-relevant events

---

## 📞 SUPPORT

After implementation:
1. Test thoroughly in development environment
2. Run security scan with tools like Bandit, Safety
3. Review logs for any anomalies
4. Monitor Redis connection metrics
5. Validate all financial calculations

**Questions?** Review this document with the development team before AI agent execution.

---

**Last Updated**: 2026-02-11  
**Document Version**: 1.0  
**Status**: Ready for AI Agent Execution