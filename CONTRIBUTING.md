# Contributing to EV Showroom ERP

Guidelines for contributing to the Electric Vehicle Showroom ERP codebase.

---

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Environment (`.env` in `backend/`)

```ini
DATABASE_URL=postgresql+asyncpg://postgres:admin@localhost:5432/showroom_db
JWT_SECRET_KEY=your_secret_key_here
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=240
REDIS_HOST=localhost
REDIS_PORT=6379
DEBUG=true
ENVIRONMENT=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

---

## Golden Rules

### 1. Alembic Only — No Raw SQL

All database schema changes **must** go through Alembic.

```bash
# Create a new migration after changing a model
alembic revision --autogenerate -m "add_column_to_customers"

# Apply migrations
alembic upgrade head

# Rollback last migration
alembic downgrade -1
```

> [!CAUTION]
> Never modify the database schema manually with raw SQL (`ALTER TABLE`, `CREATE TABLE`, etc.). This will cause migration drift and break deployments.

### 2. Domain-Driven Folder Structure

All business logic lives inside `backend/app/domains/<domain>/`. Each domain is self-contained:

```
backend/app/domains/<domain>/
├── models.py     # SQLAlchemy models
├── schemas.py    # Pydantic request/response schemas
├── routes.py     # FastAPI router endpoints
└── services.py   # Business logic layer
```

- **Do not** import between domains. Shared logic goes in `backend/app/shared/`.
- **Do not** create one-off script files. All schema changes use Alembic; all seed data uses `backend/scripts/seed_admin.py` as a template.
- New domains must be registered in `backend/app/bootstrap.py`.

### 3. Soft-Delete & RBAC Enforcement

| Action | Role Required | Mechanism |
|---|---|---|
| Soft Delete (deactivate) | Dealer or Staff | `SoftDeleteMixin` → sets `is_deleted = True` |
| Restore (reactivate) | Dealer | `SoftDeleteMixin` → sets `is_deleted = False` |
| Hard Delete (permanent) | Admin only | Standard SQLAlchemy `DELETE` |

- All critical tables **must** inherit from `SoftDeleteMixin` and `AuditMixin`.
- Service layer functions must check `current_user.role` before allowing destructive operations.
- Queries must filter on `is_deleted == False` by default.

---

## Coding Standards

### Backend (Python)

- Follow **PEP 8**.
- Use `async def` for all route handlers and service functions.
- All models inherit `AuditMixin` at minimum.
- Use Pydantic v2 for all request/response schemas.

### Frontend (TypeScript)

- **Strict mode** enabled — no `any` unless absolutely necessary.
- Use **TanStack Query** (`useQuery` / `useMutation`) for all API calls.
- Always invalidate relevant query keys after mutations.
- Use **Zustand** only for global app state (auth, theme).
- Extend the generic `CrudTable` for new Setup entities — don't create one-off pages.

### Git Commits

Use **conventional commits**:

```
feat: add insurance nominee management
fix: correct GST calculation rounding
refactor: extract billing service from sales domain
chore: update alembic migration for warranty table
```

---

## Contribution Workflow

1. Fork the repository.
2. Branch from `main` → `feat/<feature-name>` or `fix/<bug-name>`.
3. Follow the rules above.
4. Open a Pull Request with a clear description.

---

## License

Proprietary Software — Internal Use Only.
