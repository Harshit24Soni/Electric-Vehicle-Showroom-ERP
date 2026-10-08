# ANTIGRAVITY — ERP V2 MASTER FORENSIC AUDIT

## 1. EXECUTIVE SUMMARY

An exhaustive forensic audit of the Electric Vehicle Showroom ERP V2 repository has been conducted. The goal was to determine the true state of the application's production readiness, architecture, and functional completeness.

The audit has revealed a system in active transition with significant architectural drift. We have identified multiple critical (P0) and high (P1) findings that currently block the application from being considered production-grade. Chief among these is the concurrent existence of two competing backend architectures (`app/domains` vs `app/modules`), duplicate implementations of core logic, and severe gaps in transaction management and stock ledger authority.

## 2. WHAT IS ACTUALLY COMPLETE

Based on the forensic scan of the backend, frontend, and test suites, the following domains have partial to significant implementation:
- **Authentication & RBAC:** Login, PIN management, roles (Staff, Dealer, Admin).
- **Master Data:** Vehicles, Models, Customers, Vendors, Nominees.
- **Inventory (Dual Implementation):** Spare parts, stock balances, movements, tags, batches, and serials.
- **Procurement:** Receiving, OCR intake, temporary items.
- **Sales:** Direct spare sales, invoices, challans.
- **Service:** Job cards, spare consumption.
- **CRM/Followup:** Leads, enquiries, test rides.
- **Insurance:** Policy forms.
- **Warranty:** Forms and basic schema (though explicitly excluded from current scope, the code exists).

However, "implemented" does not mean "production-ready". Almost every implemented domain currently suffers from gaps in the DB-to-UI workflow, as detailed below.

## 3. CRITICAL FINDINGS

### P0-1: Competing Architectural Patterns (Domains vs Modules)
The backend codebase is split between `backend/app/domains/` and `backend/app/modules/`. 
- **Evidence:** Both `app/domains/inventory/` and `app/modules/inventory/` exist and contain overlapping logic, services, and models.
- **Impact:** Extreme risk of data corruption if different API endpoints mutate the same tables using different logic.
- **Action:** Enforce a single architectural standard and migrate or delete the legacy implementation immediately.

### P0-2: Inventory Ledger Authority
- **Evidence:** Stock balances are being managed across potentially redundant services in `domains/inventory/services_stock.py` and `modules/inventory/services.py`.
- **Impact:** Direct mutations of stock quantity without ledger entries may be occurring, violating the immutable ledger pattern.
- **Action:** Audit all stock mutations and enforce a strict `LedgerMovement` pattern.

### P0-3: Transaction Boundaries
- **Evidence:** Inspection of service layers indicates that multi-step operations (e.g., Sale creation + Stock deduction) might lack strict `SELECT FOR UPDATE` locking and atomicity.
- **Impact:** High risk of race conditions resulting in negative stock or inconsistent business states during concurrent usage.
- **Action:** Implement rigorous SQLAlchemy transaction blocks and row-level locking for all inventory mutations.

## 4. API & FRONTEND GAPS

A comprehensive API trace revealed a staggering gap between the backend API surface and the frontend client implementation.

- **Total Backend Routes:** 227
- **Total Frontend API Calls:** 87
- **Orphan Backend Endpoints (Unused):** ~140
- **Orphan Frontend Calls (No Backend):** `GET /crm/leads/{param}/test-rides`

**Examples of Missing Frontend Implementations:**
- `GET /inventory/movements` (Movements ledger not viewable in UI)
- `GET /inventory/serials` (Serialized stock not viewable in UI)
- `POST /inventory/spare/movement` (Manual adjustments not implemented in UI)
- `POST /sales/billing` (Billing module UI not connected to backend)
- `POST /finance/` (Finance mutations missing)
- `POST /warranty/claims` (Warranty UI not fully wired to backend)

This indicates that while the backend has a massive footprint, the UI is severely lagging, resulting in "Hidden Functionality".

## 5. DATABASE & LEDGER INTEGRITY

As highlighted in the critical findings, the core Ledger pattern is compromised.

1. **Dual Stock Mutation Paths:** 
   - Operations like `post_purchase_receipt` explicitly update `SpareStockBalance` (`balance.quantity += p_item.quantity`).
   - Simultaneously, they create a `SpareStockMovement` ledger entry.
   - However, `add_spare_movement` calculates stock dynamically via `SUM(movement)`. 
   - `confirm_sale` manually deducts from `SpareStockBalance` AND creates a movement. 
2. **Impact:** The application maintains two separate sources of truth for inventory quantities (the aggregated ledger vs. the explicit balance table) and mutates them via procedural logic scattered across domains and modules.
3. **Recommendation:** Eliminate `SpareStockBalance.quantity` as a mutable source of truth, or restrict all mutations to a single `LedgerService` that strictly guarantees atomicity.

## 6. PLAYWRIGHT COVERAGE & E2E

An inspection of `frontend/e2e` shows limited but growing coverage:
- `observable-service-consumption.spec.ts`
- `scanner-integration.spec.ts`
- `inventory.fullstack.spec.ts`
- `spare-sales.fullstack.spec.ts`

**Gaps:** 
There is no master suite covering the full lifecycle of a vehicle (Procurement -> Intake -> Sale -> Finance -> Billing -> Service -> Warranty). Coverage is siloed to specific spare parts workflows. The scanner tests are currently failing due to state mismatches.

## 7. FINAL PRODUCTION READINESS VERDICT

**VERDICT: NOT READY**

The ERP is absolutely not ready for production use. The existence of competing architectural paradigms (`app/domains` vs `app/modules`), combined with the highly dangerous dual-mutation pattern for inventory stock, poses an unacceptable risk of data corruption, financial mismatch, and silent failures. 

Before any new features (like Warranty) are added, the system must undergo a strict hardening phase to unify the architecture under `app/domains`, strictly enforce the immutable ledger pattern, and complete the missing UI for the 140+ orphaned backend APIs.
