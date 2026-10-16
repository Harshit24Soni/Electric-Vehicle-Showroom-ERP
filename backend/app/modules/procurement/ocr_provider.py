import base64
import logging
import re
from datetime import datetime
from decimal import Decimal
from typing import List, Any, Optional, Dict, Tuple
import httpx
from pydantic import BaseModel

logger = logging.getLogger(__name__)


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
    hsn_code: Optional[OCRField] = None
    uom: Optional[OCRField] = None
    gst_percentage: Optional[OCRField] = None
    total_cost: Optional[OCRField] = None
    so_number: Optional[OCRField] = None
    po_number: Optional[OCRField] = None
    sr_no: Optional[OCRField] = None


class OCRResult(BaseModel):
    supplier_name: Optional[OCRField] = None
    supplier_gstin: Optional[OCRField] = None
    supplier_pan: Optional[OCRField] = None
    supplier_state: Optional[OCRField] = None
    buyer_name: Optional[OCRField] = None
    buyer_gstin: Optional[OCRField] = None
    buyer_pan: Optional[OCRField] = None
    buyer_state: Optional[OCRField] = None
    invoice_number: OCRField
    invoice_date: OCRField
    supply_date_time: Optional[OCRField] = None
    irn: Optional[OCRField] = None
    docket_reference: Optional[OCRField] = None
    dispatch_plant: Optional[OCRField] = None
    sales_office: Optional[OCRField] = None
    incoterms: Optional[OCRField] = None
    terms_of_payment: Optional[OCRField] = None
    virtual_account_no: Optional[OCRField] = None
    vehicle_number: Optional[OCRField] = None
    transporter_name: Optional[OCRField] = None
    subtotal: OCRField
    tax_total: OCRField
    additional_charges: Optional[OCRField] = None
    invoice_total: OCRField
    line_items: List[OCRLineItem]
    raw_metadata: Optional[Dict[str, Any]] = None


