# SPARE PARTS INVENTORY MODULE
## Business Requirements & Requirements Gathering Specification

**Project:** Showroom ERP  
**Domain:** Spare Parts Inventory  
**Document Type:** Business Requirements / Software Requirements Baseline  
**Status:** REQUIREMENTS GATHERING COMPLETE — BASELINE FOR SYSTEM DESIGN  
**Date:** 2026-10-04  
**Scope:** Spare Parts Inventory only  
**Related Domains:** Procurement, Sales, Service, Job Cards, Warranty, Master Data, Reporting

---

## 1. Purpose

This document establishes the business requirements gathered for the showroom's Spare Parts Inventory module.

It converts the actual physical showroom workflow into a software requirements baseline before database redesign, API implementation, UI implementation, migration, and integration work begin.

This specification covers **spare-parts inventory only**. Vehicle/finished-goods inventory remains a separate domain with separate lifecycle, identity, valuation, and operational logic.

The requirements below are based on the ground-level workflow described for the showroom, the supplied inventory analysis, and the supplied workbook structure. The existing implementation already contains `SpareMaster`, `SpareSerial`, and `SpareStockMovement`, plus movement concepts for purchase, sale, service consumption, warranty inward/outward, and adjustment. The current analysis also identifies physical stock audit, temporary-spare approval, location handling, and event-handler wiring as areas requiring further work.

---

## 2. Core Business Principle

The system must reliably answer:

1. What is this part?
2. How has the company identified this part over time?
3. How many units physically exist and where are they?
4. What did each stock receipt actually cost?
5. Why did stock quantity or physical identity change?

Historical truth must be preserved. Later changes to company codes, price lists, GST, MRP, or descriptions must not rewrite historical transactions.

---

## 3. Inventory Domain Separation

### Spare Parts Inventory

Handles parts and consumables used for:

- direct customer sales,
- service/job-card consumption,
- accident repair,
- warranty replacement,
- showroom operations,
- other approved consumption.

### Vehicle Inventory

Vehicle inventory remains separate. Vehicles are individually identifiable finished goods and follow a different lifecycle.

### Shared Infrastructure

The domains may share:

- location infrastructure,
- users,
- permissions,
- audit framework,
- document attachments,
- event infrastructure,
- reporting infrastructure.

They must not be collapsed into one operational stock table.

---

## 4. Ground-Level Spare Parts Workflow

```text
Company Order
    ↓
Docket / Dispatch Information
    ↓
Company Invoice
    ↓
Physical Package Arrival
    ↓
Invoice vs Physical Goods Verification
    ↓
Invoice Capture / OCR
    ↓
Receipt Review
    ↓
Purchase Receipt Confirmation
    ↓
Stock Creation
    ↓
Serial / Batch / Tag Assignment
    ↓
QR / Barcode Label Printing
    ↓
Physical Storage
    ↓
Stock Available
```

Stock subsequently leaves through:

```text
AVAILABLE STOCK
   ├── Direct Sale → Billing → Stock Out
   ├── Service → Job Card → Consumption → Stock Out
   └── Warranty → Claim → Replacement → Stock Out
```

---

## 5. Purchase and Goods Receipt

The showroom places an order with the company/OEM. The company may provide an order reference, docket/dispatch number, invoice number, dispatch information, and invoice document.

The system must retain these references.

A docket must not itself create stock.

The following states must remain distinguishable:

```text
Invoice Received
≠
Goods Received
≠
Goods Verified
≠
Stock Posted
```

Stock is created only after physical receipt has been verified and the receipt has been confirmed.

---

## 6. Invoice OCR

### Input

The system must support:

- photograph of an A4 paper invoice,
- uploaded invoice image,
- scanned invoice,
- supported invoice document.

### OCR Fields

The system should extract where available:

**Header**
- supplier/company name,
- supplier GSTIN,
- invoice number,
- invoice date,
- docket/dispatch number,
- purchase-order/order reference.

**Line Items**
- company part code,
- part name,
- description,
- HSN,
- quantity,
- unit price,
- actual billed price,
- discount,
- tax/GST,
- line total,
- serial number where present.

