# Electric Vehicle Showroom ERP

A full-stack ERP for an electric-vehicle dealership. It manages inventory, purchasing, spare parts and stock movement, and automates dealer-cost, selling-price and GST input-credit calculations that were previously done by hand in spreadsheets.

🔗 **Live demo:** https://electric-vehicle-showroom-erp.vercel.app
> The backend runs on a free-tier host, so the first request can take a few seconds to wake it up. *(Delete this note if it doesn't apply.)*

<!-- Add 2-3 screenshots here: dashboard, inventory list, a stock movement screen -->
<!-- ![Inventory screen](docs/screenshots/inventory.png) -->

## Why I built it

The dealership is my family's business, and inventory, pricing and GST credit were tracked in spreadsheets. This project turns those workflows into one system with validation, audit-friendly stock movements and role-based access.

## Features

- **Authentication:** JWT-based login with protected API routes
- **Inventory:** vehicle and stock records, with stock movements and weighted-average-cost (WAC) logic
- **Pricing and tax:** dealer-cost, selling-price and GST input-tax-credit calculations (decimal arithmetic, no floats)
- **Spare parts:** parts catalogue and stock handling
- **Reliability:** transactional safety on stock changes, request validation with Pydantic, Redis-backed rate limiting
- **Frontend:** React screens for inventory and reports

**Status:** authentication, inventory (phases 1–2), read-only frontend screens and spare-parts Phase A are complete. See the roadmap below for what is next.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI, SQLAlchemy 2.0 (async), Pydantic, Alembic |
| Database | PostgreSQL (Supabase) |
| Cache / rate limiting | Redis (Upstash) |
| Frontend | React, TypeScript, Vite, Tailwind CSS, React Query, Zustand |
| Testing | pytest, Playwright (end-to-end) |
| CI/CD | GitHub Actions |
| Deployment | Docker; backend on Render, frontend on Vercel |

## Architecture

```
React (Vercel)  ──►  FastAPI (Render)  ──►  PostgreSQL (Supabase)
                          │
                          └──►  Redis (Upstash): rate limiting
```

## Repository structure

```
backend/              FastAPI app, models, migrations, tests
frontend/             React + TypeScript app
docs/                 Design and API documentation
.github/workflows/    CI pipeline
docker-compose.yml    Local development setup
.env.example          Required environment variables
```

## Testing

- Backend API tests with **pytest**
- End-to-end tests with **Playwright**
- CI runs on every push through GitHub Actions
- API coverage: 268 registered endpoints, of which 241 are in scope and 223 are covered by passing tests. <!-- Verify these figures against your latest test run before publishing. -->

## Run locally

```bash
git clone https://github.com/Harshit24Soni/Electric-Vehicle-Showroom-ERP.git
cd Electric-Vehicle-Showroom-ERP
cp .env.example .env        # fill in database and Redis values
docker-compose up --build
```

<!-- Check these commands against your setup. If you run the backend and frontend separately, list them here:
Backend:  cd backend && pip install -r requirements.txt && alembic upgrade head && uvicorn app.main:app --reload
Frontend: cd frontend && npm install && npm run dev -->

Interactive API docs are available at `/docs` once the backend is running.

## Roadmap

- [ ] Remaining spare-parts modules
- [ ] UI redesign
- [ ] Full end-to-end test automation
- [ ] Production hardening

## Author

**Harshit Soni** · [GitHub](https://github.com/Harshit24Soni) · [LinkedIn](https://www.linkedin.com/in/harshit24soni) · harshit24soni@gmail.com