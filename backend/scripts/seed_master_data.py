"""
seed_master_data.py
~~~~~~~~~~~~~~~~~~~
Populates the database with Ampere-specific master data for
Sudha Electric Vehicle (exclusive Ampere dealership).

Usage (from the repository root):
    python backend/scripts/seed_master_data.py

Idempotent: safe to run multiple times — existing rows are skipped.
"""

import sys
import os
import asyncio

# ---------------------------------------------------------------------------
# Path setup – allow importing `app.*` regardless of working directory
# ---------------------------------------------------------------------------
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.future import select

from app.db.session import AsyncSessionLocal

# ── CRM models ──────────────────────────────────────────────────────────────
from app.domains.crm.models import LeadStatusMaster, EnquiryStatusMaster

# ── Master / Setup models ──────────────────────────────────────────────────
from app.domains.master.models import (
    Brand,
    VehicleModel,
    Vendor,
    PaymentMode,
    Bank,
    InsuranceCompany,
    DocumentType,
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
CREATED_BY = 1  # System Admin (seeded by seed_admin.py)


# ---------------------------------------------------------------------------
# Helper: generic idempotent insert
# ---------------------------------------------------------------------------
async def _seed_if_missing(session, model, lookup_col, lookup_val, obj):
    """Insert `obj` only when no row with `lookup_col == lookup_val` exists."""
    result = await session.execute(
        select(model).filter(lookup_col == lookup_val)
    )
    if result.scalars().first() is not None:
        print(f"  ⏭  Already exists: {lookup_val}")
        return None
    session.add(obj)
    print(f"  ✅  Inserted: {lookup_val}")
    return obj


# ---------------------------------------------------------------------------
# Seed functions
# ---------------------------------------------------------------------------
async def seed_lead_statuses(session):
    """Seed crm.lead_status_master"""
    print("\n── Lead Status Master ──")
    statuses = ["HOT", "WARM", "COLD", "SOLD", "LOST", "CONVERTED"]
    for idx, name in enumerate(statuses, start=1):
        await _seed_if_missing(
            session,
            LeadStatusMaster,
            LeadStatusMaster.status_name,
            name,
            LeadStatusMaster(status_name=name, display_order=idx),
        )


async def seed_enquiry_statuses(session):
    """Seed crm.enquiry_status_master"""
    print("\n── Enquiry Status Master ──")
    statuses = ["ACTIVE", "INACTIVE", "CONVERTED", "LOST"]
    for idx, name in enumerate(statuses, start=1):
        await _seed_if_missing(
            session,
            EnquiryStatusMaster,
            EnquiryStatusMaster.status_name,
            name,
            EnquiryStatusMaster(status_name=name, display_order=idx),
        )


async def seed_brand(session) -> int | None:
    """Seed master.brand and return the brand_id for Ampere."""
    print("\n── Brand ──")
    result = await session.execute(
        select(Brand).filter(Brand.brand_name == "Ampere")
    )
    existing = result.scalars().first()
    if existing:
        print(f"  ⏭  Already exists: Ampere (brand_id={existing.brand_id})")
        return existing.brand_id

    brand = Brand(brand_name="Ampere", is_active=True, created_by=CREATED_BY)
    session.add(brand)
    await session.flush()  # generate the PK so we can reference it
    print(f"  ✅  Inserted: Ampere (brand_id={brand.brand_id})")
    return brand.brand_id


async def seed_vehicle_models(session, brand_id: int):
    """Seed master.vehicle_model with Ampere models."""
    print("\n── Vehicle Models ──")
    models = [
        {
            "model_name": "Magnus EX",
            "material_number": "AMP-MAGNUS-EX",
            "colour": "Grey",
        },
        {
            "model_name": "Zeal EX",
            "material_number": "AMP-ZEAL-EX",
            "colour": "Blue",
        },
        {
            "model_name": "Primus",
            "material_number": "AMP-PRIMUS",
            "colour": "White",
        },
        {
            "model_name": "Nexus",
            "material_number": "AMP-NEXUS",
            "colour": "Black",
        },
    ]
    for m in models:
        await _seed_if_missing(
            session,
            VehicleModel,
            VehicleModel.material_number,
            m["material_number"],
            VehicleModel(
                brand_id=brand_id,
                model_name=m["model_name"],
                material_number=m["material_number"],
                colour=m["colour"],
                is_active=True,
                created_by=CREATED_BY,
            ),
        )


async def seed_vendor(session):
    """Seed master.vendor with the Ampere OEM."""
    print("\n── Vendor ──")
    await _seed_if_missing(
        session,
        Vendor,
        Vendor.vendor_name,
        "Greaves Electric Mobility Pvt Ltd",
        Vendor(
            vendor_name="Greaves Electric Mobility Pvt Ltd",
            vendor_type="OEM",
            is_active=True,
            created_by=CREATED_BY,
        ),
    )


async def seed_payment_modes(session):
    """Seed master.payment_mode"""
    print("\n── Payment Modes ──")
    modes = ["CASH", "CARD", "UPI", "FINANCE", "CHEQUE"]
    for name in modes:
        await _seed_if_missing(
            session,
            PaymentMode,
            PaymentMode.mode_name,
            name,
            PaymentMode(mode_name=name, is_active=True, created_by=CREATED_BY),
        )


async def seed_banks(session):
    """Seed master.bank"""
    print("\n── Banks ──")
    banks = [
        {"bank_name": "HDFC Bank",               "ifsc_code": "HDFC0000001"},
        {"bank_name": "SBI",                      "ifsc_code": "SBIN0000001"},
        {"bank_name": "ICICI Bank",               "ifsc_code": "ICIC0000001"},
        {"bank_name": "IDFC First",               "ifsc_code": "IDFB0000001"},
        {"bank_name": "Cholamandalam Finance",     "ifsc_code": "CIUB0000001"},
    ]
    for b in banks:
        await _seed_if_missing(
            session,
            Bank,
            Bank.bank_name,
            b["bank_name"],
            Bank(
                bank_name=b["bank_name"],
                ifsc_code=b["ifsc_code"],
                is_active=True,
                created_by=CREATED_BY,
            ),
        )


async def seed_insurance_companies(session):
    """Seed master.insurance_company"""
    print("\n── Insurance Companies ──")
    companies = [
        "Digit Insurance",
        "Acko General",
        "ICICI Lombard",
        "Reliance General",
    ]
    for name in companies:
        await _seed_if_missing(
            session,
            InsuranceCompany,
            InsuranceCompany.company_name,
            name,
            InsuranceCompany(
                company_name=name, is_active=True, created_by=CREATED_BY
            ),
        )


async def seed_document_types(session):
    """Seed master.document_type"""
    print("\n── Document Types ──")
    docs = ["Aadhaar Card", "PAN Card", "Driving License"]
    for name in docs:
        await _seed_if_missing(
            session,
            DocumentType,
            DocumentType.type_name,
            name,
            DocumentType(
                type_name=name, is_active=True, created_by=CREATED_BY
            ),
        )


# ---------------------------------------------------------------------------
# Main entry-point
# ---------------------------------------------------------------------------
async def seed_master_data():
    print("=" * 60)
    print("  Sudha Electric Vehicle — Master Data Seed")
    print("=" * 60)
    print("Connecting to database...")

    async with AsyncSessionLocal() as session:
        try:
            # 1. CRM statuses (no created_by on these models)
            await seed_lead_statuses(session)
            await seed_enquiry_statuses(session)

            # 2. Brand → Vehicle Models (order matters for FK)
            brand_id = await seed_brand(session)
            if brand_id is not None:
                await seed_vehicle_models(session, brand_id)

            # 3. Other master data
            await seed_vendor(session)
            await seed_payment_modes(session)
            await seed_banks(session)
            await seed_insurance_companies(session)
            await seed_document_types(session)

            # Commit all at once
            await session.commit()

            print("\n" + "=" * 60)
            print("  ✅  Master data seeding completed successfully!")
            print("=" * 60)

        except Exception as e:
            await session.rollback()
            print(f"\n❌  Error during seeding: {e}")
            raise


if __name__ == "__main__":
    try:
        asyncio.run(seed_master_data())
    except KeyboardInterrupt:
        pass
