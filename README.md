# ⚡ Electric Vehicle Showroom ERP

## 📌 Project Overview

**Electric Vehicle Showroom ERP** is a modular, production-oriented **Enterprise Resource Planning (ERP) system** designed specifically for **Electric Two-Wheeler Showrooms**.

The objective of this project is to build a **real-world dealership management system** that covers the complete operational lifecycle of an EV showroom — from customer enquiry to sales, service, warranty, inventory, OEM compliance, and reporting.

This project is being designed based on **actual showroom workflows and OEM practices**, not as a theoretical or academic exercise.

---

## 🎯 Project Goals

- Replace Excel-based and manual showroom operations
- Maintain **accurate inventory with serial-level traceability**
- Handle **complex service and warranty workflows**
- Support **OEM reimbursement and compliance**
- Build a **full CRM system** (leads → follow-ups → conversion → retention)
- Provide **clean, auditable data** for accounting and reporting
- Ensure scalability for **future multi-branch expansion**

---

## 🏗️ Current Phase – System Design & Database Architecture

The project is currently in the **architecture and database design phase**.

At this stage, the focus is on:
- Identifying real-world business entities
- Designing a **fully normalized PostgreSQL database**
- Defining clear data ownership between modules
- Ensuring audit safety, data integrity, and future extensibility

No frontend or backend code has been implemented yet.  
The foundation is being built first to avoid rework later.

---

## 🧩 Modules Designed / In Progress

### ✅ Core Modules (Database Design Locked)

#### 🔹 Master Data
- Customer management (multiple phones, documents, GST, Aadhaar, PAN)
- Vendor management (OEM & non-OEM, representatives, documents)
- Vehicle models and variants
- Spare master with pricing policy (dealer landing price & margin)

#### 🔹 Procurement
- Vehicle purchase from OEM (one vehicle per invoice)
- Spare purchase from OEM and other vendors
- Warranty inward (OEM replacement parts received with invoice)

#### 🔹 Inventory Management
- Ledger-based spare stock movement (no static stock values)
- Serial-numbered spare tracking
- Correct handling of:
  - paid service usage
  - insurance usage
  - counter spare sales
  - warranty replacements (no stock leakage)

#### 🔹 Sales & Billing
- Vehicle sales with booking and mixed payment handling
- Editable invoices (Draft → Finalized)
- Counter spare sales
- Insurance estimates and final billing

#### 🔹 Service & Workshop
- Job cards with mixed service, warranty, and insurance work
- Labour decided at job completion
- Vehicle stay duration tracking
- Component serial replacement tracking

#### 🔹 Warranty Management
- Component-level warranty claims
- OEM Service Order (SO) number tracking
- Claim status tracking (raised, approved, rejected)
- Courier docket and shipment tracking
- Serial-level fault audit

#### 🔹 OEM Reimbursement
- Free service claims (count-based)
- Warranty labour claims (job-based)
- Periodic invoices raised to OEM for accounting and settlement

---

## 🚀 Planned Development Phases

### 🔹 Phase 1 – Full CRM System
- Lead and enquiry management
- Follow-up tracking (calls, WhatsApp, visits)
- Lead status and temperature tracking (HOT / WARM / COLD)
- Test ride tracking
- Missed follow-up detection
- Staff-wise performance and conversion analysis

### 🔹 Phase 2 – Compliance & Vehicle Lifecycle
- RTO registration tracking
- RC and number plate management
- Insurance lifecycle tracking and renewals
- Customer document workflows

### 🔹 Phase 3 – Automation & Customer Engagement
- Service due reminders (OEM km / month logic)
- Insurance renewal reminders
- Customer feedback and complaint tracking
- Communication activity logging

### 🔹 Phase 4 – Reporting & Analytics
- Sales and purchase summaries
- Inventory valuation
- Service and warranty analytics
- OEM reimbursement status
- CA-friendly financial summaries

### 🔹 Phase 5 – Application Development
- Backend API implementation (planned with Python)
- Desktop-based user interface
- Role-based access control
- Data migration from legacy Excel systems

---

## 🧠 Design Principles

- Database-first architecture
- No hardcoded business logic
- Audit-safe and OEM-compliant design
- Frontend flexibility for pricing and billing
- Modular and scalable structure

---

## 🛠️ Planned Tech Stack

- **Database:** PostgreSQL  
- **Backend:** Python (planned)  
- **Frontend:** Desktop-based application (planned)  
- **Version Control:** Git & GitHub  

---

## 📈 Project Status

🚧 **Active Design Phase**

This repository will gradually include:
- Database schemas
- SQL scripts
- System documentation
- Backend and frontend code in later phases

---

## 👤 Author

**Harshit Soni**  
B.Tech (3rd Year)  
Focused on building **real-world, production-grade software systems**
