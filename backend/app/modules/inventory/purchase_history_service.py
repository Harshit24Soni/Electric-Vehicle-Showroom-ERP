"""
Enterprise Purchase History & Inward Bill Summary Service.

Provides comprehensive bill-by-bill audit tracking and aggregated purchase KPIs
for any individual inventory spare part code:
  - Bill/Invoice Number (vendor_invoice_no, docket reference)
  - Date and Timestamp of purchase/inward
  - Quantity bought
  - Unit purchase rate, GST %, and total line amount
  - Vendor / Supplier details
  - Aggregated KPIs: Total Units Bought, Total Spend, Last Purchase Rate,
    Lowest Rate, Highest Rate, and Weighted Average Cost (WAC).
"""

import logging
from datetime import date, datetime
from typing import Any, List, Optional, Set, Tuple

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.inventory.models import (
    SpareCostHistory,
    SpareMaster,
    SparePartCode,
    SpareStockMovement,
)
from app.modules.master.models import Vendor
from app.modules.procurement.models import SparePurchase, SparePurchaseItem

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------


class PartPurchaseBillRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    purchase_item_id: Optional[int] = None
    spare_purchase_id: Optional[int] = None
    bill_number: str
    bill_date: Optional[str] = None
    vendor_name: Optional[str] = "Unknown Vendor"
    vendor_id: Optional[int] = None
    vendor_gstin: Optional[str] = None
    quantity: int = 0
    unit_rate: float = 0.0
    gst_percentage: Optional[float] = 0.0
    tax_amount: Optional[float] = 0.0
    total_amount: float = 0.0
    landed_cost_unit: Optional[float] = None
    ex_factory_unit: Optional[float] = None
    status: str = "POSTED"
    verification_status: Optional[str] = None
    source_type: str = "PO_BILL"  # "PO_BILL" | "IMPORT_STUDIO" | "DIRECT_ENTRY" | "STOCK_OPENING"
    source_label: str = "Vendor Purchase Bill (PO)"
    is_po_bill: bool = True  # True if authentic vendor PO/invoice, False if direct entry/import studio
    docket_reference: Optional[str] = None
    remarks: Optional[str] = None


class PartPurchaseSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    spare_id: int
    part_code: str
    part_name: str
    category: Optional[str] = "General"
    hsn_code: Optional[str] = None
    tracking_mode: str = "QUANTITY"
    current_stock: int = 0

    # Current Master Sheet Price Baseline
    current_cost: Optional[float] = None
    current_dlp: Optional[float] = None
    current_mrp: Optional[float] = None
    current_margin_percent: Optional[float] = None
    averaged_dlp: Optional[float] = None
    averaged_mrp: Optional[float] = None

    # Aggregated Purchase KPIs across authentic bills
    total_bills_count: int = 0  # Count of authentic PO / vendor bills only
    direct_entries_count: int = 0  # Count of Import Studio / direct rate entries
    total_records_count: int = 0  # Total combined transactions
    total_quantity_bought: int = 0  # Quantity bought strictly under PO bills
    total_spend: float = 0.0  # Spend strictly under PO bills

    last_purchase_rate: Optional[float] = None
    last_purchase_date: Optional[str] = None
    last_bill_number: Optional[str] = None
    last_vendor_name: Optional[str] = None
    last_rate_source: Optional[str] = None  # "PO_BILL" | "IMPORT_STUDIO" | "DIRECT_ENTRY"

    lowest_purchase_rate: Optional[float] = None
    highest_purchase_rate: Optional[float] = None
    weighted_average_cost: Optional[float] = None

    # Complete Bill-by-bill Purchase Records & Direct Entries
    bills: List[PartPurchaseBillRecord] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _safe_float(val: Any) -> Optional[float]:
    if val is None:
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def _format_date(val: Any) -> Optional[str]:
    if val is None:
        return None
    if isinstance(val, (datetime, date)):
        return val.strftime("%Y-%m-%d")
    val_str = str(val).strip()
    return val_str[:10] if len(val_str) >= 10 else val_str


# ---------------------------------------------------------------------------
# Core Service Logic
# ---------------------------------------------------------------------------


