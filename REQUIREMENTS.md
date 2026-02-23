# Project Requirements & Feature Status

> **Last Updated:** February 2026

This document tracks the implementation status of all business workflows and features in the Electric Vehicle Showroom ERP.

---

## Completed Workflows

### 1. Setup & Master Data ✅

The centralized **Setup Module** manages all reference data used across the system.

| Entity | CRUD | Soft Delete | Restore | Audit Trail |
|---|:---:|:---:|:---:|:---:|
| Brands | ✅ | ✅ | ✅ | ✅ |
| Banks | ✅ | ✅ | ✅ | ✅ |
| Payment Modes | ✅ | ✅ | ✅ | ✅ |
| Insurance Companies | ✅ | ✅ | ✅ | ✅ |
| Document Types | ✅ | ✅ | ✅ | ✅ |

- Generic `CrudTable` component handles all Setup entities with a unified UI.
- Serial numbers displayed in UI instead of database IDs.

---

### 2. Authentication & Staff Management ✅

| Feature | Status |
|---|:---:|
| JWT Auth (Access + Refresh tokens) | ✅ |
| Role-Based Access (Admin / Dealer / Staff) | ✅ |
| Staff PIN Login | ✅ |
| Staff Create / Edit / Soft Delete / Restore | ✅ |
| PIN Reset Request (notify Admin) | ✅ |
| Dual-Delete (Soft by Dealer, Hard by Admin) | ✅ |

---

### 3. Pre-Sales — Lead Conversion Workflow ✅

The complete lead-to-customer pipeline is implemented:

```
Enquiry → Lead Created → Follow-ups Scheduled → Lead Converted → Customer Record
```

| Feature | Backend | Frontend |
|---|:---:|:---:|
| Lead Creation (partial customer data) | ✅ | ✅ |
| Lead Listing & Search | ✅ | ✅ |
| Follow-up Scheduling & Tracking | ✅ | ✅ |
| Lead → Customer Conversion (data sync/override) | ✅ | ✅ |
| Enquiry Management | ✅ | ✅ |
| Nominee Details (Name, DOB, Relation) | ✅ | ✅ |

---

### 4. Procurement — OEM Vehicle Intake ✅

Vehicles received from OEMs are registered and tracked at chassis level.

```
Purchase Order → Vehicle Inward → Chassis Registered → Stock Available
```

| Feature | Backend | Frontend |
|---|:---:|:---:|
| Vehicle Inward Entry (Chassis, Model, Variant) | ✅ | ✅ |
| Multi-Brand / Multi-Model Support | ✅ | ✅ |
| Inventory Registration on Intake | ✅ | ✅ |
| Batch & Colour Metadata | ✅ | ✅ |

---

### 5. Sales — Billing & Document Generation ✅

The end-to-end sales pipeline from quotation to delivery.

```
Customer → Quotation → Booking → Invoice → Delivery → Documents Issued
```

| Feature | Backend | Frontend |
|---|:---:|:---:|
| Quotation Generation | ✅ | ✅ |
| Booking Confirmation | ✅ | ✅ |
| GST Invoice Generation | ✅ | ✅ |
| Multi-Payment Mode (Cash, Finance, UPI, Cheque) | ✅ | ✅ |
| Delivery Processing | ✅ | ✅ |
| Document Issuance (RC, Insurance, etc.) | ✅ | ✅ |

---

### 6. Infrastructure ✅

| Feature | Status |
|---|:---:|
| Alembic Migrations (full schema versioning) | ✅ |
| Redis Caching & Rate Limiting | ✅ |
| CORS Middleware | ✅ |
| Centralized Error Handling | ✅ |
| Audit Mixins (`created_by`, `updated_by`) | ✅ |
| Soft-Delete Mixins (`is_deleted`, `deleted_at`, `deleted_by`) | ✅ |
| Domain-Driven Folder Structure (19 domains) | ✅ |

---

## Roadmap (Pending)

### Phase 1 — Service & Warranty

| Feature | Priority |
|---|---|
| Digital Job Cards for vehicle servicing | High |
| Service Follow-up Scheduling | High |
| OEM Warranty Claim Processing | High |
| Service History on Customer Profile | Medium |

### Phase 2 — Finance & Reporting

| Feature | Priority |
|---|---|
| Partial Payment & EMI Tracking | High |
| Loan Disbursement Records | Medium |
| Business Analytics Dashboard | Medium |
| Revenue & Sales Reports | Medium |

### Phase 3 — Insurance & Notifications

| Feature | Priority |
|---|---|
| Insurance Policy CRUD & Renewal Tracking | High |
| Insurance Expiry Alerts | Medium |
| Service Reminder Notifications | Medium |
| SMS / Email Integration | Low |

### Phase 4 — Advanced CRM

| Feature | Priority |
|---|---|
| Aggregated Follow-up Dashboard (Sales, Service, Insurance) | High |
| Customer Lifetime Value Metrics | Low |
| Lead Source Analytics | Low |

---

## Core Rules (Inviolable)

1. **No Raw SQL** — All schema changes go through Alembic migrations.
2. **No Hard Deletes** — All user-facing deletions use `SoftDeleteMixin`. Only Admins may hard-delete.
3. **API-First** — Frontend must exclusively use backend REST APIs. No direct DB access.
4. **Audit Everything** — All core tables inherit `AuditMixin`.
5. **Preserve CSS** — The existing frontend styling and UX flows must not be altered without explicit approval.
