import logging
import os
import re
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import warnings

import openpyxl
import pdfplumber
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.mixins import utc_now_naive
from app.modules.inventory.models import (
    PriceList,
    PriceListItem,
    PriceListVersion,
    SpareCostHistory,
    SpareMaster,
    SparePartCode,
    SparePartVehicleCompatibility,
    SpareSellingPriceHistory,
    SpareStockBalance,
    SpareStockMovement,
)
from app.modules.inventory.pricing_engine import calculate_observed_margin
from app.modules.inventory.alteration_service import capture_spare_snapshot, record_alteration
from app.modules.master.models import Brand, VehicleModel

# Filter out openpyxl user warnings (e.g., malformed date serials or unsupported cell features)
warnings.filterwarnings("ignore", category=UserWarning, module="openpyxl")

logger = logging.getLogger(__name__)

TEMP_UPLOAD_DIR = Path(tempfile.gettempdir()) / "ev_showroom_worksheets"
TEMP_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Simple in-memory cache for parsed workbook metadata
WORKBOOK_CACHE: Dict[str, Dict[str, Any]] = {}
PDF_TABLES_CACHE: Dict[str, Dict[str, Any]] = {}


def get_candidate_default_paths() -> List[Path]:
    """Returns candidate paths for the default inventory Excel workbook."""
    repo_root = Path(__file__).resolve().parents[4]
    backend_dir = Path(__file__).resolve().parents[3]
    paths: List[Path] = []
    env_path = os.getenv("DEFAULT_INVENTORY_WORKBOOK_PATH")
    if env_path:
        paths.append(Path(env_path))
    paths.extend(
        [
            repo_root / "Inventory (22-09-25).xlsx",
            backend_dir / "Inventory (22-09-25).xlsx",
            Path.cwd() / "Inventory (22-09-25).xlsx",
            Path.cwd().parent / "Inventory (22-09-25).xlsx",
        ]
    )
    return paths


def find_default_workbook_path() -> Optional[Path]:
    """Finds the default Inventory workbook if it exists on disk, or falls back to the most recent upload."""
    for p in get_candidate_default_paths():
        if p.exists() and p.is_file():
            return p
    # Fallback to the most recent workbook in TEMP_UPLOAD_DIR if available
    if TEMP_UPLOAD_DIR.exists():
        recent_uploads = sorted(
            [f for f in TEMP_UPLOAD_DIR.glob("*.*") if f.suffix.lower() in (".xlsx", ".xls", ".xlsm", ".pdf")],
            key=lambda f: f.stat().st_mtime,
            reverse=True,
        )
        if recent_uploads:
            return recent_uploads[0]
    return None


def get_workbook_path(file_token: Optional[str] = None) -> Optional[Path]:
    """Resolves the workbook/PDF path from a file token or falls back to the default file."""
    if not file_token or file_token == "default":
        return find_default_workbook_path()

    for ext in (".xlsx", ".xls", ".xlsm", ".pdf"):
        target = TEMP_UPLOAD_DIR / f"{file_token}{ext}"
        if target.exists():
            return target
    return None


def clean_cell_str(val: Any) -> Optional[str]:
    """Cleans a cell value into a trimmed string, replacing linebreaks with single spaces."""
    if val is None:
        return None
    if isinstance(val, float):
        if val.is_integer():
            return str(int(val)).strip()
        return f"{val:g}".strip()
    s = str(val).replace("\r\n", " ").replace("\n", " ").strip()
    return s if s else None


def clean_cell_float(val: Any) -> Optional[float]:
    """Converts a cell value safely to a float."""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace(",", "")
    if not s or s.lower() in ("none", "null", "-", "na", "n/a", "—"):
        return None
    # Strip common currency signs, Indian notation suffixes, and percentages
    s = (
        s.replace("₹", "")
        .replace("Rs.", "")
        .replace("Rs", "")
        .replace("INR", "")
        .replace("/-", "")
        .replace("%", "")
        .strip()
    )
    if not s:
        return None
    # If string contains multiple numbers like '350 / 450', take the second (revised/GST) or first
    if "/" in s:
        parts = [p.strip() for p in s.split("/") if p.strip()]
        if parts:
            try:
                return float(parts[-1].replace(",", ""))
            except ValueError:
                pass
    try:
        return float(s)
    except ValueError:
        return None


def clean_cell_int(val: Any) -> int:
    """Converts a cell value safely to an integer."""
    flt = clean_cell_float(val)
    if flt is None:
        return 0
    return int(round(flt))


def clean_cell_optional_int(val: Any) -> Optional[int]:
    """Converts a cell value safely to an integer if present, returning None if absent or non-numeric."""
    if val is None:
        return None
    flt = clean_cell_float(val)
    if flt is None:
        return None
    return int(round(flt))


def detect_sheet_headers(sheet: Any) -> Tuple[List[str], int, bool]:
    """Detects headers for a worksheet, supporting both standard row 0 headers

    and 2-row superheader/subheader tables (like Master Inventory).
    Returns (headers, data_start_row_index, has_super_header).
    """
    rows: List[List[Any]] = []
    for i, r in enumerate(sheet.iter_rows(values_only=True)):
        if i >= 4:
            break
        rows.append(list(r))

    if not rows:
        return [], 0, False

    row0 = [clean_cell_str(c) or "" for c in rows[0]]
    row1 = [clean_cell_str(c) or "" for c in rows[1]] if len(rows) > 1 else []

    # Check if row 1 contains part code / description / stock headers while row 0 has categories/models
    r1_text = " ".join(row1).lower()
    has_super = any(k in r1_text for k in ["part code", "description", "part name", "current inventory"])

    if has_super and len(rows) > 1:
        headers: List[str] = []
        current_super = ""
        seen: Dict[str, int] = {}

        for idx, (c0, c1) in enumerate(zip(row0, row1)):
            # If c0 has a valid super header name, propagate forward
            if c0 and c0 not in ["Q", "/", " ", "-", "_"]:
                current_super = c0

            col_name = ""
            if current_super and c1:
                # Avoid "Magnus Neo - Magnus Neo"
                if current_super.lower() in c1.lower():
                    col_name = c1
                else:
                    col_name = f"{current_super} - {c1}"
            elif c1:
                col_name = c1
            elif c0:
                col_name = c0
            else:
                col_name = f"Column_{idx + 1}"

            # Ensure unique column names
            if col_name in seen:
                seen[col_name] += 1
                col_name = f"{col_name}_{seen[col_name]}"
            else:
                seen[col_name] = 1

            headers.append(col_name)

        return headers, 2, True
    else:
        # Standard single row header
        headers = []
        seen: Dict[str, int] = {}
        for idx, c0 in enumerate(row0):
            name = c0 if c0 else f"Column_{idx + 1}"
            if name in seen:
                seen[name] += 1
                name = f"{name}_{seen[name]}"
            else:
                seen[name] = 1
            headers.append(name)
        return headers, 1, False


def detect_sheet_type(sheet_name: str, headers: List[str]) -> str:
    """Categorizes the sheet into a functional domain."""
    name_lower = sheet_name.lower()
    headers_text = " ".join(headers).lower()

    if "purchase" in name_lower or "bill no" in headers_text:
        return "PURCHASE_SHEET"
    if "sale" in name_lower or "job card" in headers_text:
        return "SALES_SHEET"
    if "master" in name_lower or (len(headers) >= 15 and "customer price" in headers_text):
        return "MASTER_INVENTORY"
    if any(k in headers_text for k in ["revised mrp", "revised dlp", "ex factory", "hsn code"]):
        return "MODEL_PRICE_LIST"
    return "GENERAL"


