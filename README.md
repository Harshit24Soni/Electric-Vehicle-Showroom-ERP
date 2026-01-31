# Electric Vehicle Showroom ERP System

## Project Overview

The **Electric Vehicle Showroom ERP (Enterprise Resource Planning) System** is a comprehensive backend solution designed to manage all operational aspects of an electric vehicle dealership/showroom. Built with **FastAPI** and **PostgreSQL**, this system provides a robust, scalable, and production-ready platform for managing inventory, sales, customer relationships, billing, finance, service, warranty, and staffing operations.

This is a **B2B enterprise application** that integrates multiple business functions into a unified ecosystem, enabling dealerships to streamline operations, improve customer experience, and maintain data integrity across departments.

---

## Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.10+)
  - Asynchronous request handling
  - Auto-generated API documentation (Swagger UI)
  - Built-in request validation (Pydantic)
  - High performance (comparable to Node.js and Go)

- **ORM**: SQLAlchemy 2.0 with Pydantic v2
  - Modern async/await support
  - Type-hinted models
  - Advanced relationship mapping

- **Authentication**: JWT (JSON Web Tokens)
  - Role-based access control (RBAC)
  - PIN-based login for staff
  - Force PIN change on first login

- **Password Security**: Passlib with Argon2
  - Industry-standard hashing
  - Protection against brute-force attacks

### Database
- **PostgreSQL** (Primary)
  - ACID compliance
  - Foreign key constraints
  - Multi-schema support
  - Advanced indexing capabilities
  - Transaction isolation

