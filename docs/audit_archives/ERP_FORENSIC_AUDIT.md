# ERP FORENSIC AUDIT & RESTART ANALYSIS

## Executive Summary

This repository is a modular ERP application built as a Python FastAPI backend and a React + TypeScript frontend. It is structured as a multi-domain showroom/ERP system with separate business domains for CRM, inventory, procurement, finance, sales, service, warranty, insurance, setup, reporting, and staff administration.

The codebase is substantially more complete than a bare template. It contains domain models, router modules, authentication logic, seed scripts, and UI modules for role-based access. However, the project cannot currently be restarted and validated in its present local environment without first restoring its Python backend dependencies and database services.

The most important architectural facts are:

- The application authenticates staff by email or mobile number plus a 6-digit PIN, not by username/password.
- Role values are defined as ADMIN, DEALER, and STAFF.
- The backend expects PostgreSQL and Redis to be running locally.
- The seed script is intended to create login-ready staff accounts, but the environment has not had the required Python packages installed.
- The system is designed for a collaborative domain-driven monolith pattern, but it still needs an operational environment to be fully runnable.

---

## 1. Scope and Method

This audit was performed as a read-only repository assessment based on the actual source present in the workspace. No production logic was altered. The evidence used here comes from actual project files, including:

- backend/app/auth/routes.py
- backend/app/auth/pin_utils.py
- backend/app/domains/master/models.py
- backend/scripts/seed_data.py
- backend/.env
- frontend/src/App.tsx
- frontend/src/store/authStore.ts
- frontend/src/modules/auth/pages/LoginPage.tsx
- backend/app/main.py
- backend/requirements.txt

---

## 2. Current State of the Repository

### 2.1 Technology Stack

The workspace contains two major application layers:

1. Backend
   - Python
   - FastAPI
   - SQLAlchemy + Alembic
   - PostgreSQL via asyncpg
   - Redis support for background/cache/rate-limit use cases
   - Passlib + Argon2 for PIN hashing

2. Frontend
   - React + TypeScript
   - Vite
   - Tailwind CSS
   - React Router
   - Zustand for auth state
   - TanStack Query

This is consistent with a modern ERP-style internal application with a domain-driven backend and a role-based frontend.

### 2.2 Domain Structure

The backend is organized around domain folders under backend/app/domains and module folders under backend/app/modules. Major concerns include:

- Admin
- CRM
- Followup
- Insurance
- Inventory
- Master
- Procurement
- Reports
- Service
- Setup
- Staff
- Warranty
- Sales
- Finance
- Billing

This shows a strong modular monolith design, with each domain owning data models, schemas, routes, and services.

---

## 3. Authentication and Role Model

### 3.1 Auth Mechanism

The app does not use classic username/password authentication. The confirmed flow is PIN-based login.

Evidence:

- backend/app/auth/routes.py contains the endpoint /auth/login-pin.
- The login payload accepts identifier and pin.
- backend/app/auth/routes.py checks a staff record by either Staff.mobile_no or Staff.email.
- backend/app/domains/master/models.py defines Staff with pin_hash instead of a password field.
- backend/app/auth/pin_utils.py uses Passlib Argon2 to hash and verify PINs.

The login route authorizes using:

- identifier = email or mobile number
- pin = 6-digit PIN

This is consistent with the actual frontend form in frontend/src/modules/auth/pages/LoginPage.tsx, which displays "Email or Mobile Number" and a 6-digit PIN field.

### 3.2 Role Definitions

The frontend state and role checks clearly define these roles:

- ADMIN
- DEALER
- STAFF

This is reinforced by the frontend auth store in frontend/src/store/authStore.ts and by the backend auth role logic in backend/app/auth/roles.py.

### 3.3 Seed Accounts

The project includes a seed script intended to produce login-ready users:

- admin@erp.com / 123456
- dealer@erp.com / 123456
- staff@erp.com / 123456

These are defined in backend/scripts/seed_data.py and are inserted into the database using the real Staff model and hashed PIN logic. This is the only real user-creation pattern in the codebase and matches the actual authentication design.

---

## 4. Environmental and Startup Status

### 4.1 Environment Files

The backend environment is configured in backend/.env with these important values:

- DATABASE_URL=postgresql+asyncpg://postgres:admin@localhost:5432/showroom_db
- JWT_SECRET_KEY=present
- JWT_ALGORITHM=HS256
- REDIS_HOST=localhost
- REDIS_PORT=6379

This confirms the application expects PostgreSQL and Redis to be present locally.

### 4.2 Dependency Status

The backend requirements file exists and lists the expected dependencies. However, when the seed script was executed in the local environment using the default interpreter, the runtime failed with:

- ModuleNotFoundError: No module named 'sqlalchemy'

This indicates the project Python environment is not currently activated or the dependencies have not been installed in the active interpreter.

### 4.3 Startup Readiness

At the evidence level, the app is not currently ready to start in this environment because:

1. The Python runtime lacks project dependencies.
2. PostgreSQL is expected but not confirmed running.
3. Redis is expected but not confirmed running.
4. The seed data requires the backend environment to be installed and DB connectivity to work.