class BaseOCRProvider:
    async def extract_invoice(self, file_content: bytes, file_name: str) -> OCRResult:
        raise NotImplementedError()

    async def extract_invoices(self, files: List[Tuple[bytes, str]]) -> OCRResult:
        if not files:
            raise ValueError("No files provided for OCR extraction.")
        results = [await self.extract_invoice(content, name) for content, name in files]
        return self._accumulate_ocr_results(results, [n for _, n in files])

    def _accumulate_ocr_results(self, results: List[OCRResult], filenames: List[str]) -> OCRResult:
        if not results:
            raise ValueError("No OCR results to accumulate.")
        if len(results) == 1:
            return results[0]

        # Use first non-empty header fields
        primary = results[0]
        for r in results[1:]:
            if (
                primary.invoice_number.value == "INV-UNKNOWN" or not primary.invoice_number.value
            ) and r.invoice_number.value != "INV-UNKNOWN":
                primary.invoice_number = r.invoice_number
            if not primary.supplier_name and r.supplier_name:
                primary.supplier_name = r.supplier_name
            if not primary.supplier_gstin and r.supplier_gstin:
                primary.supplier_gstin = r.supplier_gstin
            if not primary.buyer_gstin and r.buyer_gstin:
                primary.buyer_gstin = r.buyer_gstin
            if not primary.irn and r.irn:
                primary.irn = r.irn
            if not primary.supply_date_time and r.supply_date_time:
                primary.supply_date_time = r.supply_date_time
            if not primary.dispatch_plant and r.dispatch_plant:
                primary.dispatch_plant = r.dispatch_plant

        # Combine line items
        combined_items: List[OCRLineItem] = []
        seen_keys = set()
        for r in results:
            for item in r.line_items:
                part_code = str(item.part_code.value).strip().upper()
                qty = str(item.quantity.value)
                price = str(item.unit_price.value)
                po = str(item.po_number.value) if item.po_number else ""
                so = str(item.so_number.value) if item.so_number else ""
                key = (part_code, qty, price, po, so)
                if key not in seen_keys:
                    seen_keys.add(key)
                    combined_items.append(item)

        subtotal = sum(
            Decimal(str(item.unit_price.value)) * Decimal(str(item.quantity.value)) for item in combined_items
        )
        tax_total = sum(
            Decimal(str(item.tax_amount.value)) if item.tax_amount else Decimal("0") for item in combined_items
        )
        charges = sum(
            Decimal(str(r.additional_charges.value)) if r.additional_charges else Decimal("0") for r in results
        )
        invoice_total = subtotal + tax_total + charges

        # Merge raw metadata
        combined_metadata = {
            "accumulated_files": filenames,
            "pages_count": len(results),
            "tax_compliance": {
                "supplier_name": primary.supplier_name.value if primary.supplier_name else None,
                "supplier_gstin": primary.supplier_gstin.value if primary.supplier_gstin else None,
                "supplier_pan": primary.supplier_pan.value if primary.supplier_pan else None,
                "buyer_name": primary.buyer_name.value if primary.buyer_name else None,
                "buyer_gstin": primary.buyer_gstin.value if primary.buyer_gstin else None,
                "buyer_pan": primary.buyer_pan.value if primary.buyer_pan else None,
                "irn": primary.irn.value if primary.irn else None,
                "supply_date_time": primary.supply_date_time.value if primary.supply_date_time else None,
            },
            "logistics": {
                "dispatch_plant": primary.dispatch_plant.value if primary.dispatch_plant else None,
                "sales_office": primary.sales_office.value if primary.sales_office else None,
                "incoterms": primary.incoterms.value if primary.incoterms else None,
                "terms_of_payment": primary.terms_of_payment.value if primary.terms_of_payment else None,
                "virtual_account": primary.virtual_account_no.value if primary.virtual_account_no else None,
            },
            "financial_summary": {
                "subtotal": float(subtotal),
                "tax_total": float(tax_total),
                "additional_charges": float(charges),
                "total_value": float(invoice_total),
                "item_count": len(combined_items),
            },
        }

        return OCRResult(
            supplier_name=primary.supplier_name,
            supplier_gstin=primary.supplier_gstin,
            supplier_pan=primary.supplier_pan,
            supplier_state=primary.supplier_state,
            buyer_name=primary.buyer_name,
            buyer_gstin=primary.buyer_gstin,
            buyer_pan=primary.buyer_pan,
            buyer_state=primary.buyer_state,
            invoice_number=primary.invoice_number,
            invoice_date=primary.invoice_date,
            supply_date_time=primary.supply_date_time,
            irn=primary.irn,
            docket_reference=primary.docket_reference or primary.irn,
            dispatch_plant=primary.dispatch_plant,
            sales_office=primary.sales_office,
            incoterms=primary.incoterms,
            terms_of_payment=primary.terms_of_payment,
            virtual_account_no=primary.virtual_account_no,
            vehicle_number=primary.vehicle_number,
            transporter_name=primary.transporter_name,
            subtotal=OCRField(value=subtotal, confidence=0.98),
            tax_total=OCRField(value=tax_total, confidence=0.98),
            additional_charges=OCRField(value=charges, confidence=0.98) if charges else None,
            invoice_total=OCRField(value=invoice_total, confidence=0.98),
            line_items=combined_items,
            raw_metadata=combined_metadata,
        )


class FakeOCRProvider(BaseOCRProvider):
    """Deterministic OCR Provider for automated tests"""

    async def extract_invoice(self, file_content: bytes, file_name: str) -> OCRResult:
        if "unknown" in file_name.lower():
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
                        tax_amount=OCRField(value=Decimal("18.00"), confidence=0.98),
                        gst_percentage=OCRField(value=Decimal("18.00"), confidence=0.98),
                        total_cost=OCRField(value=Decimal("118.00"), confidence=0.98),
                    )
                ],
            )

        if "mismatch" in file_name.lower():
            return OCRResult(
                invoice_number=OCRField(value="INV-002", confidence=0.99),
                invoice_date=OCRField(value="2026-10-04", confidence=0.95),
                subtotal=OCRField(value=Decimal("100.00"), confidence=0.98),
                tax_total=OCRField(value=Decimal("18.00"), confidence=0.98),
                invoice_total=OCRField(value=Decimal("500.00"), confidence=0.98),
                line_items=[
                    OCRLineItem(
                        part_code=OCRField(value="VALID-001", confidence=0.90),
                        part_description=OCRField(value="Valid Part", confidence=0.95),
                        quantity=OCRField(value=1, confidence=0.99),
                        unit_price=OCRField(value=Decimal("100.00"), confidence=0.98),
                        tax_amount=OCRField(value=Decimal("18.00"), confidence=0.98),
                        gst_percentage=OCRField(value=Decimal("18.00"), confidence=0.98),
                        total_cost=OCRField(value=Decimal("118.00"), confidence=0.98),
                    )
                ],
            )

        if "low_confidence" in file_name.lower():
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
                        tax_amount=OCRField(value=Decimal("18.00"), confidence=0.98),
                        gst_percentage=OCRField(value=Decimal("18.00"), confidence=0.98),
                        total_cost=OCRField(value=Decimal("118.00"), confidence=0.98),
                    )
                ],
            )

        # Standard deterministic invoice
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
                    tax_amount=OCRField(value=Decimal("27.00"), confidence=0.98),
                    gst_percentage=OCRField(value=Decimal("18.00"), confidence=0.98),
                    total_cost=OCRField(value=Decimal("177.00"), confidence=0.98),
                )
            ],
            raw_metadata={
                "tax_compliance": {"supplier_name": "Test Supplier"},
                "financial_summary": {"subtotal": 1500.0, "tax_total": 270.0, "total_value": 1770.0},
            },
        )


