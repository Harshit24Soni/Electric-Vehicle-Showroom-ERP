# Contributing to EV Showroom ERP

Thank you for your interest in contributing to the **Electric Vehicle Showroom ERP**! This guide details the development workflow, project structure, and coding standards.

## 🛠️ Prerequisites

Ensure you have the following installed:
- **Python 3.10+** (Backend)
- **Node.js 18+** & **npm** (Frontend)
- **PostgreSQL 15+** (Database)
- **Redis** (Required for caching & rate limiting)
- **Git** (Version Control)

---

## 🚀 Backend Development

### 1. Setup & Installation
```bash
git clone https://github.com/Harshit24Soni/Electric-Vehicle-Showroom-ERP.git
cd Electric-Vehicle-Showroom-ERP/backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate
# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Environment Configuration
Create a `.env` file in the `backend/` directory based on `.env.example`:
```ini
# Database
DATABASE_URL=postgresql+asyncpg://postgres:admin@localhost:5432/showroom_db

# Security
JWT_SECRET_KEY=your_secret_key_here
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=240

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# App Config
DEBUG=true
ENVIRONMENT=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 3. Database Migration (Alembic)
We use Alembic for all schema changes. Do not modify the database manually.

```bash
# Initialize/Upgrade schema to latest version
alembic upgrade head

# To revert the last migration
alembic downgrade -1
```

> **Note**: If you are setting up for the first time, `alembic upgrade head` will create all necessary tables including the new Setup module tables.

### 4. Running the Server
```bash
# Start backend on port 8000 with hot-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🎨 Frontend Development

### 1. Setup & Installation
```bash
cd ../frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
- App URL: [http://localhost:5173](http://localhost:5173)

### 2. Frontend Tech Stack
- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand (Global Auth/App State) + TanStack Query (Server State)
- **Validation**: Zod + React Hook Form

---

## 📂 Project Structure

### Backend (`backend/app/`)
- **`main.py`**: App entry point.
- **`bootstrap.py`**: Centralized model registration.
- **`db/`**: Database session, Mixins (`SoftDeleteMixin`, `AuditMixin`).
- **`domains/`**: Business logic modules:
  - `master`: Customers, Vehicles, Staff.
  - `setup`: **[NEW]** Master data configurator (Brands, Banks, etc.).
  - `sales`: Sales workflow (Enquiry -> Delivery).
  - `finance`: Payments, Loans.
  - `inventory`: Stock management.
  - `crm`: Leads, Follow-ups.
  - `admin`: Staff management & system admin.

### Frontend (`frontend/src/`)
- **`modules/`**: Feature-based organization matching backend domains.
  - `setup`: **[NEW]** SetupPage, setupApi.
  - `auth`: Login, simplified PIN flow.
  - `dashboard`: Main summaries.
- **`components/ui/`**: Reusable Shadcn-like components (`Skeleton`, `Button`, `Input`).
- **`api/`**: Axios instances.

---

## 📜 Coding Standards & Guidelines

### 1. Database Mixins (Backend)
- **AuditMixin**: All major tables must inherit `AuditMixin`. This automatically adds `created_at`, `updated_at`, `created_by`, `updated_by`.
- **SoftDeleteMixin**: Critical tables (Staff, Setup Entities) should support soft delete (`is_deleted`, `deleted_at`, `deleted_by`).
  - **Do NOT** use hard `DELETE` for these tables.
  - Use `service.delete_entity()` which sets flags.

### 2. Setup Module Pattern (Frontend)
- The **Setup Module** uses a generic `CrudTable` component to handle standardized Create/Read/Update/Delete/Restore operations.
- If adding a new master table, prefer extending the `SetupPage.tsx` configuration over creating a new page.

### 3. API & State
- **React Query**: Use `useQuery` for fetching and `useMutation` for actions.
- **Invalidation**: Always invalidate relevant query keys after mutations to auto-refresh UI.

### 4. Code Style
- **Python**: Follow PEP 8.
- **TypeScript**: Strict mode enabled. No `any` unless absolutely necessary.
- **Commits**: Use conventional commits (e.g., `feat: add soft delete`, `fix: token expiry`).

---

## 🤝 Contribution Workflow
1. Fork the repository.
2. Create a feature branch (`git checkout -b feat/amazing-feature`).
3. Commit your changes.
4. Push to the branch.
5. Open a Pull Request.

Happy Coding! 🚀