async def resolve_spare_by_identifier(db: AsyncSession, identifier: str) -> Optional[Tuple[SpareMaster, List[str]]]:
    """
    Finds a SpareMaster record by part code (current or historical) or by spare_id.
    Returns (spare, list_of_known_part_codes).
    """
    clean_id = identifier.strip()

    # 1. Check exact match on SparePartCode
    code_stmt = (
        select(SparePartCode)
        .options(selectinload(SparePartCode.spare).selectinload(SpareMaster.codes))
        .filter(
            func.lower(SparePartCode.code) == clean_id.lower(),
            SparePartCode.is_deleted.is_(False),
        )
    )
    code_res = await db.execute(code_stmt)
    code_obj = code_res.scalars().first()

    if code_obj and code_obj.spare:
        spare = code_obj.spare
        known_codes = [c.code for c in spare.codes if not c.is_deleted]
        if clean_id not in known_codes:
            known_codes.append(clean_id)
        return spare, known_codes

    # 2. If numeric, check SpareMaster.spare_id
    if clean_id.isdigit():
        num_id = int(clean_id)
        spare_stmt = (
            select(SpareMaster)
            .options(selectinload(SpareMaster.codes), selectinload(SpareMaster.balances))
            .filter(SpareMaster.spare_id == num_id, SpareMaster.is_deleted.is_(False))
        )
        spare_res = await db.execute(spare_stmt)
        spare = spare_res.scalars().first()
        if spare:
            known_codes = [c.code for c in spare.codes if not c.is_deleted]
            return spare, known_codes

    # 3. Check SpareMaster with codes
    all_spares_stmt = (
        select(SpareMaster)
        .options(selectinload(SpareMaster.codes), selectinload(SpareMaster.balances))
        .filter(SpareMaster.is_deleted.is_(False))
    )
    all_spares_res = await db.execute(all_spares_stmt)
    all_spares = all_spares_res.scalars().all()

    clean_id_lower = clean_id.lower()
    for s in all_spares:
        for c in s.codes:
            if not c.is_deleted and c.code.strip().lower() == clean_id_lower:
                known_codes = [c.code for c in s.codes if not c.is_deleted]
                return s, known_codes

    return None


