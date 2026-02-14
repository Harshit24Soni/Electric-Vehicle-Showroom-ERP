# Project Requirements & Roadmap

## 1. Core Principles & Rules
> **Source**: Originally from `CHANGES.md`. These rules are inviolable.

### General Rules
1.  **CSS Styling**: Do not change the CSS styling of this app since I love the CSS and flows etc.
2.  **Tab Structure**: Each tab must have all the details related to that tab. Example: Leads tab: Creation of new lead, followup of all the leads, messages sent to those leads, latest update, reports of the all the leads that exist.
3.  **API Usage**: The frontend must and must use the APIs created in the backend folder only to fetch the data from the backend and not connect to the backend without them.
4.  **API Flexibility**: You may change the APIs in order to meet my functionality of the frontend.
5.  **Cleanup**: Always delete files that turn obsolete i.e. are no longer in use.

### Module Specific Rules

#### 1. Login Page
-   **No Staff ID Login**: I don't want the staff to be able to login using the staff id. The staff id is only meant for the database tracking and not to be displayed anywhere to the staff or the dealers as well. It can be accessed by the admin.
-   **Forgot PIN**: There should be an option to ping the admin that the staff has forgotten their login pin by clicking on a option such as forgot pin. If the dealer himself forgets the pin we must have an alternat route for him to access the portal and change the pin.

#### 2. CRM
-   **Leads First**: The leads is very first task that is involved in the sales. When a customer arrives the staff ensures that they note their details as a lead and not first create a customer. This lead is then used to track followup calls in regards to purchase. When any customer agrees to buy the vehicle they will visit the showroom and we will convert that lead and use that leads data to sync with the customer records. We should be asked whether we need to use the name number etc that we stored of the lead or do we just want to reference that lead to this customer.
-   **Lead Conversion**: When that lead is converted then the form to fill the details of the customer is avilable in the customer tab itself with a proper marker stating that a new lead is converted and fill the necessary details to proceed.
-   **Nominee Details**: A few columns and a very important aspect of a customer is missing which is also missing from the database i.e. Nominee details for insurance. (We need details such as Nominee name, DOB, relation).
-   **CRM Tab Logic**: The CRM tab is mainly the one which shows follow up records i.e. Sales follow up against a lead, Service follow up for the vehicles which are due for service, Insurance follow up for the vehicles whose insurance will expire in a few days. These are the details that should be shown in the CRM tab.
-   **Enquiry Tab**: A enquiry in itself must be a different tab that allows to track the number of active enquiries what is the latest followup again a enquiry, what is the latest message that we have shared with that lead.

#### 3. Customer
-   **Lead Reference**: Every new customer may or may not reference a lead that we created using the enquiry. We must have the option of add customer but along with that when we in the Leads tab to converted, it must get reflected into the customer tab and prompt us to enter all the necessary details to proceed with the billing.
-   **Direct Creation**: THere may also be a chance that no lead exists and we need to create the customer directly so we should be able to do that.
-   **Customer History**: The customer table must also show all the details such as exisiting customers with the number of vehicles they have and what is the status of that vehicle like when was it last serviced, or when was the last warranty processed etc.
-   **Definitions**: Lead is the partial data recorded of the customer as per their interest at that moment and a customer record is when they finally buy vehicle from us.

---

## 2. Recommended Changes & Roadmap
> **Source**: Originally from `RECOMMENDED_CHANGES.md` (Feb 5, 2026).
> **Status Update**: As of Feb 2026, Backend Phase 1 is complete.

### 1. BACKEND API IMPLEMENTATION (CRITICAL) 🔴
**Status: ✅ COMPLETED**

#### 1.1 CRM Lead Endpoints
**File:** `backend/app/domains/crm/routes.py`
- [x] Endpoints to Implement: `POST /crm/leads`, `GET /crm/leads` (list & single), `PUT /crm/leads`, `DELETE /crm/leads`, `POST /crm/leads/{id}/convert`, `GET /crm/leads/{id}/activities`.
- [x] Business Logic: Lead creation independent of customer_id, status management, activity tracking.