def auto_detect_field_mappings(headers: List[str], sheet_name: str) -> Dict[str, str]:
    """Intelligently detects the best Excel column for each ERP target field."""
    mapping: Dict[str, str] = {}

    def find_best_header(keywords: List[str], exclude: Optional[List[str]] = None) -> Optional[str]:
        exclude_list = [e.lower() for e in (exclude or [])]
        # 1. Exact match
        for h in headers:
            hl = h.lower().strip()
            if any(hl == kw.lower() for kw in keywords):
                if not any(ex in hl for ex in exclude_list):
                    return h
        # 2. Ends with match (e.g. "Final Rates - Customer Price")
        for h in headers:
            hl = h.lower().strip()
            for kw in keywords:
                if hl.endswith(kw.lower()):
                    if not any(ex in hl for ex in exclude_list):
                        return h
        # 3. Contains match
        for h in headers:
            hl = h.lower().strip()
            for kw in keywords:
                if kw.lower() in hl:
                    if not any(ex in hl for ex in exclude_list):
                        return h
        return None

    # Part Code
    pc = find_best_header(["part code", "item code", "part number", "part no", "sku", "code"])
    if pc:
        mapping["part_code"] = pc

    # Description
    desc = find_best_header(["description", "part name", "item name", "name", "spare name"])
    if desc:
        mapping["description"] = desc

    # HSN Code
    hsn = find_best_header(["hsn code", "hsn", "hsn/sac", "sac code", "sac"])
    if hsn:
        mapping["hsn_code"] = hsn

    # GST Rate
    gst = find_best_header(
        ["revised gst", "gst rate", "gst %", "gst percentage", "gst"],
        exclude=["value", "amount", "gstin", "number", "no"],
    )
    if gst:
        mapping["gst_rate"] = gst

    # Ex Factory (Manufacturer Base Price before GST)
    ex_factory = find_best_header(
        ["ex factory", "ex-factory", "ex factory price", "factory price", "base price", "unit cost before tax"],
        exclude=["showroom", "final", "dlp", "landing", "mrp", "gst"],
    )
    if ex_factory:
        mapping["ex_factory"] = ex_factory

    # DLP (Dealer Landing Price = Purchase Rate = Ex Factory + GST)
    dlp = find_best_header(
        [
            "dealer landing price",
            "revised dlp",
            "old dlp",
            "dlp",
            "dealer price",
            "landed cost",
            "dealer landing",
            "landing price",
            "purchase rate",
        ],
        exclude=["margin", "showroom", "factory", "mrp"],
    )
    if dlp:
        mapping["dlp"] = dlp

    # Dealer Margin %
    margin = find_best_header(
        ["dealer margin %", "dealer margin percent", "dealer margin", "margin %", "markup %", "margin percentage"],
        exclude=["amount", "value", "landing"],
    )
    if margin:
        mapping["dealer_margin_percent"] = margin

    # Ex Showroom Price (Dealer Selling Price before Customer GST = Ex Factory + Margin)
    ex_showroom = find_best_header(
        [
            "final rates - ex showroom price",
            "ex showroom price",
            "ex showroom",
            "ex-showroom price",
            "ex-showroom",
            "showroom price",
        ],
        exclude=["factory", "dlp", "mrp", "gst"],
    )
    if ex_showroom:
        mapping["ex_showroom"] = ex_showroom

    # MRP (Customer Selling Price = Ex Showroom + Customer GST)
    mrp = find_best_header(
        [
            "final rates - customer price",
            "revised mrp",
            "customer price",
            "old mrp",
            "mrp",
            "maximum retail price",
            "selling price",
            "retail price",
        ],
        exclude=["without gst", "showroom", "dlp", "factory", "cost"],
    )
    if mrp:
        mapping["mrp"] = mrp

    # Stock Quantity - ONLY match if an exclusive stock/quantity column is explicitly present
    # Plain 'qty' or 'quantity' in rate lists indicates packaging/per-unit spec (e.g. 1 unit), NEVER showroom inventory balance
    stock = find_best_header(
        [
            "current inventory stock",
            "current inventory",
            "current stock",
            "available stock",
            "stock quantity",
            "physical stock",
            "closing stock",
            "opening stock",
            "in-stock qty",
            "in stock qty",
            "stock qty",
            "inventory qty",
            "qty in stock",
            "quantity in stock",
            "units in stock",
            "on hand stock",
            "stock on hand",
        ],
        exclude=[
            "rate",
            "rates",
            "price",
            "prices",
            "cost",
            "dlp",
            "mrp",
            "value",
            "amount",
            "old",
            "hsn",
            "code",
            "desc",
            "name",
            "category",
            "unit price",
            "unit cost",
            "tax",
            "moq",
            "lot",
        ],
    )
    if stock:
        mapping["stock_quantity"] = stock

    # Category / Classification
    cat = find_best_header(["unique/common", "category", "part category", "group", "item type", "classification"])
    if cat:
        mapping["category"] = cat

    # Serial Number
    serial = find_best_header(["serial number (if applicable)", "serial number", "serial no", "serial"])
    if serial:
        mapping["serial_number"] = serial

    return mapping


def detect_available_model_price_columns(headers: List[str]) -> List[Dict[str, str]]:
    """Finds model-specific price columns in superheader sheets

    e.g. 'Magnus Neo - Customer Price' -> {'model_name': 'Magnus Neo', 'column': 'Magnus Neo - Customer Price'}
    """
    results: List[Dict[str, str]] = []
    excluded_prefixes = ["final rates", "old inventory rates", "bpl", "unnamed"]

    for h in headers:
        if " - " in h:
            parts = h.split(" - ", 1)
            prefix = parts[0].strip()
            suffix = parts[1].strip()

            if prefix.lower() in excluded_prefixes:
                continue

            if any(p in suffix.lower() for p in ["customer price", "mrp", "ex showroom price", "price"]):
                results.append(
                    {
                        "model_name": prefix,
                        "field_type": suffix,
                        "column_name": h,
                    }
                )
    return results


