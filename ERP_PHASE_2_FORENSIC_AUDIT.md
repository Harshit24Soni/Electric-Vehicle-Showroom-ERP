# ERP Phase 2 Deep Forensic System Investigation

**Audit date:** 2026-09-27  
**Scope:** Current working-tree snapshot of `Electric-Vehicle-Showroom-ERP`  
**Mode:** Read-only code and metadata investigation. No application code, migrations, dependencies, or database records were changed for this audit.  
**Confidence labels:** **Verified** means directly observed in source, current SQLAlchemy metadata, or OpenAPI. **Runtime evidence** means a live check already performed in this session. **Unknown** means repository evidence cannot determine the answer.

## # Executive Summary

This is a React/TypeScript + FastAPI modular monolith for a single EV showroom or a dealer hierarchy. It is not yet a coherent, end-to-end ERP despite having broad domain names and many forms. The current snapshot registers **180 HTTP operations across 129 paths**, maps **57 SQLAlchemy tables** to a single flattened Alembic revision, has **17 frontend feature modules**, and contains **no discoverable unit, integration, or browser test files**.

The most consequential code-level findings are:

1. **Cross-domain event side effects do not run.** `main.py` registers event listeners but never starts the in-memory event bus. Several registered handlers require a database argument although the bus calls handlers with only the event. Inventory listeners instead use a placeholder session generator that yields `None`. As written, sale-to-vehicle status changes, purchase/service stock movements, CRM conversion-on-sale, billing invoice creation, and finance ledger creation are not reliably persisted. Exceptions from event handlers are swallowed by `gather(..., return_exceptions=True)`.
2. **Two competing sale/billing workflows exist.** `/sales/` creates a pending sale and document flags are changed through separate endpoints; `/sales/billing` creates an invoiced sale and separate `SaleDocument`/`SalePayment` records; `/billing/invoice` creates a different `SalesInvoice`, but only after a sale is marked delivered. The accounting report reads only `SalesInvoice`. The UI has a non-routed Billing page that hardcodes an empty invoice list.
3. **Lead creation is forced to reference a model in four layers.** The form requires a model, the frontend `LeadCreate` type requires its ID, Pydantic requires it, and `lead.vehicle_model_id` is a non-null FK. This is an implementation and database constraint, not evidence of an approved business rule. There is no variant entity.
4. **There are significant model and workflow duplicates.** Two insurance-company tables exist; payment data can be represented by `payment_receipt` or `sale_payment`; invoices can be represented by `sale_document`, sale-level fields/flags, and `sales_invoice`; lead data duplicates some customer fields; vehicle status is stored on `vehicle` and also implied by inventory movements; and lead follow-ups have multiple representations.
5. **The most visible operational screens are not all reachable.** Billing, finance, insurance, reports, warranty, and admin pages exist as files but are not routed in `App.tsx`. The `admin/dealers` path redirects to an unregistered `/admin/staff` path. Several client contracts also disagree with their backend route (lead assignment payload, test-ride GET, status filter names, sale status filter).
6. **Reporting has an implementation-level session mismatch.** CSV report functions use synchronous `db.query()` with the async `get_db()` dependency, which yields `AsyncSession`. These endpoints are not compatible as written. Dashboard reporting uses async SQLAlchemy, but the dashboard stats route is inside a role-gated router and will reject `STAFF`, while the visible Dashboard page is open to all three roles.
7. **The UI is not just visually plain.** It has a minimal Tailwind component layer, but weak information architecture and unfinished flows are the larger problem: missing route exposure, repeated modules, sparse interaction states, large all-record tables, inconsistent client state, and unclear progression between CRM, Sale, Billing, Insurance, Service, and Warranty.

**What is demonstrably working:** FastAPI imports and constructs the app under `backend/venv`; current OpenAPI can be generated; all 57 current model tables have matching names in the one current migration; and an earlier DB-backed PIN login smoke check in this session returned HTTP 200. That is not proof that sales, inventory, billing, reports, service, or warranty flows work. PostgreSQL was reachable in the earlier session; a conclusive Redis PING and deployed-schema/migration comparison are not available in this audit.

**Recommendation:** Retain the modular monolith and the current stack. Before adding more features, define a single authoritative sale, payment, invoice, and stock lifecycle, then prove one vertical slice from vehicle intake through sale and delivery using the actual database transaction. Do not introduce microservices, AI automation, or a broad rewrite yet.

## # 1. Actual System Inventory

### Technology and runtime

| Area | Current evidence | Assessment |
|---|---|---|
| API | FastAPI `0.128.0` | App imports; 180 registered operations. |
| ORM/database | SQLAlchemy `2.0.46`, async sessions, PostgreSQL/asyncpg | Core request dependency is async. Some report functions are synchronous and incompatible. |
| Schema/migrations | Pydantic `2.12.5`, Alembic migration directory | One current root revision creates 57 tables. `alembic` is not listed in the decoded `requirements.txt`. |
| Auth/security | JWT bearer, Argon2 PIN hashing, TOTP helpers, Redis rate limiter | Auth flow exists; OTP delivery is a development stub, rate limit fails open. |
| Frontend | React `18.2`, TypeScript `5.2` range, Vite `7.3` range, React Router `6.20`, TanStack Query `5`, Zustand `4` | Static page imports; no route-level lazy loading. |
| Runtime services | Local PostgreSQL config, optional/used Redis rate limit | Previous DB-backed auth check passed; Redis health is not confirmed here. |
| Frontend packages | `frontend/package.json` and lockfile; `node_modules` exists | No build/lint was run because this is a read-only investigation. |
| Python environment | `backend/venv` exists | Libraries were present in the session; requirements file is UTF-16 LE and does not list Alembic, so fresh-install reproducibility is not demonstrated. |

The repository is in a **dirty worktree**. The current snapshot contains deleted tracked documentation, old domain sales/finance/billing files and migration revisions, plus untracked replacement `backend/app/modules/*`, `backend/analyze_coupling.py`, a flattened migration, and seed script. Findings describe the **current working tree**, not a clean commit or production deployment. No deleted or untracked user files were restored or overwritten.

### Frontend route/page inventory

`frontend/src/App.tsx` wires: `/login`, `/change-pin`, `/dashboard`, `/crm`, `/followups`, `/sales`, `/sales/:saleId`, `/inventory`, `/service`, `/procurement`, `/procurement/spares/new`, `/procurement/temporary-items`, `/master/customers`, `/master/vehicles`, `/master/models`, `/master/vendors`, `/admin/dealers` (redirect only), `/staff/profile`, `/setup`, and three `/print/sale/:saleId/{invoice,challan,schedule}` pages.

Page files present by module:

- Auth: `LoginPage`, `ChangePinPage`.
- Admin: `DealerManagementPage` (not routed); plus `SecuritySettings.tsx` is a component-level file, not a page.
- Dashboard: `DashboardPage`.
- CRM: `CrmPage`.
- Follow-up: `FollowupDashboardPage`.
- Sales: `SalesPage`, `SaleDetailPage`, `PrintInvoicePage`, `PrintChallanPage`, `PrintSchedulePage`.
- Inventory: `InventoryPage`.
- Service: `ServicePage`.
- Master: `CustomersPage`, `VehiclesPage`, `VehicleModelsPage`, `VendorsPage`.
- Procurement: `ProcurementPage`, `SparePurchasePage`, `TemporaryItemPage`.
- Billing: `BillingPage` (not routed).
- Finance: `FinancePage` (not routed).
- Insurance: `InsurancePage` (not routed).
- Reports: `ReportsPage` (not routed).
- Warranty: `WarrantyPage` (not routed).
- Staff: `StaffProfilePage`.
- Setup: `SetupPage`.

Relevant forms, modals, and components include: `LeadForm`, `LeadConversionModal`, `LeadDetailsModal`, `LeadFollowupModal`, `TestRideList`, `EnquiryList`, `FollowupDashboard`, `FollowUpList`, `SaleForm`, `NewSaleModal`, `PaymentModal`, `PostDeliveryChecklist`, `SalesProgressBar`, `VehicleIntakeModal`, `SparePurchasePage`, `TemporaryItemPage`, `JobCardForm`, `CustomerForm`, `CustomerDetailModal`, `NomineeList`, `VehicleForm`, `VehicleModelForm`, `VendorForm`, `InvoiceForm`, `PolicyForm`, `ClaimForm`, `StaffManager`, `Enable2FAModal`, `TempPinModal`, `PinResetRequests`, `DeleteConfirmModal`, `Skeleton`, and `SkeletonTable`.

Shared frontend state/API files: `src/lib/api.ts`; auth, CRM, and master Zustand stores; module API files for auth, billing, CRM (three clients), finance, follow-up, insurance, inventory, master (three clients), procurement, sales, service, setup, and warranty. This API surface is duplicated in places rather than owned by one contract per capability.

### Backend inventory

- Bootstrap/app: `backend/app/main.py`, `bootstrap.py`, `db/base.py`, `db/session.py`, `db/mixins.py`.
- Auth: `auth/routes.py`, `dependencies.py`, `roles.py`, `pin_utils.py`, `token_utils.py`, `totp_utils.py`.
- Core: `core/config.py`, `core/redis.py`, `core/event_bus.py`, `core/feature_toggles.py`.
- Domain routers: admin, CRM, follow-up, insurance, inventory, master, procurement, reports, service, setup, staff, warranty.
- New module routers/models/services: sales, billing, finance, inventory.
- Supporting utilities: CSV export in `shared/utils.py`; seed script in `backend/scripts/seed_data.py`; schema coupling scanner in `backend/analyze_coupling.py`.
- Repository abstraction: no distinct repository package is used by the inspected business paths; domain services issue ORM queries directly. `backend/app/repository/` exists in the workspace tree, but the registered workflows inspected here do not use it.
- Background tasks: no scheduler/worker is wired. The in-memory event bus is defined but not started by app lifespan.
- External integrations: no Salesforce client, webhook route, OAuth flow, outbound HTTP integration, or sync worker found in app/frontend source.

### Capability cross-reference

| Business capability | Frontend surface | API surface | Service/logic | Database | Status from code evidence |
|---|---|---|---|---|---|
| Login/PIN/TOTP | Login, change PIN, profile 2FA components | `/auth/*`, `/staff/me` | `auth/routes.py`; PIN/TOTP helpers | `staff`, `pin_reset_request` | Basic PIN login exists and prior smoke check passed; reset OTP transport is stubbed. |
| Lead/CRM | CRM page, lead form/detail/conversion/follow-up/test ride | `/crm/*` | `domains/crm/services.py` | lead, enquiry, activity, follow-up, assignment/status history, test ride | Lead CRUD exists; model mandatory; duplicate follow-up APIs/contracts. |
| Customer/master | Customer/nominee pages and forms | `/master/customers*` | `domains/master/services.py` | customer, nominee | CRUD exists; detailed vehicle/service/warranty summary is hardcoded zero/None. |
| Vehicle catalog | Brand/model forms and pages | `/setup/brands`, `/master/vehicle-models` | setup/master services | brand, vehicle_model, vehicle_price_history | No variant entity; model color is stored on model. |
| Vehicle intake/procurement | Procurement and intake modal | `/procurement/purchases/vehicles/intake` | procurement intake service + event intended | vehicle_purchase, vehicle_purchase_detail, vehicle | Vehicle rows are inserted; inventory movement relies on nonfunctional listener. |
| Vehicle/spare inventory | Inventory page, spare movement form | `/inventory/*`, `/master/vehicles` | module inventory plus old domain service wrapper | module_* stock movements, module_spare_master, vehicle | Two status/stock representations; event-derived writes are broken. |
| Sales/delivery | Sales page/detail, quick-sale and billing modals, print pages | `/sales/*` | `modules/sales/services.py` | sale, payments, documents, checklist, schedules, portal, stage history | Two create workflows; event side effects fail; delivery rules and status pathways disagree. |
| Billing/invoicing | Invoice form/page exists, not routed | `/billing/*`, `/sales/*/invoice` | billing and sales services/listener | sales_invoice, sale_document, sale flags | Competing invoice representations; Billing UI uses an empty local array. |
| Finance | Finance page exists, not routed | `/finance/*` | finance services/listener | vehicle_finance | Only vehicle finance records; separate ledger listener is nonfunctional. |
| Reports | Reports page exists, not routed; dashboard page | `/reports/*` | reports service | joins sales, billing, CRM, master, insurance, finance, service | CSV report path uses sync query on async session; dashboard role mismatch. |
| Service | Service page/job card form | `/service/*` | service services + event intended | job_card, spare_consumption, service_followup, service_schedule | Job-card shell only; no diagnosis/labor/billing; spare consumption not persisted by service call. |
| Warranty | Claim page/form exists, not routed | `/warranty/*` | warranty service + event intended | claim, inward/item, shipment/item | Swap sends zero IDs and claim FK requires an existing consumption row; no approval/resolution API. |
| Insurance | Insurance page/policy form exists, not routed | `/insurance/*`, `/setup/insurance-companies` | insurance service | two insurance company tables, policy, insurance_followup | Policy CRUD exists; duplicate company master; renewal/claim workflow incomplete. |
| Setup/staff | Setup and profile pages | `/setup/*`, `/admin/staff/*`, `/staff/me` | generic setup service and staff routes | reference/config tables, staff | Many endpoints; role checks differ; not all catalogs drive transactional flows. |

