import openpyxl
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.modules.inventory.worksheet_service import (
    clean_cell_float,
    clean_cell_int,
    clean_cell_optional_int,
    clean_cell_str,
    inspect_workbook,
    parse_and_preview_sheet_data,
)
from app.modules.inventory.models import (
    SpareMaster,
    SparePartCode,
    PriceListItem,
    SpareStockBalance,
    SpareStockMovement,
)


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

    assert clean_cell_optional_int(None) is None
    assert clean_cell_optional_int("") is None
    assert clean_cell_optional_int("  ") is None
    assert clean_cell_optional_int("0") == 0
    assert clean_cell_optional_int(0) == 0
    assert clean_cell_optional_int("42") == 42
    assert clean_cell_optional_int(42.0) == 42


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
    # Magnus Neo has no stock column, so stock_quantity must be None (never assumed to be 0 or 1)
    assert first_row["stock_quantity"] is None
    assert "stock_quantity" not in preview["applied_mapping"]


def test_preview_search_filter(setup_mock_workbook):
    """Tests search filtering within parsed sheet data."""
    path = setup_mock_workbook
    assert path is not None and path.exists()

    preview = parse_and_preview_sheet_data(path, "Magnus Neo", page=1, limit=50, search="TERMINAL")
    assert preview["counts"]["filtered"] >= 1
    assert any("TERMINAL" in r["description"].upper() for r in preview["rows"])


def test_pdf_inspection_and_preview(tmp_path):
    """Validates multi-page PDF table extraction, header auto-detection, and repeated-header deduplication."""
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib import colors

    pdf_file = tmp_path / "supplier_parts_pricelist.pdf"
    doc = SimpleDocTemplate(str(pdf_file), pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()

    elements.append(Paragraph("Supplier Spare Parts Price List", styles["Title"]))
    elements.append(Spacer(1, 10))

    data = [
        ["Part Code", "Description", "HSN Code", "GST %", "Revised DLP", "Revised MRP"],
        ["PDF-001", "Front Disc Rotor Assembly", "87141090", "18%", "1,200.00", "1,750.00"],
        ["PDF-002", "Rear Hub Motor 1500W", "85013119", "18%", "7,500.00", "10,200.00"],
    ]
    # Add 25 rows to force multi-page
    for i in range(3, 26):
        data.append(
            [f"PDF-{i:03d}", f"Component Spare Part {i}", "87141090", "18%", f"{i * 100:.2f}", f"{i * 150:.2f}"]
        )

    t = Table(data, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#94a3b8")),
            ]
        )
    )
    elements.append(t)
    doc.build(elements)

    # 1. Test inspect_workbook with PDF
    info = inspect_workbook(pdf_file, pdf_file.name, "pdf_token_123")
    assert info["sheet_count"] >= 1
    sheet = info["sheets"][0]
    assert sheet["row_count"] == 25  # All 25 data rows, repeated page 2 header skipped
    assert sheet["auto_mapping"]["part_code"] == "Part Code"
    assert sheet["auto_mapping"]["description"] == "Description"
    assert sheet["auto_mapping"]["dlp"] == "Revised DLP"
    assert sheet["auto_mapping"]["mrp"] == "Revised MRP"
    assert len(sheet["sample_rows"]) == 3
    assert sheet["sample_rows"][0]["Part Code"] == "PDF-001"

    # 2. Test parse_and_preview_sheet_data with PDF
    preview = parse_and_preview_sheet_data(pdf_file, sheet["name"], page=1, limit=10)
    assert preview["total_rows"] == 25
    assert len(preview["rows"]) == 10
    assert preview["rows"][0]["part_code"] == "PDF-001"
    assert preview["rows"][0]["dlp"] == 1200.0
    assert preview["rows"][0]["mrp"] == 1750.0
    assert preview["rows"][0]["status"] == "READY"
    assert preview["rows"][0]["selected"] is True

    # 3. Test search filter on PDF rows
    search_prev = parse_and_preview_sheet_data(pdf_file, sheet["name"], page=1, limit=10, search="Hub Motor")
    assert search_prev["counts"]["filtered"] == 1
    assert search_prev["rows"][0]["part_code"] == "PDF-002"


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


@pytest.mark.asyncio
async def test_api_execute_import_rate_only_no_stock_column(admin_client: AsyncClient, db_session: AsyncSession):
    """When a sheet/document has no stock/quantity column, importing must NOT assume 1 or 0 units

    and must leave SpareStockBalance untouched with 0 movements created.
    """
    import_payload = {
        "sheet_name": "Magnus Neo Revised Rates",
        "target_model_name": "Magnus Neo",
        "update_existing": True,
        "update_stock": False,
        "default_category": "Rate Only Spares",
        "rows": [
            {
                "part_code": "RATE-ONLY-001",
                "description": "Rate Only Mirror Assembly",
                "category": "Body",
                "hsn_code": "87141090",
                "gst_rate": 18.0,
                "dlp": 320.0,
                "mrp": 480.0,
                "stock_quantity": None,
            },
        ],
    }

    response = await admin_client.post("/api/v1/inventory/worksheet-import/execute-import", json=import_payload)
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert res["created_count"] == 1

    # Verify SparePartCode and PriceListItem created
    code_stmt = select(SparePartCode).where(SparePartCode.code == "RATE-ONLY-001")
    code_obj = (await db_session.execute(code_stmt)).scalar_one_or_none()
    assert code_obj is not None

    # CRITICAL: Verify NO stock balance record is created or assumed
    bal_stmt = select(SpareStockBalance).where(SpareStockBalance.spare_id == code_obj.spare_id)
    balances = (await db_session.execute(bal_stmt)).scalars().all()
    assert len(balances) == 0, f"Expected 0 stock balance records, but found {len(balances)}"

    # CRITICAL: Verify NO stock movement record is created
    mov_stmt = select(SpareStockMovement).where(SpareStockMovement.spare_id == code_obj.spare_id)
    movements = (await db_session.execute(mov_stmt)).scalars().all()
    assert len(movements) == 0, f"Expected 0 stock movements, but found {len(movements)}"