async def get_part_purchase_history(db: AsyncSession, identifier: str) -> PartPurchaseSummaryResponse:
    """
    Builds the complete purchase rate, quantity, and bill summary for a given part code or spare_id.
    """
    resolved = await resolve_spare_by_identifier(db, identifier)
    clean_id = identifier.strip()

    spare: Optional[SpareMaster] = None
    known_codes: List[str] = [clean_id]

    if resolved:
        spare, known_codes = resolved
        spare_id = spare.spare_id
        part_code = spare.part_number or (known_codes[0] if known_codes else clean_id)
        part_name = spare.spare_name
        category = spare.category or "General"
        hsn_code = spare.hsn_code
        tracking_mode = spare.tracking_mode or "QUANTITY"
        current_stock = spare.stock_quantity
        base_cost = _safe_float(spare.base_cost)
        base_dlp = _safe_float(spare.base_dlp)
        base_mrp = _safe_float(spare.base_mrp)
        margin_percent = _safe_float(spare.profit_margin_percent)
    else:
        # Check if purchase items exist under this part_code even without a SpareMaster row
        spare_id = 0
        part_code = clean_id
        part_name = clean_id
        category = "General"
        hsn_code = None
        tracking_mode = "QUANTITY"
        current_stock = 0
        base_cost = None
        base_dlp = None
        base_mrp = None
        margin_percent = None

    bills: List[PartPurchaseBillRecord] = []
    seen_purchase_ids: Set[int] = set()

    # 1. Query Procurement SparePurchaseItem + SparePurchase + Vendor
    purch_stmt = (
        select(SparePurchaseItem, SparePurchase, Vendor)
        .join(SparePurchase, SparePurchaseItem.spare_purchase_id == SparePurchase.spare_purchase_id)
        .outerjoin(Vendor, SparePurchase.vendor_id == Vendor.vendor_id)
        .filter(
            or_(
                SparePurchaseItem.spare_id == spare_id if spare_id > 0 else False,
                SparePurchaseItem.part_code.in_(known_codes),
                func.lower(SparePurchaseItem.part_code) == clean_id.lower(),
            ),
            SparePurchaseItem.is_deleted.is_(False),
            SparePurchase.is_deleted.is_(False),
        )
        .order_by(
            desc(
                func.coalesce(
                    SparePurchase.vendor_invoice_date,
                    SparePurchase.purchase_date,
                    SparePurchase.created_at,
                )
            ),
            desc(SparePurchaseItem.purchase_item_id),
        )
    )

    purch_res = await db.execute(purch_stmt)
    rows = purch_res.all()

    for item, purchase, vendor in rows:
        seen_purchase_ids.add(purchase.spare_purchase_id)

        bill_no = purchase.vendor_invoice_no or purchase.docket_reference or f"PUR-{purchase.spare_purchase_id}"
        bill_dt = _format_date(purchase.vendor_invoice_date or purchase.purchase_date or purchase.created_at)

        vendor_title = (
            vendor.vendor_name
            if vendor
            else (f"Vendor #{purchase.vendor_id}" if purchase.vendor_id else "OEM / Direct Vendor")
        )

        qty = int(item.quantity or 0)
        rate = _safe_float(item.unit_cost) or 0.0
        gst_pct = _safe_float(item.gst_percentage) or 0.0
        tax_amt = _safe_float(item.tax_amount) or 0.0

        if (tax_amt is None or tax_amt == 0.0) and gst_pct > 0 and rate > 0 and qty > 0:
            tax_amt = round(qty * rate * (gst_pct / 100.0), 2)

        if item.total_cost is not None and float(item.total_cost) > 0:
            total_amt = round(float(item.total_cost), 2)
        else:
            total_amt = round(qty * rate + (tax_amt or 0.0), 2)

        landed_rate = round(total_amt / qty, 2) if qty > 0 else rate

        bills.append(
            PartPurchaseBillRecord(
                purchase_item_id=item.purchase_item_id,
                spare_purchase_id=purchase.spare_purchase_id,
                bill_number=bill_no,
                bill_date=bill_dt,
                vendor_name=vendor_title,
                vendor_id=purchase.vendor_id,
                vendor_gstin=vendor.gstin if vendor else None,
                quantity=qty,
                unit_rate=rate,
                gst_percentage=gst_pct,
                tax_amount=tax_amt,
                total_amount=total_amt,
                landed_cost_unit=landed_rate,
                status=purchase.status or "POSTED",
                verification_status=item.verification_status,
                source_type="PO_BILL",
                source_label="Vendor Purchase Bill (PO)",
                is_po_bill=True,
                docket_reference=purchase.docket_reference,
                remarks=purchase.remarks,
            )
        )

    cost_records: List[SpareCostHistory] = []

    # 2. Query Inward Stock Movements (if spare_id > 0)
    if spare_id > 0:
        mov_stmt = (
            select(SpareStockMovement)
            .filter(
                SpareStockMovement.spare_id == spare_id,
                SpareStockMovement.movement_type.in_(["PURCHASE", "ADJUSTMENT"]),
                SpareStockMovement.is_deleted.is_(False),
            )
            .order_by(desc(SpareStockMovement.movement_datetime))
        )
        mov_res = await db.execute(mov_stmt)
        movements = mov_res.scalars().all()

        for mov in movements:
            # If movement is linked to a procurement purchase already shown, skip to avoid double-counting
            if mov.reference_type == "PROCUREMENT" and mov.reference_id and mov.reference_id in seen_purchase_ids:
                continue

            is_po_movement = mov.reference_type == "PROCUREMENT" or mov.movement_type == "PURCHASE"
            mov_remarks_lower = (mov.remarks or "").lower()
            is_worksheet_import = any(k in mov_remarks_lower for k in ["worksheet", "import", "sheet", "batch"])

            if is_po_movement and not is_worksheet_import:
                source_type = "PO_BILL"
                source_label = "Procurement Inward Movement"
                is_po_bill = True
                bill_no = mov.remarks or f"PO-STOCK-{mov.movement_id}"
                vendor_title = "Procurement Inward"
            elif is_worksheet_import:
                source_type = "IMPORT_STUDIO"
                source_label = "Import Studio (Initial Stock)"
                is_po_bill = False
                bill_no = mov.remarks or "Direct Stock Ingestion"
                vendor_title = "Worksheet Ingestion Studio"
            else:
                source_type = "STOCK_OPENING"
                source_label = "Opening Stock Balance"
                is_po_bill = False
                bill_no = mov.remarks or "Opening Stock Adjustment"
                vendor_title = "Showroom Stock Opening"

            bill_dt = _format_date(mov.movement_datetime)
            qty = int(mov.quantity or 0)
            rate = _safe_float(mov.unit_cost) or 0.0

            if mov.total_cost is not None and float(mov.total_cost) > 0:
                total_amt = round(float(mov.total_cost), 2)
            else:
                total_amt = round(qty * rate, 2)

            landed_rate = round(total_amt / qty, 2) if qty > 0 else rate

            bills.append(
                PartPurchaseBillRecord(
                    purchase_item_id=None,
                    spare_purchase_id=mov.reference_id if mov.reference_type == "PROCUREMENT" else None,
                    bill_number=bill_no,
                    bill_date=bill_dt,
                    vendor_name=vendor_title,
                    vendor_id=None,
                    vendor_gstin=None,
                    quantity=qty,
                    unit_rate=rate,
                    gst_percentage=0.0,
                    tax_amount=0.0,
                    total_amount=total_amt,
                    landed_cost_unit=landed_rate,
                    status="POSTED",
                    verification_status="CONFIRMED",
                    source_type=source_type,
                    source_label=source_label,
                    is_po_bill=is_po_bill,
                    docket_reference=None,
                    remarks=mov.remarks,
                )
            )

        # 3. Query SpareCostHistory for manual entries, price list imports, or worksheet ingestion
        cost_stmt = (
            select(SpareCostHistory)
            .filter(
                SpareCostHistory.spare_id == spare_id,
                SpareCostHistory.is_deleted.is_(False),
            )
            .order_by(desc(SpareCostHistory.effective_date))
        )
        cost_res = await db.execute(cost_stmt)
        cost_records = cost_res.scalars().all()

        existing_bill_names = {b.bill_number.strip().lower() for b in bills if b.bill_number}
        for ch in cost_records:
            ref = (ch.source_reference or "").strip()
            if not ref or ref.lower() in existing_bill_names:
                continue

            # Check if ref matches PURCHASE-X already recorded
            if ref.startswith("PURCHASE-"):
                try:
                    p_id = int(ref.replace("PURCHASE-", ""))
                    if p_id in seen_purchase_ids:
                        continue
                except ValueError:
                    pass

            ref_lower = ref.lower()
            is_po_ref = ref_lower.startswith("purchase") or ref_lower.startswith("inv-") or ref_lower.startswith("po-")
            is_worksheet = any(k in ref_lower for k in ["worksheet", "import", "sheet", "excel", "pdf"])

            if is_po_ref and not is_worksheet:
                source_type = "PO_BILL"
                source_label = "Procurement Purchase Invoice"
                is_po_bill = True
                bill_no = ref
                vendor_title = "Procurement Vendor"
            elif is_worksheet:
                source_type = "IMPORT_STUDIO"
                source_label = "Import Studio (Rate Ingestion)"
                is_po_bill = False
                bill_no = ref
                vendor_title = "Worksheet Ingestion Studio"
            else:
                source_type = "DIRECT_ENTRY"
                source_label = "Direct Rate Update"
                is_po_bill = False
                bill_no = ref
                vendor_title = "Master Sheet Catalog Entry"

            qty = int(ch.quantity or 0)
            # Purchase rate for dealer is Dealer Landing Price (DLP)
            rate = _safe_float(ch.landed_cost) or _safe_float(ch.billed_unit_price) or 0.0
            total_amt = round(qty * rate, 2) if qty > 0 else 0.0

            # If billed_unit_price is distinct from landed_cost and lower, it captured ex-factory
            ex_factory_val = None
            if ch.billed_unit_price and ch.landed_cost and float(ch.billed_unit_price) < float(ch.landed_cost):
                ex_factory_val = float(ch.billed_unit_price)

            bills.append(
                PartPurchaseBillRecord(
                    purchase_item_id=None,
                    spare_purchase_id=None,
                    bill_number=bill_no,
                    bill_date=_format_date(ch.effective_date),
                    vendor_name=vendor_title,
                    vendor_id=None,
                    vendor_gstin=None,
                    quantity=qty,
                    unit_rate=rate,
                    gst_percentage=0.0,
                    tax_amount=0.0,
                    total_amount=total_amt,
                    landed_cost_unit=_safe_float(ch.landed_cost) or rate,
                    ex_factory_unit=ex_factory_val,
                    status="POSTED",
                    verification_status="CONFIRMED",
                    source_type=source_type,
                    source_label=source_label,
                    is_po_bill=is_po_bill,
                    docket_reference=None,
                    remarks=f"Direct rate entry ({ref})" if not is_po_bill else ref,
                )
            )

    # Sort all records chronologically descending
    bills.sort(key=lambda b: (b.bill_date or "", b.bill_number), reverse=True)

    # Separate authentic PO Bills from Direct Entries / Import Studio records
    po_bills = [b for b in bills if b.is_po_bill]
    direct_entries = [b for b in bills if not b.is_po_bill]

    # Metrics computation:
    # total_bills_count strictly reflects authentic vendor PO bills
    total_bills = len(po_bills)
    direct_entries_count = len(direct_entries)
    total_records = len(bills)

    total_qty = sum(b.quantity for b in po_bills if b.quantity > 0)
    total_spend = round(sum(b.total_amount for b in po_bills if b.total_amount > 0), 2)

    # Rate determination (prefers PO bill if available, fallback to direct entry or base_cost)
    if po_bills:
        last_rate = po_bills[0].unit_rate
        last_date = po_bills[0].bill_date
        last_bill_no = po_bills[0].bill_number
        last_vendor = po_bills[0].vendor_name
        last_rate_source = po_bills[0].source_type
    elif direct_entries:
        last_rate = direct_entries[0].unit_rate or base_cost
        last_date = direct_entries[0].bill_date
        last_bill_no = direct_entries[0].bill_number
        last_vendor = direct_entries[0].vendor_name
        last_rate_source = direct_entries[0].source_type
    else:
        last_rate = base_cost
        last_date = None
        last_bill_no = None
        last_vendor = None
        last_rate_source = "CATALOG_BASELINE"

    # Rate spread (lowest / highest)
    rates_pool = [b.unit_rate for b in (po_bills if po_bills else bills) if b.unit_rate > 0]
    lowest_rate = min(rates_pool) if rates_pool else base_cost
    highest_rate = max(rates_pool) if rates_pool else base_cost

    # Perpetual Weighted Average Cost (WAC) (excluding recoverable ITC)
    # Reference Manufacturer DLP and Revised MRP are independent legal/reference prices.
    if spare and spare.accounting_wac is not None and float(spare.accounting_wac) > 0:
        wac = round(float(spare.accounting_wac), 2)
    else:
        if total_qty > 0 and total_spend > 0:
            wac = round(total_spend / total_qty, 2)
        else:
            latest_ch_wac = None
            for ch in cost_records:
                if ch.wac_cost is not None and float(ch.wac_cost) > 0:
                    latest_ch_wac = float(ch.wac_cost)
                    break
            if latest_ch_wac is not None:
                wac = round(latest_ch_wac, 2)
            elif base_dlp is not None and base_dlp > 0:
                wac = round(base_dlp, 2)
            elif base_cost is not None and base_cost > 0:
                wac = round(base_cost, 2)
            else:
                wac = last_rate

    # Manufacturer Reference Prices (never derived via universal margin on WAC)
    ref_dlp = float(spare.manufacturer_dlp) if spare and spare.manufacturer_dlp is not None else (base_dlp or wac)
    ref_mrp = float(spare.manufacturer_mrp) if spare and spare.manufacturer_mrp is not None else (base_mrp or ref_dlp)

    return PartPurchaseSummaryResponse(
        spare_id=spare_id,
        part_code=part_code,
        part_name=part_name,
        category=category,
        hsn_code=hsn_code,
        tracking_mode=tracking_mode,
        current_stock=current_stock,
        current_cost=wac,
        current_dlp=ref_dlp,
        current_mrp=ref_mrp,
        current_margin_percent=margin_percent,
        averaged_dlp=ref_dlp,
        averaged_mrp=ref_mrp,
        total_bills_count=total_bills,
        direct_entries_count=direct_entries_count,
        total_records_count=total_records,
        total_quantity_bought=total_qty,
        total_spend=total_spend,
        last_purchase_rate=last_rate,
        last_purchase_date=last_date,
        last_bill_number=last_bill_no,
        last_vendor_name=last_vendor,
        last_rate_source=last_rate_source,
        lowest_purchase_rate=lowest_rate,
        highest_purchase_rate=highest_rate,
        weighted_average_cost=wac,
        bills=bills,
    )