## # 2. Module Map

| Module | Owns | Reads/writes and dependencies | Exposed surface | Boundary finding |
|---|---|---|---|---|
| Master | Customer, nominee, staff, brand/model/vehicle/vendor and setup catalog models | CRM conversion writes customer/nominee; procurement inserts vehicle; sales reads customer/vehicle; reports reads vehicle | `/master/*`, `/setup/*`, staff/admin | It is a broad shared-data owner and receives writes from other domains. Setup and master model ownership overlap. |
| CRM | Lead, enquiry, test ride, activities, assignment and follow-up history | Reads vehicle model and writes Master customer/nominee at conversion; event listener also intends sale-driven conversion | `/crm/*` | Lead service owns customer-conversion logic; lead identity/status duplicated. |
| Follow-up | Unified view over lead/service/insurance follow-ups | Direct ORM reads of CRM, service-follow-up and insurance-follow-up tables | `/followups/dashboard` | Query façade across three modules; no writes or explicit contracts. Soft-deleted service/insurance rows are not filtered. |
| Inventory | Spare master, serials and vehicle/spare movement ledgers | Procurement, service and warranty depend on event handlers; old `domains/inventory` routes wrap module service | `/inventory/*` | Split between `domains/inventory` and `modules/inventory`; stock state is not one authority. |
| Procurement | Spare and vehicle purchase headers/details | Creates `master.Vehicle` directly; calls Inventory service for temporary spares; publishes stock events | `/procurement/*` | Purchasing mutates catalog-owned vehicle rows and expects broken async movement side effects. |
| Sales | Sale, payments, docs, stage, delivery checklist, service schedules, portal tracking | Reads CRM, Master, Procurement cost contract; publishes events for CRM/Master/Inventory/Billing/Finance | `/sales/*` | Highest cross-domain runtime coupling; two competing creation pathways. |
| Finance | VehicleFinance | Reads Sale in service; listener consumes sale event | `/finance/*` | Name suggests broader finance than schema provides; finance automation listener cannot receive db argument. |
| Billing | SalesInvoice and VehicleSubsidy | Reads Sale; listener consumes sale event; reports read invoice | `/billing/*` | Sale and Billing both generate invoice-like records; UI not mounted. |
| Service | JobCard and service spare consumption | Vehicle FK to Master; publishes stock-consumption event; warranty FK points to service consumption | `/service/*` | Domain currently lacks labor, diagnosis, pricing, customer ownership and actual stock transaction. |
| Warranty | Claims, inward receipt, shipment | Reads/writes Master Vehicle and emits Inventory events; Claim references ServiceSpareConsumption | `/warranty/*` | Swap implementation bypasses the required spare/serial identity contract. |
| Insurance | Insurance company and policy | Policy points at `domain_insurance_company`, vehicle; follow-up table used by unified dashboard | `/insurance/*` | Duplicate company master from Master/Setup; renewal/follow-up is not fully surfaced. |
| Reports | No owned transactional entity | Direct reads across Sales, Billing, Finance, CRM, Master, Insurance and Service | `/reports/*` | Cross-module read model is reasonable, but sync/async DB mismatch breaks three reports. |
| Admin/Staff | Staff accounts and PIN reset administration | Staff model lives in Master; reset/auth routes also mutate it | `/admin/staff/*`, `/staff/*`, `/auth/*` | Account lifecycle is split among Auth, Admin, Setup and Master. |

## # 3. API Map

### Registered surface and contract conventions

- OpenAPI generated from the actual `app.main:app`: **180 operations**, **129 paths**, zero duplicate OpenAPI operation IDs.
- Router paths are mounted at the root. `Settings.API_V1_STR` is `/api/v1` but is not used. Vite's development proxy strips `/api` and forwards to these root paths. This is a working dev convention, not a versioned public API.
- Most guarded routes use HTTP bearer security through `get_current_staff`; the API returns raw JSON arrays/objects, model-shaped responses, messages, or CSV. There is no universal response envelope.
- Nine operations have no OpenAPI bearer requirement: `GET /health`; `POST /auth/login-pin`; `POST /auth/forgot-pin`; `POST /auth/send-otp`; `POST /auth/reset-pin/dealer`; `POST /auth/pin/request-reset`; `POST /auth/pin/reset-self`; `GET /crm/master/lead-statuses`; `GET /crm/master/enquiry-statuses`. Public auth/reset routes are expected; CRM status endpoints are public by current code, with no stated need for public access.
- No external calls occur in the inspected API handlers. CSV export is local. Redis is used for rate limiting only.
- Only warranty claims accept explicit `skip`/`limit`. The majority of collection endpoints return unpaged arrays. CRM/master filters are limited; list sorting varies by service.

### Complete endpoint path inventory (180 operations)

The following path groups enumerate every operation registered in the current app. For CRUD patterns, each listed method is an individual operation; `id` placeholders are the resource identifiers shown in OpenAPI.

**Health (1)**
- `GET /health` -> health status object; no DB access.

**Auth (13)**
- `POST /auth/login-pin` (`PinLoginRequest` -> access-token object).
- `POST /auth/forgot-pin` (`ForgotPinRequest` -> action/message object).
- `POST /auth/change-pin` (`PinChangeRequest` -> message).
- `POST /auth/reset-pin` (`AdminPinResetRequest` -> temporary PIN/message; Admin/Dealer role dependency).
- `POST /auth/totp/setup` (no body -> `TOTPSetupResponse`).
- `POST /auth/totp/verify` (`TOTPVerifyRequest` -> message).
- `POST /auth/send-otp` (`ForgotPinRequest` -> message).
- `POST /auth/reset-pin/dealer` (`DealerPinResetRequest` -> message).
- `POST /auth/pin/request-reset` (`PinResetRequestCreate` -> message).
- `GET /auth/pin/reset-requests` (request list; Admin/Dealer).
- `POST /auth/pin/approve-reset/{request_id}` (no body -> temp PIN object; Admin/Dealer).
- `POST /auth/pin/deny-reset/{request_id}` (no body -> message; Admin/Dealer).
- `POST /auth/pin/reset-self` (`SelfPinResetRequest` -> message).

**Admin and staff (8)**
- `POST /admin/staff` (`StaffCreate` -> untyped staff/temp-PIN object); `GET /admin/staff` (`include_deleted` -> array); `GET /admin/staff/{staff_id}` (`StaffResponse`); `PUT /admin/staff/{staff_id}` (`StaffUpdate` -> `StaffResponse`); `DELETE /admin/staff/{staff_id}` (204); `POST /admin/staff/{staff_id}/restore` (`StaffResponse`). All are router-gated to Admin/Dealer, with dealer scoping in handler logic.
- `GET /staff/me` (`StaffResponse`); `PUT /staff/me` (`StaffUpdate` -> `StaffResponse`).

**Inventory (5)**
- `GET /inventory/spares` (`include_deleted` -> spare array).
- `POST /inventory/vehicle/movement` (`VehicleMovementCreate` -> `VehicleMovementResponse`).
- `GET /inventory/vehicle/{chassis_no}/availability` (availability object).
- `POST /inventory/spare/movement` (`SpareMovementCreate` -> `SpareMovementResponse`).
- `GET /inventory/spare/{spare_id}/stock` (`SpareStockResponse`).

**Billing (5)**
- `POST /billing/invoice` (`InvoiceCreate` -> `InvoiceResponse`); `GET /billing/invoices` (invoice array); `PUT /billing/invoice/{invoice_id}` (`InvoiceUpdate` -> message/revision object); `POST /billing/invoice/{invoice_id}/finalize` (message); `DELETE /billing/invoice/{invoice_id}` (204; optional `hard_delete`).

**Finance (4)**
- `GET /finance/` (array); `POST /finance/` (`FinanceCreate` -> `FinanceResponse`); `PUT /finance/{finance_id}/status` (`FinanceStatusUpdate` -> message); `DELETE /finance/{finance_id}` (204; optional `hard_delete`).

**Master (30)**
- Customer: `GET|POST /master/customers`; `GET|PUT|DELETE /master/customers/{customer_id}`; POST/GET `/master/customers/{customer_id}/nominees`; GET/PUT/DELETE `/master/customers/{customer_id}/nominees/{nominee_id}`. Request models are `CustomerCreate/Update`, `NomineeCreate/Update`; responses are customer, detailed customer, nominee or arrays; deletes return 204.
- Vehicle model: `GET|POST /master/vehicle-models`; `GET|PUT|DELETE /master/vehicle-models/{vehicle_model_id}`; `POST /master/vehicle-models/{vehicle_model_id}/restore`. Create/update use `VehicleModelCreate/Update`; GET/list use `VehicleModelResponse`/array; restore is a detail object.
- Vehicle: `GET|POST /master/vehicles`; `GET|DELETE /master/vehicles/{chassis_no}`. List accepts `status` and `vehicle_model_id`; vehicle create/response schemas apply.
- Vendor: `GET|POST /master/vendors`; `GET|PUT|DELETE /master/vendors/{vendor_id}`; `POST /master/vendors/{vendor_id}/restore`. `include_deleted` on list; create/update use `VendorCreate/Update`.
- Pricing: `POST /master/pricing/spares/{spare_id}` (`SparePriceUpdate` -> history response); `GET /master/pricing/spares/{spare_id}/history` (array); `POST /master/pricing/vehicles/{vehicle_model_id}` (`VehiclePriceUpdate` -> history response); `GET /master/pricing/vehicles/{vehicle_model_id}/history` (array). Write is Admin-only; history allows Admin/Dealer.

**Reports (5)**
- `GET /reports/sales-register` (`from_date`, `to_date` -> CSV); `GET /reports/sales-summary` (same filters -> `{items: [...]}`); `GET /reports/finance-register` (CSV); `GET /reports/dashboard-stats` (`DashboardStatsResponse`); `GET /reports/alerts` (`DashboardAlertsResponse`). Router requires Admin, Dealer, or Accounts; `Accounts` is not a valid `StaffDesignation`.

**Sales (18)**
- `GET|POST /sales/` (list array; `SaleCreate` -> `SaleResponse`); `POST /sales/billing` (`SaleCreatePayload` -> `SaleResponse`); `GET|DELETE /sales/{sale_id}` (detail response; delete 204); `POST /sales/receipts` (`ReceiptCreate` -> `ReceiptResponse`).
- `POST /sales/{sale_id}/invoice`; `POST /sales/{sale_id}/challan`; `POST /sales/{sale_id}/service-schedule`; `GET /sales/{sale_id}/delivery-status`; `POST /sales/{sale_id}/deliver` (optional remarks query); `PATCH /sales/{sale_id}/checklist` (`ChecklistUpdate` -> `ChecklistResponse`); `POST /sales/{sale_id}/stage` (`StageAdvanceRequest` -> `SaleResponse`); `POST /sales/{sale_id}/payments` (`SalePaymentCreate` -> `SalePaymentResponse`); `POST /sales/{sale_id}/documents` (`SaleDocumentCreate` -> `SaleDocumentResponse`); `GET|PATCH /sales/{sale_id}/portal` (portal model); `GET /sales/{sale_id}/progress` (`SaleProgressResponse`). All are bearer-authenticated; most writes rely on `get_db()` commit-on-success and do not define endpoint-level role checks.

**Service (5)**
- `POST /service/job-card` (`JobCardCreate` -> `JobCardResponse`); `POST /service/job-card/{job_card_id}/consume-spare` (`SpareConsumeCreate` -> message); `POST /service/job-card/{job_card_id}/close` (message); `GET /service/job-cards` (array); `DELETE /service/job-card/{job_card_id}` (204; optional `hard_delete`).

**CRM (26)**
- Status masters: `GET /crm/master/lead-statuses`; `GET /crm/master/enquiry-statuses` (both no bearer).
- Leads: `POST|GET /crm/leads`; `GET|PUT|DELETE /crm/leads/{lead_id}`; `POST /crm/leads/{lead_id}/convert`; `GET /crm/leads/{lead_id}/activities`; `POST /crm/leads/{lead_id}/assign`; `POST|GET /crm/leads/{lead_id}/followups`; `GET /crm/leads/dashboard/followups`; `POST /crm/leads/{lead_id}/test-rides`.
- Enquiries: `POST|GET /crm/enquiries`; `GET|PUT|DELETE /crm/enquiries/{enquiry_id}`; `GET /crm/enquiries/stats/summary`.
- Legacy/general follow-ups: `POST /crm/followups`; `PUT|DELETE /crm/followups/{followup_id}`; `GET /crm/followups/pending`; `GET /crm/followups/dashboard`.
- Activity: `POST /crm/activities`.
- Lead/enquiry create and update use schemas except `PUT /crm/enquiries/{enquiry_id}` and `POST /crm/activities`, which accept generic dictionaries. Several methods return untyped dictionaries or plain lists. CRM lists accept `status_id`/`owner_id`, not all frontend clients' `status_filter` key.

**Insurance (6)**
- `POST|GET /insurance/companies`; `DELETE /insurance/companies/{company_id}`; `POST|GET /insurance/policies`; `DELETE /insurance/policies/{policy_id}`. Create accepts company/policy schemas; list returns arrays. No renewal, insurance claim, or policy update endpoint.

