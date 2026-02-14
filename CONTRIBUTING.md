# Contributing to EV Showroom ERP

Thank you for your interest in contributing to the **Electric Vehicle Showroom ERP**! This guide will help you set up your development environment and understand the project structure.

## 🛠️ Prerequisites

Ensure you have the following installed:
- **Python 3.10+**
- **Node.js 18+** & **npm**
- **PostgreSQL 12+**
- **Redis** (Required for caching & rate limiting)
- **Git**

---

## 🚀 Backend Setup

### 1. Clone & Virtual Environment
```bash
git clone https://github.com/Harshit24Soni/Electric-Vehicle-Showroom-ERP.git
cd Electric-Vehicle-Showroom-ERP/backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate
# Activate (Mac/Linux)
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Environment Configuration
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

# App
DEBUG=true
ENVIRONMENT=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 4. Database Setup
You have two options to set up the database:

**Option A: Restore from SQL Dump (Recommended for full data)**
```bash
# Ensure database exists
psql -U postgres -c "CREATE DATABASE showroom_db;"

# Restore schema and data
psql -U postgres -d showroom_db -f ../Showroom_db.sql
```

**Option B: Comparison/Migration via Alembic**
```bash
# Initialize/Upgrade schema
alembic upgrade head
```

### 5. Run the Server
```bash
# Start backend on port 8000
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- API Documentation: http://localhost:8000/docs

---

## 🎨 Frontend Setup

The frontend is built with **React + Vite**.

```bash
cd ../frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
- App URL: http://localhost:5173

---

## 📂 Project Structure

### Backend (`backend/app/`)
- **`main.py`**: App entry point.
- **`bootstrap.py`**: Centralized model registration.
- **`auth/`**: Authentication & Authorization (RBAC, JWT, PIN).
- **`core/`**: Configuration, Redis, Database connection.
- **`middleware/`**: Rate limiting, CORS.
- **`domains/`**: Business logic modules:
  - `master`: Customers, Vehicles, Staff.
  - `sales`: Sales workflow.
  - `finance`: Payments, Loans.
  - `inventory`: Stock management.
  - `crm`: Leads, Follow-ups.
- **`scripts/`**: Utility scripts (`inspect_models.py`, etc.).

### Database Schemas
- `master`: Core data.
- `sales`, `inventory`, `billing`, `finance`, `crm`, `hr`, `service`, `warranty`.

---

## 🧪 Testing

Run tests (if available) or verify manually:
```bash
# Check health
curl http://localhost:8000/health
```

## 📜 Code Style
- Follow **PEP 8** for Python.
- Use **Prettier** for Frontend.
- Keep business logic in `services.py`, not routes.

## 🤝 Contribution Workflow
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes.
4. Push to the branch.
5. Open a Pull Request.

Happy Coding! 🚀
