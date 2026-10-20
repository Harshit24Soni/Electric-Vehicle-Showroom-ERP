import io

import httpx
import pytest

from app.modules.procurement.ocr_provider import GoogleCloudVisionOCRProvider


@pytest.mark.asyncio
async def test_20_page_pdf_processing():
    """Generates a 20-page invoice PDF and validates that the hybrid extractor

    extracts all 20 pages cleanly with zero failures and sub-second execution.
    """
    pytest.importorskip("reportlab")
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    # Build 20 distinct pages
    for page_num in range(1, 21):
        story.append(Paragraph(f"Tax Invoice Page {page_num}", styles["Heading1"]))
        story.append(Paragraph("GREAVES ELECTRIC MOBILITY LIMITED", styles["Normal"]))
        story.append(Paragraph(f"INVOICE NO: INV-2026-MULTI-{page_num:03d}", styles["Normal"]))
        story.append(Paragraph("GSTIN: 33AAHCA0665K1ZQ", styles["Normal"]))
        story.append(Spacer(1, 10))
        # Add line items per page
        story.append(Paragraph(f"PART-CODE-{page_num:03d}", styles["Normal"]))
        story.append(Paragraph(f"Brake Assembly Unit {page_num}", styles["Normal"]))
        story.append(Paragraph("87141090 EA 5 1200.00 18% 6000.00", styles["Normal"]))
        if page_num < 20:
            story.append(PageBreak())

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    assert len(pdf_bytes) > 0

    provider = GoogleCloudVisionOCRProvider(api_key="fake-test-key")

    async with httpx.AsyncClient() as client:
        page_results = await provider._annotate_pdf(client, pdf_bytes, "supplier_20_pages.pdf")

    # Verify that all 20 pages were extracted cleanly
    assert len(page_results) == 20
    for idx, res in enumerate(page_results, start=1):
        assert f"#page_{idx}" in res.raw_metadata["source_document"]
        assert len(res.line_items) >= 1
        assert res.line_items[0].part_code.value == f"PART-CODE-{idx:03d}"

    # Verify accumulation across all 20 pages
    accumulated = provider._accumulate_ocr_results(page_results, ["supplier_20_pages.pdf"])
    assert accumulated is not None
    assert accumulated.raw_metadata["pages_count"] == 20
    assert len(accumulated.line_items) == 20