**Warranty (6)**
- `POST|GET /warranty/claims`; `DELETE /warranty/claims/{claim_id}`; `POST /warranty/swap-component`; `POST /warranty/inwards`; `POST /warranty/shipments`. Claims GET accepts `skip` and `limit`; others have no list/filter endpoint. Writes mostly return model schemas; no claim approval, resolution, or shipment-receipt operation.

**Procurement (9)**
- `POST|GET /procurement/purchases/spares`; `POST /procurement/purchases/vehicles/intake`; `GET /procurement/purchases/vehicles`; `DELETE /procurement/purchases/spares/{spare_purchase_id}`; `DELETE /procurement/purchases/vehicles/{vehicle_purchase_id}`; `POST|GET /procurement/temporary-items`; `PUT /procurement/temporary-items/{spare_id}/approve`.
- Vehicle intake request is `VehicleIntakePayload`; spare purchase is `SparePurchaseCreate`; collections are unpaged arrays; Admin/Dealer guard is applied on creation/list/approval but delete relies on a current-staff dependency plus service logic.

**Unified Follow-ups (1)**
- `GET /followups/dashboard` -> `UnifiedFollowupDashboardResponse`; bearer required. It performs three cross-module reads.

**Setup (38)**
- For each of `brands`, `payment-modes`, `expense-categories`, `job-card-categories`, `insurance-companies`, `banks`, and `document-types`: `GET /setup/{resource}`, `POST /setup/{resource}`, `PUT /setup/{resource}/{id}`, `DELETE /setup/{resource}/{id}`, and `POST /setup/{resource}/{id}/restore` (35 operations total). POST/PUT use resource schemas; responses are untyped ORM-shaped values or message dictionaries; DELETE currently returns message objects, not 204.
- `GET /setup/staff-summary`; `GET|POST /setup/showroom-config` (38 total). Router-level Admin/Dealer role gate applies.

### API quality and behavior findings

- **Response inconsistency:** Pydantic response models, plain arrays, dicts, raw ORM output, empty 204, and CSV are mixed. Setup lacks response models on all operations; CRM has generic dictionaries; error shapes vary. No standard envelope.
- **Overlapping capabilities:** sale invoice generation vs billing invoice generation; sale receipt vs sale payment; `POST /crm/followups` vs `/crm/leads/{id}/followups` vs unified `/followups/dashboard`; insurance companies duplicated in Setup and Insurance; sale portal/checklist vs insurance policy data.
- **Too broad:** `POST /sales/billing` coordinates several domains and emits multiple effects; CRM lead conversion writes customer and nominee; setup CRUD uses one generic service across unrelated catalogs; reports is an all-domain read aggregator.
- **Too thin/incomplete:** warranty claim create does not progress through approval/resolution; insurance has no renewal/claim workflow; service has no diagnosis/labor/bill; `GET /crm/leads/{id}/test-rides` is called by frontend but is not registered.
- **Frontend contract mismatches:** `leadsApi.assign()` sends a JSON body but the backend expects `new_owner_id` as a query parameter; `leadsApi.getTestRides()` calls an absent GET endpoint; lead/enquiry list clients send `status_filter` while backend expects `status_id`; Sales UI sends a `status` query for list filtering, but the backend list route has no `status` parameter. The old `crmApi` does assignment as a query and is a second contract for the same resource. `SalesPage` expects `sale.customer`, `sale.vehicle`, `sale.receipts`, and `sale.challan_number`, but `SaleResponse` does not include nested customer/vehicle/receipt fields and names the challan field `delivery_challan_number`; the list can render blank names/models and an incorrect document count. `LeadForm` reads `model.brand`, while the master list service emits `brand_name`, so the model label's brand segment is undefined.
- **Potential redirect:** client calls `/sales` while registered path is `/sales/`; this relies on FastAPI's slash redirect behavior, including for requests with bodies.
- **Transactions and errors:** `get_db` commits after successful request and rolls back on raised exceptions. Many services only flush and depend on this. Other services commit internally. Some endpoints catch broad `Exception` and convert it to HTTP 400, masking unexpected failures. Hard-delete role checks compare title-case role strings against uppercase stored designations and reject valid Admin/Dealer requests.
- **Pagination/filter/sort:** Warranty claims is the only explicit offset/limit route. CRM filters are narrow; a fixed internal customer limit is not configurable through the route. Sales, staff, procurement, insurance, service, setup and most master lists are unpaged. Sort defaults differ and are not represented as a consistent API contract.
- **External calls:** None in API source. No Salesforce integration, email/SMS provider, payment gateway, OEM API, RTO/insurance portal client, or webhook.

## # 4. Database Map

### Migration coverage and global columns

`backend/alembic/versions/191eb4aa4173_initial_flattened_migration.py` is the only migration file in the current tree. It is a root revision (`down_revision=None`) and creates all **57** table names in current `Base.metadata`; an offline table-name comparison found no missing or extra names. This compares names only, not deployed database columns, indexes, defaults, constraints, or migration version.

`AuditMixin` adds `created_at` (non-null), `updated_at` (nullable), `created_by`, and `updated_by` FK references to staff. `SoftDeleteMixin` adds `is_deleted` (non-null default false), `deleted_at`, `deleted_by`, `restored_at`, and `restored_by`. Many tables inherit both; reference/master tables and price histories do not all use both. This mixin pattern is not a global query filter; every service must explicitly filter deleted rows.

### Complete current table inventory

The key shown is the primary key; references name actual SQLAlchemy FKs, not soft links. Most transactional entities also carry the mixin fields described above.

| Table | Primary key | Business purpose and principal references |
|---|---|---|
| `staff` | `staff_id` | Employee/login identity, PIN/TOTP, role/designation, dealer ownership; self/audit references. Unique email, mobile, Aadhaar, PAN, UPI. |
| `pin_reset_request` | `id` | Staff PIN reset workflow; FK to staff and processor. |
| `customer` | `customer_id` | Customer/KYC/contact; unique phone, Aadhaar, PAN, GSTIN; lead reference is not an FK. |
| `nominee` | `nominee_id` | Customer nominee; customer FK with CASCADE. |
| `brand` | `brand_id` | Catalog brand; unique name. |
| `vehicle_model` | `vehicle_model_id` | Catalog model/colour/material; brand FK; material number unique; no variant table. |
| `vehicle` | `chassis_no` | Physical EV, serials and `current_status`; model FK. No customer/sale FK. |
| `vendor` | `vendor_id` | Supplier identity and address; no unique name/GSTIN constraint. |
| `vehicle_price_history` | `history_id` | Model price with effective dates; FK to vehicle model. |
| `spare_price_history` | `history_id` | Spare price/margin history; `spare_id` is a soft reference to Inventory. |
| `payment_mode` | `payment_mode_id` | Setup list of payment modes; unique mode name. |
| `expense_category` | `expense_category_id` | Setup list only; no expense transaction model. |
| `job_card_category` | `job_card_category_id` | Setup list of service categories; no direct category FK from job card. |
| `insurance_company` | `insurance_company_id` | Master/Setup insurance-company record. Separate from policy's company table. |
| `bank` | `bank_id` | Setup bank reference, IFSC, contact. |
| `document_type` | `document_type_id` | Setup document-type catalog; no generalized document table uses it in observed workflows. |
| `showroom_config` | `config_id` | Dealership/legal/GST/contact/bank details; intended for local documents. |
| `lead_status_master` | `status_id` | Lead status catalog; unique status name. |
| `enquiry_status_master` | `status_id` | Enquiry status catalog; unique status name. |
| `lead` | `lead_id` | CRM prospect/contact and required model; FK to model/status/staff; nullable customer reference and sale reference are not FKs. |
| `enquiry` | `enquiry_id` | Lead enquiry; FK to lead/status/owner/creator; lead delete CASCADE. |
| `lead_activity` | `activity_id` | Lead interaction log; FK to lead, cascades. |
| `followup_schedule` | `followup_id` | Older lead scheduled follow-up; FK to lead, cascades. |
| `lead_followup` | `lead_followup_id` | Newer lead follow-up history/outcome; FK to lead and staff, lead cascades. |
| `lead_assignment_history` | `assignment_id` | Lead owner changes; FK to lead and old/new/changing staff. |
| `lead_status_history` | `status_history_id` | Lead status history; FK to lead and staff. Update services do not consistently write it. |
| `test_ride` | `test_ride_id` | Lead/model/chassis/test ride; FKs to lead, model, vehicle, staff. |
| `spare_purchase` | `spare_purchase_id` | Spare purchase header/vendor invoice; vendor FK. |
| `spare_purchase_item` | `purchase_item_id` | Spare purchase lines/quantity/cost; FK to purchase header; spare ID is not a declared FK. |
| `vehicle_purchase` | `vehicle_purchase_id` | OEM vehicle purchase/invoice header; vendor FK. |
| `vehicle_purchase_detail` | `vehicle_purchase_detail_id` | Purchased chassis/cost; FK to purchase and vehicle. |
| `module_spare_master` | `spare_id` | Inventory spare master, temporary/verified/serialized status. |
| `module_spare_serial` | `serial_id` | Serialized spare inventory; FK to spare, restrict on delete; serial index. |
| `module_spare_stock_movement` | `movement_id` | Spare quantity ledger; FK to spare and optional serial, movements indexed by spare/date. |
| `module_vehicle_stock_movement` | `movement_id` | Vehicle location/status movement log; chassis/reference are not FKs; indexed by chassis/type/date. |
| `sale` | `sale_id` | Sale/booking; unique nullable lead, chassis, invoice number, challan number; customer/chassis/creator are soft links, not FKs. |
| `payment_receipt` | `receipt_id` | Legacy sale receipt; sale FK. |
| `sale_payment` | `sale_payment_id` | Typed sale payment ledger; sale FK with cascade. |
| `sale_document` | `sale_document_id` | Generated sale documents; sale FK cascade, unique document number. |
| `sales_invoice` | `invoice_id` | Accounting invoice; unique `sale_id` and invoice number, but sale ID has no FK. |
| `delivery_checklist` | `checklist_id` | One checklist per sale; unique sale FK. |
| `service_schedule` | `schedule_id` | Planned free/paid service after sale; sale FK. |
| `sale_stage_history` | `stage_history_id` | Sale stage audit; sale FK cascade. |
| `sale_portal_tracking` | `portal_tracking_id` | Sale insurance/subsidy/RTO/CELEX/plate progress; one per sale, sale FK cascade; registration unique. |
| `vehicle_finance` | `finance_id` | Vehicle loan tracking; unique sale ID but no sale FK. |
| `vehicle_subsidy` | `subsidy_id` | Subsidy status/doc flag; unique invoice FK, cascade. |
| `job_card` | `job_card_id` | Service visit; chassis FK to vehicle with RESTRICT. |
| `spare_consumption` | `consumption_id` | Service spare issue record; job FK cascade; spare/serial IDs are soft references. |
| `service_followup` | `service_followup_id` | Service reminder; job FK cascade. |
| `domain_insurance_company` | `insurance_company_id` | Insurance domain company master; separate from `insurance_company`. |
| `policy` | `policy_id` | Policy attached to chassis and insurance company; FKs to vehicle and domain company; `vehicle_sale_id` is not an FK; unique policy number; end date check/index. |
| `insurance_followup` | `insurance_followup_id` | Policy renewal reminder; policy FK cascade. |
| `claim` | `claim_id` | Warranty claim against service spare consumption; FK CASCADE, unique SO number, status index. |
| `inward` | `warranty_inward_id` | OEM warranty parts return header; unique OEM invoice. |
| `inward_item` | `inward_item_id` | Inward spare/quantity; FK to inward; spare ID soft reference. |
| `shipment` | `shipment_id` | Warranty shipment header; unique docket. |
| `shipment_item` | `shipment_item_id` | Shipment claim line; shipment/claim FKs cascade; claim unique. |

**Count: 57 tables.** There is no `variant`, `employee`, `booking`, `delivery`, `invoice_line`, `general_ledger`, `expense`, or insurance-claim table in the current metadata. Staff is the employee/account entity; a sale row and stage are used for booking-like work; delivery is several sale flags/checklist/portal fields plus movement events rather than a delivery entity.

### Constraints, nullable fields, indexes, cascades

- Most primary keys are non-null. `vehicle.chassis_no` is a string primary key; the rest are numeric IDs.
- Key nullable fields include customer identity/address, lead email/customer/date/status extensions, sale lead/doc refs, optional serials, policy premium, optional audit fields and lifecycle dates. `Lead.vehicle_model_id`, sale customer/chassis, job-card chassis, claim `job_spare_id`, and policy company/chassis are non-null.
- Important uniques: Staff email/mobile/identity/UPI; Customer phone/Aadhaar/PAN/GSTIN; Brand name; model material number; PaymentMode name; both insurance company names within their separate tables; Sale lead/chassis/invoice/challan; SaleDocument document number; SalesInvoice sale ID/invoice number; Policy number; shipment docket; claim SO number; one checklist and portal row per sale; one finance/invoice/subsidy per sale/invoice; one claim per shipment line.
- Important declared indexes: staff active/lock, customer created, model created (the index name says material but is over `created_at`), selected setup `is_active` fields, nominee customer, CRM enquiry/follow-up dates, spare serial/movement columns, vehicle movement chassis/type/date, sale customer/lead, sales invoice sale ID, service spare IDs, vehicle finance sale ID, insurance policy expiry, warranty claim status. The lead table has no explicit indexes for its status/owner/date filters in current metadata.
- Actual ORM `ondelete` behavior includes CASCADE for nominee->customer; lead children->lead; sale children such as document/payment/stage/portal; job-child records; inward/shipment children; claim shipment item. Inventory serial/spare references use RESTRICT. Many entity links are deliberately soft/no-FK, so the database cannot enforce they point to a valid customer, lead, sale, employee, or chassis.
- Soft-delete is implemented manually. Unique constraints generally remain across soft-deleted rows, which can block re-creation. Cascade behavior on database deletes is not equivalent to a soft delete; soft-deleting a parent does not automatically soft-delete its children.

