import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    yield


@pytest.mark.asyncio
async def test_cors_preflight_production_vercel():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        response = await client.options(
            "/auth/login-pin",
            headers={
                "Origin": "https://electric-vehicle-showroom-erp.vercel.app",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type,authorization",
            },
        )
        assert response.status_code == 200
        assert response.headers.get("access-control-allow-origin") == "https://electric-vehicle-showroom-erp.vercel.app"
        assert response.headers.get("access-control-allow-credentials") == "true"
        allow_methods = response.headers.get("access-control-allow-methods", "")
        assert "POST" in allow_methods
        assert "OPTIONS" in allow_methods


@pytest.mark.asyncio
async def test_cors_xmlhttprequest_production_vercel():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        response = await client.get(
            "/health",
            headers={
                "Origin": "https://electric-vehicle-showroom-erp.vercel.app",
            },
        )
        assert response.status_code == 200
        assert response.headers.get("access-control-allow-origin") == "https://electric-vehicle-showroom-erp.vercel.app"
        assert response.headers.get("access-control-allow-credentials") == "true"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "origin",
    [
        "http://localhost:5173",
        "http://localhost:3000",
    ],
)
async def test_cors_local_development_origins(origin: str):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        # Preflight OPTIONS
        res_opt = await client.options(
            "/health",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
            },
        )
        assert res_opt.status_code == 200
        assert res_opt.headers.get("access-control-allow-origin") == origin
        assert res_opt.headers.get("access-control-allow-credentials") == "true"

        # Direct Request
        res_get = await client.get("/health", headers={"Origin": origin})
        assert res_get.status_code == 200
        assert res_get.headers.get("access-control-allow-origin") == origin


@pytest.mark.asyncio
async def test_cors_unallowed_origin_blocked():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        res = await client.get(
            "/health",
            headers={"Origin": "https://malicious-site.example.com"},
        )
        assert res.status_code == 200
        assert "access-control-allow-origin" not in res.headers
