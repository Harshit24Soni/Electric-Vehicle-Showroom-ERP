<<<<<<< HEAD
# 🚗 Electric Vehicle Showroom ERP
## Backend Architecture & System Design (DB‑First, ERP‑Grade)

---

## 1. What This Project Actually Is

This project is a **serious, DB‑first Electric Vehicle Showroom ERP backend**, designed after analysing **real Indian EV showroom workflows**, not as a CRUD demo or tutorial project.

This backend is meant to power a **desktop ERP system running on a local network**, where:
- One machine acts as the server
- Multiple staff systems connect over LAN
- Data integrity, auditability, and long‑term correctness matter more than shortcuts

This repository represents **intentional architectural decisions**, trade‑offs, and corrections made during development.

---

## 2. Core Architectural Decisions (Why Things Are the Way They Are)

### 2.1 Database‑First Design (Non‑Negotiable)

The PostgreSQL database is the **single source of truth**.

- All tables were designed manually
- All constraints live in PostgreSQL
- Normalization was done consciously, not blindly
- Backend code never “fixes” bad DB design

This mirrors how **real ERP systems** are built.

---

### 2.2 Multi‑Schema Database (ERP‑Style)

The database is split into **logical schemas**, not a flat public schema:

| Schema | Responsibility |
|------|---------------|
| master | Core master data (staff, vehicles, variants, etc.) |
| sales | Vehicle sales lifecycle |
| service | Service job cards & service history |
| inventory | Vehicle & spare stock |
| procurement | OEM purchases |
| billing | Billing & receipts |
| warranty | Warranty tracking |
| insurance | Insurance policies |
| crm | Leads & follow‑ups |
| finance | Expenses & income |
| hr | Attendance & salary |
| communication | Notifications & reminders |
| oem | OEM‑specific master data |

This separation:
- Prevents accidental coupling
- Improves long‑term maintainability
- Matches real ERP databases

---

### 2.3 Why FastAPI (and not Django)

FastAPI was chosen because:
- The database already exists (DB‑first)
- SQLAlchemy Core allows explicit SQL
- JWT & RBAC are cleanly implemented
- No forced ORM abstractions
- Predictable request/response contracts

Django ORM was intentionally avoided due to:
- Schema rigidity
- ORM‑driven mindset
- Difficulty aligning with complex ERP databases

---

### 2.4 Desktop ERP Focus (Not a Web App)

This backend is designed for:
- **PySide6 / PyQt desktop frontend**
- LAN‑based deployment
- Printer integration
- Offline‑tolerant workflows

This matches how **actual Indian showrooms operate**.

---

## 3. Backend Folder Structure (Deep Explanation)

```
backend/
├── app/
│   ├── main.py
│   ├── core/
│   ├── db/
│   ├── auth/
│   ├── api/
│   ├── schemas/
│   └── utils/
├── .env
├── requirements.txt
└── README.md
```

---

### 3.1 main.py — Application Root

Responsibilities:
- Create FastAPI instance
- Register routers
- Startup configuration only

Rules:
- No business logic
- No DB logic
- No auth logic

---

### 3.2 core/

Holds **global configuration and security constants**.

- `config.py`: loads `.env`, DB URL, JWT config
- Keeps secrets out of code
- Allows environment portability

---

### 3.3 db/session.py — Transaction Boundary

- Creates SQLAlchemy engine
- Uses `engine.begin()` for atomic transactions
- Enforces ACID compliance

Every write operation is expected to be:
- Fully committed
- Or fully rolled back

---

### 3.4 auth/ — Authentication & Authorization Layer

This is **foundational ERP infrastructure**, not a feature.

#### jwt_utils.py
- JWT creation & decoding
- Embeds staff_id and designation

#### pin_utils.py
- Hashes numeric PINs
- Lightweight by design
- bcrypt intentionally removed to avoid unnecessary overhead

#### dependencies.py
- Extracts JWT from request
- Loads logged‑in staff context
- Blocks unauthorized access early

#### roles.py
- Enforces role‑based access
- ADMIN, STAFF, DEALER (future‑ready)

---

### 3.5 api/v1/

Versioned API structure to allow:
- Future mobile apps
- Versioned upgrades without breaking clients

#### auth/login.py
- PIN‑based login
- Returns JWT token

#### admin/ping.py
- ADMIN‑only test endpoint
- Confirms RBAC correctness

---

### 3.6 schemas/

Contains **Pydantic schemas only**.

Rules:
- Schemas represent API contracts, not DB tables
- No auth context in schemas
- No dependencies in schemas
- Separate Create / Update / Response models