## # 5. Entity Map

### Actual relationship graph

```text
Staff (login, ownership, audit)
  |-- owns/creates --> Lead, Enquiry, Followup, Sale, JobCard, Claim, setup records
  |-- assigns ------> Lead (owner, creator, assignment history)

Brand -> VehicleModel -> Vehicle (chassis, serials, current status)
                         |              |-- Service JobCard -> SpareConsumption -> Warranty Claim
                         |              |-- VehiclePurchaseDetail
                         |              |-- Insurance Policy -> InsuranceFollowup
                         |              `-- Sale (soft link by chassis; no DB FK)
                         `-- Lead/TestRide (model FK)

Lead -> Enquiry / activity / lead followups / test rides (children)
  |-- optional customer_id (no DB FK)
  |-- conversion service creates Customer + Nominee and writes lead.customer_id
  `-- Sale references lead_id (soft link; unique, no DB FK)

Vendor -> VehiclePurchase -> VehiclePurchaseDetail -> Vehicle
       `-> SparePurchase -> SparePurchaseItem -> Spare master (spare id is not FK)

Sale -> checklist, service schedule, stage history, sale payments, sale documents,
        receipts, portal tracking (some relationships/FKs; invoice/finance not all FK-linked)
        `-> SalesInvoice (unique soft-linked sale_id; reports use this)

Inventory -> movement ledgers (separate from `vehicle.current_status` and service records)
Insurance -> domain_insurance_company -> Policy -> renewal follow-up
Master/Setup -> separate insurance_company table (not the policy FK target)
```

The arrows are not all enforced relationships. Some are ORM relationships, some foreign keys, and some are comments/ID conventions only. The most critical weak links are Sale->Customer/Vehicle/Lead, Finance->Sale, Billing Invoice->Sale, Policy->Sale, Inventory movement->Vehicle, service spare->Inventory spare, and Lead->Customer/Sale.

## # 6. Source of Truth Map

| Entity/capability | Current source of truth | Duplicates/references | Correctness and problem |
|---|---|---|---|
| Customer | `customer` in Master | Name/phone/email also live in `lead`; Sale carries only customer ID, without FK. | Keeping a lead contact snapshot is reasonable pre-conversion; conversion can create a separate customer. There is no duplicate-match/merge workflow, and lead edits do not sync to a converted customer. |
| Vehicle | `vehicle` by chassis | `module_vehicle_stock_movement`; Sale/Policy/Service store chassis; master listener attempts to set `customer_id` on Vehicle though no such mapped column exists. | Catalog row should identify unit; status vs movement ledger creates two authorities. The listener's unmapped assignment cannot persist customer ownership. |
| Vehicle Model | `vehicle_model` | Lead/TestRide/Purchase refer to model. `colour` is on model and vehicle intake schema also accepts a color. | One catalog record models one color; no Variant entity. Need product decision if trim/color are product variants. |
| Variant | None | Colour and model specs appear on model and intake payload. | Not a duplicate entity; it is absent. Whether a distinct variant is required is UNKNOWN. |
| Vendor | `vendor` | Purchase records reference vendor. | Single current vendor master. No duplicate vendor table found; no global unique tax/business identifier constraint. |
| Spare | `module_spare_master` | `spare_price_history` and purchase/service/warranty IDs; service and warranty do not FK to spare master. | Inventory owns its own spare master, but price and transaction references are split. Cross-reference integrity is weak. |
| Employee | `staff` | Owner/creator/processor fields in modules. | There is no separate employee entity; Staff combines login, designation, employment, dealer and personal/bank details. Appropriate only if HR scope remains minimal. |
| Lead | `lead` | Contact values overlap customer; status duplicated by `lead_status_id` and string `lead_status`; customer/sale IDs are soft links. | CRM source of truth, but dual status fields can drift. `LeadStatusHistory` exists but ordinary updates do not reliably append history. |
| Booking | No booking table | `sale` with `sale_status`/`sale_stage`, payment rows and lead relation. | Sale lifecycle doubles as booking and retail sale; cancellation/rebooking and deposits are not cleanly modeled. |
| Purchase | `vehicle_purchase`/`spare_purchase` | `include_in_accounting` flags; movement events; supplier invoices. | Purchase records exist but posting/payment/AP accounting is not represented. Spare purchase inventory changes depend on broken event. |
| Sale | `sale` | CRM lead, customer, vehicle, invoice and finance are mostly soft links. | Sale is source for lifecycle but there are two creation paths and multiple status/document representations. |
| Payment | `payment_receipt` and `sale_payment` | `sale.is_receipt_generated`, `pay_receipt_number`, initial payment in billing transaction. | Duplicate representation without reconciliation rules, totals, reversal/refund, idempotency, or one canonical receipt. |
| Invoice | `sales_invoice`, `sale_document`, sale fields/flags | Billing page contract, sales generated invoice path, event listener all separate. | Not a single source. Sales register reads only finalized `sales_invoice`; sale-specific document may not appear in accounts report. |
| Delivery | No delivery entity | `sale_status`, `sale_stage`, checklist, portal tracking, `VehicleStockMovement`. | Multiple partial representations; event-driven delivery movement is not reliable. |
| Service Job | `job_card` | `service_schedule`, service follow-up, spare consumption. | Job card has no customer FK, diagnosis, labor, estimate, invoice, or line items. It is only an open/closed chassis visit. |
| Warranty Claim | `claim` | `spare_consumption`, swap event IDs, inward/shipment records. | Claim is anchored to service consumption by FK; swap path inserts `job_spare_id=0`, which is not a valid reference in a normal database. Lifecycle is incomplete. |
| Insurance | `policy` plus `domain_insurance_company` | separate `insurance_company` table managed by Setup; sale portal also has insurance status/number. | Policy FK uses domain company table, not the company table used by Setup. Sale portal and policy both track insurance. |

## # 7. Business Workflow Map

### Lead: create -> update -> follow-up -> convert

```text
CrmPage -> LeadForm (fetch vehicle models and, for Admin/Dealer, staff)
 -> POST /crm/leads -> LeadCreate (name, phone, model ID, source, status ID; customer optional)
 -> crm.services.create_lead() -> Lead ORM + flush -> get_db commit -> LeadResponse
 -> CrmPage adds to Zustand CRM store
```

The source comment says “independent of customer,” but model is compulsory. A follow-up can use either legacy `followup_schedule` via `/crm/followups` or `lead_followup` via `/crm/leads/{id}/followups`; the latter validates >=10 non-whitespace remark characters and outcomes. Conversion modal submits full KYC/address and mandatory nominee to `/crm/leads/{id}/convert`; `convert_lead_to_customer()` flushes Customer and Nominee, marks lead converted, then commits all three atomically. This is the strongest explicit atomic workflow in CRM. A separate `SaleCreatedEvent` listener also attempts to convert the lead, but is not executable as wired; it would also be a second conversion mechanism.

Dependencies: vehicle-model catalog/status seed data, logged-in staff, Customer and Nominee tables, unique customer phone/identity data. Frontend filtering is client-side and list has no paging/search index.

### Vehicle model -> vehicle -> inventory

```text
VehicleModelsPage/VehicleModelForm -> GET /setup/brands + POST /master/vehicle-models
 -> VehicleModelCreate -> master.services.create_vehicle_model -> vehicle_model row
 -> VehiclesPage or VehicleIntakeModal -> POST /master/vehicles or
    POST /procurement/purchases/vehicles/intake
 -> vehicle row / purchase header / purchase details -> DB commit
 -> intended VehicleIntakeEvent -> inventory movement listener -> movement ledger (not persisted)