class GoogleCloudVisionOCRProvider(BaseOCRProvider):
    """Production OCR Provider utilizing Google Cloud Vision API for multi-page document intelligence."""

    def __init__(self, api_key: str):
        self.api_key = api_key.strip() if api_key else ""

    async def extract_invoice(self, file_content: bytes, file_name: str) -> OCRResult:
        return await self.extract_invoices([(file_content, file_name)])

    async def extract_invoices(self, files: List[Tuple[bytes, str]]) -> OCRResult:
        if not self.api_key:
            raise ValueError(
                "Google Cloud Vision API key is not configured. Please set GOOGLE_CLOUD_VISION_API_KEY in your .env file."
            )
        if not files:
            raise ValueError("No files provided for OCR extraction.")

        page_results: List[OCRResult] = []

        async with httpx.AsyncClient(timeout=60.0) as client:
            for file_content, file_name in files:
                is_pdf = file_name.lower().endswith(".pdf")

                if is_pdf:
                    pdf_results = await self._annotate_pdf(client, file_content, file_name)
                    page_results.extend(pdf_results)
                else:
                    img_result = await self._annotate_image(client, file_content, file_name)
                    page_results.append(img_result)

        return self._accumulate_ocr_results(page_results, [n for _, n in files])

    async def _annotate_image(self, client: httpx.AsyncClient, file_content: bytes, file_name: str) -> OCRResult:
        content_b64 = base64.b64encode(file_content).decode("utf-8")
        url = f"https://vision.googleapis.com/v1/images:annotate?key={self.api_key}"
        payload = {
            "requests": [
                {
                    "image": {"content": content_b64},
                    "features": [{"type": "DOCUMENT_TEXT_DETECTION"}],
                }
            ]
        }

        try:
            response = await client.post(url, json=payload)
            if response.status_code != 200:
                err_msg = response.text
                logger.error("Google Cloud Vision API call failed (%s): %s", response.status_code, err_msg)
                raise RuntimeError(f"Google Cloud Vision API error ({response.status_code}): {err_msg}")
            result_json = response.json()
        except Exception as exc:
            logger.error("Failed to connect to Google Cloud Vision API: %s", exc, exc_info=True)
            raise RuntimeError(f"Failed to connect to Google Cloud Vision API: {str(exc)}")

        responses = result_json.get("responses", [])
        if not responses or "fullTextAnnotation" not in responses[0]:
            logger.warning("No text detected by Google Cloud Vision for %s", file_name)
            return self._empty_result(file_name)

        extracted_text = responses[0]["fullTextAnnotation"]["text"]
        return self._parse_extracted_text(extracted_text, file_name)

    async def _annotate_pdf(self, client: httpx.AsyncClient, file_content: bytes, file_name: str) -> List[OCRResult]:
        content_b64 = base64.b64encode(file_content).decode("utf-8")
        url = f"https://vision.googleapis.com/v1/files:annotate?key={self.api_key}"
        payload = {
            "requests": [
                {
                    "inputConfig": {"content": content_b64, "mimeType": "application/pdf"},
                    "features": [{"type": "DOCUMENT_TEXT_DETECTION"}],
                    "pages": [1, 2, 3, 4, 5],
                }
            ]
        }

        try:
            response = await client.post(url, json=payload)
            if response.status_code != 200:
                err_msg = response.text
                logger.error("Google Cloud Vision PDF annotate failed (%s): %s", response.status_code, err_msg)
                raise RuntimeError(f"Google Cloud Vision PDF annotate error ({response.status_code}): {err_msg}")
            result_json = response.json()
        except Exception as exc:
            logger.error("Failed to connect to Google Cloud Vision PDF API: %s", exc, exc_info=True)
            raise RuntimeError(f"Failed to connect to Google Cloud Vision PDF API: {str(exc)}")

        responses = result_json.get("responses", [])
        page_results = []
        if responses and "responses" in responses[0]:
            for idx, page_resp in enumerate(responses[0]["responses"]):
                if "fullTextAnnotation" in page_resp:
                    page_text = page_resp["fullTextAnnotation"]["text"]
                    page_results.append(self._parse_extracted_text(page_text, f"{file_name}#page_{idx+1}"))

        if not page_results:
            page_results.append(self._empty_result(file_name))
        return page_results

    def _empty_result(self, file_name: str) -> OCRResult:
        return OCRResult(
            invoice_number=OCRField(value="INV-UNKNOWN", confidence=0.5),
            invoice_date=OCRField(value=datetime.now().strftime("%Y-%m-%d"), confidence=0.5),
            subtotal=OCRField(value=Decimal("0.00"), confidence=0.5),
            tax_total=OCRField(value=Decimal("0.00"), confidence=0.5),
            invoice_total=OCRField(value=Decimal("0.00"), confidence=0.5),
            line_items=[],
        )

    def _parse_extracted_text(self, text: str, file_name: str) -> OCRResult:
        lines = [line.strip() for line in text.split("\n") if line.strip()]

        # 1. Supplier Name & Trade Name / Brand
        supplier_name = None
        for line in lines[:8]:
            if any(kw in line.upper() for kw in ["LIMITED", "LTD", "MOTORS", "MOBILITY", "PVT", "AMPERE", "GREAVES"]):
                clean = re.sub(r"No\.\d+.*", "", line).strip()
                supplier_name = clean
                break

        # 2. GSTIN & PAN Identification
        gstins = re.findall(r"\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z0-9]{1}[Zz][A-Z0-9]{1}\b", text)
        supplier_gstin = gstins[0] if len(gstins) >= 1 else None
        buyer_gstin = gstins[1] if len(gstins) >= 2 else (gstins[0] if gstins else None)

        pans = list(dict.fromkeys(re.findall(r"\b[A-Z]{5}\d{4}[A-Z]{1}\b", text)))
        supplier_pan = pans[0] if len(pans) >= 1 else None
        buyer_pan = pans[1] if len(pans) >= 2 else (pans[0] if pans else None)

        # 3. Buyer Legal Name
        buyer_name = None
        buyer_match = re.search(
            r"(?:BILL\s*TO|SHIPPED\s*TO|CONSIGNEE)\s*[:.-]?\s*\d*\s*([A-Za-z0-9\s.,-]+)", text, re.IGNORECASE
        )
        if buyer_match:
            candidate_buyer = buyer_match.group(1).split("\n")[0].strip()
            if len(candidate_buyer) > 3 and not candidate_buyer.startswith("GSTIN"):
                buyer_name = candidate_buyer

        # 4. IRN (E-Invoice Hash)
        irn_match = re.search(r"IRN\s*[:.-]?\s*([a-f0-9]{64})", text, re.IGNORECASE)
        irn = irn_match.group(1) if irn_match else None

        # 5. Supply Date & Time
        supply_dt = None
        dt_match = re.search(
            r"Date\s*&\s*Time\s*of\s*Supply.*?(\d{1,2}[./-]\d{1,2}[./-]\d{4}\s+\d{1,2}:\d{2}(?::\d{2})?)",
            text,
            re.IGNORECASE,
        )
        if dt_match:
            supply_dt = dt_match.group(1)

        # 6. Logistics & Dispatch
        plant_match = re.search(r"Dispatch\s*Plant\s*[:.-]?\s*(\w+)", text, re.IGNORECASE)
        dispatch_plant = plant_match.group(1) if plant_match else None

        sales_match = re.search(r"Sales\s*Office\s*[:.-]?\s*(\w+)", text, re.IGNORECASE)
        sales_office = sales_match.group(1) if sales_match else None

        inco_match = re.search(r"Incoterms\s*[:.-]?\s*([A-Z]{2,4})", text, re.IGNORECASE)
        incoterms = inco_match.group(1) if inco_match else None

        terms_match = re.search(r"Terms\s*of\s*Payment\s*[:.-]?\s*([^\n\r]+)", text, re.IGNORECASE)
        terms_of_payment = terms_match.group(1).strip() if terms_match else None

        va_match = re.search(
            r"(?:Virtual\s*account\s*number|Account\s*No)\s*[:.-]?\s*([A-Za-z0-9]+)", text, re.IGNORECASE
        )
        virtual_account = va_match.group(1) if va_match else None

        # 7. Invoice Number
        invoice_number = "INV-UNKNOWN"
        candidates = re.findall(r"INVOICE\s*(?:NO|NUMBER|#)?\s*[:.-]?\s*([A-Za-z0-9/_-]+)", text, re.IGNORECASE)
        for c in candidates:
            c = c.strip()
            if c.upper() not in ["CUM", "TAX", "CHALLAN", "BILL", "DETAILS", "DATE", "NO", ""]:
                invoice_number = c
                break

        # 8. Invoice Date
        invoice_date = datetime.now().strftime("%Y-%m-%d")
        date_match = re.search(r"\bDATE\s*[:.-]?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})", text, re.IGNORECASE)
        if date_match:
            raw_date = date_match.group(1).strip().replace("/", ".").replace("-", ".")
            parts = raw_date.split(".")
            if len(parts) == 3:
                if len(parts[0]) == 4:
                    invoice_date = f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"
                else:
                    invoice_date = f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"

        # 9. Line items extraction
        line_items: List[OCRLineItem] = []
        hsn_pattern = re.compile(r"^(?:87\d{2,6}|85\d{2,6}|84\d{2,6})\s*(EA|NOS|PCS|SET|UNIT|KGS|MTR)?$", re.IGNORECASE)

        # Strategy 1: HSN-Anchored Table
        for i, l in enumerate(lines):
            m_hsn = hsn_pattern.match(l)
            if m_hsn:
                hsn_code = l.split()[0]
                uom = m_hsn.group(1) or "EA"

                code_cand = lines[i - 1] if i > 0 else ""
                part_code = ""
                if re.match(r"^[A-Z0-9-]{6,20}$", code_cand, re.IGNORECASE):
                    part_code = code_cand.strip()
                else:
                    tokens = re.findall(r"\b[A-Z0-9-]{6,20}\b", code_cand)
                    if tokens:
                        part_code = tokens[0]

                if not part_code:
                    continue

                part_desc = ""
                so_no = None
                po_no = None
                sr_no = None

                for offset in range(2, 6):
                    if i - offset >= 0:
                        cand = lines[i - offset]
                        if cand.isdigit() and len(cand) <= 4:
                            sr_no = int(cand)
                            continue
                        m_so = re.search(r"SO\s*NO\s*[:.-]?\s*(\w+)", cand, re.IGNORECASE)
                        if m_so:
                            so_no = m_so.group(1)
                        m_po = re.search(r"PO\s*[:.-]?\s*(\w+)", cand, re.IGNORECASE)
                        if m_po:
                            po_no = m_po.group(1)
                        if any(
                            kw in cand.upper()
                            for kw in ["SO NO", "PO2", "ORDER NO", "MATERIAL DESCRIPTION", "SR. NO", "GSTIN", "BILL TO"]
                        ):
                            continue
                        part_desc = cand
                        break

                nums = []
                for nxt in range(i + 1, min(len(lines), i + 8)):
                    nxt_l = lines[nxt]
                    if hsn_pattern.match(nxt_l) or (nxt_l.isdigit() and len(nxt_l) <= 3 and int(nxt_l) > 0):
                        break
                    clean_num = nxt_l.replace(",", "")
                    if re.match(r"^\d+(?:\.\d+)?$", clean_num):
                        nums.append(Decimal(clean_num))

                qty = Decimal("1")
                price = Decimal("0.00")
                net_val = Decimal("0.00")
                if len(nums) >= 1:
                    qty = nums[0]
                if len(nums) >= 2:
                    price = nums[1]
                if len(nums) >= 3:
                    net_val = nums[2]
                else:
                    net_val = qty * price

                gst_rate = Decimal("18.00")
                tax_amt = round(net_val * (gst_rate / Decimal("100")), 2)
                total_cost = net_val + tax_amt

                line_items.append(
                    OCRLineItem(
                        part_code=OCRField(value=part_code, confidence=0.98),
                        part_description=OCRField(value=part_desc or part_code, confidence=0.95),
                        quantity=OCRField(value=int(qty) if qty == int(qty) else float(qty), confidence=0.98),
                        unit_price=OCRField(value=price, confidence=0.98),
                        tax_amount=OCRField(value=tax_amt, confidence=0.95),
                        hsn_code=OCRField(value=hsn_code, confidence=0.98),
                        uom=OCRField(value=uom, confidence=0.95),
                        gst_percentage=OCRField(value=gst_rate, confidence=0.98),
                        total_cost=OCRField(value=total_cost, confidence=0.98),
                        so_number=OCRField(value=so_no, confidence=0.90) if so_no else None,
                        po_number=OCRField(value=po_no, confidence=0.90) if po_no else None,
                        sr_no=OCRField(value=sr_no, confidence=0.90) if sr_no else None,
                    )
                )

        # Strategy 2: Fallback OEM Code Extraction (for non-HSN bills)
        if not line_items:
            oem_code_pattern = re.compile(r"\b([A-Z]{2,6}[0-9]{3,10}|[A-Z]{2,4}-[A-Z0-9-]{4,15})\b")
            seen_codes = set()
            ignore_keywords = {
                "AMPERE",
                "INVOICE",
                "CHALLAN",
                "DELIVERY",
                "MATERIAL",
                "DESCRIPTION",
                "TAX-INVOICE",
                "TAXABLE",
                "LIMITED",
                "MOBILITY",
                "ORIGINAL",
                "DUPLICATE",
                "REGISTERED",
                "AUTHORISED",
                "SIGNATORY",
                "JURISDICTION",
                "CUSTOMER",
                "VEHICLE",
                "DISPATCH",
                "COMMODITY",
                "INCOTERMS",
                "VIRTUAL",
            }

            for idx, line in enumerate(lines):
                codes = oem_code_pattern.findall(line)
                for code_str in codes:
                    if code_str in seen_codes:
                        continue
                    if len(code_str) == 15 and "Z" in code_str:
                        continue  # GSTIN
                    if code_str.startswith(("PO", "GEMPL")):
                        continue
                    if code_str.upper() in ignore_keywords:
                        continue
                    if not (re.search(r"[A-Za-z]", code_str) and re.search(r"\d", code_str)):
                        continue

                    desc = ""
                    for prev_offset in range(1, 4):
                        if idx - prev_offset >= 0:
                            prev_line = lines[idx - prev_offset]
                            cleaned = re.sub(r"SO\s*NO.*?/\s*\d+\s*", "", prev_line).strip()
                            cleaned = re.sub(r"PO\d+.*", "", cleaned).strip()
                            if any(
                                kw in cleaned.upper()
                                for kw in ["SR. NO", "MATERIAL DESCRIPTION", "BILL TO", "TAX-INVOICE", "GSTIN"]
                            ):
                                continue
                            if cleaned and not oem_code_pattern.search(cleaned):
                                desc = cleaned
                                break

                    forward_text = " ".join(lines[idx : min(len(lines), idx + 3)])
                    tokens = re.findall(r"\b\d+(?:\.\d+)?\b", forward_text)
                    usable_nums = []
                    for t in tokens:
                        if len(t) in [6, 8] and t.startswith("87"):
                            continue
                        if len(t) >= 10:
                            continue
                        usable_nums.append(Decimal(t))

                    qty = Decimal("1")
                    price = Decimal("0.00")
                    if len(usable_nums) >= 1:
                        qty = usable_nums[0]
                    if len(usable_nums) >= 2:
                        price = usable_nums[1]

                    gst_rate = Decimal("18.00")
                    tax_amt = round(qty * price * (gst_rate / Decimal("100")), 2)
                    total_cost = (qty * price) + tax_amt

                    seen_codes.add(code_str)
                    line_items.append(
                        OCRLineItem(
                            part_code=OCRField(value=code_str, confidence=0.92),
                            part_description=OCRField(value=desc or code_str, confidence=0.88),
                            quantity=OCRField(value=int(qty) if qty == int(qty) else float(qty), confidence=0.92),
                            unit_price=OCRField(value=price, confidence=0.92),
                            tax_amount=OCRField(value=tax_amt, confidence=0.90),
                            gst_percentage=OCRField(value=gst_rate, confidence=0.90),
                            total_cost=OCRField(value=total_cost, confidence=0.90),
                        )
                    )

        # 10. Financial Reconciliation
        subtotal = sum(Decimal(str(item.unit_price.value)) * Decimal(str(item.quantity.value)) for item in line_items)
        tax_total = sum(Decimal(str(item.tax_amount.value)) if item.tax_amount else Decimal("0") for item in line_items)
        invoice_total = subtotal + tax_total

        # Structured metadata
        metadata = {
            "source_document": file_name,
            "tax_compliance": {
                "supplier_name": supplier_name,
                "supplier_gstin": supplier_gstin,
                "supplier_pan": supplier_pan,
                "buyer_name": buyer_name,
                "buyer_gstin": buyer_gstin,
                "buyer_pan": buyer_pan,
                "irn": irn,
                "supply_date_time": supply_dt,
            },
            "logistics": {
                "dispatch_plant": dispatch_plant,
                "sales_office": sales_office,
                "incoterms": incoterms,
                "terms_of_payment": terms_of_payment,
                "virtual_account": virtual_account,
            },
            "financial_summary": {
                "subtotal": float(subtotal),
                "tax_total": float(tax_total),
                "total_value": float(invoice_total),
                "item_count": len(line_items),
            },
            "item_manifest": [
                {
                    "part_code": str(it.part_code.value),
                    "description": str(it.part_description.value),
                    "hsn": str(it.hsn_code.value) if it.hsn_code else None,
                    "uom": str(it.uom.value) if it.uom else None,
                    "qty": float(it.quantity.value),
                    "rate": float(it.unit_price.value),
                    "gst_percent": float(it.gst_percentage.value) if it.gst_percentage else 18.0,
                    "tax": float(it.tax_amount.value) if it.tax_amount else 0.0,
                    "total": (
                        float(it.total_cost.value)
                        if it.total_cost
                        else float(it.unit_price.value) * float(it.quantity.value)
                    ),
                    "so_no": str(it.so_number.value) if it.so_number else None,
                    "po_no": str(it.po_number.value) if it.po_number else None,
                }
                for it in line_items
            ],
        }

        return OCRResult(
            supplier_name=OCRField(value=supplier_name, confidence=0.95) if supplier_name else None,
            supplier_gstin=OCRField(value=supplier_gstin, confidence=0.98) if supplier_gstin else None,
            supplier_pan=OCRField(value=supplier_pan, confidence=0.98) if supplier_pan else None,
            buyer_name=OCRField(value=buyer_name, confidence=0.90) if buyer_name else None,
            buyer_gstin=OCRField(value=buyer_gstin, confidence=0.98) if buyer_gstin else None,
            buyer_pan=OCRField(value=buyer_pan, confidence=0.98) if buyer_pan else None,
            invoice_number=OCRField(value=invoice_number, confidence=0.98),
            invoice_date=OCRField(value=invoice_date, confidence=0.98),
            supply_date_time=OCRField(value=supply_dt, confidence=0.95) if supply_dt else None,
            irn=OCRField(value=irn, confidence=0.98) if irn else None,
            docket_reference=OCRField(value=irn, confidence=0.95) if irn else None,
            dispatch_plant=OCRField(value=dispatch_plant, confidence=0.90) if dispatch_plant else None,
            sales_office=OCRField(value=sales_office, confidence=0.90) if sales_office else None,
            incoterms=OCRField(value=incoterms, confidence=0.90) if incoterms else None,
            terms_of_payment=OCRField(value=terms_of_payment, confidence=0.90) if terms_of_payment else None,
            virtual_account_no=OCRField(value=virtual_account, confidence=0.90) if virtual_account else None,
            subtotal=OCRField(value=subtotal, confidence=0.98),
            tax_total=OCRField(value=tax_total, confidence=0.98),
            invoice_total=OCRField(value=invoice_total, confidence=0.98),
            line_items=line_items,
            raw_metadata=metadata,
        )