- **Schema Organization**:
  - `master` - Core master data (customers, vehicles, staff)
  - `sales` - Vehicle sales records
  - `inventory` - Vehicle and spare parts stock
  - `billing` - Invoices and billing information
  - `finance` - Finance and payment tracking
  - `service` - Service job cards and maintenance
  - `warranty` - Warranty claims and inward/outward logistics
  - `crm` - Customer relationship management
  - `insurance` - Insurance policies and companies
  - `hr` - Human resources (future expansion)
  - `procurement` - Vendor and procurement (future expansion)

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                          # FastAPI app initialization & router registration
│   ├── auth/                            # Authentication module
│   │   ├── routes.py                    # Login, password/PIN reset endpoints
│   │   ├── dependencies.py              # JWT token validation, user dependency injection
│   │   ├── pin_utils.py                 # PIN hashing/verification utilities
│   │   ├── token_utils.py               # JWT token creation/validation
│   │   └── roles.py                     # Role-based access control
│   │
│   ├── db/                              # Database layer
│   │   ├── session.py                   # SQLAlchemy engine & session factory
│   │   └── base.py                      # DeclarativeBase for all models
│   │
│   ├── shared/                          # Shared utilities
│   │   └── utils.py                     # CSV export, common helpers
│   │
│   └── domains/                         # Business logic organized by domain
│       ├── admin/
│       │   ├── models.py                # (Uses Staff model from master)
│       │   ├── routes.py                # Admin staff management endpoints
│       │   └── schemas.py               # Staff request/response models
│       │
│       ├── master/                      # Master data (customers, vehicles, staff)
│       │   ├── models.py                # Customer, Vehicle, VehicleModel, Vendor, Staff
│       │   ├── schemas.py               # Pydantic request/response models
│       │   ├── services.py              # CRUD operations for master data
│       │   └── routes.py                # REST endpoints for master data
│       │
│       ├── staff/                       # Staff operations
│       │   ├── routes.py                # Staff profile endpoints (GET /staff/me)
│       │   └── schemas.py               # Staff response models
│       │
│       ├── inventory/                   # Vehicle & spare parts stock management
│       │   ├── models.py                # SpareMaster, VehicleInventory, SpareMovement
│       │   ├── schemas.py               # Inventory request/response models
│       │   ├── services.py              # Stock calculations, movement tracking
│       │   └── routes.py                # Stock status, movement endpoints
│       │
│       ├── sales/                       # Vehicle sales transactions
│       │   ├── models.py                # VehicleSale, SaleAllocation, SaleDelivery
│       │   ├── schemas.py               # Sale request/response models
│       │   ├── services.py              # Sale creation, allocation, delivery logic
│       │   └── routes.py                # Sale management endpoints
│       │
│       ├── billing/                     # Invoice & billing management
│       │   ├── models.py                # Invoice, InvoiceItem
│       │   ├── schemas.py               # Invoice request/response models
│       │   ├── services.py              # Invoice generation, finalization, tax calculation
│       │   └── routes.py                # Billing endpoints
│       │
│       ├── finance/                     # Finance & payment management
│       │   ├── models.py                # Payment, LoanDetail, Subsidy
│       │   ├── schemas.py               # Finance request/response models
│       │   ├── services.py              # Payment processing, loan tracking
│       │   └── routes.py                # Finance endpoints
│       │
│       ├── service/                     # Vehicle service & maintenance
│       │   ├── models.py                # JobCard, JobSpare, JobService
│       │   ├── schemas.py               # Service request/response models
│       │   ├── services.py              # Job card creation, spare consumption
│       │   └── routes.py                # Service management endpoints
│       │
│       ├── warranty/                    # Warranty claims & logistics
│       │   ├── models.py                # Claim, Inward, InwardItem, Shipment, ShipmentItem
│       │   ├── schemas.py               # Warranty request/response models
│       │   ├── services.py              # Claim creation, inward/shipment tracking
│       │   └── routes.py                # Warranty endpoints
│       │
│       ├── crm/                         # Customer relationship management
│       │   ├── models.py                # Lead, FollowupSchedule, LeadActivity
│       │   ├── schemas.py               # CRM request/response models
│       │   ├── services.py              # Lead tracking, activity logging
│       │   └── routes.py                # CRM endpoints
│       │
│       ├── insurance/                   # Insurance management
│       │   ├── models.py                # InsuranceCompany, Policy
│       │   ├── schemas.py               # Insurance request/response models
│       │   └── routes.py                # Insurance endpoints
│       │
│       └── reports/                     # Analytics & reporting
│           ├── routes.py                # Report generation endpoints
│           └── services.py              # Report aggregation logic
│
├── requirements.txt                     # Python dependencies
└── .env.example                        # Environment variables template
```

---

## Module Descriptions

### Core Authentication (`app/auth/`)

| File | Responsibility |
|------|-----------------|
| `routes.py` | Endpoints: `/auth/login-pin` (authenticate staff), `/auth/change-pin` (force PIN change), `/auth/reset-pin` (admin PIN reset) |
| `dependencies.py` | JWT token validation, `get_current_staff()` dependency that blocks login if force PIN change is required |
| `token_utils.py` | JWT token generation/validation, configurable expiration (default 480 minutes = 8 hours) |
| `pin_utils.py` | PIN hashing (Argon2) and verification for secure PIN management |
| `roles.py` | Role-based access control - enforce role requirements on endpoints |

### Database Layer (`app/db/`)

| File | Responsibility |
|------|-----------------|
| `session.py` | PostgreSQL connection via SQLAlchemy, session factory, dependency injection for DB access |
| `base.py` | `DeclarativeBase` for all ORM models, ensures consistent mapping across all domains |

### Master Data Domain (`app/domains/master/`)

**Purpose**: Central hub for core business entities

| Model | Purpose |
|-------|---------|
| `Staff` | Employee records with role assignment, PIN authentication, bank details |
| `Customer` | Customer profiles with contact info and address |
| `VehicleModel` | EV model specifications (range, capacity, price, etc.) |
| `Vehicle` | Physical vehicle instances with chassis/engine numbers, linked to models |
| `Vendor` | Supplier and vendor information for procurement |

### Inventory Domain (`app/domains/inventory/`)

**Purpose**: Track stock of vehicles and spare parts

| Model | Purpose |
|-------|---------|
| `SpareMaster` | Spare parts catalog with pricing |
| `VehicleInventory` | Vehicle stock levels per location |
| `SpareMovement` | Complete audit trail of spare part movements (inward, outward, service consumption) |

**Key Logic**: 
- Real-time stock calculations
- Movement type tracking (INWARD, OUTWARD, SERVICE_CONSUMPTION, WARRANTY_INWARD)
- Reference tracking for all movements
- Prevents stock-out scenarios with validation

### Sales Domain (`app/domains/sales/`)

**Purpose**: Manage vehicle sales transactions end-to-end

| Model | Purpose |
|-------|---------|
| `VehicleSale` | Sale header with customer, vehicle, amount, and status |
| `SaleAllocation` | Link specific vehicle instance to a sale |
| `SaleDelivery` | Track delivery date and completion |

**Workflow**:
1. Create sale → Vehicle is marked allocated
2. Allocate specific vehicle → Checks inventory availability
3. Mark as delivered → Completes the transaction

**Validations**:
- Prevents duplicate allocations
- Ensures delivered vehicle belongs to the sale
- Validates stock availability

### Billing Domain (`app/domains/billing/`)

**Purpose**: Invoice generation and billing management

| Model | Purpose |
|-------|---------|
| `Invoice` | Sales invoice header with tax, total amount, status |
| `InvoiceItem` | Line items in invoice (vehicle, accessories, charges) |

**Key Features**:
- Unique invoice number generation (timestamp-based format)
- Tax calculation with proper rounding (2 decimal places)
- Invoice finalization prevents editing
- Proper error handling for already-finalized invoices

### Finance Domain (`app/domains/finance/`)

**Purpose**: Payment and finance tracking

| Model | Purpose |
|-------|---------|
| `Payment` | Payment records with method (cash, check, UPI, etc.) |
| `LoanDetail` | EMI/loan information if vehicle is financed |
| `Subsidy` | Government subsidies applied to sale |

**Features**:
- Multiple payment method support
- Loan EMI tracking
- Subsidy application and reconciliation

### Service Domain (`app/domains/service/`)

**Purpose**: Vehicle service and maintenance management

| Model | Purpose |
|-------|---------|
| `JobCard` | Service request header with vehicle, status, completion date |
| `JobSpare` | Spare parts consumed during service |
| `JobService` | Services rendered (labor charges) |

**Smart Features**:
- Prevents multiple open job cards for same vehicle
- Prevents operations on closed job cards
- Integrates with inventory for spare consumption tracking
- Automatic spare movement logging

### Warranty Domain (`app/domains/warranty/`)

**Purpose**: Warranty claim and logistics management

| Model | Purpose |
|-------|---------|
| `Claim` | Warranty claim header with status (pending/approved/shipped) |
| `Inward` | Warranty parts received from OEM |
| `InwardItem` | Line items in inward (spare parts with cost) |
| `Shipment` | Defective parts shipment to OEM |
| `ShipmentItem` | Claims included in each shipment |

**Status Flow**:
- Claim created → `pending`
- After shipment → `shipped`
- After inward receipt → `received`

### CRM Domain (`app/domains/crm/`)

**Purpose**: Customer relationship and lead management

| Model | Purpose |
|-------|---------|
| `Lead` | Potential customer with source tracking |
| `FollowupSchedule` | Scheduled follow-ups for leads |
| `LeadActivity` | Activity log (calls, emails, visits) |

**Use Case**: Track lead progression from inquiry to sale

### Insurance Domain (`app/domains/insurance/`)

**Purpose**: Insurance policy management

| Model | Purpose |
|-------|---------|
| `InsuranceCompany` | Insurance provider details |
| `Policy` | Insurance policies linked to vehicles |

**Future Enhancement**: Integration with insurance providers for real-time quote generation

### Reports Domain (`app/domains/reports/`)

**Purpose**: Analytics and business intelligence

**Report Types** (Planned):
- Sales summary by date range
- Revenue breakdown by vehicle model
- Spare parts consumption analysis
- Service job metrics
- Warranty claim statistics
- Staff performance metrics

---

## API Endpoints Overview

### Authentication
```
POST   /auth/login-pin           - Staff login with PIN
POST   /auth/change-pin          - Change staff PIN (forced on first login)
POST   /auth/reset-pin           - Admin reset staff PIN
```

### Master Data Management
```
POST   /master/customers         - Create customer
GET    /master/customers         - List customers
GET    /master/customers/{id}    - Get customer details
POST   /master/vehicles          - Add vehicle to inventory
GET    /master/vehicles          - List vehicles
POST   /master/vehicle-models    - Create vehicle model
GET    /master/vehicle-models    - List vehicle models
```

### Inventory Management
```
GET    /inventory/stock          - Check current stock levels
POST   /inventory/movements      - Record spare movement
GET    /inventory/movements      - Movement history/audit trail
```

### Sales Management
```
POST   /sales                    - Create vehicle sale
GET    /sales                    - List sales
POST   /sales/{id}/allocate      - Allocate vehicle to sale
POST   /sales/{id}/deliver       - Mark sale as delivered
```

### Billing
```
POST   /billing/invoices         - Generate invoice
GET    /billing/invoices         - List invoices
POST   /billing/invoices/{id}/finalize - Finalize invoice
```

### Finance
```
POST   /finance/payments         - Record payment
GET    /finance/payments         - Payment history
POST   /finance/loans            - Create loan record
```

### Service Management
```
POST   /service/job-cards        - Open service job card
POST   /service/job-cards/{id}/consume-spare - Log spare consumption
POST   /service/job-cards/{id}/close - Close job card
GET    /service/job-cards        - List open/closed job cards
```

### Warranty
```
POST   /warranty/claims          - Create warranty claim
GET    /warranty/claims          - List claims
POST   /warranty/inwards         - Create inward shipment
POST   /warranty/shipments       - Create outbound shipment
```

### CRM
```
POST   /crm/leads                - Create lead
GET    /crm/leads                - List leads
POST   /crm/leads/{id}/followup  - Schedule followup
POST   /crm/activities           - Log activity
```

---

## Environment Setup

### Prerequisites
- Python 3.10+
- PostgreSQL 12+
- pip or poetry for dependency management

### Installation

1. **Clone Repository**
```bash
git clone <repository-url>
cd Electric-Vehicle-Showroom-ERP/backend
```

2. **Create Virtual Environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install Dependencies**
```bash
pip install -r requirements.txt
```

4. **Configure Environment Variables**
Create `.env` file in `backend/` directory:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ev_erp

# JWT Configuration
JWT_SECRET_KEY=your-super-secret-key-minimum-32-characters-long
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=480  # 8 hours (optional, defaults to 480 if not set)

# Server
DEBUG=False
ENVIRONMENT=production
```