```

Vehicle intake is more than one vehicle at a time and requires vendor, OEM invoice, chassis, model, color and purchase price. The service persists model/chassis/purchase detail, but does not persist the advertised `VehicleStockMovement` itself. The generic Master vehicle create sets `IN_STOCK` without creating a movement. Catalog creation is a hard dependency of vehicle intake because of the FK. There is no variant layer.

### Vehicle purchase: vendor -> purchase -> receipt -> vehicle -> inventory

`VehicleIntakeModal` fetches vendor choices; user enters OEM invoice and vehicle rows; `process_vehicle_intake()` creates a purchase header, checks each chassis with one query per item, inserts `Vehicle`, adds `VehiclePurchaseDetail`, queues `VehicleIntakeEvent`, and commits. DB atomicity covers header, unit, detail, but **not** event delivery. If any chassis exists, exception aborts the request and dependency rollback should roll back DB work. Duplicate-submit/idempotency key is absent; the header invoice is not shown as unique in the model. Inventory event effects are no-op with current listener wiring. The purchase screen lists all records with no pagination.

### Inventory: received -> available -> reserved -> sold -> delivered

There is no single state machine. `vehicle.current_status` is read by `verify_vehicle_available()` and Sales UI; allowed values are hard-coded (`IN_STOCK`, `AVAILABLE`). A separate `module_vehicle_stock_movement` history is queried by an Inventory availability service, which treats latest `INWARD` or `AVAILABLE` as available. Event listener intended to record `INWARD`, `BOOKED`, `SOLD`, and `DELIVERED` transitions, but is not started, its handlers have no real DB session, and master/CRM/billing/finance event handlers have wrong signatures. No explicit reservation lease or concurrent row lock exists. Sale chassis uniqueness catches many duplicate attempts only at insert; a soft-deleted sale retains the unique chassis and can block re-sale.

### Sale: lead/customer -> vehicle -> price -> payment -> invoice -> delivery

Two separate UI modes and service flows exist:

1. `SalesPage` Quick Sale -> `SaleForm` loads leads, customers, vehicles and posts `SaleCreate` to `POST /sales/`. For a lead that has not converted, `selectedLead.customer_id` is null and the form sends `customer_id=0`; backend requires an existing customer, so this path fails for an unconverted lead. If the lead is converted, the ID can exist. Direct sale path uses customer.
2. New Sale/Billing -> `NewSaleModal` loads customers and vehicles and posts `SaleCreatePayload` to `POST /sales/billing`. UI collects base price, tax amount, total, payment mode, financier and down payment. Service verifies customer/vehicle and procurement cost floor; creates Sale, document, optional payment, checklist, portal tracking and stage history. It publishes three events before commit and sets status `INVOICED`; base price/taxes are accepted but service stores only total amount. No discount field, discount rule, or approval workflow exists. The event intended to create `SalesInvoice` hardcodes 18% tax and is nonfunctional.

Later routes separately add payments, documents, generate invoice/challan/service schedule, edit delivery checklist/portal state, advance stage, deliver. Delivery gate checks invoice, receipt, challan and schedule booleans; this is separate from `Billing.generate_invoice()` which requires sale status `DELIVERED`. Sale stage advances only forward, but can skip arbitrary intermediate stages; route does not enforce per-stage business prerequisites. The completion stage/status and `deliver_vehicle()` rules need one authoritative lifecycle.

### Service: customer/vehicle -> job card -> diagnosis -> spare -> labor -> billing

Current UI enters chassis, free-service flag and remarks. `POST /service/job-card` validates only that another non-deleted open job card for chassis is absent. It creates `job_card`; there is no Customer or sale lookup in the form, diagnosis field, technician assignment, labor line, estimate/approval, bill, or closeout payload. `consume-spare` validates positive quantity and open job, then only publishes an event; it does not insert `spare_consumption`, decrement stock synchronously, or record labor. Job close sets timestamp. Therefore warranty's required `job_spare_id` cannot be obtained from this path without additional unstated database work.

### Warranty: issue -> claim -> approval -> resolution

Claim UI creates a claim with `job_spare_id` and SO number. Model requires that ID to reference `spare_consumption`. There is list/create/delete plus inward and shipment create; shipment marks claim `shipped`. There is no claim status transition endpoint, approval endpoint, resolution/credit/replace close path, or shipment receipt route. `swap_vehicle_component()` verifies chassis and serial on Master Vehicle, publishes return/replacement events with `spare_id=0` and `serial_id=0`, sets new vehicle serial, inserts claim with `job_spare_id=0`, and flushes. The FK is to a real `spare_consumption.consumption_id`, so this is structurally invalid absent a matching zero key. It also accepts a job-card ID without verifying the job card belongs to that chassis.

### Insurance: customer/vehicle -> policy -> renewal/claim

PolicyForm fetches all sales and the Insurance API's company list; user must select a sale and manually re-enter chassis even though sale response includes it. `POST /insurance/policies` checks date ordering and deactivates an old active policy by chassis, then creates policy. There is no DB unique constraint enforcing one active policy per chassis, and no renewal or claim endpoint. `insurance_followup` is read by the unified dashboard, but no observed API creates or closes these follow-ups. The Setup insurance company CRUD operates on a different table from policy forms.

## # 8. Dependency & Coupling Analysis

| # | Source | Depends on | Type | Necessary? | Impact/evidence |
|---|---|---|---|---|---|
| 1 | CRM LeadForm | VehicleModel existence/list | UI + data | Business confirmation required | Blocks all new lead creation even for general enquiry. |
| 2 | `crm.Lead` | `master.VehicleModel` FK | Database | Only if product requires model-specific leads | Model delete/availability is coupled to CRM; no nullable lead interest. |
| 3 | CRM conversion service | Master Customer/Nominee ORM | Data/technical | Legitimate conversion, implementation too direct | Cross-module write bypasses Master service contract. |
| 4 | Sales service | CRM Lead existence | Data/API | Often legitimate | Service imports contracts and ORM types; direct sale path differs. |
| 5 | Sales service | Master Customer/Vehicle | Data/API | Legitimate core sale requirements | Direct contract checks, but Sale itself has no FKs. |
| 6 | Sales service | Procurement cost contract | Data | Legitimate margin rule if policy approved | A sale is rejected below recorded cost; no cost fallback means missing cost may behave as zero. |
| 7 | Sales -> event bus -> CRM/Master/Inventory | Technical/event | Intended but broken | No startup, handler signature mismatch, no durable outbox; core state can diverge. |
| 8 | Procurement | Master Vehicle ORM | Technical/data | Intake needs a unit record | Directly writes another module's aggregate/table. |
| 9 | Procurement | Inventory temporary-spare service | Contract/data | Legitimate | Good direction in one path, but broad exception hides all failure causes. |
| 10 | Procurement | Inventory event listener | Technical | Could be legitimate | No actual stock update with mock session. |
| 11 | Service | Inventory stock event | Technical | Legitimate stock effect | Event only; service creates no consumption record or response ID. |
| 12 | Warranty | Master Vehicle ORM | Data | Legitimate serial check | Direct model mutation across ownership boundary. |
| 13 | Warranty | Service spare consumption FK | Database/business | Legitimate traceability | Swap path supplies zero; normal service path does not insert consumption. |
| 14 | Billing | Sales Sale model | Data/API | Legitimate invoice checks | Coupled directly to sale_status; requirement says invoice only after delivery. |
| 15 | Finance | Sales Sale model + event | Data/event | Legitimate finance record | Direct read + broken listener; no integration with actual payment reconciliation. |
| 16 | Reports | Sales, Billing, Finance, CRM, Master, Insurance, Service | Read-model/API | Necessary for cross-domain reports | God-query boundary; sync session API breaks exports. |
| 17 | Followup dashboard | CRM, service follow-up, insurance follow-up | Data | Legitimate unified view | Direct table queries couple schemas; no paging and inconsistent soft delete filtering. |
| 18 | Setup | Master models for catalogs | Ownership | Ambiguous | Setup and domain Master both own/use reference data; insurance company duplicated. |
| 19 | Vehicle | current_status + movement ledger | Data/state | Two authorities are unnecessary | Sale availability uses current status; inventory availability uses movement history. |
| 20 | Sale lifecycle | sale_status + sale_stage + flags + checklist + portal + events | State/API/DB | Some distinctions legitimate | Contradictions allow invoice/delivery stage and flags to disagree. |

No direct Python import cycle was established from the inspected import graph; there is bidirectional business dependency through Sales<->CRM event intent and multiple direct cross-domain model references, but those are not proof of an import cycle. `backend/analyze_coupling.py` only regex-scans FK strings for schemas whose names differ from the current package directory; the model set mostly uses unqualified public table names, so it is not a complete import/service/event dependency analyzer.

## # 9. Lead / Vehicle Model Dependency Investigation

**Finding:** The inability to create a lead without an existing vehicle model is currently enforced by both frontend and backend plus the database. It is not a generic business truth proven by the code.

| Layer | Evidence | Effect |
|---|---|---|
| UI validation | `frontend/src/modules/crm/components/LeadForm.tsx`, Zod `vehicle_model_id: z.number().min(1, ...)` | Submit disabled/invalid without choosing model. |
| UI dependency | `LeadForm` fetches `masterApi.getVehicleModels()` and displays required selector | Empty catalog means no selectable lead model. |
| Client type | `frontend/src/modules/crm/api/leads.ts` requires `vehicle_model_id: number`; older `crmApi.ts` also requires it | Type-level coupling in current UI code. |
| Pydantic | `backend/app/domains/crm/schemas.py`, `LeadCreate.vehicle_model_id: int` | Missing ID is request validation failure (422). |
| Service | `crm.services.create_lead()` copies payload model ID | No “unknown/general interest” handling. |
| ORM/DB | `lead.vehicle_model_id` is non-null FK to `vehicle_model.vehicle_model_id` | Database rejects absent/nonexistent model. |
| FK behavior | No `ondelete` cascade declared for Lead->VehicleModel | Model cannot be hard-deleted while referenced under normal FK enforcement. |

Classification: **C (backend implementation dependency), D (frontend implementation dependency), and B (database dependency)** are all true. Whether this is **A, a genuine business dependency**, is **UNKNOWN**. It is a high-confidence **E, accidental architectural coupling**, only if the owner confirms enquiries may describe a brand/category/general EV interest or may precede catalog setup. The current `Lead` docstring says “potential customer with interest,” service says “independent of customer,” and creation is described as enquiry capture; those labels do not prove that a specific model is optional.

**Product decision required:** Should a lead mean (1) a qualified intent for one stocked/catalog model, or (2) an early prospect/enquiry that can be unqualified and later connected to one or more models? Also decide how to represent “not decided,” out-of-catalog interest, multiple models, variant/color, and a model discontinued after capture. Do not infer policy solely from the field requirement.

## # 10. Duplication Analysis

| Duplication | Classification | Evidence and consequence |
|---|---|---|
| Insurance company (`insurance_company`, `domain_insurance_company`) | Accidental | Setup CRUD uses Master `InsuranceCompany`; policy FK and `/insurance/companies` use domain table. Setup changes are invisible to PolicyForm. |
| Invoice (`sale.invoice_number`/flags, `sale_document`, `sales_invoice`) | Unnecessary representation duplication unless distinct legal vs operational documents are defined | Sales invoice endpoint only flips Sale fields; billing creates SalesInvoice; event listener would create another; reports use SalesInvoice. Different number patterns and requirements. |
| Payment (`payment_receipt`, `sale_payment`, Sale receipt flags/number) | Historical/unfinished duplication | Different routes and schemas, no cross-ledger balance or refund/reversal. Choose one canonical payment ledger and keep immutable audit events/doc references as appropriate. |
| Sale status | Unnecessary dual status | `sale_status` and 10-stage `sale_stage` overlap; route sets status based on only selected stages; the two creation flows initialize differently. |
| Vehicle status | Unnecessary duplicated state | `vehicle.current_status` and movement-derived status can differ; sale availability ignores movement history. |
| Lead contact vs customer contact | Legitimate snapshot until conversion, then risk | Lead may be a non-buyer; conversion intentionally allows buyer details to differ. Need identity linkage/history policy and duplicate detection. |
| Lead status fields | Accidental | `lead_status_id` references master and free-text `lead_status` drives follow-up/dashboard; update paths can update separately. |
| Follow-up records | Historical/accidental overlap | `followup_schedule`, `lead_followup`, `service_followup`, `insurance_followup` are distinct but multiple lead APIs/dashboard representations overlap. Domain-specific records can remain but one lead followup workflow should own the business process. |
| Customer API clients | Accidental | `masterApi` and `customersApi` call same routes with duplicated types/methods. |
| Lead API clients | Accidental/historical | `crmApi.ts` and `leads.ts` disagree on required fields and assignment/filter shapes. |
| Inventory service layers | Historical/unfinished split | `domains/inventory` route/service facade imports `modules.inventory`; second module contains separate contracts/listeners/models. Boundary is not complete. |
| Purchase cost/tax totals | Snapshot is legitimate; calculation duplicate/risk | Purchase item stores unit cost; service separately calculates totals; UI sends sale `base_price`, `taxes`, and total, while service stores total and an event hardcodes 18% tax. |
| Service schedules vs service followups | Potentially legitimate different meanings | Sale-triggered free schedule and post-job reminders are separate entities, but there is no lifecycle link from one to job completion. |
| Portal tracking vs actual insurance policy/subsidy entities | Partly legitimate checklist snapshot, partly duplicate status | Portal tracker is an operational checklist, Policy is policy record; no synchronization is visible. |

## # 11. State/Status Analysis

| Entity | Status/state fields observed | Transitions/evidence | Audit finding |
|---|---|---|---|
| Lead | `lead_status_id`; free text HOT/WARM/COLD/LOST/SOLD; `is_converted` | Auto next-followup days 1/3/7; convert writes SOLD and status master if found | Dual status; status history table not consistently written; literal values differ (`CONVERTED`/`WON`/`SOLD`). |
| Enquiry | `enquiry_status_id`, status master | No dedicated transition function | Generic dict update, no controlled transition history. |
| Lead follow-up | `outcome_status`; older `followup_status` PENDING/MISSED/COMPLETED/DONE | Separate APIs and records | Two meanings and spelling variants (`DONE`/`COMPLETED`). |
| Vehicle | `current_status` (`IN_STOCK`, `AVAILABLE`, `BOOKED`, `SOLD`, `DELIVERED` appear in code) | Direct create starts IN_STOCK; event intended to change status | Transition path is unreliable; no enum/check constraint; Inventory ledger uses different status vocabulary. |
| Vehicle movement | `movement_type` arbitrary string (`INWARD`, `AVAILABLE`, `DELIVERED` and event types) | Latest movement used by module contract | No DB FK or check; movement/current_status not reconciled. |
| Sale | `sale_status` PENDING/INVOICED/DELIVERED/CANCELLED; `sale_stage` ten ordered stages | Stage helper only permits forward moves but can skip | Sales create flows start at different stages; delivery function/gate and Billing requirement conflict. No cancellation/rollback transition shown. |
| Sale document/payment flags | invoice/receipt/challan/insurance/service schedule booleans | Set by several endpoints independently | Flags can contradict row existence, totals, delivery status. |
| Portal tracking | insurance/subsidy/RTO/CELEX strings default PENDING; all-completed boolean | Update accepts arbitrary strings; completion dates set only on exact `COMPLETED` | No enum, transition guard or valid-value schema. |
| Service job | open/closed timestamps | close sets `closed_at`; no reopen or canceled state | Basic binary state only; job close does not validate work, labor or payment. |
| Spare | temporary/verified/deleted booleans | Temporary item approval flips two booleans | State consistency not constrained; old item availability/in stock not linked. |
| Warranty claim | free text `claim_status` (`pending`, `shipped` lower-case); approval date | claim create -> shipment changes to shipped | No enum or approve/reject/resolve transition; code and comments use case variation. |
| Finance | `finance_status`; comments specify INITIATED/SANCTIONED/DISBURSED/REJECTED/CANCELLED | API update accepts schema string | No transition graph/validation observed. |
| Policy | `is_active`, date window, soft delete | new active policy deactivates old active by chassis | No concurrency-safe one-active-per-chassis unique constraint; renewal lifecycle missing. |
| PIN reset | PENDING/APPROVED/DENIED | approve/deny endpoints | Good basic state guard, but no `processed_at`/`processed_by` set in observed approval code. |
| Subsidy | APPLIED/APPROVED/REJECTED/PAID comment; app accepts string | No workflow API shown | Field exists without implemented state machine. |

Explicit transition services would materially help Sale, Vehicle, Policy, Warranty Claim, Finance, and Portal tracking. They should be designed after the canonical process is agreed; do not add transition code while the owner still has to decide the lifecycle.

## # 12. Transactional Consistency

`get_db()` yields `AsyncSession`, commits at dependency exit on success, rolls back on exception. Some services commit internally, causing inconsistent ownership of transaction boundaries.

| Operation | DB atomicity | Non-DB effects / risks |
|---|---|---|
| Lead conversion | Explicit flushes and one explicit commit cover Customer, Nominee, Lead state. | No external calls. This is a good atomic pattern, though no concurrent double-conversion lock/unique lead reference is enforced. |
| Vehicle intake | Purchase header, Vehicle rows and details commit together; exceptions roll back request dependency. | Event is queued before commit and is in-memory/non-durable; inventory movement not guaranteed. Per-row duplicate checks are race-prone. |
| Spare purchase | Header/items commit together. | One event queued per item; listener doesn't persist. Purchase may succeed while stock remains unchanged. |
| Sale create/simple | Sale/checklist/history/portal are flushed and committed by dependency. | Sale events are queued before commit; event processing may not see committed records and is not durable. Vehicle status doesn't update. |
| Sale + billing | Sale, document, optional down payment, checklist, portal, stage history commit together. | Invoice/finance/inventory/CRM event effects are out-of-transaction and broken. Sale can commit without required accounting/stock side effects. |
| Add payment / doc / stages | Typically `flush()` then dependency commit. | No idempotency key, unique payment reference, duplicate submit protection or authoritative amount-balance check. |
| Service consume spare | No service record inserted; request dependency has no pending DB writes. | Event-only stock decrement is lost. Repeated request can return success repeatedly without consuming stock. |
| Warranty swap | Vehicle serial mutation and Claim flush in one DB request. | Event effects broken; placeholder IDs violate claim FK; partial operation will roll back only if insert failure propagates. Broad exception maps failures to HTTP 400. |
| Invoice finalize | Flush then request dependency commit. | Finalization is a boolean; no immutable invoice snapshot/version policy, audit workflow or idempotency token. |

No transactional outbox or durable queue exists. Duplicate HTTP submission is possible for several creates. Unique constraints can reject duplicates, but often the API does not translate them consistently. Sale + payment + invoice + stock is not one complete transaction today.

## # 13. Performance Forensics

| Bottleneck | Evidence | Layer | Severity | Direction |
|---|---|---|---|---|
| Unpaged high-volume collection APIs | Sales, staff, CRM, procurement, service, insurance, setup and most master lists return full arrays. | API/DB/UI | High as rows grow | Introduce consistent cursor/page contract with server filters/sort; retain small reference lists only if bounded. |
| Client-side filtering | CRM and Sales load arrays then search/filter in component; Sales `status` query is ignored by backend. | Frontend/API | Medium-high | Move search/status filtering and totals to API; query only needed fields. |
| Repeat ORM sum per spare | `modules/inventory/services.check_spare_stock()` executes one SUM query per requested spare ID. | Backend/DB | High for batch request size | One grouped aggregate query over IDs. |
| Dashboard loads all in-stock vehicles then filters ages in Python | `get_dashboard_alerts()` selects every in-stock Vehicle+Model, loops in Python, then sorts; no created/status DB filtering or pagination. | Backend/DB | High with inventory growth | Filter by created_at in SQL, select only output fields, top-N ordering in database. |
| Dashboard stats are sequential | Four scalar aggregate queries awaited one after another. | Backend | Medium | Combine compatible aggregate query or issue safely in parallel after session/query plan review. |
| Missing indexes on lead filters | Current metadata has no explicit lead index; CRM filters on deleted/status/owner and sorts created_at. | DB | Medium-high | Profile real plans/data sizes, then targeted composite indexes. |
| Invoice reports use extract month/year | Dashboard sum applies `extract()` to `invoice_date`; current SalesInvoice indexes sale_id, not invoice_date. | DB | Medium | Use date ranges and verify index strategy. |
| Route-level API waterfalls | CRM initially fetches master data and leads; lead form fetches models and staff; sales page and modal each fetch customers/vehicles; Policy form separately fetches company and all sales. | Frontend/network | Medium | Reuse query cache/keys and only fetch data needed for active workflows; avoid duplicate store/query clients. |
| Stale-time default and mixed state | QueryClient leaves default staleTime at 0; several modules use manual Zustand fetching and others use Query. | Frontend | Medium | One consistent server-state strategy, mutation invalidation, explicit stale policies. |
| Route bundle is eager | `App.tsx` statically imports every page, including orphaned pages. No `React.lazy` route split. | Frontend/build | Medium | Route-level splitting once page boundaries are confirmed. |
| No list virtualization | Tables render mapped arrays; no virtualization library/use found. | Frontend | Medium only at large row counts | First paginate/filter on server; virtualize only measured long lists. |
| Oversized payload risk | `get_sale()` selectin-loads many related collections; several list APIs return full ORM schemas. | API/serialization | Medium | Keep rich detail endpoint separate from slim list models; measure payload. |
| Redis cache absent | Redis module is used by rate limiter; no application cache reads/writes found. | Backend | Low/unknown | Do not add caching without profiling; correctness and pagination are first. |

No runtime profiler, query-plan sample, production row counts, frontend bundle report, or browser network trace was available. “Feels slow” cannot be conclusively attributed to one bottleneck from source alone. The listed findings are concrete risks and likely contributors, not benchmarked timings.

## # 14. Frontend Architecture

- React Router routes are centrally declared in `App.tsx`; screens are statically imported.
- TanStack Query is configured globally, with retry 1 and no window-focus refetch. It is mixed with manually managed Zustand stores and direct local component state. CRM and Master state coexist with query-based data.
- Auth token/user persist in `localStorage` using Zustand. Axios adds Bearer token from persisted storage. There is no refresh-token flow or centralized 401 logout/expiry behavior; the interceptor just rejects errors.
- `api.ts` exposes generic methods with `any` request config and several client interfaces claim shapes that do not match the backend. Feature modules duplicate API definitions.
- `App.tsx` route gates hide some pages but API authorization remains the actual security boundary. Print routes sit outside the protected layout; their data APIs are still bearer guarded.
- There is no route-level error boundary observed. Some screens log errors or render empty arrays; many query failures are not differentiated from true empty data.
- Main backend endpoint path is unversioned. Settings advertises `/api/v1`, but app does not mount it.
- Frontend screens using large tables are not paged/virtualized. App uses responsive layout for sidebar and horizontal table overflow, but does not switch to a purpose-built mobile record view.

## # 15. UX/UI Audit

### What the code actually presents

The UI has a dark fixed-width sidebar, compact white header, gray page background, generic Tailwind forms/tables, rounded cards and primary blue/indigo utility classes. It is consistent enough to recognize as one app, but it is visually generic and information density is inconsistent. The report is code-only; no browser screenshots were taken.

### Problem classification

- **Visual design:** Yes, materially plain. `index.css` defines generic `.btn`, `.input`, `.card`, `.table`; there is no typography system, tokenized spacing/type scale, or clear domain-specific visual hierarchy. `Header` shows a static “Current Time” value computed at render and generic welcome copy.
- **Information architecture:** High concern. Routes and sidebar omit Billing, Finance, Insurance, Reports, Warranty, admin staff management and some capability views; the `/admin/dealers` redirect points to a missing frontend route. The sidebar labels procurement “Purchase” and nests master data, but does not communicate lifecycle or key action entry points.
- **Workflow:** Highest concern. A lead form cannot proceed without model; unconverted-lead Quick Sale sends customer ID 0; the Billing screen shows a hardcoded empty collection; service and warranty screens expose processes whose backend records/side effects are incomplete; insurance company setup does not feed insurance policy company choices.
- **Component architecture:** Small primitive layer only. Forms and tables implement repeated Tailwind inline patterns; API clients are duplicated; large screens combine data fetch, workflow state and table interactions. This makes cross-screen behavior hard to standardize.
- **Performance:** Likely contributors are unpaged arrays and eager routes, not proven by timing. Multiple queries per workflow and stale/refetch behavior add network work.
- **Loading/errors/empty states:** A few screens show loading and empty text; there is no uniform error/empty/retry component. Query errors often become empty default arrays. Several mutations show toast/errors inconsistently.
- **Tables/forms/modals:** Tables scroll horizontally but do not adapt record layout. Forms use labels and simple validation; several selectors depend on full unpaged lists. Custom modal shells generally lack dialog semantics, focus trap/restore, Escape close, and explicit accessible names on X buttons.
- **Responsiveness:** Layout has a mobile sidebar overlay and responsive grid classes. Small screen table usability is limited to horizontal scrolling; full responsive behavior has not been browser-verified.

## # 16. Design System Audit

A minimal styling layer exists in `frontend/src/index.css`; shared UI component directory currently contains only `DeleteConfirmModal`, `Skeleton`, and `SkeletonTable`. Buttons, inputs and tables are CSS utility classes, not reusable typed components. No shared components were found for select, alert/toast conventions, badges, pagination, filter bar, page heading, modal/drawer primitives, or form field/error rows. Lucide is installed and used.

Minimum appropriate system for this internal ERP: define accessible button/input/select/textarea/field/error components; data table with server pagination/sort/filter/empty/error/loading; status badge mapping sourced from validated status enums; modal/drawer focus/keyboard behavior; page title/action/filter conventions; compact density and desktop/mobile table behavior; a small set of semantic color/spacing/type tokens. Do not start with a broad visual redesign before the workflows/routes and field semantics are agreed.

## # 17. Security

- **Auth model:** email/mobile + six-character PIN, Argon2 hash, signed JWT bearer, `get_current_staff()` rechecks active staff and blocks tokens flagged for forced PIN change. JWT persisted in localStorage; XSS would expose the token. No refresh/revocation list observed.
- **Role model:** only `ADMIN`, `DEALER`, `STAFF` exist in `StaffDesignation`. `require_roles()` correctly uppercases its allowed/current comparison and Admin bypasses. Reports also allow `ACCOUNTS`, a role that cannot be created through this schema. Many transactional routes require authentication but do not authorize a specific role. Frontend route hiding is not authorization.
- **Broken hard-delete checks:** service code compares designation to `['Admin','Dealer']` while `get_current_staff()` returns uppercase values. This appears across CRM, Master, Procurement, Service, Warranty, Insurance, Billing, Finance and Sales; hard delete requests are denied even for valid Admin/Dealer. Soft-delete is default and functions separately.
- **OTP:** `/auth/send-otp` does not send or persist an OTP; code documents a development static `123456` and prints it. This is not a production reset channel. Rate limiting only attaches to login (max 25 per 300 seconds in decorator); settings list different configured limits. Redis failure intentionally fails open; check/increment is not atomic and TTL is reset on each request.
- **Reset routes:** Dealer self-reset and Admin/Dealer reset-self verify TOTP, but reset-self identifies account by public mobile and is unauthenticated; TOTP is the control. PIN reset request is unauthenticated and intentionally avoids existence disclosure. These flows need rate-limit/monitoring review. TOTP setup/verify implement custom bearer parsing separate from `get_current_staff` and do not run the shared active-account/forced-change check.
- **Sensitive data:** Staff stores Aadhaar, PAN, bank account, IFSC, UPI, address, emergency phone; customer stores Aadhaar/PAN/GSTIN and addresses. `StaffResponse` omits most bank/identity details, which is good, but data encryption/retention/access audit is not evident. Do not expose any `.env` credentials in this report.
- **Tenant scope:** Staff has `dealer_id`, and Admin staff routes constrain Dealer access. Most business entities have no dealer/showroom tenant field and business list queries are not scoped by dealer. Whether this is a real exposure depends on single vs multi-dealer deployment; if multi-dealer is intended, it is a critical isolation issue.
- **Other:** `feature_toggles.py` is a hard-coded mock user/tenant context and not wired to business routes. No CSRF concern for bearer header as currently used, but browser token storage and CORS settings need deployment-specific review. Rate-limit fail-open and public reset routes are confirmed source behaviors.

## # 18. Testing

- No project test file, `conftest.py`, frontend test/spec, Playwright suite, or CI workflow was found in current snapshot.
- OpenAPI generation and model mapper configuration succeed in the active backend venv. Earlier in the session, DB-backed PIN login returned HTTP 200. This validates login only, not downstream workflows.
- No migrations were run, no database schema diff was collected, and no endpoint write tests were performed during this read-only audit.
- Minimum regression suite before further core work: auth roles; lead create with/without model according to owner decision; lead conversion atomicity; intake duplicate rollback and movement; sale single-create/idempotency, invoice/payment/delivery; service consumption/warranty reference integrity; reports with AsyncSession; dealer isolation; soft-delete restore/unique behavior.

## # 19. External Integrations

**Verified:** Source includes PostgreSQL, Redis rate limiting, local CSV generation, browser-side PDF package, QR-code package, and TOTP provisioning URI. No Salesforce, outbound REST client, webhook, OAuth client, synchronization worker, scheduled integration task, or provider SDK was found in current app/frontend source. `requests` and `httpx` appearing in dependency inventory is not evidence of an integration.

**Not verified:** Whether code exists outside this repository; credentials/API access from the customer’s Salesforce tenant; product/edition/API quota; whether Salesforce is used in production; external billing provider, OEM, insurer, RTO, subsidy or payment portal access; export/import files handled manually by staff.

**External information needed:** Salesforce objects/fields and API contract; org edition and API-enabled status; approved OAuth/auth flow and sandbox; stable ERP/Salesforce IDs; ownership of customer/sale/invoice/payment; invoice numbering/tax rules; webhook or polling options; data protection/retention requirements; expected volumes, rate limits, retry/dead-letter ownership and support SLA. Credentials themselves must be handled outside this report and not pasted into chat.

## # 20. Salesforce/Billing Investigation

### Present ERP data capability

ERP has customer name/contact/address/KYC in `customer`; vehicle model/chassis/serials in Master; sale date/total/status in `sale`; tax/amount/finalization in `sales_invoice`; payment mode/amount/reference in payment tables; financier/loan in `vehicle_finance`; sale documents and portal tracking. That is enough to prefill some likely billing fields, but not enough evidence to assert a lossless Salesforce billing integration: item-level products, Salesforce record identifiers, line taxes/discounts, required invoice fields, customer ownership, payment settlement and invoice numbering are not defined as a coherent contract. ERP has no discount or approval model. The UI enters base price/taxes but backend transaction does not persist those components separately.

| Integration direction/option | Ownership | Failure/duplicate risk | Complexity and evidence |
|---|---|---|---|
| ERP -> Salesforce | ERP owns customer/sale/vehicle, Salesforce consumes for billing | Retry can create duplicate Salesforce records unless external ID/idempotency key exists; Salesforce outage blocks sync or leaves pending ERP record | Moderate; no client/credentials/ID mapping currently exists. |
| Salesforce -> ERP | Salesforce owns customer/billing record; ERP imports status/amount/invoice reference | Stale/partial import can leave ERP sale, stock, and payment state inconsistent; overwriting ERP customer data risk | Moderate; requires authoritative Salesforce objects and change feed. |
| ERP as system of entry | Staff enters once in ERP; pushes to Salesforce | Push outage needs visible queue/retry and duplicate guard; tax/invoice data must satisfy Salesforce process | Plausible but unverified. ERP currently lacks an operational integration queue and full invoice accounting. |
| Salesforce as system of record | Staff captures/bills there; ERP imports status/doc refs | Delayed import causes ERP inventory/reporting lag; field ownership conflict | Plausible but owner has not stated this; ERP sales workflow currently presents itself as system of entry. |
| Two-way sync | Entity-level field authority and conflict policy required | Highest conflict/loop/duplicate risk; retry and merge conflicts | Do not choose without object-level ownership and sync semantics. |
| Middleware | Middleware maps IDs, retries, observability and transformations | Additional outage/config/ownership surface; duplicate handling still required | Consider only if Salesforce access/contracts exist and integration complexity warrants it; no evidence of existing middleware. |

No choice is justified by repository evidence. First establish the exact billing data Salesforce needs and the designated system of record for each entity/field.

## # 21. Automation Opportunities

| Type | Existing/current process | Trigger/data | Failure handling/dependency | Assessment |
|---|---|---|---|---|
| Rule automation | Lead next-follow-up date computed from HOT/WARM/COLD as 1/3/7 days. | Lead create/update, status value. | Deterministic local function; statuses can diverge between ID/string fields. | Keep deterministic; align status source first. |
| Rule automation | Three free service schedule rows can be created at 30/90/180 days. | Explicit `POST /sales/{id}/service-schedule`, sale date. | No guarantee endpoint is called; generated rows not linked to job close. | Good narrow rule if this matches warranty policy. |
| Workflow automation (intended) | Sale events intended to update vehicle, CRM lead, invoice and finance. | `SaleCreatedEvent`/`SaleTransactionCompletedEvent`. | Not started; wrong handler signatures; inventory session stub; in-memory loss. | Do not add more event consumers until one reliable transaction/outbox approach is chosen. |
| Workflow automation | PIN-reset requests can be approved/denied and temporary PIN issued. | Staff public request, Admin/Dealer approval. | No actual secure delivery channel; returned temp PIN only to API caller; audit processor timestamps not filled. | Needs security/product channel decision. |
| Integration automation | None found for Salesforce, insurers, payment gateway, OEM or RTO. | No trigger/client. | No external contract, queue or retries. | Unknown / not implemented. |
| AI-assisted automation | None in source. | No AI service or prompt/model integration. | No privacy/accuracy/fallback mechanism. | Not presently appropriate. |

## # 22. AI Opportunities

AI should not replace deterministic workflow, price/tax arithmetic, stock updates, TOTP, role checks, or statutory invoice calculations. The current immediate work is correctness, not AI.

| Candidate (conditional) | Input/output and frequency | Expected value | Cost, accuracy, privacy, fallback |
|---|---|---|---|
| Lead-call note summarization / suggested next action | Only if staff records meaningful free-text call notes; on demand per follow-up. | Reduce manual note reading and handoff time. | Customer contact/PII must be minimized and approved; summary can hallucinate. Keep source notes, label generated text, require staff review; deterministic status/date rules remain authoritative. Data volume/value unknown. |
| Warranty complaint triage | If claim/inward history and symptoms become structured and sufficiently large; on claim entry. | Route common failure categories to human review. | EV safety/warranty decisions must remain human/OEM policy-controlled; false denial has financial/customer harm. Start with rule-based symptom codes; AI only proposes category. No usable claim corpus/label data evidenced. |
| Sales forecasting | Only after reliable historical sale, stock, seasonality and loss reasons exist. | Purchase planning, if forecasts demonstrably improve over simple baselines. | Current transactions/status/invoice data are inconsistent; small/local dataset risk and privacy concerns. Compare with deterministic moving averages first; fallback must be a transparent baseline. |

No candidate merits implementation now. AI adds cost and privacy obligations while deterministic fixes address current problems.

## # 23. Feature Audit

| Feature | Decision | Evidence/value/qualification |
|---|---|---|
| PIN login, force-change, TOTP setup | KEEP, harden | Real aligned UI/API flow; dev reset OTP must not ship. |
| Staff CRUD and dealer scoping | REFACTOR | Useful account management; split Auth/Admin/Setup ownership and verify backend permissions. |
| Customer/nominee master | KEEP | Needed for sale and insurance/KYC; fix fabricated vehicle/service summary values and duplicate search. |
| Vehicle brand/model catalog | KEEP | Required for vehicles; decide model vs variant/color shape before adding catalog features. |
| Lead create/update/assignment/conversion | KEEP, conditional refactor | Core CRM value; resolve model requirement, dual status and buyer-vs-rider conversion. |
| Enquiry record CRUD | MERGE/DEFER | Enquiry and Lead capture overlap; current UI appears secondary and update accepts untyped dict. Confirm whether enquiries are distinct from qualified leads. |
| Lead follow-up schedules/history | MERGE | Three overlapping route/data concepts; keep audit history but define one command/read model. |
| Test rides | KEEP after completion | EV showroom-relevant and linked to lead/model/vehicle, but no GET backend endpoint exists despite frontend calls. |
| Vehicle procurement intake | KEEP, fix transaction | Core inventory entry; event movement currently absent, supplier invoice idempotency incomplete. |
| Spare purchase/stock | KEEP only if service operation uses it | Purchase and spare tables exist; stock event and service consumption path currently do not update ledger. |
| Temporary spare request/approval | DEFER pending actual use | Dedicated workflow exists but potential low frequency; broad exception obscures validation; verify dealership process. |
| Vehicle sale | KEEP, consolidate | Core revenue workflow; two create flows, duplicate invoice/payment paths and client/backend mismatches. |
| Discount approval | UNKNOWN / missing | No discount field, approval endpoint, model or rule found; owner must define it if required. |
| Delivery checklist and portal tracker | KEEP only as manual ops aid if used | Multiple statuses for insurance/subsidy/RTO/CELEX/plates; no external portal integration. Validate each field's actual operational use. |
| Billing invoice generation/finalization | MERGE into one sale/billing source | Real accounting value, but duplicate model and unreachable UI. Must establish legal numbering/tax rules. |
| Vehicle finance tracking | DEFER/REFINE | Loan record is useful for financed sales, but only four endpoints and no lender integration/accounting. |
| Reports/dashboard | KEEP, fix contract | Core operational visibility; three report endpoints incompatible with AsyncSession; dashboard role mismatch and one alerts query scans all stock. |
| Service job cards | REFACTOR before expansion | Core after-sales capability, but current scope is only open/close and spare event, not an end-to-end job. |
| Warranty claim/swap/shipment | REFACTOR or DEFER | Business-relevant but invalid placeholder IDs and incomplete status transitions; do not expose as completed feature. |
| Insurance policy CRUD | KEEP if required by delivery | Manual policy tracking exists; separate company master, no renewal/claim operations; screen not routed. |
| General accounting/expenses | DEFER/UNKNOWN | Finance module is vehicle-loan tracking, not ledger/AP/AR; expense categories alone do not provide accounting. |
| Salesforce synchronization | UNKNOWN / do not build yet | No existing integration or external contract. |
| Hard deletion | REMOVE from normal UI or repair policy intentionally | Broad advertised hard-delete path currently has broken role comparison; soft-delete/audit should be normal operation. |

No product feature is marked REMOVE solely because its code is poor. Removal needs actual usage/business evidence. Remove unused scaffolding only after confirming it is not used in another deployment.

## # 24. Missing Capabilities

**Required before trusting the core sale lifecycle:** one enforced sale/invoice/payment/delivery state machine; atomic vehicle reservation and stock state; reliable service/warranty stock record linkage; idempotency and rollback tests; accurate report queries; consistent auth and role authorization; unique source of truth for customer, vehicle, invoice, and payment.

**Useful if confirmed by operation:** server-side search/pagination; duplicate customer/lead resolution; quote/discount approvals; invoice line/tax snapshots; payment reversals/refunds; customer/vehicle history; explicit delivery record; service diagnosis/labor/estimate/approval/billing; warranty approval/claim response; insurance renewal/claim reminders; purchase AP/accounting and stock reconciliation.

**Future or external prerequisite:** Salesforce API sync, insurer/OEM/RTO/subsidy APIs, notification provider, background scheduler/worker, analytics/forecasting, AI summaries. None should be described as an existing feature.

**Not necessary until proven:** microservices, generic workflow builder, AI chatbot, a new frontend framework, event sourcing, a broad repository rewrite, or a universal abstraction for every small catalog CRUD.

## # 25. Technical Debt

| ID | Problem / location | Severity | Impact | Direction |
|---|---|---|---|---|
| TD-01 | Event bus not started and handlers wired incorrectly: `main.py`, `core/event_bus.py`, listeners | Critical | Core state changes silently fail. | Choose transactional synchronous writes or implement lifecycle + durable outbox; add integration tests. |
| TD-02 | Inventory event listener returns `None` DB session | Critical | Stock movements never persist. | Use actual session factory and tested ownership/transaction boundary. |
| TD-03 | Sale/invoice/payment duplication: `modules/sales/*`, `modules/billing/*` | Critical | Missing/duplicate accounting records and unreconciled totals. | Product decision, then consolidate one source and transaction. |
| TD-04 | Warranty swap uses zero spare/serial/consumption IDs | Critical | FK failure and false stock movements. | Build swap around real stock/serial/job consumption IDs. |
| TD-05 | Report sync ORM queries with async DB session: `domains/reports/services.py` | High | CSV sales/finance reports fail at runtime. | Convert paths to async SQLAlchemy and test. |
| TD-06 | Lead requires catalog model across UI/schema/DB | High, conditional | Prevents prospect capture when catalog absent. | Product-owner decision; only then change schema/API/UI/migration together. |
| TD-07 | Hard delete checks use wrong designation case across services | High | Admin/Dealer hard deletes always denied. | Normalize centralized authorization and test every exposed destructive route. |
| TD-08 | Frontend route holes for six modules and broken admin redirect | High | Existing API/pages cannot be reached or appear incomplete. | Decide which features are supported; mount or defer/remove navigation. |
| TD-09 | Duplicate frontend CRM/customer API clients | High | Client contracts diverge; requests fail silently/422. | One typed API client per resource, generated/verified against OpenAPI. |
| TD-10 | Service spare issue doesn't insert `spare_consumption` | High | No stock trace or valid warranty anchor. | Treat issue/ledger write as one validated operation. |
| TD-11 | Vehicle status vs movement ledger | High | Availability results depend on endpoint used. | Choose one authoritative state and derive/read from it consistently. |
| TD-12 | Duplicate insurance-company tables | High | Setup-created insurers unavailable to policy flow. | Select one master and migrate references deliberately. |
| TD-13 | Inconsistent list pagination/status filters | High at volume | Large payloads and misleading filters. | Consistent query contract and server pagination. |
| TD-14 | Several status fields are free strings/duplicated | High | Invalid and contradictory transitions. | Validated enums/transition functions after product states agreed. |
| TD-15 | No tests/CI evidence | High | Regressions have no local guard; modernization confidence low. | Establish focused characterization tests for core vertical slice. |
| TD-16 | `requirements.txt` UTF-16 LE and missing Alembic entry | Medium-high | Fresh environment/migration setup may not be reproducible. | Verify parser behavior and make manifest a supported UTF-8 direct-dependency manifest; include migration tool. |
| TD-17 | Setup outputs untyped and soft-delete restore lacks actor audit | Medium | Client contracts unstable; restored_by missing for setup records. | Typed responses and explicit operator/audit fields. |
| TD-18 | Dashboard and lists scan/hydrate unbounded data | Medium-high | Likely slow at realistic scale. | Add pagination/query filters and measure SQL plans/payloads. |
| TD-19 | Development feature toggle uses hardcoded user/tenant | Medium | Mock flag code is misleading if mistaken for access control. | Keep out of production path or implement real identity integration. |
| TD-20 | Flattened migration replaced prior history in dirty snapshot | High operational risk | Fresh DB can be created from root migration, but upgrades from existing DB lineage may not be possible. | Determine production schema/revision before deciding migration strategy; do not rewrite history blindly. |

## # 26. Modernization

| Current | Observed issue | Alternative/benefit | Complexity/risk | Recommendation |
|---|---|---|---|---|
| FastAPI 0.128 + Pydantic 2 | No framework defect established; API design is inconsistent. | Keep and standardize contracts, dependency/session patterns. | Low risk to retain; broad upgrade adds churn. | Retain. |
| SQLAlchemy 2 async + asyncpg | Correct stack, but report sync `query()` incompatible and cross-domain ORM ownership is leaky. | Standardize async select/session and domain service contracts. | Moderate targeted work. | Retain; fix usage, not ORM. |
| Alembic | One flattened root revision in current tree; old revisions deleted in worktree; package omitted from requirements. | Restore a deliberate migration lineage after comparing deployed schema. | High data-loss/upgrade risk if squashed without production inventory. | Do not regenerate/delete history until database provenance is known. |
| React 18 + React Router 6 + TanStack Query | Mixed state strategy, static route imports and client/server contract drift. | Keep; use consistent query cache and route lazy loading. | Low-to-moderate. | Targeted cleanup, no framework swap. |
| Vite 7 + TypeScript 5.2 range | No current issue demonstrated; local proxy is coherent. | Keep; add type/lint/test CI once allowed. | Low. | Retain. |
| Redis 7 client | Only rate limit observed; fail-open behavior and configuration mismatch. | Keep only if rate limiting/cache needs it; atomic operations and operational health. | Moderate operational concern. | Retain as optional infra; do not call it a cache layer today. |
| Modular monolith | Boundaries exist but direct ORM cross-writes and two parallel organizations (`domains`/`modules`) undermine them. | Formalize ownership/contracts and transaction boundaries. | Moderate. | Retain and clarify boundaries; no microservices. |

The current technology is not the primary reason the ERP is incomplete or feels slow. Workflow correctness, endpoint contracts, pagination, event persistence, and route availability dominate.

## # 27. Target Architecture

**Recommendation: remain a modular monolith.** One deployment, one PostgreSQL transaction boundary and a staff-oriented React UI fit the evidenced showroom ERP. Current team/deployment scale and external integration needs are unknown; no evidence supports a service-distribution boundary. Splitting now would make the broken cross-domain consistency harder, not easier.

Target direction within the monolith:

- Keep clear owners: CRM owns leads/followups; Master owns customer/catalog/vehicle/vendor; Inventory owns stock ledger/availability; Sales owns sale lifecycle; Billing owns legal invoice; Finance owns financing/accounting scope; Service owns job/work lines; Warranty owns claims; Insurance owns policies; Reports owns read models.
- Other modules call typed application contracts for reads/writes; no module directly constructs another module's ORM aggregate.
- Cross-domain writes that must be atomic stay in one DB transaction. Only noncritical notifications/integrations go through a durable outbox/worker after core commit.
- Use explicit state transition functions and stable request/response schemas, plus one documented API versioning policy.
- Preserve PostgreSQL referential constraints where ownership does not require soft links; deliberately document exceptions and reconciliation.

## # 28. Quick Wins

- **Performance:** paginate Sales/CRM/Staff/Procurement/Service lists; push CRM/Sales filters to server; restrict dashboard inventory query in SQL; aggregate spare stock in one query.
- **UX:** expose only implemented pages in route/sidebar; correct admin redirect; show query errors distinctly from empty results; remove BillingPage's hardcoded empty list or defer route until it loads API data; make selectors search/paged when datasets grow.
- **Architecture:** designate one CRM lead client and one Customer client; align method/query/body with OpenAPI; define response model for Setup CRUD.
- **Reliability:** add a small set of DB-backed tests for lead conversion, vehicle intake, sale+invoice, stock issue and report query; do not expand event bus until a real session/lifecycle/outbox is tested.
- **Developer experience:** decode/reformat backend requirements into supported UTF-8 format after checking install behavior; declare Alembic; record supported Python version and startup/migration commands; add CI typecheck/lint/test jobs.

## # 29. Must Fix Before Development

1. Agree on the sale/payment/invoice/delivery owner and process; current parallel APIs cannot be extended safely without this.
2. Prove a database transaction for vehicle availability, sale creation and stock transition; stop relying on current in-memory mock event listeners for persisted facts.
3. Decide if model is mandatory at lead creation; this affects UI, Pydantic, FK nullability/migration and downstream sales conversion.
4. Establish a migration baseline against the actual database and ensure a clean dependency install can run Alembic. Do not run a fresh migration against real data as an exploratory check.
5. Add focused characterization/integration tests for the above slice. There are currently no project tests.
6. Establish whether this is one showroom or multiple dealer tenants; if multiple, data scoping is a foundational security constraint, not a later feature.

This is intentionally a small set of decisions and slice gates, not a broad refactor mandate.

## # 30. Do Not Fix Yet

- Do not extract microservices, introduce event sourcing, or replace FastAPI/SQLAlchemy/React.
- Do not add Salesforce APIs, middleware, credentials, webhooks or two-way sync until Salesforce access, object mapping and ownership are confirmed.
- Do not build AI features; deterministic workflow/status/stock corrections are sufficient now.
- Do not build a generic workflow engine or broad accounting suite before confirming product scope.
- Do not add every requested UI module to navigation simply because a page file exists; verify end-to-end backing functionality first.
- Do not perform a repository-wide model/service split or rename all statuses before the core lifecycle decisions and tests exist.
- Do not rewrite migration history or drop/merge duplicate tables until actual deployed schema/data has been inventoried.

## # 31. Recommended Restart Point

### First
**Make one vehicle sale lifecycle dependable: received vehicle -> available -> sale/booking -> payment -> one invoice -> delivery.** Begin by agreeing which current create path is authoritative, then characterize it with a test using PostgreSQL. This is the most central revenue/stock workflow and currently crosses Procurement, Master, Inventory, Sales, Billing and Finance with silent event gaps.

### Why
- `process_vehicle_intake()` inserts the vehicle but relies on a dead event listener for inventory movements.
- Sale availability reads Master `current_status`, while Inventory exposes movement-derived status.
- Sales has two transaction creation routes and three invoice representations.
- Payment state has two ledgers and no reconciliation/idempotency.
- Delivery route gates on Sale flags while Billing requires sale status DELIVERED.
- No tests currently guard this lifecycle.

### Prerequisites
- Product decision on invoice numbering/tax/discount approval and owner of sale/payment/invoice.
- Decide if lead conversion is required before sale and whether lead can omit model.
- Verify current DB revision/schema and real migration lineage before any schema change.
- Decide whether dealer data is single-tenant or must be isolated by `dealer_id`.

### Explicitly do not build
Salesforce integration, AI, new sale lifecycle stages, a general accounting ledger, or microservices before the existing sale slice is correct and measured.

## # 32. Vertical Slice Roadmap

### Vertical Slice 1: Intake to delivered sale

Vendor and model preconditions -> bulk vehicle intake -> one authoritative stock record/state -> customer and sale/booking -> payment -> one invoice -> required delivery checks -> delivery record/state -> report row. Include duplicate submission, rollback, permission, and concurrent sale tests. Replace the broken event side effect with an explicit in-transaction write or a correctly designed outbox for noncritical effects.

### Vertical Slice 2: Lead to customer to sale

Capture lead according to owner decision -> assignment/history -> one follow-up model -> test ride list/create -> convert to purchaser + nominee -> sale references same customer and lead -> CRM/report state. Enforce the selected lead-model rule and avoid duplicate lead conversion.

### Vertical Slice 3: Service visit to warranty resolution

Find customer/vehicle -> open job -> diagnosis/work/labor estimate -> customer approval/free-service coverage -> spare issue with persisted consumption and stock movement -> bill/close job -> warranty claim tied to consumption -> approval/replacement/shipment/closure -> service and warranty followups. This is a true slice only once the owner defines the workshop and OEM claim requirements; current implementation is a shell.

## # 33. Unknowns

- **UNKNOWN-001:** Can a lead exist before model selection, for broad interest, multiple models, or out-of-catalog products?
- **UNKNOWN-002:** Does the active PostgreSQL schema match current 57-table migration and current worktree model metadata? Table-name equality does not answer this.
- **UNKNOWN-003:** What is the production Alembic revision and lineage? Older revisions are deleted in current worktree; deployed DB may have them.
- **UNKNOWN-004:** Is Redis running and configured/authenticated? This audit has no conclusive PING result.
- **UNKNOWN-005:** Does Salesforce API access exist for the required billing process, and which Salesforce edition/org objects are involved?
- **UNKNOWN-006:** Which system is authoritative for customer, sale, invoice, payment, tax, discount and delivery state?
- **UNKNOWN-007:** Does the showroom operate as one tenant or multiple independent dealers/showrooms? Most business rows lack dealer scoping.
- **UNKNOWN-008:** Are manual portal trackers for subsidy, RTO, CELEX, number plates and insurance actively used and required?
- **UNKNOWN-009:** What are the statutory invoice, GST/tax, numbering, revision, cancellation, credit note, receipt, refund and audit requirements?
- **UNKNOWN-010:** Are purchase `include_in_accounting`, expense categories, vendor invoice data, and loan status actively used outside the visible UI?
- **UNKNOWN-011:** What are actual data volumes, query timings, browser network traces, supported devices and deployment SLAs? No profiling evidence.
- **UNKNOWN-012:** What service workshop data (labor, diagnostics, estimate approvals, kilometers, free-service rules) is required?
- **UNKNOWN-013:** What warranty/OEM claim, approval, inward, replacement and shipment handoff must be represented?
- **UNKNOWN-014:** Are any tests/deployments/integrations maintained outside this workspace snapshot?
- **UNKNOWN-015:** Which entity's variant definition includes trim, battery, color, range, price and model year?

## # 34. Questions for Product Owner

### BLOCKING
1. Is a lead an early enquiry or only an expressed intent for a specific catalog model? How are undecided, multiple-model and out-of-catalog enquiries represented?
2. For the sale and invoice, which application is system of entry and record: ERP or Salesforce? Does the Salesforce org provide enabled API access and a sandbox for the required objects?
3. What is the canonical sale progression, and which exact events create a booking, collect payments, issue tax invoice, reserve stock and allow delivery?
4. What are the required tax, discount, approval, invoice number/revision/cancel/refund rules? Is ERP expected to be a legally authoritative invoice system?
5. Is the target operating model one showroom or multiple dealers with data isolation? Which roles may see/edit each customer, lead, stock, sale and financial record?

### IMPORTANT
6. What does “Finance” mean in scope: vehicle lender tracking only or full cashbook/AP/AR/general ledger/expenses?
7. Are variants/trim/color separate sellable SKUs? Is `colour` a model property or unit/variant attribute?
8. What service job-card fields, labor/parts pricing, approvals, billing, free-service coverage and technician workflow are required?
9. What is the OEM warranty lifecycle, required claim states and real identifier linking the replaced part to service consumption?
10. Are policy renewals and insurance claims required, or is the app only recording original policy details at delivery?
11. Which portal checklist items (subsidy, RTO, CELEX, registration and plates) are actively used and who updates them?
12. Should staff PIN delivery use SMS/email/administrator handoff, and what account recovery/retention policy applies?

### LATER
13. What list sizes/search fields and mobile/tablet workflows are typical? This informs pagination and UX density.
14. Which reports are operationally required, who can see them, and what source data is authoritative?
15. What retention/deletion policy applies to Aadhaar, PAN, bank and customer data, and which actions need immutable audit history?
16. What response-time and availability targets should be used to measure reported slowness?

## # 35. Final Recommendation

Keep the existing stack and modular-monolith deployment shape, but do not treat the current module names or page files as proof of complete capabilities. The highest-risk issue is that cross-module stock, CRM, billing and finance side effects are implemented as events that are not actually processed. The next is the competing sale/payment/invoice design, followed by missing test coverage and frontend/backend contract drift.

Resume with a product-approved, tested intake-to-delivery sale slice. Keep its core database facts atomic; make side effects observable and durable; maintain one source for vehicle availability, invoice, payment and status; then reconnect or retire orphaned screens according to real user workflows. Salesforce, lead qualification policy, multi-dealer isolation and legal billing remain explicit decisions, not assumptions.

### Evidence file index

- App and route registration: `backend/app/main.py`
- Model bootstrap: `backend/app/bootstrap.py`
- SQLAlchemy model inventory: `backend/app/domains/master/models.py`, CRM/procurement/service/insurance/warranty models, and `backend/app/modules/{sales,inventory,billing,finance}/models.py`
- Current migration: `backend/alembic/versions/191eb4aa4173_initial_flattened_migration.py`
- Auth/session/roles: `backend/app/auth/routes.py`, `dependencies.py`, `roles.py`, `backend/app/db/session.py`
- Core event defects: `backend/app/core/event_bus.py`, `backend/app/modules/inventory/listeners.py`, `backend/app/domains/master/listeners.py`, `backend/app/domains/crm/listeners.py`, `backend/app/modules/billing/listeners.py`, `backend/app/modules/finance/listeners.py`
- Lead evidence: `backend/app/domains/crm/{routes.py,schemas.py,services.py,models.py}` and `frontend/src/modules/crm/components/LeadForm.tsx`
- Sale/billing evidence: `backend/app/modules/sales/{routes.py,schemas.py,services.py,models.py}` and `backend/app/modules/billing/{routes.py,services.py,models.py}`
- Reporting: `backend/app/domains/reports/{routes.py,services.py}`
- Frontend routing/design: `frontend/src/App.tsx`, `frontend/src/components/layout/{Sidebar.tsx,Layout.tsx,Header.tsx}`, `frontend/src/index.css`, `frontend/src/lib/api.ts`
- Build/dependency manifests: `backend/requirements.txt`, `frontend/package.json`, `frontend/vite.config.ts`
