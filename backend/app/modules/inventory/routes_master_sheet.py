import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.dependencies import get_current_staff
from app.auth.roles import require_roles
from app.db.session import get_db
from app.modules.inventory.models import (
    PriceList,
    PriceListItem,
    PriceListVersion,
    SpareCostHistory,
    SpareMaster,
    SparePartCode,
    SparePartVehicleCompatibility,
    SpareSellingPriceHistory,
)
from app.modules.master.models import VehicleModel
from app.modules.inventory.pricing_engine import (
    calculate_observed_margin,
    compute_prices_from_cost_and_margin,
    apply_new_purchase_cost,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Master Inventory Sheet"])


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------


class MasterSheetRow(BaseModel):
    model_config = ConfigDict(extra="allow")

    spare_id: int
    part_code: str
    description: str
    category: Optional[str] = "General"
    tracking_mode: str = "QUANTITY"
    status: str = "ACTIVE"
    hsn_code: Optional[str] = None
    gst_rate: Optional[float] = None
    ex_factory: Optional[float] = None
    dlp: Optional[float] = None
    mrp: Optional[float] = None
    ex_showroom: Optional[float] = None
    profit_margin_percent: Optional[float] = None
    stock_quantity: int = 0
    compatible_models: List[str] = Field(default_factory=list)
    model_prices: Dict[str, Optional[float]] = Field(default_factory=dict)
    remarks: Optional[str] = None


class MasterSheetItemCreate(BaseModel):
    part_code: str = Field(..., min_length=1, max_length=50, description="Unique part code / SKU")
    description: str = Field(..., min_length=1, max_length=150, description="Part description / name")
    category: Optional[str] = Field(default="General", max_length=100)
    tracking_mode: str = Field(default="QUANTITY", max_length=20)
    hsn_code: Optional[str] = Field(default=None, max_length=20)
    gst_rate: Optional[float] = Field(default=None, ge=0, le=100)
    ex_factory: Optional[float] = Field(default=None, ge=0)
    dlp: Optional[float] = Field(default=None, ge=0, description="Dealer Landing Price")
    mrp: Optional[float] = Field(default=None, ge=0, description="Maximum Retail Price / Customer Selling Price")
    ex_showroom: Optional[float] = Field(default=None, ge=0)
    profit_margin_percent: Optional[float] = Field(default=None)
    model_prices: Dict[str, Optional[float]] = Field(default_factory=dict)
    compatible_models: List[str] = Field(default_factory=list)
    remarks: Optional[str] = None


class MasterSheetItemUpdate(BaseModel):
    description: Optional[str] = Field(default=None, min_length=1, max_length=150)
    category: Optional[str] = Field(default=None, max_length=100)
    tracking_mode: Optional[str] = Field(default=None, max_length=20)
    status: Optional[str] = Field(default=None, max_length=20)
    hsn_code: Optional[str] = Field(default=None, max_length=20)
    gst_rate: Optional[float] = Field(default=None, ge=0, le=100)
    ex_factory: Optional[float] = Field(default=None, ge=0)
    dlp: Optional[float] = Field(default=None, ge=0)
    mrp: Optional[float] = Field(default=None, ge=0)
    ex_showroom: Optional[float] = Field(default=None, ge=0)
    profit_margin_percent: Optional[float] = Field(default=None)
    model_prices: Optional[Dict[str, Optional[float]]] = None
    compatible_models: Optional[List[str]] = None
    remarks: Optional[str] = None


class CostInwardRequest(BaseModel):
    part_code: str
    new_purchase_cost: float = Field(..., gt=0, description="New purchase or ex-factory cost")
    source_reference: Optional[str] = "Inward Procurement"


# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------


def utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def encode_spare_remarks(hsn_code: Optional[str], user_remarks: Optional[str]) -> Optional[str]:
    parts = []
    if hsn_code and str(hsn_code).strip():
        parts.append(f"HSN: {str(hsn_code).strip()}")
    if user_remarks and str(user_remarks).strip():
        # Remove any existing HSN prefix from user_remarks to prevent duplication
        clean_remarks = re.sub(r"HSN:\s*[A-Za-z0-9]+\s*(\|\s*)?", "", str(user_remarks).strip()).strip()
        if clean_remarks:
            parts.append(clean_remarks)
    return " | ".join(parts) if parts else None


def extract_hsn_from_remarks(remarks: Optional[str]) -> Optional[str]:
    if not remarks:
        return None
    match = re.search(r"HSN:\s*([A-Za-z0-9]+)", remarks, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return None


def clean_user_remarks(remarks: Optional[str]) -> Optional[str]:
    if not remarks:
        return None
    cleaned = re.sub(r"HSN:\s*[A-Za-z0-9]+\s*(\|\s*)?", "", remarks, flags=re.IGNORECASE).strip()
    return cleaned if cleaned else None


async def get_or_create_default_price_list_version(db: AsyncSession) -> PriceListVersion:
    """Ensures an active default price list and version exists for master sheet pricing."""
    pl_stmt = select(PriceList).where(PriceList.source_name == "Master Inventory", PriceList.is_deleted.is_(False))
    pl_res = await db.execute(pl_stmt)
    price_list = pl_res.scalars().first()
    if not price_list:
        price_list = PriceList(
            source_name="Master Inventory",
            status="ACTIVE",
            remarks="Master Sheet Pricing Header",
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


def build_row_payload(spare: SpareMaster, all_vms: List[VehicleModel], vm_id_map: Dict[int, str]) -> MasterSheetRow:
    """Builds a unified, flattened master sheet row from database models in-memory in O(1) time."""
    part_code = spare.part_number or f"PART-{spare.spare_id}"
    hsn_code = spare.hsn_code or extract_hsn_from_remarks(spare.remarks)
    pure_remarks = clean_user_remarks(spare.remarks)

    mrp = float(spare.base_mrp) if spare.base_mrp is not None else None
    ex_showroom = float(spare.base_ex_showroom) if spare.base_ex_showroom is not None else None
    dlp = float(spare.base_dlp) if spare.base_dlp is not None else None
    ex_factory = float(spare.base_cost) if spare.base_cost is not None else None
    gst_rate = float(spare.gst_rate) if spare.gst_rate is not None else 18.0
    margin = float(spare.profit_margin_percent) if spare.profit_margin_percent is not None else None

    # Resolve Vehicle Compatibility from eager-loaded relationship
    compat_map = {c.vehicle_model_id: c for c in (spare.compatibilities or [])}
    compatible_models = [vm_id_map[mid] for mid in compat_map.keys() if mid in vm_id_map]

    # Model-specific prices
    model_prices: Dict[str, Optional[float]] = {}
    for vm in all_vms:
        compat = compat_map.get(vm.vehicle_model_id)
        if compat and (compat.customer_mrp is not None or compat.ex_showroom_price is not None):
            model_prices[vm.model_name] = float(
                compat.customer_mrp if compat.customer_mrp is not None else compat.ex_showroom_price
            )
        elif vm.model_name in compatible_models:
            model_prices[vm.model_name] = mrp or ex_showroom
        else:
            model_prices[vm.model_name] = None

    row_data: Dict[str, Any] = {
        "spare_id": spare.spare_id,
        "part_code": part_code,
        "description": spare.spare_name,
        "category": spare.category or "General",
        "tracking_mode": spare.tracking_mode,
        "status": spare.status,
        "hsn_code": hsn_code,
        "gst_rate": gst_rate,
        "ex_factory": ex_factory,
        "dlp": dlp,
        "mrp": mrp or ex_showroom,
        "ex_showroom": ex_showroom,
        "profit_margin_percent": margin,
        "stock_quantity": spare.stock_quantity,
        "compatible_models": compatible_models,
        "model_prices": model_prices,
        "remarks": pure_remarks,
    }

    # Add flattened dynamic columns for each model name
    for model_name, price in model_prices.items():
        row_data[model_name] = price

    return MasterSheetRow(**row_data)


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------


@router.get("", response_model=List[MasterSheetRow])
async def get_master_sheet(
    search: Optional[str] = Query(None, description="Search by Part Code, Name, or HSN"),
    category: Optional[str] = Query(None, description="Filter by Category"),
    include_inactive: bool = Query(False, description="Include inactive/soft-deleted parts"),
    limit: Optional[int] = Query(None, ge=1, le=5000, description="Optional row limit"),
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    """Queries `spare_master` joined with vehicle compatibility and model pricing.

    Returns a unified, flattened JSON list representing a single master spreadsheet view.
    """
    stmt = (
        select(SpareMaster)
        .options(
            selectinload(SpareMaster.codes),
            selectinload(SpareMaster.compatibilities),
            selectinload(SpareMaster.balances),
        )
        .order_by(SpareMaster.spare_id.asc())
    )

    if not include_inactive:
        stmt = stmt.where(SpareMaster.is_deleted.is_(False))

    if category and isinstance(category, str):
        stmt = stmt.where(SpareMaster.category.ilike(f"%{category.strip()}%"))

    if search and isinstance(search, str):
        q = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                SpareMaster.spare_name.ilike(q),
                SpareMaster.hsn_code.ilike(q),
                SpareMaster.codes.any(SparePartCode.code.ilike(q)),
            )
        )

    if limit and isinstance(limit, int):
        stmt = stmt.limit(limit)

    res = await db.execute(stmt)
    spares = res.scalars().all()

    # Pre-fetch active VehicleModels
    vm_stmt = select(VehicleModel).where(VehicleModel.is_deleted.is_(False)).order_by(VehicleModel.model_name.asc())
    vm_res = await db.execute(vm_stmt)
    all_vms = list(vm_res.scalars().all())
    vm_id_map = {vm.vehicle_model_id: vm.model_name for vm in all_vms}

    return [build_row_payload(spare, all_vms, vm_id_map) for spare in spares]


@router.get("/models", response_model=List[str])
async def get_active_vehicle_models(
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    """Returns a list of all active EV vehicle model names for spreadsheet column generation."""
    stmt = select(VehicleModel.model_name).where(VehicleModel.is_deleted.is_(False)).order_by(VehicleModel.model_name)
    res = await db.execute(stmt)
    return list(res.scalars().all())


@router.post("/recompute-pricing")
async def recompute_part_pricing(
    payload: CostInwardRequest,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_roles("ADMIN", "MANAGER", "DEALER", "STAFF")),
) -> Dict[str, Any]:
    """Directly applies a new purchase / procurement cost for any spare part,
    automatically recomputing the ex-showroom, 18% GST, and customer MRP based on
    the spare's individual observed profit margin.
    """
    code_stmt = select(SparePartCode).where(
        SparePartCode.code == payload.part_code.strip(),
        SparePartCode.is_deleted.is_(False),
    )
    code_res = await db.execute(code_stmt)
    sp_code = code_res.scalar_one_or_none()
    if not sp_code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Part code '{payload.part_code}' not found.",
        )

    return await apply_new_purchase_cost(
        spare_id=sp_code.spare_id,
        new_cost=payload.new_purchase_cost,
        source_reference=payload.source_reference or "Inward Procurement",
        db=db,
    )


@router.post("", response_model=MasterSheetRow, status_code=status.HTTP_201_CREATED)
async def create_master_sheet_item(
    payload: MasterSheetItemCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_roles("ADMIN", "MANAGER", "DEALER", "STAFF")),
):
    """Direct endpoint to add a new part row into the database,

    handling part master, pricing, and model mappings in a single atomic transaction.
    """
    part_code = payload.part_code.strip()

    # 1. Check duplicate part code
    existing_code_stmt = select(SparePartCode).where(
        SparePartCode.code == part_code, SparePartCode.is_deleted.is_(False)
    )
    existing_res = await db.execute(existing_code_stmt)
    if existing_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Part code '{part_code}' already exists in inventory.",
        )

    # 2. Compute observed profit margin
    cost = float(payload.ex_factory if payload.ex_factory is not None else (payload.dlp or 0))
    selling = float(payload.ex_showroom if payload.ex_showroom is not None else (payload.mrp or 0))
    if payload.mrp is not None and selling == 0:
        selling = float(payload.mrp)
    obs_margin = payload.profit_margin_percent
    if obs_margin is None and cost > 0 and selling > 0:
        obs_margin = calculate_observed_margin(cost, selling)

    # 3. Create SpareMaster
    encoded_remarks = encode_spare_remarks(payload.hsn_code, payload.remarks)
    spare = SpareMaster(
        spare_name=payload.description.strip(),
        category=payload.category.strip() if payload.category else "General",
        tracking_mode=payload.tracking_mode or "QUANTITY",
        status="ACTIVE",
        is_verified=True,
        remarks=encoded_remarks,
        hsn_code=payload.hsn_code,
        gst_rate=payload.gst_rate or 18.0,
        base_cost=cost if cost > 0 else None,
        base_dlp=payload.dlp if payload.dlp is not None else (cost if cost > 0 else None),
        base_ex_showroom=selling if selling > 0 else None,
        base_mrp=payload.mrp if payload.mrp is not None else selling,
        profit_margin_percent=obs_margin,
    )
    db.add(spare)
    await db.flush()

    # 4. Create SparePartCode
    code_obj = SparePartCode(
        spare_id=spare.spare_id,
        code=part_code,
        is_current=True,
        effective_from=utc_now_naive(),
        reason="Master Sheet Direct Creation",
    )
    db.add(code_obj)
    await db.flush()

    # 5. Upsert PriceListItem in default version
    version = await get_or_create_default_price_list_version(db)
    pli = PriceListItem(
        version_id=version.version_id,
        part_code=part_code,
        part_name=payload.description.strip(),
        mrp=payload.mrp,
        dlp=payload.dlp,
        gst_rate=payload.gst_rate,
    )
    db.add(pli)

    # 6. Pricing Histories
    if payload.mrp is not None:
        db.add(
            SpareSellingPriceHistory(
                spare_id=spare.spare_id,
                selling_price=payload.mrp,
                effective_from=utc_now_naive(),
                reason="Master Sheet Initial Pricing",
            )
        )

    if cost > 0 or payload.dlp is not None:
        db.add(
            SpareCostHistory(
                spare_id=spare.spare_id,
                quantity=0,
                billed_unit_price=float(cost),
                landed_cost=float(payload.dlp if payload.dlp is not None else cost),
                source_reference="Master Sheet Initial Cost",
                effective_date=utc_now_naive(),
            )
        )

    # 7. Model Compatibility & Multi-Model Pricing
    all_vm_stmt = select(VehicleModel).where(VehicleModel.is_deleted.is_(False))
    vm_res = await db.execute(all_vm_stmt)
    all_vms = list(vm_res.scalars().all())
    vm_map = {vm.model_name.lower().strip(): vm for vm in all_vms}
    vm_id_map = {vm.vehicle_model_id: vm.model_name for vm in all_vms}

    models_to_link = set()
    for cm in payload.compatible_models:
        if cm and cm.strip():
            models_to_link.add(cm.strip())
    for mp_name in payload.model_prices.keys():
        if mp_name and mp_name.strip():
            models_to_link.add(mp_name.strip())

    for model_name in models_to_link:
        matched_vm = vm_map.get(model_name.lower())
        if matched_vm:
            mprice = payload.model_prices.get(matched_vm.model_name)
            m_margin = calculate_observed_margin(cost, mprice) if (cost > 0 and mprice) else obs_margin
            db.add(
                SparePartVehicleCompatibility(
                    spare_id=spare.spare_id,
                    vehicle_model_id=matched_vm.vehicle_model_id,
                    ex_factory_price=cost if cost > 0 else None,
                    dlp=payload.dlp,
                    ex_showroom_price=mprice or (selling if selling > 0 else None),
                    customer_mrp=mprice or payload.mrp,
                    gst_rate=payload.gst_rate or 18.0,
                    profit_margin_percent=m_margin,
                )
            )

    # Record model-specific selling price overrides
    for model_name, model_price in payload.model_prices.items():
        if model_price is not None:
            db.add(
                SpareSellingPriceHistory(
                    spare_id=spare.spare_id,
                    selling_price=model_price,
                    effective_from=utc_now_naive(),
                    reason=f"Model: {model_name}",
                )
            )

    await db.commit()
    await db.refresh(spare, ["codes", "compatibilities", "balances"])

    return build_row_payload(spare, all_vms, vm_id_map)