5. **Initialize Database**
```bash
# Run PostgreSQL migrations (if using Alembic - to be set up)
alembic upgrade head
```

6. **Run Development Server**
```bash
uvicorn app.main:app --reload --port 8000
```

**API Documentation**: Open `http://localhost:8000/docs` (Swagger UI)

---

## Database Schema

The PostgreSQL database is organized into logical schemas:

### `master` schema
- `staff` - Employee records
- `customer` - Customer profiles
- `vehicle` - Physical vehicle instances
- `vehicle_model` - Vehicle type specifications
- `vendor` - Supplier information

### `sales` schema
- `vehicle_sale` - Sales transactions
- `sale_allocation` - Vehicle allocation to sales
- `sale_delivery` - Delivery records

### `inventory` schema
- `spare_master` - Spare parts catalog
- `vehicle_inventory` - Vehicle stock
- `spare_movement` - Movement audit trail

### `billing` schema
- `invoice` - Sales invoices
- `invoice_item` - Invoice line items

### `finance` schema
- `payment` - Payment records
- `loan_detail` - Loan EMI information
- `subsidy` - Government subsidies

### `service` schema
- `job_card` - Service requests
- `job_spare` - Spare parts consumed
- `job_service` - Services rendered

### `warranty` schema
- `claim` - Warranty claims
- `inward` - Parts received from OEM
- `inward_item` - Inward line items
- `shipment` - Outbound shipments
- `shipment_item` - Shipment line items