### Critical Rule

OCR must create a **draft**, never directly post inventory.

```text
Image
  ↓
OCR
  ↓
Draft Receipt
  ↓
Human Review
  ↓
Correction
  ↓
Confirmation
  ↓
Inventory Posting
```

Low-confidence or suspicious fields must be highlighted for review.

---

## 7. Invoice vs Physical Reconciliation

The receiving screen must allow comparison of:

- OCR result,
- known part master,
- historical company codes,
- expected order quantity,
- invoice quantity,
- physical quantity,
- actual billed price.

The system should flag:

- unknown code,
- historical code,
- duplicate logical part,
- quantity mismatch,
- price mismatch,
- unexpected part,
- missing part,
- damaged/missing item.

---

## 8. Actual Purchase Price vs Price List

The actual company invoice-billed price is authoritative for the purchase transaction.

Example:

```text
Price List Reference = ₹500
Actual Invoice Billed Price = ₹535
```

The purchase must record ₹535 as the actual purchase price.

The ₹500 value remains reference information.

The system must never silently substitute price-list values for actual invoice values.

---

## 9. Part Identity

Company part code is an external identifier, not the permanent ERP identity.

The ERP requires a stable internal Part ID.

Example:

```text
Internal Part ID: SP-000184
Canonical Part: Brake Shoe Assembly
```

---

## 10. Part-Code History

A logical part may have multiple company codes over time.

Example:

```text
SP-000184
 ├── ABC-123  (2023–2024)
 ├── ABC-456  (2024–2025)
 └── ABC-789  (2025–Present)
```

Historical transactions must retain their original company code.

The system must support code aliases and effective periods.

---

## 11. Code Change vs Supersession

The system must distinguish:

### Code Change

Same logical part, different company code.

```text
ABC123 → ABC456
Relationship = CODE_CHANGE
```

### Supersession

Manufacturer explicitly replaces an old part with another part.

```text
ABC123 → ABC789
Relationship = SUPERSEDES
```

These relationships must not be conflated.

---

## 12. Vehicle Compatibility

Parts can be shared across multiple vehicle models.

Therefore:

```text
Part ↔ Vehicle Model
```

is a many-to-many relationship.

Example:

```text
Brake Shoe
 ├── Magnus Neo
 ├── Nexus
 ├── Reo 80
 └── Primus
```

Compatibility must be maintained separately from stock quantity.

---

## 13. Company Price Lists

Price lists arrive irregularly and may have different structures.

They may:

- add parts,
- remove part codes,
- change prices,
- change GST,
- change DLP,
- change MRP,
- contain different columns,
- omit previously listed parts that still physically exist.

The system must not assume a fixed price-list schedule or fixed column structure.

---

## 14. Price List Versioning

Every imported price list must be retained as a version.

Example:

```text
Version 001 — 2026-01-10
Version 002 — 2026-04-23
Version 003 — 2026-09-18
```

The original source document should remain accessible.

Price-list history must not be overwritten.

---

## 15. Price Fields

The system must distinguish:

- company price-list price,
- dealer price/DLP,
- actual invoice purchase price,
- landing cost,
- MRP,
- customer selling price,
- GST/tax,
- discount,
- additional expenses.

No single generic `price` field should represent all of these.

---

## 16. Historical Price Preservation

When MRP/DLP/GST changes, historical transactions must remain historically correct.

Example:

```text
Sale on 2026-09-15
MRP = ₹134
```

If current MRP later becomes ₹123, the old sale remains ₹134.

Price history therefore requires effective dates/versioning.

---

## 17. Purchase Cost and Landing Cost

A purchase receipt may contain:

- billed unit price,
- quantity,
- GST,
- discount,
- freight,
- transportation,
- handling,
- other allocable expenses,
- landing cost.

The exact allocation methodology must be finalized during technical design.

Existing WAC/decimal-costing work should be preserved.

---

## 18. Batch Tracking

Non-serialized parts should support purchase-lot/batch identification where appropriate.

A batch should retain:

- part,
- purchase invoice,
- purchase date,
- quantity,
- actual unit cost,
- landing cost,
- source reference.