The repository is therefore structurally complete enough to be restarted, but operationally the environment is not yet ready.

---

## 5. Backend Structure Assessment

### 5.1 Main API Bootstrapping

backend/app/main.py is the application entry point. It wires up the FastAPI app and includes the routing modules.

### 5.2 Domain Model Pattern

The project follows a domain-driven pattern for ERP operations:

- Sales, finance, CRM, service, insurance, warranty, and inventory are distinct domain areas.
- The database layer includes audit mixins and soft-delete behavior.
- The models indicate enterprise patterns such as audit trails, stage progression, document generation, and lifecycle tracking.

### 5.3 Strong Points

- Clear separation of responsibilities across app/domains and app/modules
- Real authentication and authorization logic
- Use of secure hashing for PIN storage
- Database access based on SQLAlchemy ORM
- Seed script for role-based login onboarding
- Frontend gatekeeping by role

### 5.4 Risks and Gaps

- No confirmed end-to-end run log available for the app in this workspace
- Dependency state is incomplete or unprepared in the current local environment
- DB connection and service readiness are external prerequisites, not validated in the repo itself
- Some domain modules suggest operational complexity that may require migration, data seeding, and role-based permission tuning before full launch
- The seed script clearly identifies role credentials, but there is no guarantee that all downstream business workflows are fully populated for a fresh environment

---

## 6. Frontend and Authorization Assessment

The frontend in frontend/src/App.tsx is configured with protected routes and role gating. The auth store decodes the JWT and translates the stored designation into a UI role. The login page uses the actual web form pattern:

- identifier field
- PIN field
- retry lockout logic
- forced PIN change flag support

This is aligned with the backend auth behavior. The front end is not using standard username/password; it is built around the same email/mobile + PIN model that the backend expects.

---

## 7. Data and Persistence Assessment

The backend uses SQLAlchemy ORM with PostgreSQL plus async operations. The .env file points to a database named showroom_db and a local Postgres instance. The domain models show enterprise features such as:

- soft deletes
- audit timestamps
- trigger-like document tracking
- role-based staff records
- lifecycle state transitions (sales stage progression)
- status tracking for delivery, payment, claims, and service records

This indicates the application is designed to support a working ERP system with transaction data, not just a demo.

---

## 8. Restart Blueprint

To restart and validate the project, the following sequence is recommended.

### Phase 1: Restore the backend environment

1. Open a terminal in backend/
2. Create or activate the project venv
3. Install dependencies from requirements.txt
4. Confirm SQLAlchemy and related packages are installed
5. Ensure PostgreSQL is running
6. Ensure Redis is running on localhost:6379

### Phase 2: Validate database connectivity

1. Confirm the database showroom_db exists or create it
2. Confirm the PostgreSQL credentials match backend/.env
3. Run Alembic migrations if the schema is not already present

### Phase 3: Seed login-ready users

Run the seed script:

- backend/scripts/seed_data.py

This should create the role-based login users:

- ADMIN: admin@erp.com / 123456
- DEALER: dealer@erp.com / 123456
- STAFF: staff@erp.com / 123456

### Phase 4: Start the backend

Launch the FastAPI app through the backend project environment.

### Phase 5: Start the frontend

1. Install frontend dependencies
2. Run the Vite dev server
3. Test login using the seeded credentials
4. Verify protected routes resolve by role

### Phase 6: Validate real user flows

Once login works, verify the key workflows for the domain areas: sales, service, inventory, CRM, finance, and staff management. The project is rich enough to need operational validation across these modules, not just a login screen.

---

## 9. Highest-Risk Findings

1. Environment not active: the default Python environment cannot import SQLAlchemy.
2. Hidden operating dependencies: Postgres and Redis are required but not guaranteed to be running.
3. Full ERP flow requires real data and migrations; seed users alone do not guarantee a complete working ERP startup.
4. Login model differs from standard ERP setups; the team must be careful not to assume username/password login exists.
5. The authentication and role model is coherent, but the environment needs proper startup discipline before feature validation can be trusted.

---

## 10. Final Assessment

This repository is not a dead or abandoned project. It is an operationally complete ERP-style codebase with clear domain separation, role-based auth, and seedable login accounts. The primary issue is not absence of application logic; the issue is environment and runtime readiness.

The project is restartable, but only after the local Python environment, PostgreSQL, Redis, and database schema are restored and validated. The login pattern is confirmed to be PIN-based—admin/dealer/staff access is role-driven rather than password-driven.

### Bottom line

The project is recoverable and restartable, but it needs environment setup and operational verification before it can be considered fully usable.

---

## Evidence Snapshot

The most important files that confirm this assessment are:

- backend/app/auth/routes.py
- backend/app/auth/pin_utils.py
- backend/app/domains/master/models.py
- backend/scripts/seed_data.py
- backend/.env
- frontend/src/modules/auth/pages/LoginPage.tsx
- frontend/src/store/authStore.ts
- backend/app/main.py
- backend/requirements.txt

These sources align with one clear conclusion: this ERP is designed around PIN-based staff authentication, structured domain modules, and a restartable local environment requirement rather than a hardcoded username/password system.
