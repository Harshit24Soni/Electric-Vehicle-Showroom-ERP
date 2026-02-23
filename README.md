# Electric Vehicle Showroom ERP

![Status](https://img.shields.io/badge/Status-Active%20Development-brightgreen)
![Backend](https://img.shields.io/badge/Backend-FastAPI-009688)
![Frontend](https://img.shields.io/badge/Frontend-React_18-61DAFB)
![Database](https://img.shields.io/badge/Database-PostgreSQL_15+-336791)
![Architecture](https://img.shields.io/badge/Architecture-Modular_Monolith-blueviolet)

## Overview

The **Electric Vehicle Showroom ERP** is an enterprise-grade, LAN-deployable platform built to manage the entire lifecycle of a single or multi-brand EV dealership — from the first customer enquiry to the final invoice.

Built as a **Modular Monolith** with a **FastAPI** (Python) backend and a **React 18** (TypeScript) frontend, it prioritizes data integrity, operational speed, and premium UX. All modules share a single PostgreSQL database but are strictly separated by business domain.

---

## Core Architecture

### Modular Monolith

The backend is organized into self-contained **domain modules**, each owning its own `models`, `schemas`, `routes`, and `services`. Domains are registered via a centralized `bootstrap.py` and share infrastructure (database session, auth middleware, mixins) without cross-domain imports.

```
backend/app/domains/
├── setup/          # Master data (Brands, Banks, Payment Modes, etc.)
├── crm/            # Lead management & follow-ups
├── procurement/    # OEM vehicle inward (Chassis intake)
├── sales/          # Quotation → Booking → Invoice
├── billing/        # GST invoice generation & documents
├── finance/        # Payments, loans, EMI tracking
├── inventory/      # Vehicle stock & spare parts
├── insurance/      # Policy management & renewals
├── service/        # Job cards & servicing
├── warranty/       # OEM warranty claims
├── documents/      # Document type management
├── followup/       # Aggregated follow-up dashboard
├── reports/        # Business intelligence & analytics
├── staff/          # Staff CRUD & PIN management
├── admin/          # System administration
├── audit/          # Audit trail infrastructure
├── notifications/  # Alert & reminder engine
└── workflow/       # Cross-domain process orchestration
```

### Dual-Delete Safety Model

All critical entities implement a **two-tier deletion** strategy:

| Layer | Mechanism | Who | Reversible? |
|---|---|---|---|
| **Soft Delete** | `is_deleted` flag via `SoftDeleteMixin` | Dealer / Staff | ✅ Yes (Restore) |
| **Hard Delete** | Permanent `DELETE` from database | Admin only | ❌ No |

This ensures zero accidental data loss while giving Admins full control.

### Role-Based Access Control (RBAC)

A three-tier role hierarchy enforces permissions across every endpoint:

- **Admin** — Full system control, hard deletes, staff management.
- **Dealer** — Showroom operations, soft deletes, reporting.
- **Staff** — Day-to-day data entry, read-only on sensitive areas.

### Audit Trail

Every core record automatically tracks `created_at`, `updated_at`, `created_by`, and `updated_by` via the `AuditMixin`. Soft-deleted records additionally store `deleted_at` and `deleted_by`.

---

## Key Business Workflows

### 1. Pre-Sales (Lead Conversion)

```
Enquiry → Lead Created → Follow-ups → Lead Converted → Customer Record
```

- Leads capture partial interest data (name, phone, vehicle interest).
- Follow-up scheduler tracks calls, messages, and next actions.
- On conversion, lead data syncs into a full Customer profile (with option to override).

### 2. Procurement (OEM Intake)

```
Purchase Order → Vehicle Inward → Chassis Registered → In Stock
```

- Vehicles are received from OEMs with chassis-level tracking.
- Each unit is tagged with brand, model, variant, colour, and batch metadata.

### 3. Sales (Billing & Documents)

```
Customer → Quotation → Booking → Invoice → Delivery → Documents Issued
```

- Multi-payment-mode support (Cash, Finance/EMI, UPI, Cheque).
- GST-compliant invoice generation.
- Insurance nominee capture linked to customer profiles.

---

## Tech Stack

### Backend (`/backend`)

| Layer | Technology |
|---|---|
| Framework | FastAPI (Async Python 3.10+) |
| Database | PostgreSQL 15+ |
| ORM | SQLAlchemy 2.0 (Async) |
| Migrations | Alembic |
| Caching | Redis |
| Auth | JWT (Access + Refresh) via `python-jose` |
| Passwords | Argon2 / Bcrypt via `passlib` |
| Validation | Pydantic v2 + `pydantic-settings` |

### Frontend (`/frontend`)

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| Language | TypeScript (strict) |
| State | Zustand + TanStack Query v5 |
| Styling | Tailwind CSS v3 + Lucide Icons |
| Forms | React Hook Form + Zod |
| UX | Skeleton loaders, optimistic updates, responsive design |

---

## Deployment Strategy

This ERP is designed for **LAN deployment** within a dealership's local network:

- **Backend**: Uvicorn bound to `0.0.0.0:8000`, accessible from any machine on the LAN.
- **Frontend**: Vite dev server or static build served on `0.0.0.0:5173`.
- **Database**: PostgreSQL instance on a central server or NAS.
- **Redis**: Local instance for rate limiting and session caching.

No cloud infrastructure required — the system runs entirely on-premises.

---

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 15+
- Redis

### Backend

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate          # Windows
# source venv/bin/activate       # macOS / Linux

pip install -r requirements.txt
alembic upgrade head
python -m app.scripts.seed_admin  # Create initial Admin user
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Documentation

| Document | Purpose |
|---|---|
| [REQUIREMENTS.md](REQUIREMENTS.md) | Feature status, completed workflows, and roadmap |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Dev setup, coding standards, and contribution rules |

---

## License

Proprietary Software — Internal Use Only.
