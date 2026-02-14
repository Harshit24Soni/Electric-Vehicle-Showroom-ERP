# Electric Vehicle Showroom ERP

![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Python](https://img.shields.io/badge/Backend-FastAPI-009688)
![Database](https://img.shields.io/badge/Database-PostgreSQL-336791)
![Frontend](https://img.shields.io/badge/Frontend-React-61DAFB)

## ⚡ Overview

The **Electric Vehicle Showroom ERP** is a comprehensive enterprise solution designed to manage the entire lifecycle of an EV dealership. From inventory and sales to service and warranty, this system integrates all business functions into a unified, high-performance platform.

Built with **FastAPI** (Python) and **React**, it offers a modern, responsive experience with robust security and scalability.

---

## 🌟 Key Features

### 🏢 Master Data Management
- Centralized management of **Customers**, **Vehicles**, **Staff**, and **Vendors**.
- Role-based access control (RBAC) with PIN-based staff authentication.

### 🚗 Sales & Showroom
- Complete **Sales Workflow**: Inquiry → Lead → Allocation → Billing → Delivery.
- Real-time stock availability checks.
- automated generation of **Invoices**, **Delivery Challans**, and **Service Schedules**.

### 📦 Inventory & Procurement
- Real-time tracking of **Vehicles** and **Spare Parts**.
- Automated audit trail for all stock movements (Inward, Outward, Consumption).
- **Proactive Procurement**: Vendor management and purchase order tracking.

### 🛠️ Service & Warranty
- **Job Cards**: Track vehicle service history, labor, and spare part consumption.
- **Warranty Claims**: End-to-end claim processing with OEM (Inward/Shipment logic).
- Smart integration: Consumed spares automatically deduct from inventory.

### 💰 Finance & Billing
- **GST-compliant Invoicing** with automatic tax calculations.
- **Payment Tracking**: Multiple payment modes, loan/EMI tracking, and subsidy management.
- Financial reporting and revenue analytics.

### 🤝 CRM (Customer Relationship Management)
- **Lead Tracking**: Source tracking, status pipelines, and automated follow-up schedules.
- **Activity Logs**: Record calls, visits, and test rides.
- **2FA Security**: Dealer-level actions protected by TOTP (Time-based One-Time Password).

---

## 🏗️ Technical Architecture

### Backend
- **Framework**: FastAPI (Async Python 3.10+)
- **Database**: PostgreSQL 12+ (SQLAlchemy ORM + Alembic Migrations)
- **Cash & Rate Limits**: Redis
- **Security**: JWT Authentication, Argon2 Password Hashing, Role-Based Access Control

### Frontend
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand / TanStack Query

---

## 🚀 Getting Started

### For Users
This system is designed to be deployed on a cloud server or on-premise infrastructure. Access the web interface via your browser.

### For Developers
We welcome contributions! If you are a developer looking to set up the project locally, modify the code, or contribute features, please read our detailed **Developer Guide**:

👉 **[Read CONTRIBUTING.md](CONTRIBUTING.md)**

It covers:
- Local Environment Setup (Python/Node.js)
- Database Initialization
- Running Development Servers
- Project Structure & Code Guidelines

### Product Roadmap
Interested in the future of this project? Check out our **[Product Requirements & Roadmap](REQUIREMENTS.md)**.

---

## 📄 License
This project is proprietary software. All rights reserved.

## 📞 Support
For support or feature requests, please contact the IT administration.
