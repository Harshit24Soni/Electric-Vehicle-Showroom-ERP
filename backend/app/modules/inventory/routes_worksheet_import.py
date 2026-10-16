import logging
import os
import shutil
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_staff
from app.auth.roles import require_roles
from app.db.session import get_db
from app.modules.inventory.worksheet_service import (
    TEMP_UPLOAD_DIR,
    execute_batch_import,
    execute_entire_sheet_import,
    find_default_workbook_path,
    get_workbook_path,
    inspect_workbook,
    parse_and_preview_sheet_data,
)
from app.modules.inventory.pricing_engine import apply_new_purchase_cost
from app.modules.inventory.models import SpareMaster, SparePartVehicleCompatibility
from app.modules.master.models import VehicleModel
from sqlalchemy import select

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Worksheet Import (Mail Merge)"])


# ---------------------------------------------------------------------------
# Request & Response Schemas
# ---------------------------------------------------------------------------


class SheetSummary(BaseModel):
    name: str
    row_count: int
    col_count: int
    has_super_header: bool
    data_start_row: int
    sheet_type: str
    headers: List[str]
    sample_rows: List[Dict[str, Any]]
    auto_mapping: Dict[str, str]
    model_columns: List[Dict[str, str]]


class WorkbookInspectionResponse(BaseModel):
    file_name: str
    file_size: int
    file_token: str
    sheet_count: int
    sheets: List[SheetSummary]


class SheetPreviewRequest(BaseModel):
    file_token: Optional[str] = "default"
    sheet_name: str
    field_mapping: Optional[Dict[str, str]] = None
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=50, ge=1, le=500)
    search: Optional[str] = None
    filter_status: Optional[str] = None  # ALL, READY, WARNING, ERROR


class SheetCounts(BaseModel):
    total: int
    ready: int
    warning: int
    error: int
    filtered: int


class ParsedPreviewRow(BaseModel):
    row_id: int
    part_code: str
    description: str
    category: str = "General"
    tracking_mode: str = "QUANTITY"
    hsn_code: Optional[str] = None
    gst_rate: Optional[float] = None
    dlp: Optional[float] = None
    mrp: Optional[float] = None
    ex_factory: Optional[float] = None
    stock_quantity: int = 0
    model_prices: Dict[str, Optional[float]] = Field(default_factory=dict)
    status: str
    validation_messages: List[str] = Field(default_factory=list)
    selected: bool = True


class SheetPreviewResponse(BaseModel):
    sheet_name: str
    total_rows: int
    page: int
    limit: int
    headers: List[str]
    applied_mapping: Dict[str, str]
    model_columns: List[Dict[str, str]]
    counts: SheetCounts
    rows: List[ParsedPreviewRow]


class ImportRowPayload(BaseModel):
    part_code: str
    description: str
    category: Optional[str] = "General"
    tracking_mode: Optional[str] = "QUANTITY"
    hsn_code: Optional[str] = None
    gst_rate: Optional[float] = None
    ex_factory: Optional[float] = None
    dlp: Optional[float] = None
    mrp: Optional[float] = None
    stock_quantity: Optional[int] = 0
    model_prices: Optional[Dict[str, Optional[float]]] = Field(default_factory=dict)
    remarks: Optional[str] = None


class ExecuteImportRequest(BaseModel):
    sheet_name: str
    target_model_name: Optional[str] = None
    update_existing: bool = True
    update_stock: bool = True
    default_category: Optional[str] = "Spare Parts"
    rows: List[ImportRowPayload]


class ExecuteImportResponse(BaseModel):
    success: bool
    total_processed: int
    created_count: int
    updated_count: int
    skipped_count: int
    errors: List[str]
    message: str


# ---------------------------------------------------------------------------
# API Routes
# ---------------------------------------------------------------------------


