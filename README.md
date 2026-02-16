# Electric Vehicle Showroom ERP

![Status](https://img.shields.io/badge/Status-Active%20Development-brightgreen)
![Backend](https://img.shields.io/badge/Backend-FastAPI-009688)
![Frontend](https://img.shields.io/badge/Frontend-React_18-61DAFB)
![Database](https://img.shields.io/badge/Database-PostgreSQL_15+-336791)

## ⚡ Overview

The **Electric Vehicle Showroom ERP** is a high-performance, enterprise-grade solution designed to streamline the operations of single or multi-brand EV dealerships. It unifies inventory, sales, customer relationship management (CRM), finance, and after-sales service into a single reactive platform.

Built with a **FastAPI** (Python) backend and a **React 18** frontend, the system prioritizes speed, data integrity, and a premium user experience.

---

## 🌟 Key Features

### 🏢 Unified Setup & Administration
- **Centralized Master Data**: Manage Brands, Payment Modes, Banks, Insurance Companies, and Document Types from a single **Setup Module**.
- **Role-Based Access Control (RBAC)**: secure hierarchy with **Admin**, **Dealer**, and **Staff** roles.
- **Smart Staff Management**: "Soft Delete" architecture ensuring no staff data is ever permanently lost; includes "Active/Inactive" toggle and restore capabilities.
- **Audit Trails**: Automatic tracking of `created_by` and `updated_by` for all core records.

### 🤝 CRM & Sales Pipeline
- **Lead Management**: Track potential customers from Enquiry to Booking.
- **Follow-up System**: Automated schedules for sales inquiries, service reminders, and insurance renewals.
- **Digital Conversions**: Seamlessly convert Leads to Customers with data persistence.
- **Nominee Management**: Capture insurance nominee details linked to customer profiles.

### 🚗 Inventory & Procurement
- **Vehicle Lifecycle**: Track Chassis numbers from Inward (Procurement) to Outward (Delivery).
- **Multi-Brand Support**: dynamic handling of different OEM models and variants.
- **Spare Parts**: Real-time stock tracking with auto-consumption logic during Service.

### 🛠️ Service & Warranty
- **Job Cards**: Digital job cards for vehicle servicing.
- **Warranty Claims**: End-to-end claim processing integrated with OEM requirements.

### 💰 Finance & Billing
- **GST Invoicing**: Automated tax calculation and invoice generation.
- **Payment Tracking**: Support for multiple payment modes, partial payments, and finance/EMI logs.

---

## 🏗️ Technical Architecture

### Backend (`/backend`)
- **Framework**: FastAPI (Async Python 3.10+)
- **Database**: PostgreSQL 15+
- **ORM**: SQLAlchemy 2.0 (Async) + Alembic (Migrations)
- **Caching**: Redis (Rate Limiting & caching)
- **Security**:
  - JWT Authentication (Access + Refresh tokens)
  - Argon2 Password Hashing
  - PIN-based login for Staff
- **Architecture**: Domain-Driven Design (DDD) with clear separation of concerns (`routes`, `services`, `schemas`, `models`).

### Frontend (`/frontend`)
- **Framework**: React 18 + Vite (TypeScript)
- **State Management**: Zustand (Global Store) + TanStack Query v5 (Server State)
- **UI System**: Tailwind CSS v3 + Lucide Icons + Shadcn/UI-inspired components.
- **Forms**: React Hook Form + Zod Validation.
- **Experience**: Skeletal loading states, Optimistic updates, Responsive design.

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 12+
- Redis (Optional for dev, required for prod)

### Quick Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Harshit24Soni/Electric-Vehicle-Showroom-ERP.git
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # or .\venv\Scripts\activate
   pip install -r requirements.txt
   # Configure .env (see CONTRIBUTING.md)
   alembic upgrade head
   uvicorn app.main:app --reload
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

For detailed setup instructions, coding standards, and contribution guidelines, please see:

👉 **[CONTRIBUTING.md](CONTRIBUTING.md)**

---

## 🛤️ Roadmap & Requirements

For a detailed breakdown of current project status, implemented features, and future goals, please refer to:

📄 **[REQUIREMENTS.md](REQUIREMENTS.md)**

---

## 🔒 License
Proprietary Software. Internal Use Only.