### `crm` schema
- `lead` - Potential customers
- `followup_schedule` - Scheduled follow-ups
- `lead_activity` - Activity log

### `insurance` schema
- `insurance_company` - Provider details
- `policy` - Insurance policies

---

## Current Status

### ✅ Completed Features
- **Core Architecture**: FastAPI application with structured domain organization
- **Authentication**: JWT-based with PIN login and role-based access control
- **Master Data Management**: Customers, vehicles, staff, vendors
- **Inventory Management**: Real-time stock tracking with movement audit trail
- **Sales Management**: Complete sales workflow (create → allocate → deliver)
- **Billing**: Invoice generation with tax calculations
- **Finance**: Payment and loan tracking
- **Service Management**: Job card management with spare consumption
- **Warranty Management**: Claim and logistics tracking
- **CRM**: Lead and activity management
- **Insurance**: Basic policy management

### 🔄 In Progress
- Database migrations (Alembic setup recommended)
- Runtime testing with actual PostgreSQL database
- Comprehensive unit and integration tests
- API rate limiting and throttling

### 📋 Future Enhancements

#### Phase 2 - Backend Improvements
1. **Advanced Analytics**
   - Dashboard metrics (real-time)
   - Predictive analytics for inventory
   - Revenue forecasting
   - Customer lifetime value calculation

