import pytest

@pytest.mark.asyncio
async def test_get_spares_unauthorized(client):
    response = await client.get("/inventory/spares")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_get_spares_authorized(admin_client):
    response = await admin_client.get("/inventory/spares")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
