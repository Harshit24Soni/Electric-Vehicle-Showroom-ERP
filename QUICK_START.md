# Quick Start Guide - EV Showroom ERP Backend

## 🚀 Getting Started in 5 Minutes

### 1. Setup Environment
```bash
# Clone and navigate
cd Electric-Vehicle-Showroom-ERP/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Database
Create `.env` file:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/ev_erp
JWT_SECRET_KEY=your-secret-key-here-min-32-chars
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=480
DEBUG=False
ENVIRONMENT=production
```

### 3. Run Server
```bash
uvicorn app.main:app --reload --port 8000
```

**API Docs**: Open http://localhost:8000/docs

---

## 📁 File Cleanup Done
✅ Deleted unused empty files:
- `app/shared/calculations.py`
- `app/core/config.py`
- `app/core/constants.py`
- `app/core/permissions.py`
- `app/core/security.py`
- `app/tests/` (empty folder)

---

## 📚 Documentation Files Created/Updated
1. **README.md** - Comprehensive project guide
   - Project overview
   - Technology stack
   - All module descriptions
   - API endpoints reference
   - Frontend recommendations
   - Timeline for frontend development

2. **.env.example** - Environment variable template
   - All required variables
   - Optional configurations
   - Examples and explanations

---

## 🎯 Next Steps

### Immediate (This Week)
- [ ] Test backend APIs against PostgreSQL database
- [ ] Verify all endpoints return correct responses
- [ ] Check error handling (400, 404, 409, 500 status codes)
- [ ] Run load testing with mock data

### Short-term (Next 1-2 Weeks)
- [ ] Add comprehensive unit tests for services
- [ ] Add integration tests for APIs
- [ ] Create Alembic migrations for database
- [ ] Add API request/response logging

### Medium-term (Next 3-4 Weeks)
- [ ] Setup GitHub Actions CI/CD pipeline
- [ ] Create production deployment guide
- [ ] Add Redis caching for master data
- [ ] Start frontend development (React.js recommended)

### Long-term (Next 2-3 Months)
- [ ] Advanced analytics and reporting
- [ ] Payment gateway integration
- [ ] Insurance API integration
- [ ] Frontend deployment and go-live

---

## 💡 Frontend Stack (RECOMMENDED)

**Framework**: React.js + TypeScript
**Why Not JavaFX?**
- JavaFX is desktop-only, React is web-based (modern)
- React has massive ecosystem and faster development
- React can run on web, mobile (React Native), desktop (Electron)
- Better UX with modern components and animations

**Alternative Modern Options**:
1. **Vue.js 3** - Easier learning curve, cleaner syntax
2. **SvelteKit** - Fastest build time, smallest bundle
3. **Next.js** - Full-stack with built-in optimizations

**UI Library**: Chakra UI or Material-UI (both professional & modern)

**Styling**: Tailwind CSS + shadcn/ui components

---

## 🔗 Key Files Reference

| File | Purpose |
|------|---------|
| `app/main.py` | Application entry point, router registration |
| `app/auth/routes.py` | Login, PIN change, PIN reset endpoints |
| `app/db/session.py` | Database connection and session management |
| `app/domains/*/routes.py` | REST API endpoints for each domain |
| `app/domains/*/services.py` | Business logic and CRUD operations |
| `app/domains/*/models.py` | SQLAlchemy ORM models |
| `requirements.txt` | Python dependencies |
| `.env.example` | Environment variable template |
| `README.md` | Full project documentation |

---

## 🧪 Testing the API

### Via Swagger UI (Recommended)
1. Start server: `uvicorn app.main:app --reload --port 8000`
2. Open: http://localhost:8000/docs
3. Authorize with JWT token
4. Test endpoints interactively

### Via cURL
```bash
# Login
curl -X POST "http://localhost:8000/auth/login-pin" \
  -H "Content-Type: application/json" \
  -d '{"staff_id": 1, "pin": "123456"}'

# Get token from response, then use it
curl -X GET "http://localhost:8000/master/customers" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Via Python Requests
```python
import requests

# Login
response = requests.post("http://localhost:8000/auth/login-pin", 
    json={"staff_id": 1, "pin": "123456"})
token = response.json()["access_token"]

# List customers
headers = {"Authorization": f"Bearer {token}"}
response = requests.get("http://localhost:8000/master/customers", 
    headers=headers)
print(response.json())
```

---

## 🐛 Troubleshooting

**Error: "No module named 'app'"**
- Solution: Run from `backend/` folder: `cd backend && uvicorn app.main:app`

**Error: "PostgreSQL connection failed"**
- Check `DATABASE_URL` in `.env`
- Verify PostgreSQL is running: `pg_isready -h localhost`
- Check credentials are correct

**Error: "JWT token invalid"**
- Regenerate JWT secret: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
- Update `JWT_SECRET_KEY` in `.env`
- Re-login to get new token

**Error: "Port 8000 already in use"**
- Use different port: `uvicorn app.main:app --port 8001`
- Or kill existing process: `lsof -ti:8000 | xargs kill -9`

---

## 📞 Support
For detailed documentation, see **README.md** in the project root.

**Status**: ✅ Backend ready for testing
**Last Updated**: February 1, 2026
