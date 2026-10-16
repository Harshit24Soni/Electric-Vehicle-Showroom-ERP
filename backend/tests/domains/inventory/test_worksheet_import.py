import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.modules.inventory.worksheet_service import (
    clean_cell_float,
    clean_cell_int,
    clean_cell_str,
    find_default_workbook_path,
    inspect_workbook,
    parse_and_preview_sheet_data,
)
from app.modules.inventory.models import SpareMaster, SparePartCode, PriceListItem

pytestmark = pytest.mark.asyncio


def test_clean_cell_utilities():
    """Validates cell cleaning and type coercion utilities."""
    assert clean_cell_str("  BACBK00115  ") == "BACBK00115"
    assert clean_cell_str(800051211.0) == "800051211"
    assert clean_cell_str(None) is None
    assert clean_cell_str("") is None

    assert clean_cell_float("1,250.50") == 1250.50
    assert clean_cell_float("350 / 450") == 450.0
    assert clean_cell_float("-") is None
    assert clean_cell_float(None) is None

    assert clean_cell_int("42") == 42
    assert clean_cell_int(42.0) == 42
    assert clean_cell_int(None) == 0


def test_inspect_default_workbook():
    """Inspects the default showroom workbook and validates sheet discovery."""
    path = find_default_workbook_path()
    assert path is not None, "Inventory (22-09-25).xlsx should be discoverable in workspace"

    info = inspect_workbook(path, path.name, "default")
    assert info["sheet_count"] >= 14
    sheet_names = [s["name"] for s in info["sheets"]]
    assert "Master Inventory" in sheet_names
    assert "Magnus Neo" in sheet_names
    assert "Purchase Sheet" in sheet_names
    assert "Sales Sheet" in sheet_names

    master_meta = next(s for s in info["sheets"] if s["name"] == "Master Inventory")
    assert master_meta["row_count"] > 3000
    assert master_meta["has_super_header"] is True
    assert "part_code" in master_meta["auto_mapping"]
    assert "description" in master_meta["auto_mapping"]


def test_preview_magnus_neo_sheet():
    """Tests parsed preview rows and auto-mapping on a model price list sheet."""
    path = find_default_workbook_path()
    assert path is not None

    preview = parse_and_preview_sheet_data(path, "Magnus Neo", page=1, limit=10)
    assert preview["sheet_name"] == "Magnus Neo"
    assert preview["total_rows"] > 200
    assert len(preview["rows"]) == 10

    first_row = preview["rows"][0]
    assert first_row["part_code"] != ""
    assert first_row["description"] != ""
    assert first_row["status"] in ("READY", "WARNING")
    assert first_row["selected"] is True


def test_preview_search_filter():
    """Tests search filtering within parsed sheet data."""
    path = find_default_workbook_path()
    assert path is not None

    preview = parse_and_preview_sheet_data(path, "Magnus Neo", page=1, limit=50, search="TERMINAL")
    assert preview["counts"]["filtered"] >= 1
    assert any("TERMINAL" in r["description"].upper() for r in preview["rows"])


async def test_api_inspect_default(admin_client: AsyncClient):
    """GET /api/v1/inventory/worksheet-import/inspect-default returns full workbook structure."""
    response = await admin_client.get("/api/v1/inventory/worksheet-import/inspect-default")
    assert response.status_code == 200
    data = response.json()
    assert data["sheet_count"] >= 14
    assert len(data["sheets"]) == data["sheet_count"]


async def test_api_sheet_preview(admin_client: AsyncClient):
    """POST /api/v1/inventory/worksheet-import/sheet-preview returns paginated mapped rows."""
    payload = {
        "file_token": "default",
        "sheet_name": "Magnus Neo",
        "page": 1,
        "limit": 5,
    }
    response = await admin_client.post("/api/v1/inventory/worksheet-import/sheet-preview", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["sheet_name"] == "Magnus Neo"
    assert len(data["rows"]) == 5
    assert "counts" in data
    assert data["counts"]["ready"] > 0


async def test_api_execute_import(admin_client: AsyncClient, db_session: AsyncSession):
    """POST /api/v1/inventory/worksheet-import/execute-import creates spares and price items atomically."""
    import_payload = {
        "sheet_name": "Test Ingestion Sheet",
        "target_model_name": "Magnus Neo",
        "update_existing": True,
        "update_stock": True,
        "default_category": "Spares Test",
        "rows": [
            {
                "part_code": "TEST-INGEST-001",
                "description": "Ingested Front Brake Disc",
                "category": "Brakes",
                "hsn_code": "87141090",
                "gst_rate": 18.0,
                "dlp": 450.0,
                "mrp": 650.0,
                "stock_quantity": 5,
            },
            {
                "part_code": "TEST-INGEST-002",
                "description": "Ingested Rear Shock Absorber",
                "category": "Suspension",
                "hsn_code": "87141090",
                "gst_rate": 18.0,
                "dlp": 850.0,
                "mrp": 1200.0,
                "stock_quantity": 2,
            },
        ],
    }

    response = await admin_client.post("/api/v1/inventory/worksheet-import/execute-import", json=import_payload)
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert res["total_processed"] == 2
    assert res["created_count"] == 2
    assert res["updated_count"] == 0

    # Verify SparePartCode and SpareMaster created in database
    stmt = select(SparePartCode).where(SparePartCode.code == "TEST-INGEST-001")
    code_obj = (await db_session.execute(stmt)).scalar_one_or_none()
    assert code_obj is not None

    spare = await db_session.get(SpareMaster, code_obj.spare_id)
    assert spare is not None
    assert spare.spare_name == "Ingested Front Brake Disc"
    assert "87141090" in (spare.remarks or "")

    # Verify PriceListItem created
    pli_stmt = select(PriceListItem).where(PriceListItem.part_code == "TEST-INGEST-001")
    pli = (await db_session.execute(pli_stmt)).scalar_one_or_none()
    assert pli is not None
    assert float(pli.mrp) == 650.0
    assert float(pli.dlp) == 450.0
    assert float(pli.gst_rate) == 18.0