@pytest.mark.asyncio
async def test_dealer_landing_price_as_purchase_rate_and_pricing_formulas(
    admin_client: AsyncClient, db_session: AsyncSession
):
    """Verifies that:
    1. Purchase Rate is equivalent to Dealer Landing Price (DLP), NOT Ex-Factory.
    2. Ex-Factory (5265) + 28% GST = DLP (6740).
    3. Ex-Factory (5265) + 18% Dealer Margin = Ex-Showroom Price (6213).
    4. Ex-Showroom (6213) + 28% GST = Customer MRP (7953).
    5. Cost history records DLP as billed_unit_price and landed_cost.
    6. Part purchase summary endpoint returns unit_rate = 6740 (DLP).
    """
    from app.modules.inventory.models import SpareCostHistory, SparePartVehicleCompatibility
    from app.modules.inventory.purchase_history_service import get_part_purchase_history

    payload = {
        "sheet_name": "Ampere Price List Ingestion",
        "target_model_name": "Magnus Neo",
        "update_existing": True,
        "update_stock": False,
        "default_category": "Chassis & Frame",
        "rows": [
            {
                "part_code": "TEST-AMP-VP-42709",
                "description": "FRAME ASSEMBLY_SLANT_BATTERY_MT80",
                "category": "Unique Part",
                "hsn_code": "87149100",
                "gst_rate": 28.0,
                "ex_factory": 5265.0,
                "dlp": 6740.0,
                "dealer_margin_percent": 18.0,
                "ex_showroom": 6213.0,
                "mrp": 7953.0,
                "stock_quantity": None,  # Qty in sheet was packaging spec (1 EA), safely unmapped
            }
        ],
    }

    response = await admin_client.post("/api/v1/inventory/worksheet-import/execute-import", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert res["created_count"] == 1

    # Verify SpareMaster
    code_stmt = select(SparePartCode).where(SparePartCode.code == "TEST-AMP-VP-42709")
    code_obj = (await db_session.execute(code_stmt)).scalar_one_or_none()
    assert code_obj is not None

    spare = await db_session.get(SpareMaster, code_obj.spare_id)
    assert spare is not None
    # Purchase Rate for dealer MUST be DLP (6,740.00), NOT Ex-Factory (5,265.00)
    assert float(spare.base_cost) == 6740.0, f"Expected base_cost to be DLP 6740.0, got {spare.base_cost}"
    assert float(spare.base_dlp) == 6740.0
    assert float(spare.base_ex_showroom) == 6213.0
    assert float(spare.base_mrp) == 7953.0
    assert float(spare.profit_margin_percent) == 18.0

    # Verify SpareCostHistory stores DLP as billed_unit_price and landed_cost
    ch_stmt = select(SpareCostHistory).where(SpareCostHistory.spare_id == spare.spare_id)
    cost_histories = (await db_session.execute(ch_stmt)).scalars().all()
    assert len(cost_histories) == 1
    ch = cost_histories[0]
    assert float(ch.billed_unit_price) == 6740.0, f"Expected billed_unit_price 6740.0, got {ch.billed_unit_price}"
    assert float(ch.landed_cost) == 6740.0

    # Verify SparePartVehicleCompatibility retains full pricing breakdown
    compat_stmt = select(SparePartVehicleCompatibility).where(SparePartVehicleCompatibility.spare_id == spare.spare_id)
    compat = (await db_session.execute(compat_stmt)).scalars().first()
    assert compat is not None
    assert float(compat.ex_factory_price) == 5265.0
    assert float(compat.dlp) == 6740.0
    assert float(compat.ex_showroom_price) == 6213.0
    assert float(compat.customer_mrp) == 7953.0
    assert float(compat.profit_margin_percent) == 18.0

    # Verify get_part_purchase_history reports unit_rate = DLP (6740.0)
    summary = await get_part_purchase_history(db_session, "TEST-AMP-VP-42709")
    assert summary is not None
    assert len(summary.bills) >= 1
    latest_bill = summary.bills[0]
    assert latest_bill.unit_rate == 6740.0, f"Expected bill unit_rate to be DLP 6740.0, got {latest_bill.unit_rate}"
    assert latest_bill.landed_cost_unit == 6740.0
    assert latest_bill.quantity == 0  # No stock assumed!