def extract_pdf_table_groups(file_path: Path) -> Dict[str, Dict[str, Any]]:
    """Extracts tables from a PDF document using pdfplumber, handling multi-page tables,

    repeated headers, and column structure grouping.
    Returns a dictionary mapping sheet/table names to table metadata:
    {
        "headers": headers,
        "data_start_row": int,
        "has_super_header": bool,
        "sheet_type": str,
        "auto_mapping": Dict[str, str],
        "model_columns": List[Dict[str, str]],
        "rows": List[List[Any]],
    }
    """
    cache_key = f"{file_path}_{os.path.getmtime(file_path)}"
    if cache_key in PDF_TABLES_CACHE:
        return PDF_TABLES_CACHE[cache_key]

    raw_page_tables: List[Tuple[int, List[List[Any]]]] = []
    with pdfplumber.open(str(file_path)) as pdf:
        for page_idx, page in enumerate(pdf.pages):
            tables = page.extract_tables()
            if not tables:
                tables = page.extract_tables(
                    table_settings={"vertical_strategy": "text", "horizontal_strategy": "text"}
                )
            for table in tables or []:
                cleaned_table = []
                for row in table:
                    cleaned_row = [clean_cell_str(c) for c in row]
                    if any(c is not None for c in cleaned_row):
                        cleaned_table.append(cleaned_row)
                if cleaned_table:
                    raw_page_tables.append((page_idx, cleaned_table))

    if not raw_page_tables:
        PDF_TABLES_CACHE[cache_key] = {}
        return {}

    header_keywords = [
        "part code",
        "item code",
        "part no",
        "part number",
        "part_code",
        "sku",
        "code",
        "description",
        "part name",
        "item name",
        "hsn",
        "sac",
        "gst",
        "dlp",
        "mrp",
        "price",
        "rate",
        "cost",
        "qty",
        "quantity",
        "stock",
    ]

    # Find the dominant price list table across all pages (even across 20+ pages)
    dominant_col_count = None
    for p_idx, tbl in raw_page_tables:
        if not tbl:
            continue
        for row in tbl[:5]:
            row_text = " ".join([c.lower() for c in row if c])
            if sum(1 for kw in header_keywords if kw in row_text) >= 2 and len(tbl[0]) >= 3:
                dominant_col_count = len(tbl[0])
                break
        if dominant_col_count is not None:
            break

    table_groups: Dict[str, List[Tuple[int, List[List[Any]]]]] = {}

    if dominant_col_count is not None:
        # Consolidate all price list pages into a unified "Price List Table"
        dominant_tables = []
        other_tables = []
        for p_idx, tbl in raw_page_tables:
            c_cnt = len(tbl[0])
            # If within 1 column difference or has >= 3 columns, group into dominant table
            if abs(c_cnt - dominant_col_count) <= 1 or c_cnt >= 4:
                dominant_tables.append((p_idx, tbl))
            else:
                other_tables.append((p_idx, tbl))

        table_groups["Price List Table"] = dominant_tables
        for p_idx, tbl in other_tables:
            c_cnt = len(tbl[0])
            gname = f"Auxiliary Table ({c_cnt} Columns)"
            if gname not in table_groups:
                table_groups[gname] = []
            table_groups[gname].append((p_idx, tbl))
    else:
        # Fallback grouping continuous tables by column count
        col_counts = [len(tbl[0]) for _, tbl in raw_page_tables if tbl]
        all_same_col_count = len(set(col_counts)) == 1
        if all_same_col_count:
            table_groups["Price List Table"] = raw_page_tables
        else:
            for p_idx, tbl in raw_page_tables:
                c_cnt = len(tbl[0])
                gname = f"Table ({c_cnt} Columns)"
                if gname not in table_groups:
                    table_groups[gname] = []
                table_groups[gname].append((p_idx, tbl))

    result: Dict[str, Dict[str, Any]] = {}

    for group_name, page_tables in table_groups.items():
        if not page_tables:
            continue

        first_p_idx, first_table = page_tables[0]
        # Find header row in first table (within first 5 rows)
        header_idx = 0
        for idx, row in enumerate(first_table[:5]):
            row_text = " ".join([c.lower() for c in row if c])
            if any(kw in row_text for kw in header_keywords):
                header_idx = idx
                break

        # Check for 2-row superheader
        has_super = False
        headers: List[str] = []
        data_start_row = header_idx + 1

        if header_idx + 1 < len(first_table):
            r0 = first_table[header_idx]
            r1 = first_table[header_idx + 1]
            r1_text = " ".join([c.lower() for c in r1 if c])
            if any(k in r1_text for k in ["part code", "description", "part name", "price", "mrp", "dlp", "gst"]):
                has_super = True
                data_start_row = header_idx + 2
                seen: Dict[str, int] = {}
                current_super = ""
                for idx, (c0, c1) in enumerate(zip(r0, r1)):
                    if c0 and c0 not in ["Q", "/", " ", "-", "_"]:
                        current_super = c0
                    col_name = ""
                    if current_super and c1:
                        if current_super.lower() in c1.lower():
                            col_name = c1
                        else:
                            col_name = f"{current_super} - {c1}"
                    elif c1:
                        col_name = c1
                    elif c0:
                        col_name = c0
                    else:
                        col_name = f"Column_{idx + 1}"
                    if col_name in seen:
                        seen[col_name] += 1
                        col_name = f"{col_name}_{seen[col_name]}"
                    else:
                        seen[col_name] = 1
                    headers.append(col_name)

        if not headers:
            seen = {}
            for idx, c in enumerate(first_table[header_idx]):
                name = re.sub(r"\s+", " ", str(c)).strip() if c else f"Column_{idx + 1}"
                if name in seen:
                    seen[name] += 1
                    name = f"{name}_{seen[name]}"
                else:
                    seen[name] = 1
                headers.append(name)

        # Collect data rows, skipping repeated headers and footers
        normalized_headers = [h.lower().strip() for h in headers]
        data_rows: List[List[Any]] = []

        for p_idx, tbl in page_tables:
            start_r = data_start_row if p_idx == first_p_idx else 0
            for r in tbl[start_r:]:
                norm_r = [c.lower().strip() for c in r if c]
                if not norm_r:
                    continue
                # Use exact token comparison rather than greedy substring to prevent dropping valid parts
                matching_header_terms = sum(1 for c in norm_r if c in normalized_headers)
                if matching_header_terms >= max(2, len(norm_r) // 2):
                    continue
                first_non_empty = next((c.lower().strip() for c in r if c), "")
                if first_non_empty in ("total", "grand total", "summary"):
                    continue

                if len(r) < len(headers):
                    r = r + [None] * (len(headers) - len(r))
                elif len(r) > len(headers):
                    r = r[: len(headers)]
                data_rows.append(r)

        sheet_type = detect_sheet_type(group_name, headers)
        auto_map = auto_detect_field_mappings(headers, group_name)
        model_cols = detect_available_model_price_columns(headers)

        result[group_name] = {
            "headers": headers,
            "data_start_row": data_start_row,
            "has_super_header": has_super,
            "sheet_type": sheet_type,
            "auto_mapping": auto_map,
            "model_columns": model_cols,
            "rows": data_rows,
        }

    PDF_TABLES_CACHE[cache_key] = result
    return result


def inspect_pdf_document(file_path: Path, file_name: str, file_token: str) -> Dict[str, Any]:
    """Inspects a PDF document and returns the sheet metadata structure compatible with Excel workbooks."""
    cache_key = f"{file_path}_{os.path.getmtime(file_path)}"
    if cache_key in WORKBOOK_CACHE:
        return WORKBOOK_CACHE[cache_key]

    table_groups = extract_pdf_table_groups(file_path)
    sheets_info: List[Dict[str, Any]] = []

    for name, grp in table_groups.items():
        headers = grp["headers"]
        rows = grp["rows"]
        sample_rows: List[Dict[str, Any]] = []
        for r in rows[:3]:
            row_dict: Dict[str, Any] = {}
            for col_idx, col_name in enumerate(headers):
                if col_idx < len(r):
                    val = r[col_idx]
                    row_dict[col_name] = clean_cell_str(val) if val is not None else None
            sample_rows.append(row_dict)

        sheets_info.append(
            {
                "name": name,
                "row_count": len(rows),
                "col_count": len(headers),
                "has_super_header": grp["has_super_header"],
                "data_start_row": grp["data_start_row"],
                "sheet_type": grp["sheet_type"],
                "headers": headers,
                "sample_rows": sample_rows,
                "auto_mapping": grp["auto_mapping"],
                "model_columns": grp["model_columns"],
            }
        )

    result = {
        "file_name": file_name,
        "file_size": os.path.getsize(file_path),
        "file_token": file_token,
        "sheet_count": len(sheets_info),
        "sheets": sheets_info,
    }
    WORKBOOK_CACHE[cache_key] = result
    return result


def inspect_workbook(file_path: Path, file_name: str, file_token: str) -> Dict[str, Any]:
    """Inspects all sheets in the workbook without reading all rows into memory."""
    cache_key = f"{file_path}_{os.path.getmtime(file_path)}"
    if cache_key in WORKBOOK_CACHE:
        return WORKBOOK_CACHE[cache_key]

    if file_path.suffix.lower() == ".pdf":
        return inspect_pdf_document(file_path, file_name, file_token)

    wb = openpyxl.load_workbook(str(file_path), read_only=True, data_only=True)
    sheets_info: List[Dict[str, Any]] = []

    for name in wb.sheetnames:
        sheet = wb[name]
        headers, data_start, has_super = detect_sheet_headers(sheet)
        sheet_type = detect_sheet_type(name, headers)
        auto_map = auto_detect_field_mappings(headers, name)
        model_cols = detect_available_model_price_columns(headers)

        # Count non-empty rows and capture sample rows
        sample_rows: List[Dict[str, Any]] = []
        row_count = 0

        # Read samples and count
        for idx, row in enumerate(sheet.iter_rows(values_only=True)):
            if not any(cell is not None for cell in row):
                continue
            if idx >= data_start:
                row_count += 1
                if len(sample_rows) < 3:
                    row_dict: Dict[str, Any] = {}
                    for col_idx, col_name in enumerate(headers):
                        if col_idx < len(row):
                            val = row[col_idx]
                            row_dict[col_name] = clean_cell_str(val) if val is not None else None
                    sample_rows.append(row_dict)

        sheets_info.append(
            {
                "name": name,
                "row_count": row_count,
                "col_count": len(headers),
                "has_super_header": has_super,
                "data_start_row": data_start,
                "sheet_type": sheet_type,
                "headers": headers,
                "sample_rows": sample_rows,
                "auto_mapping": auto_map,
                "model_columns": model_cols,
            }
        )

    wb.close()

    result = {
        "file_name": file_name,
        "file_size": os.path.getsize(file_path),
        "file_token": file_token,
        "sheet_count": len(sheets_info),
        "sheets": sheets_info,
    }

    WORKBOOK_CACHE[cache_key] = result
    return result


def parse_and_preview_pdf_data(
    file_path: Path,
    sheet_name: str,
    field_mapping: Optional[Dict[str, str]] = None,
    page: int = 1,
    limit: int = 50,
    search: Optional[str] = None,
    filter_status: Optional[str] = None,
) -> Dict[str, Any]:
    """Reads rows from a specified PDF table group, applies Mail Merge mapping, validates fields,

    and returns paginated preview data.
    """
    table_groups = extract_pdf_table_groups(file_path)
    if sheet_name not in table_groups:
        if table_groups:
            sheet_name = next(iter(table_groups.keys()))
        else:
            raise ValueError(f"Table/Sheet '{sheet_name}' not found in PDF.")

    grp = table_groups[sheet_name]
    headers = grp["headers"]
    auto_map = grp["auto_mapping"]
    effective_map = {**auto_map, **(field_mapping or {})}
    model_price_cols = grp["model_columns"]
    header_to_idx = {h: idx for idx, h in enumerate(headers)}

    col_part_code = effective_map.get("part_code")
    col_desc = effective_map.get("description")
    col_hsn = effective_map.get("hsn_code")
    col_gst = effective_map.get("gst_rate")
    col_dlp = effective_map.get("dlp")
    col_mrp = effective_map.get("mrp")
    col_ex = effective_map.get("ex_factory")
    col_stock = effective_map.get("stock_quantity")
    col_cat = effective_map.get("category")
    col_margin = effective_map.get("dealer_margin_percent")
    col_ex_showroom = effective_map.get("ex_showroom")

    idx_part_code = header_to_idx.get(col_part_code) if col_part_code else None
    idx_desc = header_to_idx.get(col_desc) if col_desc else None
    idx_hsn = header_to_idx.get(col_hsn) if col_hsn else None
    idx_gst = header_to_idx.get(col_gst) if col_gst else None
    idx_dlp = header_to_idx.get(col_dlp) if col_dlp else None
    idx_mrp = header_to_idx.get(col_mrp) if col_mrp else None
    idx_ex = header_to_idx.get(col_ex) if col_ex else None
    idx_stock = header_to_idx.get(col_stock) if col_stock else None
    idx_cat = header_to_idx.get(col_cat) if col_cat else None
    idx_margin = header_to_idx.get(col_margin) if col_margin else None
    idx_ex_showroom = header_to_idx.get(col_ex_showroom) if col_ex_showroom else None

    all_parsed_rows: List[Dict[str, Any]] = []
    ready_count = 0
    warning_count = 0
    error_count = 0

    for row_index, row in enumerate(grp["rows"], start=1):
        row_len = len(row)

        def get_val(idx: Optional[int]) -> Any:
            if idx is not None and idx < row_len:
                return row[idx]
            return None

        raw_pc = get_val(idx_part_code)
        raw_desc = get_val(idx_desc)
        raw_hsn = get_val(idx_hsn)
        raw_gst = get_val(idx_gst)
        raw_dlp = get_val(idx_dlp)
        raw_mrp = get_val(idx_mrp)
        raw_ex = get_val(idx_ex)
        raw_margin = get_val(idx_margin)
        raw_ex_showroom = get_val(idx_ex_showroom)
        raw_stock = get_val(idx_stock)
        raw_cat = get_val(idx_cat)

        part_code = clean_cell_str(raw_pc)
        description = clean_cell_str(raw_desc)
        hsn_code = clean_cell_str(raw_hsn)
        gst_rate = clean_cell_float(raw_gst)
        if gst_rate is not None and 0 < gst_rate <= 1.0:
            gst_rate = round(gst_rate * 100, 2)
        dlp = clean_cell_float(raw_dlp)
        mrp = clean_cell_float(raw_mrp)
        ex_factory = clean_cell_float(raw_ex)
        margin_pct = clean_cell_float(raw_margin)
        if margin_pct is not None and 0 < margin_pct <= 1.0:
            margin_pct = round(margin_pct * 100, 2)
        ex_showroom = clean_cell_float(raw_ex_showroom)
        stock_quantity = clean_cell_optional_int(raw_stock) if idx_stock is not None else None
        category = clean_cell_str(raw_cat) or "General"

        # Formula deductions for sheets with partial columns:
        # 1. DLP (Dealer Landing Price = Ex Factory + GST)
        if dlp is None and ex_factory is not None and gst_rate is not None:
            dlp = round(ex_factory * (1.0 + (gst_rate / 100.0)), 2)

        # 2. Ex Showroom = Ex Factory + Dealer Margin
        if ex_showroom is None and ex_factory is not None and margin_pct is not None:
            ex_showroom = round(ex_factory * (1.0 + (margin_pct / 100.0)), 2)

        # 3. Customer MRP = Ex Showroom + Customer GST
        if mrp is None and ex_showroom is not None and gst_rate is not None:
            mrp = round(ex_showroom * (1.0 + (gst_rate / 100.0)), 2)

        model_prices: Dict[str, Optional[float]] = {}
        for mc in model_price_cols:
            cname = mc["column_name"]
            midx = header_to_idx.get(cname)
            if midx is not None and midx < row_len:
                mval = clean_cell_float(row[midx])
                if mval is not None:
                    model_prices[mc["model_name"]] = mval

        validation_messages: List[str] = []
        status = "READY"

        if not part_code and not description:
            continue

        if not part_code:
            status = "ERROR"
            validation_messages.append("Missing Part Code")
        elif not description:
            status = "ERROR"
            validation_messages.append("Missing Description")

        if status != "ERROR":
            if dlp is None and mrp is None and ex_factory is None and not model_prices:
                status = "WARNING"
                validation_messages.append("No price specified (DLP, MRP, or Model Price missing)")

        if status == "READY":
            ready_count += 1
        elif status == "WARNING":
            warning_count += 1
        else:
            error_count += 1

        if search and search.strip():
            q = search.strip().lower()
            in_code = q in (part_code or "").lower()
            in_desc = q in (description or "").lower()
            in_hsn = q in (hsn_code or "").lower()
            if not (in_code or in_desc or in_hsn):
                continue

        if filter_status and filter_status != "ALL":
            if status != filter_status:
                continue

        all_parsed_rows.append(
            {
                "row_id": row_index,
                "part_code": part_code or "",
                "description": description or "",
                "category": category,
                "tracking_mode": "QUANTITY",
                "hsn_code": hsn_code,
                "gst_rate": gst_rate,
                "dlp": dlp,
                "mrp": mrp,
                "ex_factory": ex_factory,
                "ex_showroom": ex_showroom,
                "dealer_margin_percent": margin_pct,
                "stock_quantity": stock_quantity,
                "model_prices": model_prices,
                "status": status,
                "validation_messages": validation_messages,
                "selected": status in ("READY", "WARNING"),
            }
        )

    total_filtered = len(all_parsed_rows)
    start_offset = (page - 1) * limit
    paginated_rows = all_parsed_rows[start_offset : start_offset + limit]

    return {
        "sheet_name": sheet_name,
        "total_rows": total_filtered,
        "page": page,
        "limit": limit,
        "headers": headers,
        "applied_mapping": effective_map,
        "model_columns": model_price_cols,
        "counts": {
            "total": len(grp["rows"]),
            "ready": ready_count,
            "warning": warning_count,
            "error": error_count,
            "filtered": total_filtered,
        },
        "rows": paginated_rows,
    }


def parse_and_preview_sheet_data(
    file_path: Path,
    sheet_name: str,
    field_mapping: Optional[Dict[str, str]] = None,
    page: int = 1,
    limit: int = 50,
    search: Optional[str] = None,
    filter_status: Optional[str] = None,
) -> Dict[str, Any]:
    """Reads rows from a specified sheet, applies Mail Merge mapping, validates fields,

    and returns paginated preview data.
    """
    if file_path.suffix.lower() == ".pdf":
        return parse_and_preview_pdf_data(
            file_path=file_path,
            sheet_name=sheet_name,
            field_mapping=field_mapping,
            page=page,
            limit=limit,
            search=search,
            filter_status=filter_status,
        )

    wb = openpyxl.load_workbook(str(file_path), read_only=True, data_only=True)
    if sheet_name not in wb.sheetnames:
        wb.close()
        raise ValueError(f"Sheet '{sheet_name}' not found in workbook.")

    sheet = wb[sheet_name]
    headers, data_start, has_super = detect_sheet_headers(sheet)
    auto_map = auto_detect_field_mappings(headers, sheet_name)

    # Effective mapping merges user overrides with auto-detected fields
    effective_map = {**auto_map, **(field_mapping or {})}
    model_price_cols = detect_available_model_price_columns(headers)

    header_to_idx = {h: idx for idx, h in enumerate(headers)}

    all_parsed_rows: List[Dict[str, Any]] = []
    ready_count = 0
    warning_count = 0
    error_count = 0

    col_part_code = effective_map.get("part_code")
    col_desc = effective_map.get("description")
    col_hsn = effective_map.get("hsn_code")
    col_gst = effective_map.get("gst_rate")
    col_dlp = effective_map.get("dlp")
    col_mrp = effective_map.get("mrp")
    col_ex = effective_map.get("ex_factory")
    col_margin = effective_map.get("dealer_margin_percent")
    col_ex_showroom = effective_map.get("ex_showroom")
    col_stock = effective_map.get("stock_quantity")
    col_cat = effective_map.get("category")

    idx_part_code = header_to_idx.get(col_part_code) if col_part_code else None
    idx_desc = header_to_idx.get(col_desc) if col_desc else None
    idx_hsn = header_to_idx.get(col_hsn) if col_hsn else None
    idx_gst = header_to_idx.get(col_gst) if col_gst else None
    idx_dlp = header_to_idx.get(col_dlp) if col_dlp else None
    idx_mrp = header_to_idx.get(col_mrp) if col_mrp else None
    idx_ex = header_to_idx.get(col_ex) if col_ex else None
    idx_margin = header_to_idx.get(col_margin) if col_margin else None
    idx_ex_showroom = header_to_idx.get(col_ex_showroom) if col_ex_showroom else None
    idx_stock = header_to_idx.get(col_stock) if col_stock else None
    idx_cat = header_to_idx.get(col_cat) if col_cat else None

    row_index = 0
    for file_row_idx, row in enumerate(sheet.iter_rows(values_only=True)):
        if file_row_idx < data_start:
            continue
        if not any(cell is not None for cell in row):
            continue

        row_index += 1
        row_len = len(row)

        def get_val(idx: Optional[int]) -> Any:
            if idx is not None and idx < row_len:
                return row[idx]
            return None

        raw_pc = get_val(idx_part_code)
        raw_desc = get_val(idx_desc)
        raw_hsn = get_val(idx_hsn)
        raw_gst = get_val(idx_gst)
        raw_dlp = get_val(idx_dlp)
        raw_mrp = get_val(idx_mrp)
        raw_ex = get_val(idx_ex)
        raw_margin = get_val(idx_margin)
        raw_ex_showroom = get_val(idx_ex_showroom)
        raw_stock = get_val(idx_stock)
        raw_cat = get_val(idx_cat)

        part_code = clean_cell_str(raw_pc)
        description = clean_cell_str(raw_desc)
        hsn_code = clean_cell_str(raw_hsn)
        gst_rate = clean_cell_float(raw_gst)
        # If GST rate is expressed as decimal fraction (e.g. 0.18, 0.28, 0.05), normalize to percent (18, 28, 5)
        if gst_rate is not None and 0 < gst_rate <= 1.0:
            gst_rate = round(gst_rate * 100, 2)

        dlp = clean_cell_float(raw_dlp)
        mrp = clean_cell_float(raw_mrp)
        ex_factory = clean_cell_float(raw_ex)
        margin_pct = clean_cell_float(raw_margin)
        if margin_pct is not None and 0 < margin_pct <= 1.0:
            margin_pct = round(margin_pct * 100, 2)
        ex_showroom = clean_cell_float(raw_ex_showroom)
        stock_quantity = clean_cell_optional_int(raw_stock) if idx_stock is not None else None
        category = clean_cell_str(raw_cat) or "General"

        # Formula deductions for sheets with partial columns:
        # 1. DLP (Dealer Landing Price = Ex Factory + GST)
        if dlp is None and ex_factory is not None and gst_rate is not None:
            dlp = round(ex_factory * (1.0 + (gst_rate / 100.0)), 2)

        # 2. Ex Showroom = Ex Factory + Dealer Margin
        if ex_showroom is None and ex_factory is not None and margin_pct is not None:
            ex_showroom = round(ex_factory * (1.0 + (margin_pct / 100.0)), 2)

        # 3. Customer MRP = Ex Showroom + Customer GST
        if mrp is None and ex_showroom is not None and gst_rate is not None:
            mrp = round(ex_showroom * (1.0 + (gst_rate / 100.0)), 2)

        # Extract model-specific prices if available
        model_prices: Dict[str, Optional[float]] = {}
        for mc in model_price_cols:
            cname = mc["column_name"]
            midx = header_to_idx.get(cname)
            if midx is not None and midx < row_len:
                mval = clean_cell_float(row[midx])
                if mval is not None:
                    model_prices[mc["model_name"]] = mval

        # Status & Validation rules
        validation_messages: List[str] = []
        status = "READY"

        if not part_code:
            status = "ERROR"
            validation_messages.append("Missing Part Code")
        if not description:
            status = "ERROR"
            validation_messages.append("Missing Description")

        if status != "ERROR":
            if dlp is None and mrp is None and ex_factory is None and not model_prices:
                status = "WARNING"
                validation_messages.append("Price / MRP unassigned")
            if not hsn_code:
                validation_messages.append("HSN not provided")

        if status == "READY":
            ready_count += 1
        elif status == "WARNING":
            warning_count += 1
        else:
            error_count += 1

        # Search filter
        if search:
            q = search.lower().strip()
            pc_match = part_code and q in part_code.lower()
            desc_match = description and q in description.lower()
            hsn_match = hsn_code and q in hsn_code.lower()
            if not (pc_match or desc_match or hsn_match):
                continue

        # Status filter
        if filter_status and filter_status != "ALL" and status != filter_status:
            continue

        all_parsed_rows.append(
            {
                "row_id": row_index,
                "part_code": part_code or "",
                "description": description or "",
                "category": category,
                "tracking_mode": "QUANTITY",
                "hsn_code": hsn_code,
                "gst_rate": gst_rate,
                "dlp": dlp,
                "mrp": mrp,
                "ex_factory": ex_factory,
                "ex_showroom": ex_showroom,
                "dealer_margin_percent": margin_pct,
                "stock_quantity": stock_quantity,
                "model_prices": model_prices,
                "status": status,
                "validation_messages": validation_messages,
                "selected": status in ("READY", "WARNING"),
            }
        )

    wb.close()

    total_filtered = len(all_parsed_rows)
    start_offset = (page - 1) * limit
    paginated_rows = all_parsed_rows[start_offset : start_offset + limit]

    return {
        "sheet_name": sheet_name,
        "total_rows": total_filtered,
        "page": page,
        "limit": limit,
        "headers": headers,
        "applied_mapping": effective_map,
        "model_columns": model_price_cols,
        "counts": {
            "total": row_index,
            "ready": ready_count,
            "warning": warning_count,
            "error": error_count,
            "filtered": total_filtered,
        },
        "rows": paginated_rows,
    }


async def ensure_default_brand(db: AsyncSession) -> Brand:
    """Ensures at least one active brand exists to associate imported vehicle models."""
    stmt = select(Brand).where(Brand.is_deleted.is_(False)).order_by(Brand.brand_id.asc())
    res = await db.execute(stmt)
    brand = res.scalars().first()
    if not brand:
        brand = Brand(
            brand_name="Ampere Electric",
            is_active=True,
        )
        db.add(brand)
        await db.flush()
    return brand


async def get_or_create_vehicle_model(model_name: str, brand_id: int, db: AsyncSession) -> VehicleModel:
    """Gets an existing VehicleModel or auto-creates one if missing."""
    clean_name = model_name.strip()
    stmt = select(VehicleModel).where(
        VehicleModel.model_name.ilike(clean_name),
        VehicleModel.is_deleted.is_(False),
    )
    res = await db.execute(stmt)
    vm = res.scalars().first()
    if not vm:
        mat_num = f"VM-{re.sub(r'[^A-Za-z0-9]', '', clean_name).upper()[:20]}"
        vm = VehicleModel(
            brand_id=brand_id,
            model_name=clean_name,
            material_number=mat_num,
            colour="Standard",
            is_active=True,
        )
        db.add(vm)
        await db.flush()
    return vm


async def get_or_create_default_price_list_version(db: AsyncSession) -> PriceListVersion:
    """Gets or creates the master inventory price list version."""
    pl_stmt = select(PriceList).where(PriceList.source_name == "Master Inventory", PriceList.is_deleted.is_(False))
    pl_res = await db.execute(pl_stmt)
    price_list = pl_res.scalars().first()
    if not price_list:
        price_list = PriceList(
            source_name="Master Inventory",
            status="ACTIVE",
            remarks="Master Inventory Ingestion Price List",
        )
        db.add(price_list)
        await db.flush()

    ver_stmt = (
        select(PriceListVersion)
        .where(PriceListVersion.price_list_id == price_list.price_list_id, PriceListVersion.is_deleted.is_(False))
        .order_by(PriceListVersion.version_id.desc())
    )
    ver_res = await db.execute(ver_stmt)
    version = ver_res.scalars().first()
    if not version:
        version = PriceListVersion(
            price_list_id=price_list.price_list_id,
            version_reference="VER-MASTER-DEFAULT",
            effective_from=utc_now_naive(),
            received_date=utc_now_naive(),
            status="PUBLISHED",
        )
        db.add(version)
        await db.flush()

    return version


def encode_spare_remarks(hsn_code: Optional[str], user_remarks: Optional[str]) -> Optional[str]:
    parts = []
    if hsn_code and str(hsn_code).strip():
        parts.append(f"HSN: {str(hsn_code).strip()}")
    if user_remarks and str(user_remarks).strip():
        clean_remarks = re.sub(r"HSN:\s*[A-Za-z0-9]+\s*(\|\s*)?", "", str(user_remarks).strip()).strip()
        if clean_remarks:
            parts.append(clean_remarks)
    return " | ".join(parts) if parts else None


async def execute_batch_import(
    rows_to_import: List[Dict[str, Any]],
    target_model_name: Optional[str],
    update_existing: bool,
    update_stock: bool,
    default_category: Optional[str],
    db: AsyncSession,
    source_document_name: Optional[str] = None,
    action_type: str = "IMPORT_EXCEL",
    staff_id: Optional[int] = None,
    staff_name: Optional[str] = None,
) -> Dict[str, Any]:
    """Executes atomic batch import of validated rows into the ERP inventory schema."""
    if not rows_to_import:
        return {
            "success": True,
            "total_processed": 0,
            "created_count": 0,
            "updated_count": 0,
            "skipped_count": 0,
            "errors": [],
            "message": "No rows provided for import.",
        }

    brand = await ensure_default_brand(db)
    version = await get_or_create_default_price_list_version(db)

    # Pre-load all vehicle models for quick lookup
    vm_stmt = select(VehicleModel).where(VehicleModel.is_deleted.is_(False))
    vm_res = await db.execute(vm_stmt)
    existing_vms = list(vm_res.scalars().all())
    vm_map: Dict[str, VehicleModel] = {vm.model_name.lower().strip(): vm for vm in existing_vms}

    target_vm: Optional[VehicleModel] = None
    if target_model_name and target_model_name.strip():
        target_name_clean = target_model_name.strip()
        if target_name_clean.lower() in vm_map:
            target_vm = vm_map[target_name_clean.lower()]
        else:
            target_vm = await get_or_create_vehicle_model(target_name_clean, brand.brand_id, db)
            vm_map[target_name_clean.lower()] = target_vm

    created_count = 0
    updated_count = 0
    skipped_count = 0
    errors: List[str] = []

    # Process in chunks of 100 for high efficiency
    chunk_size = 100
    for chunk_start in range(0, len(rows_to_import), chunk_size):
        chunk = rows_to_import[chunk_start : chunk_start + chunk_size]

        # Gather part codes in this chunk
        codes_in_chunk = [r.get("part_code", "").strip() for r in chunk if r.get("part_code")]

        # Query existing codes
        sp_code_stmt = (
            select(SparePartCode)
            .where(SparePartCode.code.in_(codes_in_chunk), SparePartCode.is_deleted.is_(False))
            .options(
                selectinload(SparePartCode.spare).selectinload(SpareMaster.codes),
                selectinload(SparePartCode.spare).selectinload(SpareMaster.compatibilities),
                selectinload(SparePartCode.spare).selectinload(SpareMaster.balances),
            )
        )
        sp_code_res = await db.execute(sp_code_stmt)
        existing_codes_map = {sc.code: sc for sc in sp_code_res.scalars().all()}

        # Batch pre-fetch PriceListItems for all codes in this chunk (O(1) queries instead of N queries)
        pli_stmt = select(PriceListItem).where(
            PriceListItem.part_code.in_(codes_in_chunk),
            PriceListItem.version_id == version.version_id,
            PriceListItem.is_deleted.is_(False),
        )
        pli_res = await db.execute(pli_stmt)
        existing_pli_map = {pli.part_code: pli for pli in pli_res.scalars().all()}

        pending_new_spares: List[Dict[str, Any]] = []

        for row in chunk:
            part_code = str(row.get("part_code") or "").strip()
            description = str(row.get("description") or "").strip()
            if not part_code or not description:
                skipped_count += 1
                errors.append(f"Row skipped: missing part_code or description (code: '{part_code}')")
                continue

            category = row.get("category") or default_category or "General"
            hsn_code = row.get("hsn_code")
            gst_rate = clean_cell_float(row.get("gst_rate"))
            if gst_rate is not None and 0 < gst_rate <= 1.0:
                gst_rate = round(gst_rate * 100, 2)

            dlp = clean_cell_float(row.get("dlp"))
            mrp = clean_cell_float(row.get("mrp"))
            ex_factory = clean_cell_float(row.get("ex_factory"))
            margin_pct = clean_cell_float(row.get("dealer_margin_percent"))
            if margin_pct is not None and 0 < margin_pct <= 1.0:
                margin_pct = round(margin_pct * 100, 2)
            ex_showroom = clean_cell_float(row.get("ex_showroom"))

            stock_qty = clean_cell_optional_int(row.get("stock_quantity"))
            model_prices = row.get("model_prices") or {}

            encoded_remarks = encode_spare_remarks(hsn_code, row.get("remarks"))

            # Pricing formulation according to dealer pricing model:
            # 1. Purchase Rate (Cost Price to Dealer) = Dealer Landing Price (DLP = Ex Factory + GST Value)
            if dlp is not None and float(dlp) > 0:
                purchase_cost = float(dlp)
            elif ex_factory is not None and float(ex_factory) > 0 and gst_rate is not None and float(gst_rate) > 0:
                purchase_cost = round(float(ex_factory) * (1.0 + (float(gst_rate) / 100.0)), 2)
            elif ex_factory is not None and float(ex_factory) > 0:
                purchase_cost = float(ex_factory)
            else:
                purchase_cost = 0.0

            # 2. Ex Showroom Price = Ex Factory + Dealer Margin
            if ex_showroom is not None and float(ex_showroom) > 0:
                showroom_price = float(ex_showroom)
            elif ex_factory is not None and float(ex_factory) > 0 and margin_pct is not None:
                showroom_price = round(float(ex_factory) * (1.0 + (float(margin_pct) / 100.0)), 2)
            elif mrp is not None and float(mrp) > 0 and gst_rate is not None and float(gst_rate) > 0:
                showroom_price = round(float(mrp) / (1.0 + (float(gst_rate) / 100.0)), 2)
            else:
                showroom_price = None

            # 3. Customer MRP = Ex Showroom + Customer GST
            if mrp is not None and float(mrp) > 0:
                final_mrp = float(mrp)
            elif showroom_price is not None and showroom_price > 0 and gst_rate is not None and float(gst_rate) > 0:
                final_mrp = round(showroom_price * (1.0 + (float(gst_rate) / 100.0)), 2)
            else:
                final_mrp = None

            # 4. Dealer Margin %
            if margin_pct is not None:
                observed_margin = float(margin_pct)
            elif showroom_price is not None and ex_factory is not None and float(ex_factory) > 0:
                observed_margin = round(((showroom_price - float(ex_factory)) / float(ex_factory)) * 100.0, 2)
            elif purchase_cost > 0 and final_mrp is not None and final_mrp > 0:
                observed_margin = calculate_observed_margin(purchase_cost, final_mrp)
            else:
                observed_margin = None

            existing_code_obj = existing_codes_map.get(part_code)

            if existing_code_obj:
                if not update_existing:
                    skipped_count += 1
                    continue

                # Update existing spare
                spare = existing_code_obj.spare
                if spare:
                    before_snap = capture_spare_snapshot(spare, part_code)
                    spare.spare_name = description
                    if category:
                        spare.category = category
                    if encoded_remarks:
                        spare.remarks = encoded_remarks
                    spare.hsn_code = hsn_code
                    spare.gst_rate = gst_rate or 18.0
                    spare.base_cost = purchase_cost if purchase_cost > 0 else None
                    spare.base_dlp = purchase_cost if purchase_cost > 0 else None
                    spare.base_ex_showroom = showroom_price
                    spare.base_mrp = final_mrp
                    if observed_margin is not None:
                        spare.profit_margin_percent = observed_margin
                    spare.updated_at = utc_now_naive()

                    # Update price list item from pre-fetched map
                    pli = existing_pli_map.get(part_code)
                    if pli:
                        if final_mrp is not None:
                            pli.mrp = final_mrp
                        if purchase_cost > 0:
                            pli.dlp = purchase_cost
                        if gst_rate is not None:
                            pli.gst_rate = gst_rate
                        pli.part_name = description
                    else:
                        new_pli = PriceListItem(
                            version_id=version.version_id,
                            part_code=part_code,
                            part_name=description,
                            mrp=final_mrp,
                            dlp=purchase_cost if purchase_cost > 0 else None,
                            gst_rate=gst_rate,
                        )
                        db.add(new_pli)
                        existing_pli_map[part_code] = new_pli

                    # Selling price history
                    if final_mrp is not None:
                        db.add(
                            SpareSellingPriceHistory(
                                spare_id=spare.spare_id,
                                selling_price=final_mrp,
                                effective_from=utc_now_naive(),
                                reason="Worksheet Batch Update",
                            )
                        )

                    # Cost history (Purchase Rate = Dealer Landing Price)
                    if purchase_cost > 0:
                        db.add(
                            SpareCostHistory(
                                spare_id=spare.spare_id,
                                quantity=0,
                                billed_unit_price=purchase_cost,
                                landed_cost=purchase_cost,
                                source_reference=source_document_name or "Worksheet Batch Update",
                                effective_date=utc_now_naive(),
                            )
                        )

                    # Stock balance update if requested
                    if update_stock and stock_qty is not None:
                        bal_found = False
                        for bal in spare.balances:
                            if bal.location == "MAIN_SHOWROOM":
                                bal.quantity = stock_qty
                                bal_found = True
                                break
                        if not bal_found:
                            db.add(
                                SpareStockBalance(
                                    spare_id=spare.spare_id,
                                    location="MAIN_SHOWROOM",
                                    quantity=stock_qty,
                                )
                            )

                    # Target model compatibility with model pricing
                    if target_vm:
                        existing_compat = next(
                            (c for c in spare.compatibilities if c.vehicle_model_id == target_vm.vehicle_model_id),
                            None,
                        )
                        if not existing_compat:
                            db.add(
                                SparePartVehicleCompatibility(
                                    spare_id=spare.spare_id,
                                    vehicle_model_id=target_vm.vehicle_model_id,
                                    ex_factory_price=ex_factory,
                                    dlp=purchase_cost if purchase_cost > 0 else None,
                                    ex_showroom_price=showroom_price,
                                    customer_mrp=final_mrp,
                                    gst_rate=gst_rate or 18.0,
                                    profit_margin_percent=observed_margin,
                                    is_primary=True,
                                )
                            )
                        else:
                            existing_compat.ex_factory_price = ex_factory
                            existing_compat.dlp = purchase_cost if purchase_cost > 0 else None
                            existing_compat.ex_showroom_price = showroom_price
                            existing_compat.customer_mrp = final_mrp
                            existing_compat.gst_rate = gst_rate or 18.0
                            existing_compat.profit_margin_percent = observed_margin

                    # Model specific prices
                    for mname, mprice in model_prices.items():
                        if mprice is not None:
                            mclean = mname.strip()
                            if mclean.lower() not in vm_map:
                                new_vm = await get_or_create_vehicle_model(mclean, brand.brand_id, db)
                                vm_map[mclean.lower()] = new_vm
                            mvm = vm_map[mclean.lower()]
                            m_margin = calculate_observed_margin(purchase_cost, mprice) if purchase_cost > 0 else None

                            existing_mcompat = next(
                                (c for c in spare.compatibilities if c.vehicle_model_id == mvm.vehicle_model_id),
                                None,
                            )
                            if not existing_mcompat:
                                db.add(
                                    SparePartVehicleCompatibility(
                                        spare_id=spare.spare_id,
                                        vehicle_model_id=mvm.vehicle_model_id,
                                        ex_factory_price=ex_factory,
                                        dlp=purchase_cost if purchase_cost > 0 else None,
                                        ex_showroom_price=mprice,
                                        customer_mrp=mprice,
                                        gst_rate=gst_rate or 18.0,
                                        profit_margin_percent=m_margin,
                                    )
                                )
                            else:
                                existing_mcompat.ex_factory_price = ex_factory
                                existing_mcompat.dlp = purchase_cost if purchase_cost > 0 else None
                                existing_mcompat.ex_showroom_price = mprice
                                existing_mcompat.customer_mrp = mprice
                                existing_mcompat.gst_rate = gst_rate or 18.0
                                existing_mcompat.profit_margin_percent = m_margin

                            db.add(
                                SpareSellingPriceHistory(
                                    spare_id=spare.spare_id,
                                    selling_price=mprice,
                                    effective_from=utc_now_naive(),
                                    reason=f"Model: {mclean}",
                                )
                            )

                    # Record alteration audit trail entry
                    after_snap = capture_spare_snapshot(spare, part_code)
                    record_alteration(
                        db=db,
                        spare_id=spare.spare_id,
                        part_code=part_code,
                        action_type=action_type,
                        source_reference=source_document_name or "Worksheet Batch Ingestion",
                        snapshot_before=before_snap,
                        snapshot_after=after_snap,
                        altered_by_id=staff_id,
                        altered_by_name=staff_name or "Worksheet Ingestion",
                    )

                    updated_count += 1
            else:
                # Stage brand new SpareMaster without immediate individual flush
                new_spare = SpareMaster(
                    spare_name=description,
                    category=category,
                    tracking_mode="QUANTITY",
                    status="ACTIVE",
                    is_verified=True,
                    remarks=encoded_remarks,
                    hsn_code=hsn_code,
                    gst_rate=gst_rate or 18.0,
                    base_cost=purchase_cost if purchase_cost > 0 else None,
                    base_dlp=purchase_cost if purchase_cost > 0 else None,
                    base_ex_showroom=showroom_price,
                    base_mrp=final_mrp,
                    profit_margin_percent=observed_margin,
                )
                db.add(new_spare)
                pending_new_spares.append(
                    {
                        "spare": new_spare,
                        "part_code": part_code,
                        "description": description,
                        "purchase_cost": purchase_cost,
                        "ex_factory": ex_factory,
                        "showroom_price": showroom_price,
                        "final_mrp": final_mrp,
                        "observed_margin": observed_margin,
                        "gst_rate": gst_rate,
                        "stock_qty": stock_qty,
                        "model_prices": model_prices,
                    }
                )

        # Process new spares in batch: allocate all spare_ids in 1 single flush per chunk
        if pending_new_spares:
            await db.flush()

            for item in pending_new_spares:
                new_spare = item["spare"]
                part_code = item["part_code"]
                description = item["description"]
                purchase_cost = item["purchase_cost"]
                ex_factory = item["ex_factory"]
                showroom_price = item["showroom_price"]
                final_mrp = item["final_mrp"]
                observed_margin = item["observed_margin"]
                gst_rate = item["gst_rate"]
                stock_qty = item["stock_qty"]
                model_prices = item["model_prices"]

                # Add part code
                new_code = SparePartCode(
                    spare_id=new_spare.spare_id,
                    code=part_code,
                    is_current=True,
                    effective_from=utc_now_naive(),
                    reason="Worksheet Batch Import",
                )
                db.add(new_code)

                # Add PriceListItem
                new_pli = PriceListItem(
                    version_id=version.version_id,
                    part_code=part_code,
                    part_name=description,
                    mrp=final_mrp,
                    dlp=purchase_cost if purchase_cost > 0 else None,
                    gst_rate=gst_rate,
                )
                db.add(new_pli)
                existing_pli_map[part_code] = new_pli

                # Price histories
                if final_mrp is not None:
                    db.add(
                        SpareSellingPriceHistory(
                            spare_id=new_spare.spare_id,
                            selling_price=final_mrp,
                            effective_from=utc_now_naive(),
                            reason="Worksheet Batch Ingestion",
                        )
                    )

                if purchase_cost > 0:
                    db.add(
                        SpareCostHistory(
                            spare_id=new_spare.spare_id,
                            quantity=0,
                            billed_unit_price=purchase_cost,
                            landed_cost=purchase_cost,
                            source_reference=source_document_name or "Worksheet Batch Ingestion",
                            effective_date=utc_now_naive(),
                        )
                    )

                # Stock balance
                if update_stock and stock_qty is not None:
                    db.add(
                        SpareStockBalance(
                            spare_id=new_spare.spare_id,
                            location="MAIN_SHOWROOM",
                            quantity=stock_qty,
                        )
                    )
                    if stock_qty > 0:
                        db.add(
                            SpareStockMovement(
                                spare_id=new_spare.spare_id,
                                quantity=stock_qty,
                                movement_type="ADJUSTMENT",
                                to_location="MAIN_SHOWROOM",
                                remarks="Initial Worksheet Balance",
                            )
                        )

                # Target model compatibility
                if target_vm:
                    db.add(
                        SparePartVehicleCompatibility(
                            spare_id=new_spare.spare_id,
                            vehicle_model_id=target_vm.vehicle_model_id,
                            ex_factory_price=ex_factory,
                            dlp=purchase_cost if purchase_cost > 0 else None,
                            ex_showroom_price=showroom_price,
                            customer_mrp=final_mrp,
                            gst_rate=gst_rate or 18.0,
                            profit_margin_percent=observed_margin,
                            is_primary=True,
                        )
                    )

                # Model specific prices
                for mname, mprice in model_prices.items():
                    if mprice is not None:
                        mclean = mname.strip()
                        if mclean.lower() not in vm_map:
                            new_vm = await get_or_create_vehicle_model(mclean, brand.brand_id, db)
                            vm_map[mclean.lower()] = new_vm
                        mvm = vm_map[mclean.lower()]
                        m_margin = calculate_observed_margin(purchase_cost, mprice) if purchase_cost > 0 else None

                        db.add(
                            SparePartVehicleCompatibility(
                                spare_id=new_spare.spare_id,
                                vehicle_model_id=mvm.vehicle_model_id,
                                ex_factory_price=ex_factory,
                                dlp=purchase_cost if purchase_cost > 0 else None,
                                ex_showroom_price=mprice,
                                customer_mrp=mprice,
                                gst_rate=gst_rate or 18.0,
                                profit_margin_percent=m_margin,
                            )
                        )
                        db.add(
                            SpareSellingPriceHistory(
                                spare_id=new_spare.spare_id,
                                selling_price=mprice,
                                effective_from=utc_now_naive(),
                                reason=f"Model: {mclean}",
                            )
                        )

                created_count += 1

        await db.flush()

    await db.commit()

    return {
        "success": True,
        "total_processed": len(rows_to_import),
        "created_count": created_count,
        "updated_count": updated_count,
        "skipped_count": skipped_count,
        "errors": errors[:20],
        "message": f"Successfully processed {len(rows_to_import)} parts: {created_count} created, {updated_count} updated, {skipped_count} skipped.",
    }


async def execute_entire_pdf_import(
    file_path: Path,
    sheet_name: str,
    field_mapping: Optional[Dict[str, str]] = None,
    target_model_name: Optional[str] = None,
    default_category: Optional[str] = "Spare Parts",
    update_existing: bool = True,
    update_stock: bool = False,
    db: AsyncSession = None,
) -> Dict[str, Any]:
    """Reads all rows from the specified PDF table group directly and imports them in chunks."""
    table_groups = extract_pdf_table_groups(file_path)
    if sheet_name not in table_groups:
        if table_groups:
            sheet_name = next(iter(table_groups.keys()))
        else:
            raise ValueError(f"Table/Sheet '{sheet_name}' not found in PDF.")

    grp = table_groups[sheet_name]
    headers = grp["headers"]
    auto_map = grp["auto_mapping"]
    effective_map = {**auto_map, **(field_mapping or {})}
    model_price_cols = grp["model_columns"]
    header_to_idx = {h: idx for idx, h in enumerate(headers)}

    col_part_code = effective_map.get("part_code")
    col_desc = effective_map.get("description")
    col_hsn = effective_map.get("hsn_code")
    col_gst = effective_map.get("gst_rate")
    col_dlp = effective_map.get("dlp")
    col_mrp = effective_map.get("mrp")
    col_ex = effective_map.get("ex_factory")
    col_margin = effective_map.get("dealer_margin_percent")
    col_ex_showroom = effective_map.get("ex_showroom")
    col_stock = effective_map.get("stock_quantity")
    col_cat = effective_map.get("category")

    idx_part_code = header_to_idx.get(col_part_code) if col_part_code else None
    idx_desc = header_to_idx.get(col_desc) if col_desc else None
    idx_hsn = header_to_idx.get(col_hsn) if col_hsn else None
    idx_gst = header_to_idx.get(col_gst) if col_gst else None
    idx_dlp = header_to_idx.get(col_dlp) if col_dlp else None
    idx_mrp = header_to_idx.get(col_mrp) if col_mrp else None
    idx_ex = header_to_idx.get(col_ex) if col_ex else None
    idx_margin = header_to_idx.get(col_margin) if col_margin else None
    idx_ex_showroom = header_to_idx.get(col_ex_showroom) if col_ex_showroom else None
    idx_stock = header_to_idx.get(col_stock) if col_stock else None
    idx_cat = header_to_idx.get(col_cat) if col_cat else None

    all_rows: List[Dict[str, Any]] = []

    for row in grp["rows"]:
        row_len = len(row)

        def get_val(idx: Optional[int]) -> Any:
            if idx is not None and idx < row_len:
                return row[idx]
            return None

        part_code = clean_cell_str(get_val(idx_part_code))
        description = clean_cell_str(get_val(idx_desc))
        if not part_code or not description:
            continue

        hsn_code = clean_cell_str(get_val(idx_hsn))
        gst_rate = clean_cell_float(get_val(idx_gst))
        if gst_rate is not None and 0 < gst_rate <= 1.0:
            gst_rate = round(gst_rate * 100, 2)
        dlp = clean_cell_float(get_val(idx_dlp))
        mrp = clean_cell_float(get_val(idx_mrp))
        ex_factory = clean_cell_float(get_val(idx_ex))
        margin_pct = clean_cell_float(get_val(idx_margin))
        if margin_pct is not None and 0 < margin_pct <= 1.0:
            margin_pct = round(margin_pct * 100, 2)
        ex_showroom = clean_cell_float(get_val(idx_ex_showroom))
        stock_quantity = clean_cell_optional_int(get_val(idx_stock)) if idx_stock is not None else None
        category = clean_cell_str(get_val(idx_cat)) or default_category or "General"

        # Formula deductions
        if dlp is None and ex_factory is not None and gst_rate is not None:
            dlp = round(ex_factory * (1.0 + (gst_rate / 100.0)), 2)
        if ex_showroom is None and ex_factory is not None and margin_pct is not None:
            ex_showroom = round(ex_factory * (1.0 + (margin_pct / 100.0)), 2)
        if mrp is None and ex_showroom is not None and gst_rate is not None:
            mrp = round(ex_showroom * (1.0 + (gst_rate / 100.0)), 2)

        model_prices: Dict[str, Optional[float]] = {}
        for mc in model_price_cols:
            cname = mc["column_name"]
            midx = header_to_idx.get(cname)
            if midx is not None and midx < row_len:
                mval = clean_cell_float(row[midx])
                if mval is not None:
                    model_prices[mc["model_name"]] = mval

        all_rows.append(
            {
                "part_code": part_code,
                "description": description,
                "category": category,
                "tracking_mode": "QUANTITY",
                "hsn_code": hsn_code,
                "gst_rate": gst_rate,
                "dlp": dlp,
                "mrp": mrp,
                "ex_factory": ex_factory,
                "ex_showroom": ex_showroom,
                "dealer_margin_percent": margin_pct,
                "stock_quantity": stock_quantity,
                "model_prices": model_prices,
            }
        )

    return await execute_batch_import(
        rows_to_import=all_rows,
        target_model_name=target_model_name,
        update_existing=update_existing,
        update_stock=update_stock,
        default_category=default_category,
        db=db,
        source_document_name=file_path.name,
        action_type="IMPORT_PDF",
    )


async def execute_entire_sheet_import(
    file_path: Path,
    sheet_name: str,
    field_mapping: Optional[Dict[str, str]] = None,
    target_model_name: Optional[str] = None,
    default_category: Optional[str] = "Spare Parts",
    update_existing: bool = True,
    update_stock: bool = False,
    db: AsyncSession = None,
) -> Dict[str, Any]:
    """Reads all rows from the specified sheet directly and imports them in chunks

    into the relational database without limiting to a single paginated view.
    """
    if file_path.suffix.lower() == ".pdf":
        return await execute_entire_pdf_import(
            file_path=file_path,
            sheet_name=sheet_name,
            field_mapping=field_mapping,
            target_model_name=target_model_name,
            default_category=default_category,
            update_existing=update_existing,
            update_stock=update_stock,
            db=db,
        )

    wb = openpyxl.load_workbook(str(file_path), read_only=True, data_only=True)
    if sheet_name not in wb.sheetnames:
        wb.close()
        raise ValueError(f"Sheet '{sheet_name}' not found in workbook.")

    sheet = wb[sheet_name]
    headers, data_start, _ = detect_sheet_headers(sheet)
    auto_map = auto_detect_field_mappings(headers, sheet_name)
    effective_map = {**auto_map, **(field_mapping or {})}
    model_price_cols = detect_available_model_price_columns(headers)
    header_to_idx = {h: idx for idx, h in enumerate(headers)}

    col_part_code = effective_map.get("part_code")
    col_desc = effective_map.get("description")
    col_hsn = effective_map.get("hsn_code")
    col_gst = effective_map.get("gst_rate")
    col_dlp = effective_map.get("dlp")
    col_mrp = effective_map.get("mrp")
    col_ex = effective_map.get("ex_factory")
    col_margin = effective_map.get("dealer_margin_percent")
    col_ex_showroom = effective_map.get("ex_showroom")
    col_stock = effective_map.get("stock_quantity")
    col_cat = effective_map.get("category")

    idx_part_code = header_to_idx.get(col_part_code) if col_part_code else None
    idx_desc = header_to_idx.get(col_desc) if col_desc else None
    idx_hsn = header_to_idx.get(col_hsn) if col_hsn else None
    idx_gst = header_to_idx.get(col_gst) if col_gst else None
    idx_dlp = header_to_idx.get(col_dlp) if col_dlp else None
    idx_mrp = header_to_idx.get(col_mrp) if col_mrp else None
    idx_ex = header_to_idx.get(col_ex) if col_ex else None
    idx_margin = header_to_idx.get(col_margin) if col_margin else None
    idx_ex_showroom = header_to_idx.get(col_ex_showroom) if col_ex_showroom else None
    idx_stock = header_to_idx.get(col_stock) if col_stock else None
    idx_cat = header_to_idx.get(col_cat) if col_cat else None

    all_rows: List[Dict[str, Any]] = []

    for file_row_idx, row in enumerate(sheet.iter_rows(values_only=True)):
        if file_row_idx < data_start:
            continue
        if not any(cell is not None for cell in row):
            continue

        row_len = len(row)

        def get_val(idx: Optional[int]) -> Any:
            if idx is not None and idx < row_len:
                return row[idx]
            return None

        part_code = clean_cell_str(get_val(idx_part_code))
        description = clean_cell_str(get_val(idx_desc))
        if not part_code or not description:
            continue

        hsn_code = clean_cell_str(get_val(idx_hsn))
        gst_rate = clean_cell_float(get_val(idx_gst))
        if gst_rate is not None and 0 < gst_rate <= 1.0:
            gst_rate = round(gst_rate * 100, 2)
        dlp = clean_cell_float(get_val(idx_dlp))
        mrp = clean_cell_float(get_val(idx_mrp))
        ex_factory = clean_cell_float(get_val(idx_ex))
        margin_pct = clean_cell_float(get_val(idx_margin))
        if margin_pct is not None and 0 < margin_pct <= 1.0:
            margin_pct = round(margin_pct * 100, 2)
        ex_showroom = clean_cell_float(get_val(idx_ex_showroom))
        stock_quantity = clean_cell_optional_int(get_val(idx_stock)) if idx_stock is not None else None
        category = clean_cell_str(get_val(idx_cat)) or default_category or "General"

        # Formula deductions
        if dlp is None and ex_factory is not None and gst_rate is not None:
            dlp = round(ex_factory * (1.0 + (gst_rate / 100.0)), 2)
        if ex_showroom is None and ex_factory is not None and margin_pct is not None:
            ex_showroom = round(ex_factory * (1.0 + (margin_pct / 100.0)), 2)
        if mrp is None and ex_showroom is not None and gst_rate is not None:
            mrp = round(ex_showroom * (1.0 + (gst_rate / 100.0)), 2)

        model_prices: Dict[str, Optional[float]] = {}
        for mc in model_price_cols:
            cname = mc["column_name"]
            midx = header_to_idx.get(cname)
            if midx is not None and midx < row_len:
                mval = clean_cell_float(row[midx])
                if mval is not None:
                    model_prices[mc["model_name"]] = mval

        all_rows.append(
            {
                "part_code": part_code,
                "description": description,
                "category": category,
                "tracking_mode": "QUANTITY",
                "hsn_code": hsn_code,
                "gst_rate": gst_rate,
                "dlp": dlp,
                "mrp": mrp,
                "ex_factory": ex_factory,
                "ex_showroom": ex_showroom,
                "dealer_margin_percent": margin_pct,
                "stock_quantity": stock_quantity,
                "model_prices": model_prices,
            }
        )

    wb.close()

    # Pass all extracted rows to batch import
    return await execute_batch_import(
        rows_to_import=all_rows,
        target_model_name=target_model_name,
        update_existing=update_existing,
        update_stock=update_stock,
        default_category=default_category,
        db=db,
        source_document_name=file_path.name,
        action_type="IMPORT_EXCEL",
    )
