import asyncio
import os
import sys
from datetime import date, datetime, timezone

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.domains.master.models import Customer, Vehicle, Brand, VehicleModel
from app.domains.service.models import ServiceJobCard
from app.modules.inventory.models import (
    SpareMaster, SparePartCode, SpareBatch, SpareSerial, 
    SpareStockBalance, SpareSellingPriceHistory
)

async def seed_e2e() -> None:
    print("\n=== Seeding deterministic E2E data ===")
    async with AsyncSessionLocal() as db:
        # 1. Customer
        result = await db.execute(select(Customer).where(Customer.primary_phone == "9999999999"))
        cust = result.scalars().first()
        if not cust:
            cust = Customer(
                name="Playwright Test Customer",
                primary_phone="9999999999",
                email="playwright@erp.com",
                is_active=True
            )
            db.add(cust)
            await db.flush()

        # 2. Brand and VehicleModel
        brand_result = await db.execute(select(Brand).where(Brand.brand_name == "Playwright Motors"))
        brand = brand_result.scalars().first()
        if not brand:
            brand = Brand(brand_name="Playwright Motors")
            db.add(brand)
            await db.flush()

        model_result = await db.execute(select(VehicleModel).where(VehicleModel.material_number == "MAT-PLW-01"))
        vmodel = model_result.scalars().first()
        if not vmodel:
            vmodel = VehicleModel(
                brand_id=brand.brand_id,
                model_name="Playwright Pro",
                material_number="MAT-PLW-01",
                colour="Black",
            )
            db.add(vmodel)
            await db.flush()

        # 3. Vehicle
        veh_result = await db.execute(select(Vehicle).where(Vehicle.chassis_no == "PLAYWRIGHT-EV-001"))
        veh = veh_result.scalars().first()
        if not veh:
            veh = Vehicle(
                chassis_no="PLAYWRIGHT-EV-001",
                vehicle_model_id=vmodel.vehicle_model_id,
                battery_serial_no="BAT-E2E-001",
                motor_serial_no="MOT-E2E-001",
                current_status="SOLD"
            )
            db.add(veh)
            await db.flush()

        # 4. Job Card
        jc = ServiceJobCard(
            chassis_no=veh.chassis_no,
            is_free_service=False,
            remarks="E2E Open Service Job Card"
        )
        db.add(jc)
        await db.flush()

        # 4. Spare Parts
        # Simple tracking
        sp1_res = await db.execute(select(SpareMaster).where(SpareMaster.spare_name == "Playwright Brake Pad"))
        spare1 = sp1_res.scalars().first()
        if not spare1:
            spare1 = SpareMaster(
                spare_name="Playwright Brake Pad",
                category="Consumables",
                tracking_mode="QUANTITY",
                status="ACTIVE",
                is_temporary=False,
                is_verified=True
            )
            db.add(spare1)
            await db.flush()

        # Batch tracking
        sp2_res = await db.execute(select(SpareMaster).where(SpareMaster.spare_name == "Playwright Coolant"))
        spare2 = sp2_res.scalars().first()
        if not spare2:
            spare2 = SpareMaster(
                spare_name="Playwright Coolant",
                tracking_mode="BATCH",
                category="Consumables",
                status="ACTIVE"
            )
            db.add(spare2)
            await db.flush()

        # Serial tracking
        sp3_res = await db.execute(select(SpareMaster).where(SpareMaster.spare_name == "Playwright Motor Controller"))
        spare3 = sp3_res.scalars().first()
        if not spare3:
            spare3 = SpareMaster(
                spare_name="Playwright Motor Controller",
                tracking_mode="SERIALIZED",
                category="Electronics",
                status="ACTIVE"
            )
            db.add(spare3)
            await db.flush()

        # Codes
        for sp, code_val in [(spare1, "SPARE-E2E-001"), (spare2, "SPARE-E2E-002"), (spare3, "SPARE-E2E-003")]:
            c_res = await db.execute(select(SparePartCode).where(SparePartCode.code == code_val))
            c = c_res.scalars().first()
            if not c:
                db.add(SparePartCode(spare_id=sp.spare_id, code=code_val))
        await db.flush()

        # Selling Prices
        for sp, price in [(spare1, 150.00), (spare2, 250.00), (spare3, 5500.00)]:
            p_res = await db.execute(select(SpareSellingPriceHistory).where(SpareSellingPriceHistory.spare_id == sp.spare_id))
            p = p_res.scalars().first()
            if not p:
                db.add(SpareSellingPriceHistory(spare_id=sp.spare_id, selling_price=price))
        await db.flush()

        from app.modules.inventory.models import SpareStockMovement

        # 5. Inventory Setup
        loc_name = "MAIN"

        for sp, qty in [(spare1, 50), (spare2, 20), (spare3, 5)]:
            s_res = await db.execute(select(SpareStockBalance).where(SpareStockBalance.spare_id == sp.spare_id))
            s = s_res.scalars().first()
            if not s:
                db.add(SpareStockBalance(spare_id=sp.spare_id, location=loc_name, quantity=qty))
                db.add(SpareStockMovement(
                    spare_id=sp.spare_id,
                    quantity=qty,
                    movement_type="PURCHASE",
                    to_location=loc_name,
                    movement_datetime=datetime.now(timezone.utc).replace(tzinfo=None),
                    remarks="Seeded initial stock"
                ))
        await db.flush()

        # Batch specific
        b_res = await db.execute(select(SpareBatch).where(SpareBatch.batch_number == "BATCH-E2E-1"))
        b = b_res.scalars().first()
        if not b:
            batch1 = SpareBatch(
                spare_id=spare2.spare_id,
                batch_number="BATCH-E2E-1",
                quantity=20,
                received_date=datetime.now(timezone.utc).replace(tzinfo=None),
                expiry_date=datetime(2030, 12, 31),
                location=loc_name,
                unit_cost=100.0
            )
            db.add(batch1)
        
        # Serial specific
        for i in range(1, 6):
            s_no = f"SN-E2E-{i}"
            sr_res = await db.execute(select(SpareSerial).where(SpareSerial.serial_no == s_no))
            sr = sr_res.scalars().first()
            if not sr:
                db.add(SpareSerial(
                    spare_id=spare3.spare_id,
                    serial_no=s_no,
                    status="AVAILABLE",
                    location=loc_name,
                    unit_cost=4000.0
                ))

        await db.flush()

        from app.modules.inventory.models import InventoryTag
        
        # 6. Inventory Tags Setup
        # Active tag
        tag1_res = await db.execute(select(InventoryTag).where(InventoryTag.tag_identifier == "TAG-ACTIVE-E2E-1"))
        tag1 = tag1_res.scalars().first()
        if not tag1:
            db.add(InventoryTag(
                tag_identifier="TAG-ACTIVE-E2E-1",
                spare_id=spare1.spare_id,
                tracking_mode="QUANTITY",
                status="ACTIVE"
            ))

        # Revoked tag
        tag2_res = await db.execute(select(InventoryTag).where(InventoryTag.tag_identifier == "TAG-REVOKED-E2E-1"))
        tag2 = tag2_res.scalars().first()
        if not tag2:
            db.add(InventoryTag(
                tag_identifier="TAG-REVOKED-E2E-1",
                spare_id=spare2.spare_id,
                tracking_mode="BATCH",
                status="REVOKED"
            ))

        # Retired tag
        tag3_res = await db.execute(select(InventoryTag).where(InventoryTag.tag_identifier == "TAG-RETIRED-E2E-1"))
        tag3 = tag3_res.scalars().first()
        if not tag3:
            db.add(InventoryTag(
                tag_identifier="TAG-RETIRED-E2E-1",
                spare_id=spare3.spare_id,
                tracking_mode="SERIALIZED",
                status="RETIRED"
            ))

        await db.commit()
        print("E2E seed finished.")

if __name__ == "__main__":
    try:
        asyncio.run(seed_e2e())
    except Exception as exc:
        print(f"\nE2E Seed failed: {exc}")
        sys.exit(1)
