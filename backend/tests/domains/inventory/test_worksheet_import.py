import openpyxl
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.modules.inventory.worksheet_service import (
    clean_cell_float,
    clean_cell_int,
    clean_cell_str,
    inspect_workbook,
    parse_and_preview_sheet_data,
)
from app.modules.inventory.models import SpareMaster, SparePartCode, PriceListItem


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


@pytest.fixture(autouse=True)
def setup_mock_workbook(tmp_path, monkeypatch):
    """Generates an isolated in-memory test workbook so CI tests never require confidential files."""
    wb_path = tmp_path / "mock_inventory.xlsx"
    wb = openpyxl.Workbook()

    # 1. Master Inventory sheet (row 1: super-header, row 2: column headers)
    ws_master = wb.active
    ws_master.title = "Master Inventory"
    ws_master.append(["", "", "", "", ""])
    ws_master.append(["Part Code", "Description", "Current Inventory", "GST Rate", "Final Rates - Customer Price"])
    for i in range(1, 15):
        ws_master.append([f"PART-{i:03d}", f"Sample Part Description {i}", 10 + i, 18.0, 500.0 + i * 10])

    # 2. Magnus Neo sheet
    ws_magnus = wb.create_sheet(title="Magnus Neo")
    ws_magnus.append(["Part Code", "Part Name", "HSN Code", "Revised DLP", "Revised MRP"])
    for i in range(1, 15):
        desc = "Terminal HBSP" if i == 1 else f"Magnus Part {i}"
        ws_magnus.append([f"MN-{i:03d}", desc, "87141090", 100.0 + i, 150.0 + i])

    # 3. Purchase Sheet
    ws_purch = wb.create_sheet(title="Purchase Sheet")
    ws_purch.append(["Date", "Bill No", "Firm Name", "Item Code", "Description", "Qty"])
    ws_purch.append(["2026-01-01", "INV-001", "Vendor Corp", "MN-001", "Terminal HBSP", 5])

    # 4. Sales Sheet
    ws_sales = wb.create_sheet(title="Sales Sheet")
    ws_sales.append(["Date", "Bill No", "Customer", "Item Code", "Qty"])
    ws_sales.append(["2026-01-02", "SALE-001", "John Doe", "MN-001", 1])

    wb.save(str(wb_path))

    # Set environment variable so any lookup in worksheet_service finds this test workbook
    monkeypatch.setenv("DEFAULT_INVENTORY_WORKBOOK_PATH", str(wb_path))
    monkeypatch.setattr(
        "app.modules.inventory.worksheet_service.find_default_workbook_path",
        lambda: wb_path,
    )
    monkeypatch.setattr(
        "app.modules.inventory.routes_worksheet_import.find_default_workbook_path",
        lambda: wb_path,
    )
    return wb_path


def test_inspect_default_workbook(setup_mock_workbook):
    """Inspects the default showroom workbook and validates sheet discovery."""
    path = setup_mock_workbook
    assert path is not None and path.exists(), "Workbook should be discoverable in test fixture"

    info = inspect_workbook(path, path.name, "default")
    assert info["sheet_count"] >= 4
    sheet_names = [s["name"] for s in info["sheets"]]
    assert "Master Inventory" in sheet_names
    assert "Magnus Neo" in sheet_names
    assert "Purchase Sheet" in sheet_names
    assert "Sales Sheet" in sheet_names

    master_meta = next(s for s in info["sheets"] if s["name"] == "Master Inventory")
    assert master_meta["row_count"] >= 10
    assert master_meta["has_super_header"] is True
    assert "part_code" in master_meta["auto_mapping"]
    assert "description" in master_meta["auto_mapping"]


def test_preview_magnus_neo_sheet(setup_mock_workbook):
    """Tests parsed preview rows and auto-mapping on a model price list sheet."""
    path = setup_mock_workbook
    assert path is not None and path.exists()

    preview = parse_and_preview_sheet_data(path, "Magnus Neo", page=1, limit=10)
    assert preview["sheet_name"] == "Magnus Neo"
    assert preview["total_rows"] >= 10
    assert len(preview["rows"]) == 10

    first_row = preview["rows"][0]
    assert first_row["part_code"] != ""
    assert first_row["description"] != ""
    assert first_row["status"] in ("READY", "WARNING")
    assert first_row["selected"] is True


def test_preview_search_filter(setup_mock_workbook):
    """Tests search filtering within parsed sheet data."""
    path = setup_mock_workbook
    assert path is not None and path.exists()

    preview = parse_and_preview_sheet_data(path, "Magnus Neo", page=1, limit=50, search="TERMINAL")
    assert preview["counts"]["filtered"] >= 1
    assert any("TERMINAL" in r["description"].upper() for r in preview["rows"])


@pytest.mark.asyncio
async def test_api_inspect_default(admin_client: AsyncClient, setup_mock_workbook):
    """GET /api/v1/inventory/worksheet-import/inspect-default returns full workbook structure."""
    response = await admin_client.get("/api/v1/inventory/worksheet-import/inspect-default")
    assert response.status_code == 200
    data = response.json()
    assert data["sheet_count"] >= 4
    assert len(data["sheets"]) == data["sheet_count"]


@pytest.mark.asyncio
async def test_api_sheet_preview(admin_client: AsyncClient, setup_mock_workbook):
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


@pytest.mark.asyncio
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