This prevents:
- Swagger confusion
- Leaking internal context
- Tight coupling

---

## 4. Staff System Design (Critical ERP Component)

### master.staff Table Philosophy

The staff table is **not just users** — it is:
- Authentication identity
- Authorization anchor
- Audit actor
- HR reference

Key design points:
- staff_id auto‑generated
- PIN‑based authentication
- Role stored as designation
- PAN & UPI intentionally nullable
- is_active used instead of deletes
- created_at for audit trails

---

## 5. Security Model

- Stateless JWT authentication
- Role‑based authorization enforced at backend
- Frontend has zero authority
- Database never trusts frontend input

This ensures:
- UI bugs cannot escalate privileges
- All enforcement happens server‑side

---

## 6. Swagger & API Contract Reality

Swagger is used as:
- Documentation aid
- Manual testing helper

Swagger is **not** treated as:
- Source of truth
- Validation authority

Database state + API behavior are the truth.

---

## 7. Development Stages (How This Project Progresses)

### Completed
- Stage 1–3: Database design & normalization
- Stage 4: JWT authentication + RBAC (stable baseline)

### Current
- Stage 5: Admin & master modules (restarted cleanly)

### Planned
- Sales workflow
- Service lifecycle
- Inventory automation
- Finance reporting
- Notification engine

---

## 8. Why the Reset to Stage 4 Was the Correct Decision

During Stage 5 development:
- FastAPI OpenAPI limitations surfaced
- Swagger behavior conflicted with expectations
- Instead of stacking hacks, the system was reset

This was a **correct senior‑level decision**:
- Preserved architectural integrity
- Avoided hidden technical debt
- Ensured long‑term correctness

---

## 9. How to Continue Development (Rules)

1. Verify DB structure first
2. Add schemas next
3. Add one API at a time
4. Verify DB writes directly
5. Only then move forward

No shortcuts.

---

## 10. Final Statement

This project is not a tutorial.
It is not a CRUD demo.
It is not framework‑driven.

It is a **deliberately designed ERP backend** meant to survive:
- Feature expansion
- New developers
- Real showroom usage
- Long‑term maintenance

Every decision prioritizes **correctness over convenience**.
=======
# 🚗 Electric Vehicle Showroom ERP  
## Backend Architecture, Database Design & Development Guide

---

## 📌 Project Overview

This project is a **full-scale Electric Vehicle Showroom ERP system** designed for **Indian EV dealerships** operating primarily on a **local network (LAN)** using desktop systems.

The ERP is built with a **Database-First architecture**, meaning:

- PostgreSQL is the **single source of truth**
- All constraints, relationships, and business rules are enforced at the DB level
- The backend **respects** database design instead of redefining it
- The frontend never directly accesses the database

This ERP mirrors **real showroom operations**, not a demo system.

---

## 🧠 Core Philosophy

### Why DB-First?
- Prevents data inconsistency
- Matches real ERP systems
- Enables audits and long-term maintenance
- Supports multiple frontends

---

## 🧱 Technology Stack

### Backend
- Python
- FastAPI
- PostgreSQL
- SQLAlchemy Core (DB-first)
- JWT Authentication
- Role-Based Access Control (RBAC)
- Uvicorn

### Frontend (Planned)
- Desktop ERP using PySide6 / PyQt
- LAN-based access

---

## 📁 Backend Folder Structure

backend/
├── app/
│   ├── main.py
│   ├── core/
│   ├── db/
│   ├── auth/
│   ├── api/
│   ├── schemas/
│   └── utils/
├── .env
├── requirements.txt
└── README.md

---

## 🔐 Authentication & Authorization

- PIN-based login
- JWT tokens
- Role enforcement at backend

---

## 🗄️ Database Design

- Multiple schemas (master, sales, service, inventory, etc.)
- DB-first, manually designed tables
- Backend strictly follows DB constraints

---

## 👤 master.staff Table

- staff_id (PK)
- pin_hash
- designation
- optional PAN, UPI, bank details
- audit-friendly fields

---

## 🧪 Testing Philosophy

- Database state is the truth
- Swagger is documentation-only
- Verify changes via DB queries

---

## 🚀 Development Roadmap

- Stage 1–4: Auth & RBAC (completed)
- Stage 5: Admin & Master modules (in progress)
- Future: Sales, Service, Inventory, Finance

---

## 🧠 Final Notes

Designed for **stability, security, and scalability**.
>>>>>>> e55757d (Revise README for clarity and project details)