Different purchases of the same part may therefore retain different cost layers.

---

## 19. Serialized Parts

Selected high-value parts should be individually serial-tracked.

Examples:

- batteries,
- motors,
- controllers,
- chargers,
- other designated high-value/warranty-sensitive components.

Each serialized item must retain:

- serial number,
- Part ID,
- purchase receipt,
- invoice,
- purchase date,
- cost,
- location,
- status,
- movement history,
- warranty relationship where applicable.

Duplicate active serial identities must be prevented.

---

## 20. Hybrid Tracking

The module should support:

| Tracking Level | Suitable Use |
|---|---|
| Quantity | Low-value/simple consumables |
| Batch | Normal physical parts |
| Individual Serial | High-value/warranty-sensitive parts |

The Part Master determines the tracking mode.

---

## 21. QR / Barcode Tagging

After receipt confirmation, the system should generate printable A4 label sheets.

Labels must be suitable for physical attachment to:

- individual serialized parts,
- boxes,
- batches,
- selected normal parts.

The QR should contain a stable opaque identifier, not mutable business information.

Example:

```text
INVSTK-8F92A7
```

Scanning this identifier should query the ERP.

---

## 22. QR Scan View

A scan should provide, subject to permissions:

- part name,
- internal Part ID,
- current company code,
- historical codes,
- purchase invoice,
- purchase date,
- actual billed price,
- landing cost,
- current MRP,
- current selling price,
- location,
- status,
- compatible vehicle models,
- serial/batch,
- movement history.

Changing MRP, location, code, or status must not require replacing the QR merely because the displayed information changed.

---

## 23. Direct Sales

Direct customer sale flow:

```text
Customer Request
    ↓
Part Identification / Scan
    ↓
Availability Check
    ↓
Price
    ↓
Sales Invoice
    ↓
Inventory Movement
```

The inventory decrease must reference the sales transaction.

Example:

```text
Movement Type = CUSTOMER_SALE
Quantity = -1
Reference Type = SALES_INVOICE
Reference ID = SI-10482
```

No direct stock-field editing is allowed.

---

## 24. Service Consumption

When a part is used against a Job Card:

```text
Job Card
    ↓
Part Requirement
    ↓
Part Issue/Consumption
    ↓
Inventory Movement
```

Example:

```text
Movement Type = SERVICE_CONSUMPTION
Quantity = -2
Reference Type = JOB_CARD
Reference ID = JC-10291
```

Service owns the Job Card business process. Inventory owns the stock consequence.

---

## 25. Accident Repair

Accident repair can use the same Job Card/service inventory consumption model.

Inventory does not need a duplicate accident-specific stock engine.

The service/job reference should identify the nature of the work.

---

## 26. Warranty

Warranty is a separate business process but affects physical stock.

Inventory must support:

```text
WARRANTY_INWARD
WARRANTY_OUTWARD
```

The Warranty module owns the claim lifecycle. Inventory owns physical stock movements.

---

## 27. Warranty Serial Replacement

When an old serialized part is removed and a new serialized part is supplied:

```text
Warranty Claim
   ↓
Failed Part
   ↓
OLD-001
   ↓
Replacement
   ↓
NEW-002
```

The relationship between old and new physical identities must be permanently retained.

---

## 28. Free Warranty Issue and OEM Reimbursement

A warranty part may be given to the customer at ₹0 while the company/OEM later reimburses the showroom.

These values must remain separate:

```text
Customer Charge = ₹0
Inventory Cost = Actual Cost
OEM Claim Value = Expected Reimbursement
Reimbursement Status = Pending / Claimed / Received / Rejected
```

This is not an ordinary zero-price customer sale.

The system should ultimately support claim amount, reimbursement reference, amount received, date, rejected amount/reason, and pending amount.

---

## 29. Inventory Movement Ledger

Every physical stock change must be represented by an auditable movement.

Candidate movement types:

```text
OPENING_BALANCE
PURCHASE
CUSTOMER_SALE
SERVICE_CONSUMPTION
WARRANTY_INWARD
WARRANTY_OUTWARD
RETURN_IN
RETURN_OUT
TRANSFER_IN
TRANSFER_OUT
ADJUSTMENT
SCRAP
```