#### 1.2 Enquiry Endpoints
**File:** `backend/app/domains/crm/routes.py`
- [x] Endpoints: `POST /crm/enquiries`, `GET /crm/enquiries` (list & active stats), `GET/PUT` single enquiry.
- [x] Features: Track active enquiries, latest followup, sync with lead status.

#### 1.3 Lead-to-Customer Conversion
- [x] Logic: Fetch lead -> Create customer (ref lead_id) -> Copy data (optional) -> Update lead status -> Return customer details.

### 2. NOMINEE MANAGEMENT (HIGH PRIORITY) 🔴
**Status: 🔄 IN PROGRESS**
**File:** `backend/app/domains/master/routes.py`
- [ ] Endpoints: CRUD for `/master/customers/{id}/nominees`.
- [ ] Features: Multiple nominees, primary flag, relationship validation.
- [ ] Customer Details API: Should include nominee list, vehicle count, last service/warranty dates.

### 4. PIN RESET REQUEST TRACKING (MEDIUM PRIORITY) 🟡
**Status: ✅ COMPLETED**
- [x] Model: `PinResetRequest` (implied in Auth flow).
- [x] Feature: Admin notification system for resets (via `forgot-pin` flow).

### 5. FOLLOW-UP TRACKING ENHANCEMENT (MEDIUM PRIORITY) 🟡
**Status: ✅ COMPLETED (Backend)**
- [x] Dashboard: Unified view of Sales (Leads), Service (Due dates), and Warranty (Expiry) follow-ups.

### 6. FRONTEND UPDATES (CRITICAL) 🔴
**Status: ⏳ PENDING**
#### 6.1 Login Page
- [ ] Remove "Staff ID". Use Mobile/Email + PIN.
- [ ] Add "Forgot PIN" and "Dealer PIN Reset" (OTP) flows.

#### 6.2 CRM Module Restructuring
- [ ] **Leads Tab**: Create, List, Followups, Convert.
- [ ] **Enquiries Tab**: Active list, stats.
- [ ] **Customers Tab**: List (w/ vehicles/service status), Add (Direct or via Lead), Nominee Mgmt.
- [ ] **FollowUps Tab**: Aggregated dashboard.

### 7. CUSTOMER DETAIL VIEW ENHANCEMENT (HIGH PRIORITY) 🔴
**Status: ⏳ PENDING**
- [ ] **Display**: Personal Info, Nominees (Manage), Vehicles (Service/Warranty status), Activity Timeline.

### 8. API CLIENT UPDATES 🔴
**Status: ⏳ PENDING**
- [ ] Extend `api.ts` for all new endpoints (Leads, Enquiries, Nominees, Auth/OTP).

### 9. STATE MANAGEMENT 🟡
**Status: ⏳ PENDING**
- [ ] Update Zustand stores (`authStore`, `leads`, `enquiries`, etc.).

### 10. VALIDATION & ERROR HANDLING 🔴
**Status: ✅ COMPLETED (Backend) / ⏳ PENDING (Frontend)**
- [x] Strict validation for Mobile, Email, DOB (Pydantic models).
- [ ] User-friendly error messages (Frontend).

### 11. DATABASE MIGRATION STRATEGY 🔴
**Status: ✅ COMPLETED**
- [x] SQL scripts/Alembic for: Lead fields, Enquiry table, Nominee table, Customer lead_ref, Pin Reset table.

### 12. TESTING CHECKLIST 🔴
**Status: 🔄 IN PROGRESS**
- [x] Unit/Integration tests for all new flows (Login, Lead->Customer, Nominees - Backend verified).

### 13. PROJECT MILESTONES
- [x] **Phase 1 (Critical)**: Backend Schema/APIs, Login Page (Backend), OTP.
- [ ] **Phase 2 (High)**: CRM Restructuring, Conversion UI, Nominees.
- [ ] **Phase 3 (Medium)**: Follow-up Dashboard, Admin Notifications.