@router.get("/inspect-default", response_model=WorkbookInspectionResponse)
async def inspect_default_workbook(
    _staff=Depends(get_current_staff),
):
    """Inspects the default showroom workbook and returns all sheet structures,

    auto-detected mappings, and sample rows.
    """
    default_path = find_default_workbook_path()
    if not default_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No default inventory workbook found in workspace. Please upload an Excel workbook via /upload.",
        )

    try:
        data = inspect_workbook(default_path, default_path.name, "default")
        return WorkbookInspectionResponse(**data)
    except Exception as e:
        logger.exception("Failed to inspect default workbook: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to inspect workbook: {str(e)}",
        )


@router.post("/upload", response_model=WorkbookInspectionResponse)
async def upload_custom_workbook(
    file: UploadFile = File(...),
    _staff=Depends(require_roles("ADMIN", "MANAGER", "DEALER", "STAFF")),
):
    """Uploads any external Excel workbook (.xlsx / .xls) for interactive

    sheet inspection and Mail Merge ingestion.
    """
    filename = file.filename or "uploaded_workbook.xlsx"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".xlsx", ".xls", ".xlsm"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only Excel spreadsheets (.xlsx, .xls) are supported.",
        )

    file_token = uuid.uuid4().hex
    target_path = TEMP_UPLOAD_DIR / f"{file_token}{ext}"

    try:
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        data = inspect_workbook(target_path, filename, file_token)
        return WorkbookInspectionResponse(**data)
    except Exception as e:
        logger.exception("Error processing uploaded file: %s", e)
        if target_path.exists():
            target_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse uploaded workbook: {str(e)}",
        )


@router.post("/sheet-preview", response_model=SheetPreviewResponse)
async def get_sheet_preview(
    req: SheetPreviewRequest,
    _staff=Depends(get_current_staff),
):
    """Generates paginated, mapped data rows from a sheet with Mail Merge

    field alignments, live status flags, and search filtering.
    """
    wb_path = get_workbook_path(req.file_token)
    if not wb_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workbook source '{req.file_token}' not found on server.",
        )

    try:
        data = parse_and_preview_sheet_data(
            file_path=wb_path,
            sheet_name=req.sheet_name,
            field_mapping=req.field_mapping,
            page=req.page,
            limit=req.limit,
            search=req.search,
            filter_status=req.filter_status,
        )
        return SheetPreviewResponse(**data)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.exception("Error during sheet preview: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate sheet preview: {str(e)}",
        )


@router.post("/execute-import", response_model=ExecuteImportResponse)
async def execute_worksheet_import(
    req: ExecuteImportRequest,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_roles("ADMIN", "MANAGER", "DEALER", "STAFF")),
):
    """Executes atomic ingestion of reviewed rows into the PostgreSQL database,

    handling part codes, vehicle compatibility, and pricing history.
    """
    try:
        rows_data = [r.model_dump() for r in req.rows]
        result = await execute_batch_import(
            rows_to_import=rows_data,
            target_model_name=req.target_model_name,
            update_existing=req.update_existing,
            update_stock=req.update_stock,
            default_category=req.default_category,
            db=db,
        )
        return ExecuteImportResponse(**result)
    except Exception as e:
        logger.exception("Error executing worksheet import: %s", e)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Worksheet import execution failed: {str(e)}",
        )


class ImportEntireSheetRequest(BaseModel):
    file_token: Optional[str] = "default"
    sheet_name: str
    field_mapping: Optional[Dict[str, str]] = None
    target_model_name: Optional[str] = None
    default_category: Optional[str] = "Spare Parts"
    update_existing: bool = True
    update_stock: bool = True


@router.post("/import-entire-sheet", response_model=ExecuteImportResponse)
async def import_entire_sheet(
    req: ImportEntireSheetRequest,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_roles("ADMIN", "MANAGER", "DEALER", "STAFF")),
):
    """Imports ALL rows from a worksheet directly without row limits,

    computing observed profit margins and model compatibility relations.
    """
    wb_path = get_workbook_path(req.file_token)
    if not wb_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workbook source '{req.file_token}' not found on server.",
        )

    try:
        result = await execute_entire_sheet_import(
            file_path=wb_path,
            sheet_name=req.sheet_name,
            field_mapping=req.field_mapping,
            target_model_name=req.target_model_name,
            default_category=req.default_category,
            update_existing=req.update_existing,
            update_stock=req.update_stock,
            db=db,
        )
        return ExecuteImportResponse(**result)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.exception("Error executing entire sheet import: %s", e)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Entire sheet import failed: {str(e)}",
        )