@router.put("/{part_code}", response_model=MasterSheetRow)
async def update_master_sheet_item(
    part_code: str,
    payload: MasterSheetItemUpdate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_roles("ADMIN", "MANAGER", "DEALER", "STAFF")),
):
    """Direct inline or modal update for any part record, updating pricing and descriptions instantly."""
    code_stmt = select(SparePartCode).where(
        SparePartCode.code == part_code.strip(), SparePartCode.is_deleted.is_(False)
    )
    code_res = await db.execute(code_stmt)
    part_code_obj = code_res.scalar_one_or_none()
    if not part_code_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Part code '{part_code}' not found.",
        )

    spare_stmt = (
        select(SpareMaster)
        .options(
            selectinload(SpareMaster.codes),
            selectinload(SpareMaster.compatibilities),
            selectinload(SpareMaster.balances),
        )
        .where(SpareMaster.spare_id == part_code_obj.spare_id)
    )
    spare_res = await db.execute(spare_stmt)
    spare = spare_res.scalar_one_or_none()
    if not spare:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Spare master not found.")

    # 1. Update master attributes
    if payload.description is not None:
        spare.spare_name = payload.description.strip()
    if payload.category is not None:
        spare.category = payload.category.strip()
    if payload.tracking_mode is not None:
        spare.tracking_mode = payload.tracking_mode
    if payload.status is not None:
        spare.status = payload.status

    if payload.hsn_code is not None:
        spare.hsn_code = payload.hsn_code.strip() if payload.hsn_code else None
    if payload.gst_rate is not None:
        spare.gst_rate = payload.gst_rate
    # 1. Update purchase / landed costs and prices
    if payload.ex_factory is not None:
        spare.base_cost = payload.ex_factory
        if payload.dlp is None:
            spare.base_dlp = payload.ex_factory
    if payload.dlp is not None:
        spare.base_dlp = payload.dlp

    # If ex_showroom is explicitly provided, update it and adjust customer MRP if not supplied
    if payload.ex_showroom is not None:
        spare.base_ex_showroom = payload.ex_showroom
        if payload.mrp is None:
            gst_rate = float(spare.gst_rate or 18.0)
            gst_amount = round(payload.ex_showroom * (gst_rate / 100.0), 2)
            spare.base_mrp = round(payload.ex_showroom + gst_amount, 2)
    elif payload.mrp is not None:
        spare.base_mrp = payload.mrp
        if spare.base_ex_showroom is None:
            spare.base_ex_showroom = payload.mrp
    elif payload.ex_factory is not None:
        # User updated new purchase cost without explicit selling price:
        # Auto-compute new ex_showroom and customer MRP maintaining individual observed profit margin!
        current_margin = float(spare.profit_margin_percent or 0.0)
        if current_margin > 0:
            computed = compute_prices_from_cost_and_margin(
                float(payload.ex_factory),
                current_margin,
                float(spare.gst_rate or 18.0),
            )
            spare.base_ex_showroom = computed["ex_showroom"]
            spare.base_mrp = computed["customer_mrp"]

    # Compute or update observed profit margin
    cost = float(spare.base_cost or (spare.base_dlp or 0))
    selling = float(spare.base_ex_showroom or (spare.base_mrp or 0))
    if payload.profit_margin_percent is not None:
        spare.profit_margin_percent = payload.profit_margin_percent
        # If profit margin was explicitly set, update selling prices to match new margin
        if cost > 0:
            computed = compute_prices_from_cost_and_margin(
                cost,
                payload.profit_margin_percent,
                float(spare.gst_rate or 18.0),
            )
            spare.base_ex_showroom = computed["ex_showroom"]
            spare.base_mrp = computed["customer_mrp"]
    elif payload.ex_showroom is not None and cost > 0 and selling > 0:
        spare.profit_margin_percent = calculate_observed_margin(cost, selling)
    elif spare.profit_margin_percent is None and cost > 0 and selling > 0:
        spare.profit_margin_percent = calculate_observed_margin(cost, selling)

    # Sync compatible models pricing if purchase cost changed
    if payload.ex_factory is not None and spare.compatibilities:
        for compat in spare.compatibilities:
            compat.ex_factory_price = payload.ex_factory
            compat.dlp = payload.ex_factory
            m_margin = float(
                compat.profit_margin_percent
                if compat.profit_margin_percent is not None
                else (spare.profit_margin_percent or 0.0)
            )
            if m_margin > 0:
                m_comp = compute_prices_from_cost_and_margin(
                    float(payload.ex_factory),
                    m_margin,
                    float(compat.gst_rate or spare.gst_rate or 18.0),
                )
                compat.ex_showroom_price = m_comp["ex_showroom"]
                compat.customer_mrp = m_comp["customer_mrp"]

    if payload.hsn_code is not None or payload.remarks is not None:
        current_hsn = spare.hsn_code
        current_remarks = payload.remarks if payload.remarks is not None else clean_user_remarks(spare.remarks)
        spare.remarks = encode_spare_remarks(current_hsn, current_remarks)

    # 2. Update default price list item
    version = await get_or_create_default_price_list_version(db)
    pli_stmt = select(PriceListItem).where(
        PriceListItem.part_code == part_code.strip(),
        PriceListItem.version_id == version.version_id,
        PriceListItem.is_deleted.is_(False),
    )
    pli_res = await db.execute(pli_stmt)
    pli = pli_res.scalar_one_or_none()
    if not pli:
        pli = PriceListItem(
            version_id=version.version_id,
            part_code=part_code.strip(),
            part_name=spare.spare_name,
            mrp=payload.mrp or spare.base_mrp,
            dlp=payload.dlp or spare.base_dlp,
            gst_rate=payload.gst_rate or spare.gst_rate,
        )
        db.add(pli)
    else:
        if payload.description is not None:
            pli.part_name = payload.description.strip()
        if payload.mrp is not None:
            pli.mrp = payload.mrp
        if payload.dlp is not None:
            pli.dlp = payload.dlp
        if payload.gst_rate is not None:
            pli.gst_rate = payload.gst_rate

    # 3. Update selling price history if MRP is provided
    if payload.mrp is not None:
        db.add(
            SpareSellingPriceHistory(
                spare_id=spare.spare_id,
                selling_price=payload.mrp,
                effective_from=utc_now_naive(),
                reason="Master Sheet Update",
            )
        )

    # 4. Update cost history if DLP or ExFactory is provided
    if payload.dlp is not None or payload.ex_factory is not None:
        billed = payload.ex_factory if payload.ex_factory is not None else payload.dlp
        landed = payload.dlp if payload.dlp is not None else payload.ex_factory
        db.add(
            SpareCostHistory(
                spare_id=spare.spare_id,
                quantity=0,
                billed_unit_price=float(billed or 0),
                landed_cost=float(landed or 0),
                source_reference="Master Sheet Update",
                effective_date=utc_now_naive(),
            )
        )

    # 5. Update vehicle compatibilities if specified
    all_vm_stmt = select(VehicleModel).where(VehicleModel.is_deleted.is_(False))
    vm_res = await db.execute(all_vm_stmt)
    all_vms = list(vm_res.scalars().all())
    vm_map = {vm.model_name.lower().strip(): vm for vm in all_vms}
    vm_id_map = {vm.vehicle_model_id: vm.model_name for vm in all_vms}

    if payload.compatible_models is not None or payload.model_prices is not None:
        target_model_ids: set[int] = set()

        if payload.compatible_models is not None:
            for cm in payload.compatible_models:
                if cm and cm.strip():
                    matched_vm = vm_map.get(cm.lower().strip())
                    if matched_vm:
                        target_model_ids.add(matched_vm.vehicle_model_id)

        if payload.model_prices is not None:
            for mp_name, p in payload.model_prices.items():
                if p is not None and mp_name and mp_name.strip():
                    matched_vm = vm_map.get(mp_name.lower().strip())
                    if matched_vm:
                        target_model_ids.add(matched_vm.vehicle_model_id)

        # Sync with database
        existing_compats = {c.vehicle_model_id: c for c in spare.compatibilities}
        # Remove models no longer compatible if compatible_models was explicitly provided
        if payload.compatible_models is not None:
            for mid, compat_obj in list(existing_compats.items()):
                if mid not in target_model_ids:
                    await db.delete(compat_obj)

        # Add newly compatible models
        for mid in target_model_ids:
            if mid not in existing_compats:
                mname = vm_id_map.get(mid)
                mprice = payload.model_prices.get(mname) if payload.model_prices and mname else None
                m_margin = (
                    calculate_observed_margin(cost, mprice) if (cost > 0 and mprice) else spare.profit_margin_percent
                )
                db.add(
                    SparePartVehicleCompatibility(
                        spare_id=spare.spare_id,
                        vehicle_model_id=mid,
                        ex_factory_price=cost if cost > 0 else None,
                        dlp=spare.base_dlp,
                        ex_showroom_price=mprice or spare.base_ex_showroom,
                        customer_mrp=mprice or spare.base_mrp,
                        gst_rate=spare.gst_rate or 18.0,
                        profit_margin_percent=m_margin,
                    )
                )
            else:
                compat_obj = existing_compats[mid]
                mname = vm_id_map.get(mid)
                mprice = payload.model_prices.get(mname) if payload.model_prices and mname else None
                if mprice is not None:
                    compat_obj.customer_mrp = mprice
                    compat_obj.ex_showroom_price = mprice
                    if cost > 0:
                        compat_obj.profit_margin_percent = calculate_observed_margin(cost, mprice)

    # 6. Update model-specific prices if specified
    if payload.model_prices is not None:
        for model_name, price in payload.model_prices.items():
            if price is not None:
                db.add(
                    SpareSellingPriceHistory(
                        spare_id=spare.spare_id,
                        selling_price=price,
                        effective_from=utc_now_naive(),
                        reason=f"Model: {model_name}",
                    )
                )

    await db.commit()
    await db.refresh(spare, ["codes", "compatibilities", "balances"])

    return build_row_payload(spare, all_vms, vm_id_map)


@router.delete("/{part_code}")
async def delete_master_sheet_item(
    part_code: str,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_roles("ADMIN", "MANAGER", "DEALER")),
):
    """Removes a part record safely from inventory."""
    code_stmt = select(SparePartCode).where(
        SparePartCode.code == part_code.strip(), SparePartCode.is_deleted.is_(False)
    )
    code_res = await db.execute(code_stmt)
    part_code_obj = code_res.scalar_one_or_none()
    if not part_code_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Part code '{part_code}' not found.",
        )

    spare = await db.get(SpareMaster, part_code_obj.spare_id)
    if not spare:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Spare master not found.")

    # Soft delete safely
    spare.status = "INACTIVE"
    spare.is_deleted = True
    part_code_obj.is_deleted = True
    part_code_obj.is_current = False

    await db.commit()
    return {"success": True, "message": f"Part '{part_code}' removed safely from inventory."}
