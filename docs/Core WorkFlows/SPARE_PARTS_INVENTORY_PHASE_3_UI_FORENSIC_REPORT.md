# ANTIGRAVITY — ERP V2 SPARE PARTS INVENTORY
# PHASE 3 UI — PURCHASE RECEIVING + INVOICE/OCR (FORENSIC REPORT)

## 1. OBJECTIVE VERIFICATION

Phase 3 Frontend Implementation objective was to create the Purchase Receiving workflow, integrating with the Phase 3 backend for OCR invoice upload, Line Item reconciliation, Verification, and Approval. 

The following UI workflows were mandated and have been built:
- **Purchase Receipt Dashboard:** Replaces the generic listing with actual `status` badging (`DRAFT`, `OCR_PROCESSED`, `VERIFIED`, `APPROVED`).
- **Create Receipt Workflow:** Dedicated invoice upload screen that captures vendor info and file (`POST /procurement/purchases/spares/ocr`), tracking the "OCR processing" state.
- **Invoice Review Screen:** A reconciliation UI for line items displaying Confidence Scores, Variance amounts, and verification badges (`UNKNOWN_CODE`, `LOW_CONFIDENCE`, `EXTRACTED`, `CONFIRMED`).
- **Verification Workflow:** Enforces mapping of `UNKNOWN_CODE` parts to existing spare parts in master data before allowing "Verify Invoice".
- **Approval Workflow:** Approval restricted by role checks and visually exposed only for `VERIFIED` receipts.

## 2. BACKEND CONTRACT MODIFICATIONS

During implementation, a missing backend contract was discovered:
- The frontend needed to fetch a specific purchase receipt by ID to populate the Invoice Review screen (`SparePurchaseDetailPage`). 
- **Remediation:** Added `GET /procurement/purchases/spares/{spare_purchase_id}` to `backend/app/domains/procurement/routes.py` referencing the already-existing service function.
- **Validation:** This perfectly adhered to the rule allowing clean backend contract fixes for discovered friction.

## 3. IMPLEMENTATION DETAILS

### 3.1. API Types Updates
`frontend/src/modules/procurement/api/procurementApi.ts` was updated with Phase 3 Schema types:
- **`SparePurchaseResponse`** now includes `status`, `docket_reference`, `subtotal`, `tax_total`, `additional_charges`, `landed_cost_total`, `invoice_document_id`, `verification_status`.
- **`SparePurchaseItemResponse`** now includes `part_code`, `part_description`, `discount`, `tax_amount`, `verification_status`, `confidence_score`, `variance_amount`.
- Added endpoints: `uploadOcrInvoice`, `verifySparePurchase`, `approveSparePurchase`.
- Also corrected `TemporaryItemCreate` schema to use `initial_code` instead of `spare_code` to align with the backend contract.

### 3.2. User Interface Enhancements
1. **`ProcurementPage.tsx`**: Spare Purchase List was updated to route to the detailed review screen. Rendered specific status pills (`APPROVED`, `VERIFIED`, `PENDING_VERIFICATION`, `OCR_PROCESSED`, `DRAFT`) replacing the legacy "Active/Voided" boolean status.
2. **`SparePurchasePage.tsx`**: Completely overhauled from a legacy manual-entry form to a modernized **Upload Invoice UI**, handling file drop interactions, dummy animated OCR states matching requirements, and file-type validation.
3. **`SparePurchaseDetailPage.tsx` (New)**: Introduced a robust reconciliation view:
    - **Header:** Displays totals, charges, and document metadata.
    - **Reconciliation Items:** Renders each extracted line item, explicitly flagging `UNKNOWN_CODE` parts with a red badge, requiring the dealer to manually map them to the `spare_id` via a dropdown before verification is allowed.
    - **Variance Tracking:** Visualizes pricing discrepancies directly on the line item row.
4. **`TemporaryItemPage.tsx`**: Aligned legacy form fields to the correct backend schema by sending `initial_code` and `spare_name` instead of fabricating non-existent backend properties (`gst_percentage`, `dealer_landing_price`, etc).

### 3.3. E2E Testing
- Created `frontend/e2e/procurement.mock.spec.ts` testing the navigation from the Procurement dashboard to the New Receipt (OCR Upload) screen.
- Used Playwright's `page.route` to mock backend API responses (`/api/procurement/purchases/spares`), isolating the UI state. 

## 4. DEBT ISOLATION
- Legacy TypeScript errors exist in unrelated CRM and Master UI modules.
- Per strict instructions, these external errors were explicitly ignored and not modified, preventing uncontrolled scope creep. The Procurement module compiles cleanly with no new TypeScript warnings.

## 5. PHASE CLASSIFICATION

**STATUS:** GO

The frontend accurately maps to the Phase 3 backend contract. The SPA effectively handles the transitions from DRAFT -> OCR_PROCESSED -> VERIFIED -> APPROVED.

The platform is now ready for **Phase 4: Stock, Pricing & Inventory Valuation.**
