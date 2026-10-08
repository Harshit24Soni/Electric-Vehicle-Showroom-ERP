import json
from decimal import Decimal
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class OCRField(BaseModel):
    value: Any
    confidence: float
    status: str = "EXTRACTED"

class OCRLineItem(BaseModel):
    part_code: OCRField
    part_description: OCRField
    quantity: OCRField
    unit_price: OCRField
    discount: Optional[OCRField] = None
    tax_amount: Optional[OCRField] = None

class OCRResult(BaseModel):
    supplier_name: Optional[OCRField] = None
    invoice_number: OCRField
    invoice_date: OCRField
    docket_reference: Optional[OCRField] = None
    subtotal: OCRField
    tax_total: OCRField
    additional_charges: Optional[OCRField] = None
    invoice_total: OCRField
    line_items: List[OCRLineItem]

class BaseOCRProvider:
    async def extract_invoice(self, file_content: bytes, file_name: str) -> OCRResult:
        raise NotImplementedError()

class FakeOCRProvider(BaseOCRProvider):
    """Deterministic OCR Provider for automated tests"""
    async def extract_invoice(self, file_content: bytes, file_name: str) -> OCRResult:
        # Simulate extraction logic based on file_name hints
        
        if "unknown" in file_name.lower():
            # Invoice with unknown part code
            return OCRResult(
                invoice_number=OCRField(value="INV-001", confidence=0.99),
                invoice_date=OCRField(value="2026-10-04", confidence=0.95),
                subtotal=OCRField(value=Decimal("100.00"), confidence=0.98),
                tax_total=OCRField(value=Decimal("18.00"), confidence=0.98),
                invoice_total=OCRField(value=Decimal("118.00"), confidence=0.98),
                line_items=[
                    OCRLineItem(
                        part_code=OCRField(value="UNKNOWN-XYZ", confidence=0.90),
                        part_description=OCRField(value="Mysterious Part", confidence=0.95),
                        quantity=OCRField(value=1, confidence=0.99),
                        unit_price=OCRField(value=Decimal("100.00"), confidence=0.98),
                        tax_amount=OCRField(value=Decimal("18.00"), confidence=0.98)
                    )
                ]
            )
            
        if "mismatch" in file_name.lower():
            # Invoice with total mismatch
            return OCRResult(
                invoice_number=OCRField(value="INV-002", confidence=0.99),
                invoice_date=OCRField(value="2026-10-04", confidence=0.95),
                subtotal=OCRField(value=Decimal("100.00"), confidence=0.98),
                tax_total=OCRField(value=Decimal("18.00"), confidence=0.98),
                invoice_total=OCRField(value=Decimal("500.00"), confidence=0.98), # intentional mismatch
                line_items=[
                    OCRLineItem(
                        part_code=OCRField(value="VALID-001", confidence=0.90),
                        part_description=OCRField(value="Valid Part", confidence=0.95),
                        quantity=OCRField(value=1, confidence=0.99),
                        unit_price=OCRField(value=Decimal("100.00"), confidence=0.98),
                        tax_amount=OCRField(value=Decimal("18.00"), confidence=0.98)
                    )
                ]
            )

        if "low_confidence" in file_name.lower():
            # Invoice with low confidence
            return OCRResult(
                invoice_number=OCRField(value="INV-003", confidence=0.50, status="LOW_CONFIDENCE"),
                invoice_date=OCRField(value="2026-10-04", confidence=0.95),
                subtotal=OCRField(value=Decimal("100.00"), confidence=0.98),
                tax_total=OCRField(value=Decimal("18.00"), confidence=0.98),
                invoice_total=OCRField(value=Decimal("118.00"), confidence=0.98),
                line_items=[
                    OCRLineItem(
                        part_code=OCRField(value="VALID-001", confidence=0.90),
                        part_description=OCRField(value="Valid Part", confidence=0.95),
                        quantity=OCRField(value=1, confidence=0.99),
                        unit_price=OCRField(value=Decimal("100.00"), confidence=0.98),
                        tax_amount=OCRField(value=Decimal("18.00"), confidence=0.98)
                    )
                ]
            )

        # Normal deterministic invoice
        return OCRResult(
            supplier_name=OCRField(value="Test Supplier", confidence=0.99),
            invoice_number=OCRField(value="INV-TEST-01", confidence=0.99),
            invoice_date=OCRField(value="2026-10-01", confidence=0.95),
            subtotal=OCRField(value=Decimal("1500.00"), confidence=0.98),
            tax_total=OCRField(value=Decimal("270.00"), confidence=0.98),
            invoice_total=OCRField(value=Decimal("1770.00"), confidence=0.98),
            line_items=[
                OCRLineItem(
                    part_code=OCRField(value="TEST-PART-1", confidence=0.99),
                    part_description=OCRField(value="Brake Assembly", confidence=0.99),
                    quantity=OCRField(value=10, confidence=0.99),
                    unit_price=OCRField(value=Decimal("150.00"), confidence=0.98),
                    tax_amount=OCRField(value=Decimal("27.00"), confidence=0.98)
                )
            ]
        )
