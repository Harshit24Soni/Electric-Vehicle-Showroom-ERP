"""
Master Data Seeder for Electric Vehicle Showroom ERP.

Idempotently seeds:
1. Core Vehicle Brands (e.g., Greaves Electric Mobility)
2. Standard Vehicle Models with initial catalog codes and colours
3. Standard Payment Modes (Cash, UPI, Bank Transfer, Card, Cheque, Finance)
4. Standard Expense Categories
5. Standard Job Card Categories (PMS, Running Repair, Accidental, Warranty, Battery)

Guarantees:
- Safe to run repeatedly (fully idempotent via unique lookups).
- Zero data deletion or table truncation.
- Does not modify existing user accounts, passwords, or transaction records.
"""

import argparse
import asyncio
import logging
import os
import sys

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

from sqlalchemy import select
from app.db.session import async_session_maker
from app.modules.master.models import (
    Brand,
    VehicleModel,
    PaymentMode,
    ExpenseCategory,
    JobCardCategory,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed_master_data")

DEFAULT_BRAND_NAME = "Greaves Electric Mobility"

STANDARD_VEHICLE_MODELS = [
    {"name": "Magnus Neo", "code": "MAG-NEO", "colour": "Ocean Blue"},
    {"name": "Primus", "code": "PRIMUS", "colour": "Ruby Red"},
    {"name": "Magnus EX", "code": "MAG-EX", "colour": "Galactic Grey"},
    {"name": "Reo Li Plus", "code": "REO-LI-PLUS", "colour": "Polar White"},
    {"name": "Zeal", "code": "ZEAL", "colour": "Glossy Black"},
    {"name": "Reo 80", "code": "REO-80", "colour": "Cherry Red"},
    {"name": "Nexus", "code": "NEXUS", "colour": "Stealth Silver"},
    {"name": "Accessories", "code": "ACCESSORIES", "colour": "Standard"},
]

STANDARD_PAYMENT_MODES = [
    {"name": "Cash", "description": "Cash payment at dealership desk"},
    {"name": "UPI", "description": "Digital payment via UPI (GPay, PhonePe, Paytm, BHIM)"},
    {"name": "Bank Transfer (NEFT/RTGS/IMPS)", "description": "Direct bank account transfer"},
    {"name": "Credit / Debit Card", "description": "Point-of-sale card swipe machine"},
    {"name": "Cheque / Demand Draft", "description": "Bank cheque or demand draft"},
    {"name": "Finance / Auto Loan", "description": "Third-party vehicle loan disbursement"},
]

STANDARD_EXPENSE_CATEGORIES = [
    {"name": "Office Expense", "description": "General office administration and stationary"},
    {"name": "Electricity & Utilities", "description": "Electricity, water, and utility bills"},
    {"name": "Showroom Maintenance", "description": "Showroom and workshop upkeep and repairs"},
    {"name": "Staff Welfare & Tea", "description": "Staff refreshments and welfare expenses"},
    {"name": "Fuel & Transportation", "description": "Fuel and local transport for showroom operations"},
    {"name": "Marketing & Promotions", "description": "Local advertising, banners, and digital marketing"},
    {"name": "Miscellaneous", "description": "Other unclassified operational expenses"},
]

STANDARD_JOB_CARD_CATEGORIES = [
    {"name": "Periodic Maintenance Service (PMS)", "description": "Scheduled maintenance service"},
    {"name": "Running Repairs", "description": "General running repairs and part replacements"},
    {"name": "Accidental Repair", "description": "Bodywork and accidental insurance repairs"},
    {"name": "Warranty Claim", "description": "OEM covered warranty parts replacement"},
    {"name": "Battery & Electrical", "description": "Battery diagnostics, BMS check, and electrical repair"},
    {"name": "Pre-Delivery Inspection (PDI)", "description": "Initial vehicle inspection before delivery"},
]


async def seed_master_data() -> None:
    logger.info("Starting idempotent master data seeding...")

    async with async_session_maker() as session:
        async with session.begin():
            # 1. Seed Default Brand
            brand_stmt = select(Brand).where(Brand.brand_name == DEFAULT_BRAND_NAME)
            brand = (await session.execute(brand_stmt)).scalar_one_or_none()
            if not brand:
                brand = Brand(brand_name=DEFAULT_BRAND_NAME, is_active=True)
                session.add(brand)
                await session.flush()
                logger.info("Created brand: '%s' (ID: %s)", brand.brand_name, brand.brand_id)
            else:
                brand.is_active = True
                logger.info("Existing brand verified: '%s' (ID: %s)", brand.brand_name, brand.brand_id)

            # 2. Seed Vehicle Models
            for m in STANDARD_VEHICLE_MODELS:
                material_num = f"MAT-{m['code']}"
                vm_stmt = select(VehicleModel).where(
                    (VehicleModel.material_number == material_num) | (VehicleModel.model_name == m["name"])
                )
                vm = (await session.execute(vm_stmt)).scalar_one_or_none()
                if not vm:
                    vm = VehicleModel(
                        brand_id=brand.brand_id,
                        model_name=m["name"],
                        material_number=material_num,
                        colour=m["colour"],
                        is_active=True,
                    )
                    session.add(vm)
                    logger.info("Created vehicle model: '%s' [%s]", m["name"], material_num)
                else:
                    vm.is_active = True
                    logger.info("Existing vehicle model verified: '%s' [%s]", m["name"], material_num)

            # 3. Seed Payment Modes
            for pm in STANDARD_PAYMENT_MODES:
                pm_stmt = select(PaymentMode).where(PaymentMode.mode_name == pm["name"])
                mode = (await session.execute(pm_stmt)).scalar_one_or_none()
                if not mode:
                    mode = PaymentMode(
                        mode_name=pm["name"],
                        description=pm["description"],
                        is_active=True,
                    )
                    session.add(mode)
                    logger.info("Created payment mode: '%s'", pm["name"])
                else:
                    mode.is_active = True
                    logger.info("Existing payment mode verified: '%s'", pm["name"])

            # 4. Seed Expense Categories
            for ec in STANDARD_EXPENSE_CATEGORIES:
                ec_stmt = select(ExpenseCategory).where(ExpenseCategory.category_name == ec["name"])
                cat = (await session.execute(ec_stmt)).scalar_one_or_none()
                if not cat:
                    cat = ExpenseCategory(
                        category_name=ec["name"],
                        description=ec["description"],
                        is_active=True,
                    )
                    session.add(cat)
                    logger.info("Created expense category: '%s'", ec["name"])
                else:
                    cat.is_active = True
                    logger.info("Existing expense category verified: '%s'", ec["name"])

            # 5. Seed Job Card Categories
            for jc in STANDARD_JOB_CARD_CATEGORIES:
                jc_stmt = select(JobCardCategory).where(JobCardCategory.category_name == jc["name"])
                jcat = (await session.execute(jc_stmt)).scalar_one_or_none()
                if not jcat:
                    jcat = JobCardCategory(
                        category_name=jc["name"],
                        description=jc["description"],
                        is_active=True,
                    )
                    session.add(jcat)
                    logger.info("Created job card category: '%s'", jc["name"])
                else:
                    jcat.is_active = True
                    logger.info("Existing job card category verified: '%s'", jc["name"])

    logger.info("Master data seeding completed successfully.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed Master Catalog and Setup Data")
    args = parser.parse_args()

    try:
        asyncio.run(seed_master_data())
    except Exception as exc:
        logger.error("Master data seeding failed: %s", exc, exc_info=True)
        sys.exit(1)