The final enum list must be frozen during technical design.

---

## 30. No Direct Stock Mutation

The authoritative quantity must be derived from valid inventory movements.

Do not rely on business logic such as:

```text
part.stock_quantity = X
```

Any correction must be represented by an auditable movement.

---

## 31. Physical Stock Audit

The showroom must be able to count physical stock and compare it to system stock.

Required values:

- system quantity,
- counted quantity,
- difference,
- reason,
- auditor,
- approver,
- adjustment reference.

Example:

```text
Brake Shoe
System = 23
Physical = 21
Difference = -2
```

The correction must be an approved inventory adjustment.

---

## 32. Initial Physical Baseline

The first stock tally should follow:

```text
Database Snapshot
    ↓
Physical Count
    ↓
System vs Physical Reconciliation
    ↓
Variance Review
    ↓
Approved Adjustment
    ↓
Official Baseline
```

Stock must not be made correct by silently overwriting quantities.

---

## 33. Historical Data Migration

Two different import modes are required.

### Historical Transactions

If an actual historical purchase invoice exists, import the historical purchase with its original date and source reference.

### Current Physical Stock

If only current physical quantity is known, record an `OPENING_BALANCE`.

The system must not invent historical purchases to explain present stock.

---

## 34. Existing Workbook Migration

The supplied workbook contains information covering purchase records, sales/service records, old inventory, inventory snapshots, and master/pricing information.

It must be treated as a migration/source-data artifact.

Migration must include:

1. column mapping,
2. normalization,
3. duplicate detection,
4. part-code history identification,
5. unknown-part detection,
6. quantity validation,
7. date validation,
8. price validation,
9. serial validation,
10. human review of exceptions,
11. controlled import.

Raw spreadsheet rows must not automatically become authoritative database records.

---

## 35. Data Quality

The system must detect/review:

- duplicate part codes,
- multiple codes for one logical part,
- same description under different codes,
- obsolete codes,
- removed codes,
- unknown parts,
- missing HSN,
- missing prices,
- inconsistent GST,
- invalid quantities,
- duplicate invoice lines,
- duplicate serials,
- duplicate invoice numbers,
- invoice-total mismatch,
- negative stock,
- stock without source movement.

---

## 36. Temporary Spare Handling

The existing implementation allows temporary spares where the exact part cannot be found.

Required workflow:

```text
Temporary Part
    ↓
Temporary Use/Receipt
    ↓
Manager/Admin Review
    ↓
Canonical Part Assignment
    ↓
Price Assignment
    ↓
Approval
```

Temporary records must not silently become permanent master data.

---

## 37. Location Management

Inventory must support physical locations.

Examples may include:

- main store,
- showroom,
- warehouse,
- secondary storage,
- other approved locations.

Transfers must be traceable.

The final location hierarchy should be defined during technical design.

---

## 38. Stock Status

Depending on the tracking mode, inventory may need to distinguish:

- available,
- reserved,
- damaged,
- warranty-related,
- quarantined,
- returned,
- scrapped,
- other controlled states.

The exact state machine must be finalized during technical design.

---

## 39. Availability Contract

Other modules should not directly query inventory tables.

The inventory domain should expose service/API contracts such as:

```text
check_part_availability(
    part_id,
    location,
    requested_quantity
)
```

The result should provide requested quantity, available quantity, reserved quantity where applicable, and fulfillment status.

---

## 40. Negative Stock Guardrail

Normal business transactions must not silently produce unexplained negative stock.

If requested quantity exceeds available stock, the system should reject the transaction or route it through an explicitly authorized exception workflow.

---

## 41. Costing

The system must distinguish:

```text
Company Reference Price
Actual Purchase Price
Additional Expense
Landing Cost
Weighted Average Cost
Selling Price
MRP
Margin
Profit
```

The final reporting cost basis must be defined during technical design.

Possible bases include:

- actual purchase cost,
- landing cost,
- WAC,
- batch cost.

