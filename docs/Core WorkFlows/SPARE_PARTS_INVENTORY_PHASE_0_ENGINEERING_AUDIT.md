# ANTIGRAVITY — ERP V2 SPARE PARTS INVENTORY
# PHASE 0 — ENGINEERING AUDIT & TEST INFRASTRUCTURE

## 1. Executive Summary
This document is the result of the Phase 0 forensic engineering and test infrastructure audit of the Electric-Vehicle-Showroom-ERP repository. The goal was to evaluate readiness for the Spare Parts Inventory module implementation. 

**Conclusion:** The repository is **NOT READY** for immediate feature implementation. There is a complete absence of backend and end-to-end tests, frontend TypeScript compilation is broken, and no deterministic database-testing strategy or dummy-data infrastructure exists. A full test-infrastructure foundation phase is mandatory before Phase 1.

## 2. Repository Architecture
- **Structure:** Monorepo containing `/backend` and `/frontend`.
- **Backend:** Python 3.13, FastAPI, SQLAlchemy 2.0, asyncpg, Alembic.
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Zustand, React Hook Form.
- **Entry Points:** `backend/app/main.py` (FastAPI app setup) and `frontend/index.html` (Vite).
- **Environment:** Handled via `.env` files locally.

## 3. Current Inventory Architecture
- **Schemas:** Present in `backend/app/domains/inventory/schemas.py`. Contains basic structures like `SpareMasterResponse`, `SpareMovementCreate`, `SpareMovementResponse`.
- **Enums/Types:** Movements currently expect `"PURCHASE" | "SALE" | "ADJUSTMENT" | "SERVICE_PAID" | "SERVICE_INSURANCE"`. This diverges from the requirements baseline (`SERVICE_CONSUMPTION`, `WARRANTY_INWARD`, `WARRANTY_OUTWARD`).
- **Models & Routes:** Stubs/initial files exist (`routes.py`, `services.py`), but the underlying tests and business logic invariants are missing.

## 4. Related Module Dependencies
The application bootstrap (`app/bootstrap.py`) registers several domains: `sales`, `crm`, `procurement`, `finance`, `billing`, `service`, `warranty`, `insurance`, `master`, and `followup`. Event listeners exist (e.g., `register_inventory_listeners`).
- These modules currently lack API contract tests and integration tests.
- Proceeding without test coverage for these integrations guarantees regressions when the new inventory event models are introduced.

## 5. Database Architecture
- **Engine:** PostgreSQL with `asyncpg` driver.
- **ORM:** SQLAlchemy 2.0.46 (async capabilities utilized).
- **Test Strategy:** No test database isolation is currently configured. The application simply relies on `DATABASE_URL` with no dynamic database provisioning or transaction-rollback strategy for test isolation.

## 6. Current Migration State
- **Framework:** Alembic.
- **Status:** There is a single large flattened migration: `191eb4aa4173_initial_flattened_migration.py`.
- **Risk:** No testing exists to verify whether applying this migration to an empty database succeeds or if data integrity is maintained.

## 7. Existing Test Architecture
- **Backend (`pytest`):** Configured via `pytest-asyncio`, but the `tests/` directory is **entirely empty**. Running `pytest` collects 0 items. 
- **Frontend (`vitest`):** Vitest is installed, but `npm run test` or `npm run build` fails. There are severe TypeScript compiler errors regarding `@testing-library/jest-dom` extensions (e.g., `Property 'toBeInTheDocument' does not exist`).
- **Factories/Fixtures:** None exist.

## 8. Existing Playwright Architecture
- **Status:** Non-existent.
- Playwright is not configured. There is no E2E test suite, no browsers setup, and no authenticated test sessions configured for CI.

## 9. Responsive/Mobile Readiness
- **Frontend Framework:** Tailwind CSS is installed.
- **Status:** The UI components use Tailwind utility classes, indicating a capability for responsive design, but without Playwright or component testing verifying viewports (Desktop, Tablet, Mobile), there are no guarantees that current screens function adequately on mobile devices. 

## 10. Dummy Data Infrastructure
- **Current State:** A single `backend/scripts/seed_data.py` exists to inject 3 login users (Admin, Dealer, Staff).
- **Gap:** No deterministic factories exist for Parts, Vendors, Invoices, Customers, Job Cards, or Stock Movements. Generating repeatable, high-volume inventory data is currently impossible.

## 11. Test Database Strategy
- **Current State:** Missing.
- **Requirement:** Need a mechanism to dynamically create, migrate, and destroy a test-specific PostgreSQL database during test initialization.

## 12. Environment Strategy
- **Files:** `.env` and `.env.example` exist.
- **Missing:** Differentiation between `development` and `test` environments (e.g. separate Supabase/DB URLs for `pytest`).

## 13. CI/CD Readiness
- **Status:** Not ready. Tests cannot pass since they don't compile (frontend) or don't exist (backend). No automated workflows (e.g., GitHub Actions) were identified executing a test matrix.

## 14. Supabase/Vercel Readiness
- **Compatibility:** FastAPI + PostgreSQL is compatible with Supabase (DB) and services like Render/Railway. React + Vite is highly compatible with Vercel. 
- **Risk:** Lacking environment-specific URL handling for tests could lead to accidental production/staging data mutation during deployments.

## 15. Existing Test Results
- **Backend (`pytest`):** PASSED (0 tests run, 0 failures, 0 collected).
- **Frontend (`npm run build` / Type checking):** FAILED.
- **Frontend (`npm run lint`):** FAILED (219 problems: 6 errors, 213 warnings).
- **Playwright:** N/A (Skipped / Missing).

## 16. Current Failures
**Frontend Build Failures:**
- `src/modules/inventory/components/SpareMovementForm.tsx`: Type mismatch between frontend movement types and backend enum expectations.
- `src/modules/inventory/pages/InventoryPage.test.tsx` and `src/modules/sales/components/SaleForm.test.tsx`: Missing DOM matchers (`toBeInTheDocument`).
- `src/modules/crm/components/LeadForm.tsx`: React Query v5 syntax/typing errors.

## 17. Risks
- Implementing the sophisticated Spare Parts Inventory workflows (OCR, Serial Tracking, Pricing Ledgers) without a test harness will result in cascading failures across Sales, Service, and Procurement modules.
- The lack of deterministic dummy data means UX and API edge cases cannot be reliably tested locally.

## 18. Required Test Infrastructure Changes
Before Phase 1, the following MUST be implemented:
1. **Backend Tests:**
   - Configure a `conftest.py` with transactional rollbacks or dynamic test database generation.
   - Implement FactoryBoy (or similar) factories for base models.
2. **Frontend Tests:**
   - Fix TypeScript compilation errors and React Query typings.
   - Configure Vitest with `@testing-library/react` and `@testing-library/jest-dom` correctly.
3. **End-to-End Tests:**
   - Initialize Playwright.
   - Configure global authentication setup for Playwright to bypass manual login in tests.
   - Define viewport testing matrix (Desktop, Tablet, Mobile).

## 19. Required Engineering Changes Before Phase 1
- **Fix Types:** Resolve all `npm run build` TypeScript errors.
- **Enums Alignment:** Align existing `SpareMovementForm` enums with the Business Requirements Baseline.
- **Database Reset Script:** Implement a safe, development-only CLI command to reset and seed the database for local UI development.

## 20. Explicit GO / NO-GO Decision

**NO-GO**

The project is NOT ready for Phase 1 (Inventory feature implementation). 

The repository requires a mandatory **Test Infrastructure & Hardening Phase** to build the fixtures, Playwright setup, testing database strategy, and data factories demanded by the business requirements.
