import pytest
from app.modules.inventory.alteration_service import (
    capture_spare_snapshot,
    compute_snapshot_diff,
    _are_values_equal,
)
from app.modules.inventory.worksheet_service import clean_cell_float
from app.modules.inventory.models import SpareMaster, SparePartCode


def test_clean_cell_float_currency_and_percent():
    """Validates that clean_cell_float handles Indian currency symbols, percentages, and notation."""
    assert clean_cell_float("₹ 1,200.00") == 1200.0
    assert clean_cell_float("Rs. 1,500.50") == 1500.50
    assert clean_cell_float("Rs 750") == 750.0
    assert clean_cell_float("1200/-") == 1200.0
    assert clean_cell_float("18%") == 18.0
    assert clean_cell_float("18.5 %") == 18.5
    assert clean_cell_float("INR 4,500") == 4500.0
    assert clean_cell_float("350 / 450") == 450.0
    assert clean_cell_float("-") is None
    assert clean_cell_float("N/A") is None
    assert clean_cell_float("—") is None


def test_compute_snapshot_diff_detection():
    """Validates that compute_snapshot_diff detects only changed keys and formats {old, new}."""
    before = {
        "part_code": "SP-001",
        "description": "Original Disc Rotor",
        "category": "Brakes",
        "dlp": 1000.0,
        "mrp": 1500.0,
        "gst_rate": 18.0,
        "hsn_code": "87141090",
        "stock_quantity": 10,
    }

    after = {
        "part_code": "SP-001",
        "description": "Updated Front Disc Rotor Assembly",
        "category": "Brakes",  # unchanged
        "dlp": 1200.0,  # changed
        "mrp": 1750.0,  # changed
        "gst_rate": 18.0,  # unchanged
        "hsn_code": "87141090",  # unchanged
        "stock_quantity": 10,  # unchanged
    }

    diff = compute_snapshot_diff(before, after)
    assert len(diff) == 3
    assert "description" in diff
    assert diff["description"]["old"] == "Original Disc Rotor"
    assert diff["description"]["new"] == "Updated Front Disc Rotor Assembly"

    assert "dlp" in diff
    assert diff["dlp"]["old"] == 1000.0
    assert diff["dlp"]["new"] == 1200.0

    assert "mrp" in diff
    assert diff["mrp"]["old"] == 1500.0
    assert diff["mrp"]["new"] == 1750.0

    # Ensure unchanged fields are NOT present
    assert "category" not in diff
    assert "gst_rate" not in diff
    assert "hsn_code" not in diff
    assert "stock_quantity" not in diff
    assert "part_code" not in diff


def test_are_values_equal_tolerances():
    """Validates that floating point round-off differences do not create false positive alterations."""
    assert _are_values_equal(100.001, 100.004) is True  # Rounded to 2 decimals
    assert _are_values_equal(100.0, 100.0) is True
    assert _are_values_equal(None, None) is True
    assert _are_values_equal(None, 100.0) is False
    assert _are_values_equal(" Brake Pad ", "Brake Pad") is True
    assert _are_values_equal({"Magnus": 500.0}, {"Magnus": 500.0}) is True


def test_capture_spare_snapshot_structure():
    """Validates capturing a complete serializable snapshot from a SpareMaster instance."""
    spare = SpareMaster(
        spare_id=101,
        spare_name="Rear Suspension Shock Absorber",
        category="Suspension",
        tracking_mode="QUANTITY",
        status="ACTIVE",
        hsn_code="87141090",
        gst_rate=18.0,
        base_cost=800.0,
        base_dlp=950.0,
        base_ex_showroom=1200.0,
        base_mrp=1416.0,
        profit_margin_percent=26.3,
        remarks="Test Remarks",
    )

    code = SparePartCode(code_id=1, spare_id=101, code="SP-SUSP-01", is_current=True)
    spare.codes = [code]
    spare.compatibilities = []
    spare.balances = []

    snap = capture_spare_snapshot(spare, "SP-SUSP-01")

    assert snap["part_code"] == "SP-SUSP-01"
    assert snap["description"] == "Rear Suspension Shock Absorber"
    assert snap["category"] == "Suspension"
    assert snap["dlp"] == 950.0
    assert snap["mrp"] == 1416.0
    assert snap["gst_rate"] == 18.0
    assert snap["profit_margin_percent"] == 26.3
    assert snap["stock_quantity"] == 0
    assert snap["model_prices"] == {}