---

## 42. Audit Trail

Inventory must preserve:

- creator,
- modifier,
- approver,
- timestamps,
- source transaction,
- source document,
- old value/new value where applicable,
- adjustment reason.

Inventory records must remain auditable.

---

## 43. Document Attachments

Relevant source documents should be linked to transactions:

- company invoice,
- price list,
- docket,
- purchase document,
- warranty document,
- claim document,
- stock audit document.

The original invoice image should remain associated with the purchase receipt.

---

## 44. Idempotency

The same invoice/event must never post stock twice.

This protects against:

- OCR retry,
- page refresh,
- repeated API requests,
- duplicate event delivery,
- integration retry.

Existing idempotency work should be retained and extended to all stock-posting workflows.

---

## 45. Transactional Integrity

Inventory posting must be transactionally safe.

The system must prevent states such as:

```text
Invoice created
but stock movement missing
```

or:

```text
Stock movement created
but source transaction rolled back
```

The exact cross-module consistency strategy must be resolved during architecture design.

---

## 46. Event Architecture

The existing ERP uses event-driven integration and module contracts.

This can remain useful, but physical stock truth must not depend on an unreliable asynchronous listener.

The technical design must explicitly define:

- synchronous inventory mutations,
- asynchronous integration events,
- retry behavior,
- idempotency,
- event ownership,
- failure recovery.

---

## 47. RBAC

At minimum, permissions should distinguish:

### Staff
- view stock,
- search parts,
- scan QR,
- create receiving drafts,
- perform permitted transactions.

### Inventory Manager
- approve receipts,
- approve adjustments,
- perform stock audits,
- approve temporary parts,
- access appropriate cost data.

### Admin
- manage master data,
- perform controlled imports,
- configure inventory,
- manage permissions,
- perform authorized corrections.

Purchase cost, landing cost, margin, and reimbursement data should be permission-controlled.

---

## 48. Required Screens

The final module should provide, as applicable:

1. Inventory Dashboard
2. Spare Part Master
3. Part Code History
4. Part Compatibility
5. Price List Management
6. Purchase Receipt
7. Invoice OCR Upload
8. OCR Review
9. Goods Receipt Verification
10. Stock
11. Serialized Stock
12. Batch Stock
13. Stock Movements
14. QR/Barcode Generator
15. QR Scan / Part Lookup
16. Stock Audit
17. Stock Reconciliation
18. Adjustments
19. Transfers
20. Temporary Part Approval
21. Purchase History
22. Cost/Valuation
23. Warranty-linked Inventory
24. Reports

Prioritization should occur during product/UX design.

---

## 49. Reporting

Required reporting should include:

- current stock,
- physical vs system stock,
- stock valuation,
- purchase history,
- movement history,
- service consumption,
- direct sales consumption,
- warranty consumption,
- pending warranty reimbursement,
- adjustment history,
- dead stock,
- slow-moving stock,
- fast-moving stock,
- stock ageing,
- price history,
- part-code history,
- serialized-part history,
- location-wise stock,
- part-wise stock,
- vehicle compatibility,
- purchase cost vs selling price/margin.

---

## 50. Non-Functional Requirements

The module must be:

- auditable,
- transactionally safe,
- idempotent,
- permission-aware,
- testable,
- migration-safe,
- resilient to duplicate events,
- resilient to OCR mistakes,
- scalable,
- historically accurate,
- suitable for physical stock reconciliation.

---

## 51. Critical Business Invariants

These must become automated tests:

1. Every stock increase has a valid source.
2. Every stock decrease has a valid source.
3. Historical transactions do not change when master data changes.
4. Price-list values do not overwrite invoice-billed values.
5. Company code changes do not create unnecessary duplicate logical parts.
6. Historical company codes remain queryable.
7. Active serialized parts cannot share duplicate serial identity.
8. The same invoice cannot be posted twice.
9. Physical adjustments are auditable.
10. Warranty replacement preserves old/new identity.
11. Sales/service consumption creates traceable movement.
12. Vehicle inventory remains a separate domain.

---

## 52. Acceptance Criteria