class ApplyPurchaseCostRequest(BaseModel):
    spare_id: int
    new_cost: float = Field(..., gt=0, description="New purchase or billed cost")
    source_reference: Optional[str] = "Purchase Update"


@router.post("/apply-purchase-cost")
async def apply_purchase_cost_endpoint(
    req: ApplyPurchaseCostRequest,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_roles("ADMIN", "MANAGER", "DEALER", "STAFF")),
):
    """Auto-recomputes selling price and model-specific prices based on observed

    profit margins when a new purchase value is provided.
    """
    try:
        result = await apply_new_purchase_cost(
            spare_id=req.spare_id,
            new_cost=req.new_cost,
            source_reference=req.source_reference or "Purchase Cost Inward",
            db=db,
        )
        return {
            "success": True,
            "data": result,
            "message": f"Successfully recomputed prices for '{result['part_code']}' based on {result['profit_margin_percent']}% margin.",
        }
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        logger.exception("Error applying purchase cost: %s", e)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update pricing: {str(e)}",
        )


@router.get("/model-pricing-matrix")
async def get_model_pricing_matrix(
    vehicle_model_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    """Returns relational model compatibility matrix with model-specific

    cost, selling price, and profit margins.
    """
    stmt = (
        select(SparePartVehicleCompatibility, SpareMaster, VehicleModel)
        .join(SpareMaster, SparePartVehicleCompatibility.spare_id == SpareMaster.spare_id)
        .join(VehicleModel, SparePartVehicleCompatibility.vehicle_model_id == VehicleModel.vehicle_model_id)
        .where(SpareMaster.is_deleted.is_(False), VehicleModel.is_deleted.is_(False))
        .order_by(VehicleModel.model_name.asc(), SpareMaster.spare_name.asc())
    )

    if vehicle_model_id:
        stmt = stmt.where(VehicleModel.vehicle_model_id == vehicle_model_id)

    res = await db.execute(stmt)
    records = []
    for compat, spare, vm in res.all():
        if search:
            q = search.lower().strip()
            if (
                q not in (spare.part_number or "").lower()
                and q not in spare.spare_name.lower()
                and q not in vm.model_name.lower()
            ):
                continue
        records.append(
            {
                "compatibility_id": compat.compatibility_id,
                "spare_id": spare.spare_id,
                "part_code": spare.part_number,
                "part_name": spare.spare_name,
                "category": spare.category,
                "vehicle_model_id": vm.vehicle_model_id,
                "model_name": vm.model_name,
                "ex_factory_price": (
                    float(compat.ex_factory_price)
                    if compat.ex_factory_price is not None
                    else (float(spare.base_cost) if spare.base_cost else None)
                ),
                "dlp": (
                    float(compat.dlp) if compat.dlp is not None else (float(spare.base_dlp) if spare.base_dlp else None)
                ),
                "ex_showroom_price": (
                    float(compat.ex_showroom_price)
                    if compat.ex_showroom_price is not None
                    else (float(spare.base_ex_showroom) if spare.base_ex_showroom else None)
                ),
                "customer_mrp": (
                    float(compat.customer_mrp)
                    if compat.customer_mrp is not None
                    else (float(spare.base_mrp) if spare.base_mrp else None)
                ),
                "gst_rate": float(compat.gst_rate or spare.gst_rate or 18.0),
                "profit_margin_percent": (
                    float(compat.profit_margin_percent)
                    if compat.profit_margin_percent is not None
                    else (float(spare.profit_margin_percent) if spare.profit_margin_percent else None)
                ),
                "stock_quantity": spare.stock_quantity,
            }
        )

    return records
