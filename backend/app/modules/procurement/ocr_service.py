import logging
import re
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.config import settings
from app.modules.procurement.ocr_provider import (
    FakeOCRProvider,
    OCRResult,
    BaseOCRProvider,
    GoogleCloudVisionOCRProvider,
)
from app.modules.procurement import models as proc_models
from app.modules.inventory.models import SparePartCode, SpareMaster

logger = logging.getLogger(__name__)

DEFAULT_MIN_CONFIDENCE_THRESHOLD: float = 0.90


class OCRService:
    """Service for parsing vendor invoices via OCR and preparing verifiable spare purchases."""

    def __init__(
        self,
        provider: Optional[BaseOCRProvider] = None,
        confidence_threshold: float = DEFAULT_MIN_CONFIDENCE_THRESHOLD,
    ):
        has_vision_key = bool(settings.GOOGLE_CLOUD_VISION_API_KEY and settings.GOOGLE_CLOUD_VISION_API_KEY.strip())
        if provider:
            self.provider = provider
        elif settings.ENVIRONMENT != "test" and has_vision_key:
            self.provider = GoogleCloudVisionOCRProvider(api_key=settings.GOOGLE_CLOUD_VISION_API_KEY)
        else:
            self.provider = FakeOCRProvider()
        self.confidence_threshold = confidence_threshold

    async def process_invoice(self, db: AsyncSession, vendor_id: int, file: UploadFile) -> proc_models.SparePurchase:
        """Process a single invoice file and persist purchase receipt."""
        return await self.process_invoices(db, vendor_id, [file])

    async def process_invoices(
        self, db: AsyncSession, vendor_id: int, files: List[UploadFile]
    ) -> proc_models.SparePurchase:
        """Extract invoice data from one or more uploaded files (pages/images/PDFs) and persist a consolidated draft SparePurchase.

        Guarantees transactional integrity with explicit rollback on parse or database error.
        """
        import json

        if not files:
            raise ValueError("No files provided for OCR processing.")

        try:
            # 1. Read all files into memory tuples
            file_tuples = []
            filenames = []
            for f in files:
                content = await f.read()
                name = f.filename or "uploaded_invoice.pdf"
                file_tuples.append((content, name))
                filenames.append(name)

            # 2. Extract and accumulate across all files/pages
            ocr_result: OCRResult = await self.provider.extract_invoices(file_tuples)

            # 3. Parse invoice date safely
            invoice_date_str = str(ocr_result.invoice_date.value)
            try:
                invoice_date_obj = datetime.strptime(invoice_date_str, "%Y-%m-%d").date()
            except ValueError:
                invoice_date_obj = datetime.now().date()

            # 4. Serialize structured metadata for audit and GST compliance
            remarks_str = None
            if ocr_result.raw_metadata:
                remarks_str = json.dumps(ocr_result.raw_metadata, default=str)

            # 5. Create Draft Purchase Record
            purchase = proc_models.SparePurchase(
                vendor_id=vendor_id,
                vendor_invoice_no=str(ocr_result.invoice_number.value),
                vendor_invoice_date=invoice_date_obj,
                purchase_date=invoice_date_obj,
                status="OCR_PROCESSED",
                subtotal=ocr_result.subtotal.value,
                tax_total=ocr_result.tax_total.value,
                additional_charges=ocr_result.additional_charges.value if ocr_result.additional_charges else None,
                landed_cost_total=ocr_result.invoice_total.value,
                docket_reference=str(ocr_result.docket_reference.value) if ocr_result.docket_reference else None,
                invoice_document_id=", ".join(filenames),
                verification_status="PENDING_VERIFICATION",
                include_in_accounting=True,
                remarks=remarks_str,
            )
            db.add(purchase)
            await db.flush()

            # 6. Process Line Items and Attempt to Resolve Part Codes
            for item in ocr_result.line_items:
                part_code_val = str(item.part_code.value).strip()

                # Step 6a: Look up part code in SparePartCode (case-insensitive)
                stmt = select(SparePartCode).filter(func.lower(SparePartCode.code) == part_code_val.lower())
                result = await db.execute(stmt)
                part_code_record = result.scalars().first()

                spare_id = part_code_record.spare_id if part_code_record else None

                # Step 6b: If no direct code match, attempt intelligent match by description against SpareMaster
                if not spare_id and item.part_description and item.part_description.value:
                    raw_desc = str(item.part_description.value).strip()
                    clean_desc = re.sub(r"SO\s*NO.*?/\s*\d+\s*", "", raw_desc, flags=re.IGNORECASE).strip()
                    clean_desc = re.sub(r"PO\d+.*", "", clean_desc, flags=re.IGNORECASE).strip()
                    clean_desc = re.sub(r"^[0-9\s/_-]+", "", clean_desc).strip()

                    if clean_desc and len(clean_desc) >= 3:
                        name_stmt = select(SpareMaster).filter(SpareMaster.spare_name.ilike(f"%{clean_desc}%"))
                        name_res = await db.execute(name_stmt)
                        matched_spare = name_res.scalars().first()
                        if matched_spare:
                            spare_id = matched_spare.spare_id
                            # Auto-register this OEM code into SparePartCode
                            new_alias = SparePartCode(
                                spare_id=spare_id,
                                code=part_code_val,
                                is_current=True,
                                reason="Auto-mapped from invoice description match",
                            )
                            db.add(new_alias)
                            await db.flush()

                # Determine verification status based on confidence threshold
                if not spare_id:
                    item_status = "UNKNOWN_CODE"
                elif item.part_code.confidence < self.confidence_threshold:
                    item_status = "LOW_CONFIDENCE"
                else:
                    item_status = "EXTRACTED"

                qty_val = int(item.quantity.value)
                unit_cost_val = Decimal(str(item.unit_price.value))
                disc_val = Decimal(str(item.discount.value)) if item.discount else Decimal("0")
                tax_val = Decimal(str(item.tax_amount.value)) if item.tax_amount else Decimal("0")
                gst_pct_val = Decimal(str(item.gst_percentage.value)) if item.gst_percentage else Decimal("18.00")
                total_val = (
                    Decimal(str(item.total_cost.value))
                    if item.total_cost
                    else (qty_val * unit_cost_val + tax_val - disc_val)
                )

                purchase_item = proc_models.SparePurchaseItem(
                    spare_purchase_id=purchase.spare_purchase_id,
                    spare_id=spare_id,
                    part_code=part_code_val,
                    part_description=str(item.part_description.value),
                    quantity=qty_val,
                    unit_cost=unit_cost_val,
                    discount=disc_val,
                    tax_amount=tax_val,
                    gst_percentage=gst_pct_val,
                    total_cost=total_val,
                    verification_status=item_status,
                    confidence_score=item.part_code.confidence,
                )
                db.add(purchase_item)

            await db.commit()
            await db.refresh(purchase, ["items"])
            return purchase
        except Exception as exc:
            await db.rollback()
            logger.error("Error during OCR invoice processing for vendor %s: %s", vendor_id, exc, exc_info=True)
            raise