2. **Integration Capabilities**
   - Payment gateway integration (Razorpay, Stripe)
   - Insurance provider APIs
   - OEM APIs for spare parts catalog
   - Email/SMS notifications (Twilio/SendGrid)
   - Document management system

3. **Compliance & Security**
   - GDPR compliance for customer data
   - Audit logging for critical operations
   - Data encryption at rest
   - Two-factor authentication (2FA)
   - API key management for third-party integrations

4. **Performance Optimization**
   - Redis caching for frequently accessed data
   - Database query optimization and indexing
   - API response compression
   - Background job processing (Celery)

#### Phase 3 - Frontend Development

**⚠️ Frontend Recommendations** (Instead of JavaFX):

Given the project's Python/FastAPI backend and need for **fast, modern, and user-friendly UI**, here are the recommended options:

##### 🏆 **Option 1: React.js + TypeScript (RECOMMENDED)**
- **Why**: Industry standard, massive ecosystem, thousands of UI libraries
- **Speed**: Extremely fast with proper optimization
- **UX**: Highly interactive with real-time updates
- **Popular Libraries**: 
  - **Material-UI** or **Chakra UI** - Pre-built professional components
  - **TanStack Query** - Efficient data fetching
  - **Zustand or Redux Toolkit** - State management
  - **Vite** - Lightning-fast build tool
- **Deployment**: Vercel, Netlify (serverless), AWS S3 + CloudFront
- **Learning Curve**: Moderate, vast community support

##### 🚀 **Option 2: Vue.js 3 (EXCELLENT ALTERNATIVE)**
- **Why**: Gentler learning curve, faster development, cleaner syntax
- **Speed**: Comparable to React, smaller bundle size
- **UX**: Equally modern and responsive
- **Popular Libraries**:
  - **Nuxt.js** - Full-stack meta-framework
  - **Vue Material** - Material Design components
  - **Pinia** - State management
  - **Vite** - Build tool
- **Ideal For**: Teams valuing developer ergonomics
- **Deployment**: Same as React

