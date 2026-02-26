# Electric Vehicle Showroom ERP - Implementation Workflow & Architectural Reference

## Core Architectural Principles (DO NOT DEVIATE)
1. **Soft Deletes Only:** Core records (Staff, Customers, Vehicles) are never permanently deleted. Use `is_active=False` and audit fields (`created_by`, `updated_by`).
2. **Leads-First CRM:** Customers cannot be created out of thin air. They must be converted from an existing Lead to maintain a complete history.
3. **Mandatory Nominees:** Every Customer record must have Insurance Nominee details (Name, DOB, Relation) prior to finalizing a sale.
4. **Authentication:** Login is strictly via Mobile/Email + PIN. Staff ID is for internal DB mapping only.
5. **UI Data Display:** Always display sequential `S.No.` in UI tables. Never expose raw DB UUIDs or primary keys to the user.
6. **Self-Contained UI Modules:** A single tab must contain all relevant workflows without forcing the user to bounce between disparate pages.
7. **DDD Backend Structure:** `routes.py` -> `services.py` -> `schemas.py` -> `models.py`.
8. **Component Modularity (Vehicles):** Vehicles are "Aggregate Roots". Batteries and Motors are separate serialized inventory items linked to a Chassis (VIN). They can be unlinked and swapped for warranty/service.
9. **Margin Protection (Pricing):** Never rely strictly on static master prices for sales. Sales validation must check the actual *procurement cost* of the specific inventory batch/serial to prevent selling at a loss.
10. **Lead Assignment:** Leads are owned by `assigned_to`. Defaults to the creator. Admins/Dealers can reassign.

---

## Phase 1: Setup & Access Management (CURRENT FOCUS)
*Goal: Establish the showroom identity, staff hierarchy, and secure access.*

* **Step 1.1: Showroom Configuration**
  * Define Dealership Details (Name, GSTIN, Address, Contact).
* **Step 1.2: Staff & Role Management**
  * Create base roles (Admin, Sales Rep, Service Tech, Finance Manager).
  * Register staff members (Mobile, Email, PIN, Role assignment).
  * Ensure the `seed_admin` operates flawlessly to bootstrap this.

## Phase 2: Master Data Initialization
*Goal: Populate the foundational data required for operational modules.*

* **Step 2.1: Master Catalogs**
  * Define EV Models, Colors, and Base Pricing.
  * Define universal Spare Parts catalog.
* **Step 2.2: Vendor & Financier Management**
  * Register vehicle OEMs, spare part suppliers, and partner banks/NBFCs.

## Phase 3: Procurement & Inventory Setup
*Goal: Bring physical assets into the digital system.*

* **Step 3.1: Serialized Intake (Vehicles & Batteries)**
  * Receive vehicles. Map VIN to Motor No. and Battery Serial No.
  * Record actual procurement cost per unit for margin protection.
* **Step 3.2: Bulk Intake (Spares & Accessories)**
  * Log non-serialized items using FIFO batches.

## Phase 4: The "Leads-First" CRM
*Goal: Track consumer interest from walk-in/web to final conversion.*

* **Step 4.1: Lead Profiling & Assignment**
  * Capture info. Assign ownership (creator or admin-assigned).
* **Step 4.2: Follow-up & Test Rides**
  * Schedule follow-ups. Map a demo inventory vehicle to a Lead for a test ride.

## Phase 5: Sales, Finance & Billing
*Goal: Convert Lead to Customer and process the transaction.*

* **Step 5.1: Customer Conversion & Nominee Capture**
* **Step 5.2: Finance & Insurance Attachment**
* **Step 5.3: Margin-Safe Invoicing**
  * Final Tax Invoice generation (validating selling price against procurement cost).

## Phase 6: Post-Sale (Service & Warranty)
* **Step 6.1: Job Cards & Inventory Consumption**
* **Step 6.2: Component Swapping (Warranty)**
  * Unlink old battery serial, link new battery serial to VIN. Track OEM claims.