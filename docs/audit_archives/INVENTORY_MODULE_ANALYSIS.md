# INVENTORY MODULE: ARCHITECTURE & WORKFLOW ANALYSIS

This document outlines the complete implementation, dependencies, and business workflows of the `inventory` module within the ERP codebase. It is designed to help you understand how inventory operates in this decoupled architecture and how to adapt it to your specific showroom functioning.

---

## 1. Architectural Strategy (DDD Decoupling)

The Inventory module is built using **Domain-Driven Design (DDD) Phase 1 Decoupling**. 
What does this mean for your showroom?
- **No Hard Database Joins:** The inventory models (`module_vehicle_stock_movement`, `module_spare_stock_movement`, `module_spare_master`) **do not use Foreign Keys** pointing to other modules (like `master.vehicle` or `sales.sale`).
- **Contracts over ORM:** If `Sales` needs to check if a vehicle is available, it does not query `VehicleStockMovement`. Instead, it calls a function in `inventory.services` which returns a Pydantic "Contract" (`VehicleAvailabilityResponse`).
- **Event-Driven Workflows:** When a vehicle is purchased by Procurement, or sold by Sales, the inventory is **not** updated synchronously. Instead, an event is fired on the `EventBus` (e.g., `VehicleIntakeEvent`, `SaleCreatedEvent`), and the Inventory module listens to these events to adjust stock asynchronously.

---

## 2. Core Database Models

The inventory module relies on these dedicated tables located in `backend/app/modules/inventory/models.py`:

### Vehicle Tracking
1. **`VehicleStockMovement`**
   - Tracks the lifecycle of a specific chassis number.
   - **Allowed Movement Types:** `INWARD`, `AVAILABLE`, `ALLOCATED`, `DELIVERED`, `SERVICE_OUT`, `SERVICE_IN`, `DEMO`, `TRANSFER`, `SCRAPPED`.
   - **Reference Tracking:** Links back to the event that caused the movement (e.g., `reference_type='SALE'`, `reference_id=102`).

### Spare Parts Tracking
2. **`SpareMaster`**
   - The master catalog of all spare parts (`spare_code`, `spare_name`, `is_serialized`, `is_temporary`).
   - *Note: Temporary spares can be created on-the-fly during Procurement if the mechanic/staff doesn't find the exact part. They must be approved later.*
3. **`SpareSerial`**
   - Tracks individual, serialized high-value spare parts (e.g., batteries, specific motors).
4. **`SpareStockMovement`**
   - Ledger of spare parts quantities. Stock balance is derived dynamically via `SUM(quantity)`.
   - **Allowed Movement Types:** `PURCHASE`, `SALE`, `SERVICE_CONSUMPTION`, `WARRANTY_INWARD`, `WARRANTY_OUTWARD`, `ADJUSTMENT`.

---

## 3. Workflows & State Machine

To adapt this to your showroom, you need to align your physical processes with these software workflows:

### Workflow A: Vehicle Procurement (OEM to Showroom)
1. **Trigger:** `procurement` module processes an OEM invoice (`process_vehicle_intake`).
2. **Action:** 
   - `procurement` creates the invoice.
   - `procurement` inserts the new `chassis_no` into `master.vehicle` with status `IN_STOCK`.
   - `procurement` fires `VehicleIntakeEvent`.
3. **Inventory Reaction:** Receives event, creates a `VehicleStockMovement` of type `INWARD`. 

### Workflow B: Selling a Vehicle (Showroom to Customer)
1. **Trigger:** `sales` module creates a Sale.
2. **Pre-Check:** Sales calls `check_vehicle_availability()` contract to ensure the chassis is `AVAILABLE` or `INWARD`.
3. **Action:** 
   - Sale is created.
   - `sales` fires `SaleCreatedEvent(status='BOOKED')`.
4. **Inventory Reaction:** Creates a `VehicleStockMovement` of type `ALLOCATED`. The vehicle can no longer be sold to anyone else.
5. **Completion:** When the transaction is completed, a `VehicleDeliveredEvent` fires, changing the inventory movement to `DELIVERED`.

### Workflow C: Spare Parts & Service
1. **Procurement:** `SparePurchasedEvent` adds positive stock to `SpareStockMovement`.
2. **Service Consumption:** When a mechanic uses a part on a Job Card, a `SpareConsumedEvent` fires, adding a negative quantity to `SpareStockMovement`.
3. **Guardrails:** The `inventory` service strictly checks `SUM(quantity)` before allowing consumption. If stock drops below zero, it throws an `InsufficientSpareStockError`.

---

## 4. Dependencies & Integrations

The inventory module sits in the middle of the ERP and interacts with:
- **Master Module:** Relies on `master.vehicle` for base vehicle data, but only links via string `chassis_no`.
- **Procurement Module:** Source of all inbound stock (vehicles and spares).
- **Sales Module:** Primary consumer of vehicle stock.
- **Service/Warranty Modules:** Primary consumers of spare stock.
- **Event Bus:** (`backend/app/core/event_bus.py`) The critical asynchronous router. **If the event bus task dies or isn't started in FastAPI lifecycle, inventory will freeze and not update.**

---

## 5. What You Need to Change / Adapt for Your Showroom

To properly mold this module to your physical showroom, consider the following action items:

1. **Verify Location Tracking:** 
   Currently, `VehicleStockMovement` has `from_location` and `to_location` as plain strings. If you have multiple warehouses or a secondary lot, you might want to create a `LocationMaster` and enforce strict location IDs instead of strings.
2. **Pre-Delivery Inspection (PDI) Workflow:** 
   Currently, vehicles jump from `INWARD` directly to `AVAILABLE` or `ALLOCATED`. If your showroom requires a PDI before a vehicle can be allocated to a sale, you need to add a `PDI_PENDING` and `PDI_PASSED` movement type to the `CHK_MOD_VEHICLE_MOVEMENT_TYPE` constraint.
3. **Physical Stock Audits (Adjustments):**
   The database supports `ADJUSTMENT` for spares, but there is no dedicated UI/API endpoint for a manager to perform an end-of-month physical stock audit and write-off missing parts. This API needs to be built.
4. **Temporary Spares Approval Loop:**
   Mechanics can create "temporary" spares if they don't find them in the system. You need an Admin UI screen that queries `list_temporary_spares()` so a manager can assign prices and approve them (`approve_temporary_spare()`).
5. **Event Handlers Implementation:**
   The `EventBus` and Event schemas exist, but the actual listener functions (e.g., `def on_vehicle_intake(...)`) that catch these events and call `add_vehicle_movement` need to be wired up in an `events.py` file within the inventory module and registered on app startup.

---

### *Recent Fix Noted*
During this analysis, a bug was found where `procurement` was attempting a hard database join against the decoupled `inventory` spare models, causing the backend to crash on startup/query. **This has been fixed.** The backend now correctly queries the `inventory` module independently when listing spare purchases.