##### ⚡ **Option 3: SvelteKit (FASTEST BUILD TIME)**
- **Why**: Fastest development experience, smallest runtime
- **Speed**: Extremely fast, compiler-based approach
- **UX**: Modern and responsive
- **Learning Curve**: Steeper but rewarding
- **Bundle Size**: Smallest among options
- **Ideal For**: Performance-critical dashboards

##### 🎯 **Option 4: Next.js (Full-Stack)**
- **Why**: Backend + Frontend in one codebase (optional)
- **Speed**: Fast with built-in optimization
- **Features**: API routes, SSR, ISR (Incremental Static Regeneration)
- **Ideal For**: Tightly integrated frontend-backend logic
- **Trade-off**: Overkill if sticking with FastAPI backend

---

## Frontend Architecture Recommendation (React.js)

```
frontend/
├── public/
├── src/
│   ├── components/              # Reusable UI components
│   │   ├── common/              # Navigation, header, sidebar
│   │   ├── forms/               # Dynamic forms for each domain
│   │   ├── tables/              # Data tables with pagination/sorting
│   │   └── modals/              # Modal dialogs
│   │
│   ├── pages/                   # Page components
│   │   ├── auth/                # Login page
│   │   ├── dashboard/           # Main dashboard
│   │   ├── sales/               # Sales management pages
│   │   ├── inventory/           # Inventory management pages
│   │   ├── service/             # Service management pages
│   │   └── ...                  # Other domains
│   │
│   ├── hooks/                   # Custom React hooks
│   ├── services/                # API integration (axios/fetch)
│   ├── store/                   # State management (Zustand/Redux)
│   ├── utils/                   # Helper functions
│   ├── styles/                  # Global & component styles (Tailwind CSS)
│   └── App.tsx
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

### Frontend Tech Stack (Recommended)
```json
{
  "Framework": "React 18 + TypeScript",
  "Styling": "Tailwind CSS + shadcn/ui",
  "UI Components": "Chakra UI OR Material-UI",
  "Forms": "React Hook Form + Zod validation",
  "Data Fetching": "TanStack Query v4+",
  "State Management": "Zustand OR Redux Toolkit",
  "Routing": "React Router v6",
  "Build Tool": "Vite",
  "Testing": "Vitest + React Testing Library",
  "Code Quality": "ESLint + Prettier",
  "E2E Testing": "Cypress or Playwright"
}
```

---

## When to Start Frontend Development

### ✅ **Ready to Start Frontend When:**
1. **Backend API is production-ready** (current status: ~80% complete)
   - All domain endpoints working
   - Database migrations finalized
   - API documentation complete
   - Error handling standardized

2. **API contracts are stable**
   - No major changes expected to request/response schemas
   - Endpoints frozen in production

3. **Authentication flow is tested**
   - JWT token handling verified
   - PIN change flow working
   - Role-based access control validated

### 📅 **Recommended Timeline:**

| Phase | Duration | Key Tasks |
|-------|----------|-----------|
| **Backend Polish** | 2-3 weeks | Database testing, API fixes, documentation |
| **Frontend Setup** | 1 week | Project scaffolding, CI/CD pipeline, team setup |
| **Core Pages** | 4-6 weeks | Dashboard, login, master data CRUD forms |
| **Domain Pages** | 6-8 weeks | Sales, inventory, service, billing pages |
| **Testing & QA** | 2-3 weeks | Integration testing, performance optimization |
| **Deployment** | 1 week | Production deployment, monitoring setup |

### 🚀 **Suggested Start Date for Frontend**
- **Earliest**: Immediately after backend database validation (next 2 weeks)
- **Optimal**: Once 80% of domain services are tested (3-4 weeks)
- **Latest**: Before going live (can run frontend & backend in parallel)

**Parallel Development Advantage**: Frontend team can work on dashboard/UI while backend team finalizes remaining domains.

---

## Development Best Practices

### Code Quality
1. **Type Safety**: Leverage FastAPI's Pydantic models and TypeScript on frontend
2. **Error Handling**: Standardized error responses (400, 404, 409, 500)
3. **Validation**: Server-side validation on all inputs
4. **Testing**: Unit tests for services, integration tests for APIs

### Database Hygiene
1. **Migrations**: Use Alembic for schema versioning
2. **Backups**: Daily automated PostgreSQL backups
3. **Indexes**: Index foreign keys and frequently queried fields
4. **Constraints**: Enforce referential integrity at database level

### API Design
1. **REST Principles**: Standard HTTP methods (GET, POST, PUT, DELETE)
2. **Versioning**: Prefix routes with `/v1/` for future compatibility
3. **Pagination**: Implement `skip` and `limit` for large datasets
4. **Filtering**: Support common filters (status, date range)
5. **Sorting**: Allow column-based sorting
6. **Rate Limiting**: Prevent abuse

### Deployment
1. **Docker**: Containerize FastAPI + PostgreSQL
2. **CI/CD**: GitHub Actions for automated testing and deployment
3. **Monitoring**: Application Performance Monitoring (APM) with New Relic/DataDog
4. **Logging**: Centralized logging (ELK Stack or Cloudwatch)

---

## Performance Considerations

### Backend
- **FastAPI Async**: Leverages async/await for concurrent request handling
- **Connection Pooling**: SQLAlchemy pooling for efficient DB connections
- **Query Optimization**: Use `select()` with eager loading to minimize queries
- **Caching**: Implement Redis for frequently accessed data (master data, exchange rates)

### Frontend (React)
- **Code Splitting**: Route-based code splitting with Vite
- **Lazy Loading**: Load components/data on demand
- **Memoization**: React.memo for expensive components
- **Bundle Size**: Monitor with `webpack-bundle-analyzer`

### Database
- **Indexes**: Index all foreign keys and frequently filtered columns
- **Partitioning**: Consider partitioning large tables (sales, movements) by date
- **Query Profiling**: Use `EXPLAIN ANALYZE` for slow queries
- **Vacuum**: Regular VACUUM ANALYZE on PostgreSQL

---

## Troubleshooting

### Common Issues

**Issue**: `"DATABASE_URL not found"`
- **Solution**: Create `.env` file with `DATABASE_URL` environment variable

**Issue**: `JWT token expired`
- **Solution**: Increase `JWT_EXPIRE_MINUTES` in `.env` or implement refresh token logic

**Issue**: `Permission denied on /inventory endpoints`
- **Solution**: Check staff role assignment in database (`master.staff.role` column)

**Issue**: Slow API responses**
- **Solution**: Check database query performance with `EXPLAIN ANALYZE` in pgAdmin

**Issue**: Duplicate invoice numbers**
- **Solution**: Ensure database constraints are enforced; use transactions for invoice creation

---

## Contributing Guidelines

1. **Branch Naming**: `feature/domain-name` or `fix/issue-name`
2. **Commit Messages**: `[domain] Action description` (e.g., `[sales] Add delivery tracking`)
3. **PR Requirements**:
   - Code review by at least one team member
   - All tests passing
   - No breaking changes to existing APIs
   - Updated API documentation (Swagger comments)

---

## Support & Documentation

- **API Docs**: `http://localhost:8000/docs` (Swagger UI)
- **Database Schema**: See `Database Schema/` folder
- **Architecture Decisions**: See `ARCHITECTURE.md` (to be created)
- **Troubleshooting**: See `TROUBLESHOOTING.md` (to be created)

---

## License

[Add your license here - e.g., MIT, Apache 2.0]

---

## Contact & Support

- **Project Lead**: [Your Name]
- **Email**: [Your Email]
- **Slack Channel**: #ev-erp-development

---

**Last Updated**: February 1, 2026
**Status**: Active Development
**Version**: 1.0.0-alpha