The core module should not be considered complete until it can demonstrate:

- paper invoice capture,
- OCR draft creation,
- human OCR correction,
- actual billed price preservation,
- receipt posting,
- exactly-once stock increase,
- label generation,
- QR lookup,
- historical code lookup,
- price-list version lookup,
- many-to-many vehicle compatibility,
- direct sale stock reduction,
- service consumption stock reduction,
- warranty inward/outward traceability,
- serialized replacement traceability,
- free warranty/OEM reimbursement separation,
- physical stock counting,
- variance approval,
- ledger-based adjustment,
- historical migration,
- duplicate prevention,
- permission-controlled costs,
- complete movement history.

---

## 53. Migration Strategy

```text
Extract
  ↓
Normalize
  ↓
Match
  ↓
Validate
  ↓
Human Review
  ↓
Import Historical Transactions
  ↓
Physical Stock Count
  ↓
Reconcile
  ↓
Approve Adjustments
  ↓
Freeze Baseline
```

---

## 54. Engineering Lifecycle

The project should now follow:

```text
1. Requirements Gathering
        ↓
2. Requirements Validation
        ↓
3. Domain / Data Design
        ↓
4. Technical Architecture
        ↓
5. API / Contract Specification
        ↓
6. UX / UI Specification
        ↓
7. Database Migration Design
        ↓
8. Implementation
        ↓
9. Unit / Integration Testing
        ↓
10. Migration Testing
        ↓
11. Physical Stock Reconciliation
        ↓
12. User Acceptance Testing
        ↓
13. Deployment
        ↓
14. Production Reconciliation
        ↓
15. Continuous Hardening
```

---

## 55. Requirements Phase Completion

Requirements Gathering is considered complete for the current business understanding.

The following have been established:

- spare/vehicle separation,
- physical receiving,
- invoice OCR,
- invoice verification,
- actual billed price,
- price-list versioning,
- part-code history,
- logical part identity,
- code-change vs supersession,
- vehicle compatibility,
- batch tracking,
- serial tracking,
- QR tagging,
- direct sales,
- service consumption,
- warranty replacement,
- warranty reimbursement,
- stock ledger,
- physical audit,
- opening balance,
- historical migration,
- costing,
- audit trail,
- idempotency,
- transactional safety,
- RBAC,
- reporting,
- integration boundaries.

---

## 56. Open Technical Decisions

These are design decisions for the next phase, not missing business requirements:

1. Canonical Part Master schema.
2. Company-code history schema.
3. Price-list schema/versioning.
4. Batch model.
5. Serialized-part state machine.
6. Location hierarchy.
7. Costing/valuation methodology.
8. Landing-cost allocation.
9. Reservation model.
10. Adjustment approval workflow.
11. OCR technology/provider.
12. OCR confidence/review implementation.
13. QR payload format.
14. Label design and printing mechanism.
15. Synchronous/asynchronous inventory posting boundaries.
16. Event consistency strategy.
17. API contracts.
18. Import format and validation rules.
19. Historical migration mappings.
20. RBAC matrix.
21. Reporting specification.
22. Retention/archival strategy.

---

## 57. NEXT PHASE

The next phase is **NOT immediate implementation**.

The next engineering deliverable is:

# SPARE PARTS INVENTORY — DOMAIN & TECHNICAL DESIGN SPECIFICATION

It should map every requirement in this document against the existing ERP and classify each item as:

```text
KEEP
MODIFY
ADD
REMOVE
REFACTOR
INTEGRATE
```

It should then produce:

```text
Requirements
    ↓
Domain Entities
    ↓
Relationships
    ↓
State Machines
    ↓
Business Rules
    ↓
Database Model
    ↓
API Contracts
    ↓
Integration Contracts
    ↓
UI Specification
    ↓
Migration Plan
    ↓
Implementation Plan
```

Only after this technical design is reviewed and approved should database migrations and implementation begin.

---

## 58. Baseline Rule

From this point forward:

> **This document is the business-requirements baseline.**

Any future implementation that contradicts these requirements must be treated as a deliberate design change and documented accordingly rather than silently changing the business behavior.
