from decimal import Decimal
from typing import Optional, List
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.domains.procurement.ocr_provider import FakeOCRProvider, OCRResult
from app.domains.procurement import models as proc_models
from app.modules.inventory.models import SparePartCode

class OCRService:
    def __init__(self, provider=None):
        self.provider = provider or FakeOCRProvider()
        
    async def process_invoice(self, db: AsyncSession, vendor_id: int, file: UploadFile) -> proc_models.SparePurchase:
        # Read file
        content = await file.read()
        filename = file.filename
        
        # 1. OCR Extraction
        ocr_result: OCRResult = await self.provider.extract_invoice(content, filename)
        
        from datetime import datetime
        invoice_date_str = str(ocr_result.invoice_date.value)
        invoice_date_obj = datetime.strptime(invoice_date_str, "%Y-%m-%d").date()
        
        # 2. Create Draft Purchase Record
        purchase = proc_models.SparePurchase(
            vendor_id=vendor_id,
            vendor_invoice_no=ocr_result.invoice_number.value,
            vendor_invoice_date=invoice_date_obj,
            purchase_date=invoice_date_obj, # Default to invoice date
            status="OCR_PROCESSED",
            subtotal=ocr_result.subtotal.value,
            tax_total=ocr_result.tax_total.value,
            additional_charges=ocr_result.additional_charges.value if ocr_result.additional_charges else None,
            landed_cost_total=ocr_result.invoice_total.value,
            docket_reference=ocr_result.docket_reference.value if ocr_result.docket_reference else None,
            invoice_document_id=filename,
            verification_status="PENDING_VERIFICATION",
            include_in_accounting=True
        )
        db.add(purchase)
        await db.flush() # get ID
        
        # 3. Process Line Items and Attempt to Resolve Part Codes
        for item in ocr_result.line_items:
            part_code_val = str(item.part_code.value)
            
            # Look up part code in SparePartCode
            stmt = select(SparePartCode).filter(SparePartCode.code == part_code_val)
            result = await db.execute(stmt)
            part_code_record = result.scalars().first()
            
            spare_id = part_code_record.spare_id if part_code_record else None
            
            # Determine verification status
            if not spare_id:
                item_status = "UNKNOWN_CODE"
            elif item.part_code.confidence < 0.90:
                item_status = "LOW_CONFIDENCE"
            else:
                item_status = "EXTRACTED"
                
            purchase_item = proc_models.SparePurchaseItem(
                spare_purchase_id=purchase.spare_purchase_id,
                spare_id=spare_id,
                part_code=part_code_val,
                part_description=str(item.part_description.value),
                quantity=int(item.quantity.value),
                unit_cost=Decimal(item.unit_price.value),
                discount=Decimal(item.discount.value) if item.discount else Decimal("0"),
                tax_amount=Decimal(item.tax_amount.value) if item.tax_amount else Decimal("0"),
                verification_status=item_status,
                confidence_score=item.part_code.confidence
            )
            db.add(purchase_item)
            
        await db.commit()
        await db.refresh(purchase, ["items"])
        return purchase