@pytest.mark.asyncio
async def test_revert_alteration_selective_and_full():
    """Validates selective field reversal and full alteration reversal with audit integrity."""
    from unittest.mock import AsyncMock, MagicMock
    from app.modules.inventory.alteration_service import revert_alteration
    from app.modules.inventory.models import SparePartAlteration

    # Initial state
    spare = SpareMaster(
        spare_id=505,
        spare_name="Newly Modified Name",
        category="Brakes",
        tracking_mode="QUANTITY",
        status="ACTIVE",
        hsn_code="87141090",
        gst_rate=18.0,
        base_cost=1000.0,
        base_dlp=1200.0,
        base_mrp=1800.0,
        base_ex_showroom=1800.0,
        profit_margin_percent=50.0,
    )
    code = SparePartCode(code_id=1, spare_id=505, code="SP-TST-505", is_current=True)
    spare.codes = [code]
    spare.compatibilities = []
    spare.balances = []

    alteration = SparePartAlteration(
        alteration_id=10,
        spare_id=505,
        part_code="SP-TST-505",
        action_type="IMPORT_PDF",
        source_reference="supplier_pricelist.pdf",
        changes={
            "description": {"old": "Original Part Name", "new": "Newly Modified Name"},
            "dlp": {"old": 900.0, "new": 1200.0},
            "mrp": {"old": 1400.0, "new": 1800.0},
        },
        snapshot_before={
            "part_code": "SP-TST-505",
            "description": "Original Part Name",
            "dlp": 900.0,
            "mrp": 1400.0,
            "category": "Brakes",
            "gst_rate": 18.0,
        },
        snapshot_after={
            "part_code": "SP-TST-505",
            "description": "Newly Modified Name",
            "dlp": 1200.0,
            "mrp": 1800.0,
            "category": "Brakes",
            "gst_rate": 18.0,
        },
        is_reverted=False,
    )

    mock_db = AsyncMock()

    # Mock execute results
    def mock_execute(stmt):
        mock_result = MagicMock()
        stmt_str = str(stmt).lower()
        if "module_spare_part_alteration" in stmt_str:
            mock_result.scalar_one_or_none.return_value = alteration
        elif "module_spare_master" in stmt_str:
            mock_result.scalar_one_or_none.return_value = spare
        else:
            mock_result.scalars.return_value.first.return_value = None
            mock_result.scalar_one_or_none.return_value = None
        return mock_result

    mock_db.execute.side_effect = mock_execute

    # 1. Test selective reversal: Revert only DLP and MRP, leaving description as 'Newly Modified Name'
    res_selective = await revert_alteration(
        db=mock_db,
        alteration_id=10,
        fields_to_revert=["dlp", "mrp"],
        reverted_by_id=1,
        reverted_by_name="Admin User",
    )

    assert res_selective["success"] is True
    assert set(res_selective["reverted_fields"]) == {"dlp", "mrp"}
    assert spare.base_dlp == 900.0
    assert spare.base_mrp == 1400.0
    # Description should NOT have been reverted
    assert spare.spare_name == "Newly Modified Name"
    # Because only 2 of 3 fields were reverted, original alteration is not marked fully reverted
    assert alteration.is_reverted is False

    # 2. Test full reversal: Revert all fields
    res_full = await revert_alteration(
        db=mock_db,
        alteration_id=10,
        fields_to_revert=None,  # Reverts all changed fields
        reverted_by_id=1,
        reverted_by_name="Admin User",
    )

    assert res_full["success"] is True
    assert set(res_full["reverted_fields"]) == {"description", "dlp", "mrp"}
    assert spare.spare_name == "Original Part Name"
    assert spare.base_dlp == 900.0
    assert spare.base_mrp == 1400.0
    assert alteration.is_reverted is True
    assert alteration.reverted_at is not None
