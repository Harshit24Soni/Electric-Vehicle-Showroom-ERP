import argparse
import asyncio
import os
import sys

# Add project root to sys.path so we can import app
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

from sqlalchemy import select

from app.auth.pin_utils import hash_pin
from app.db.session import AsyncSessionLocal
from app.domains.master.models import Staff

LOGIN_USERS = [
    {
        "full_name": "System Admin",
        "mobile_no": "9000000001",
        "email": "admin@erp.com",
        "designation": "ADMIN",
        "pin": "123456",
        "dealer_id": None,
    },
    {
        "full_name": "Dealer User",
        "mobile_no": "9000000002",
        "email": "dealer@erp.com",
        "designation": "DEALER",
        "pin": "123456",
        "dealer_id": None,
    },
    {
        "full_name": "Sales Executive",
        "mobile_no": "9000000003",
        "email": "staff@erp.com",
        "designation": "STAFF",
        "pin": "123456",
        "dealer_id": None,
    },
]


async def upsert_staff_user(user: dict) -> Staff:
    async with AsyncSessionLocal() as db:
        stmt = select(Staff).where(
            (Staff.email == user["email"]) | (Staff.mobile_no == user["mobile_no"])
        )
        result = await db.execute(stmt)
        staff = result.scalars().first()

        if staff is None:
            staff = Staff(
                full_name=user["full_name"],
                mobile_no=user["mobile_no"],
                email=user["email"],
                designation=user["designation"],
                pin_hash=hash_pin(user["pin"]),
                dealer_id=user["dealer_id"],
                is_active=True,
                is_pin_reset_required=False,
                failed_attempts=0,
                locked_until=None,
            )
            db.add(staff)
            await db.commit()
            await db.refresh(staff)
            return staff

        staff.full_name = user["full_name"]
        staff.mobile_no = user["mobile_no"]
        staff.email = user["email"]
        staff.designation = user["designation"]
        staff.pin_hash = hash_pin(user["pin"])
        staff.dealer_id = user["dealer_id"]
        staff.is_active = True
        staff.is_pin_reset_required = False
        staff.failed_attempts = 0
        staff.locked_until = None
        await db.commit()
        await db.refresh(staff)
        return staff


async def seed_login_users() -> None:
    print("\n=== Seeding login-ready staff users ===")
    for user in LOGIN_USERS:
        staff = await upsert_staff_user(user)
        print(
            f"{staff.designation:<8} | email={staff.email:<18} | phone={staff.mobile_no} | pin={user['pin']}"
        )

    print("\nLogin API: POST http://localhost:8000/auth/login-pin")
    print("Example payload:")
    print('{"identifier": "admin@erp.com", "pin": "123456"}')
    print("\nValid roles: ADMIN, DEALER, STAFF")

async def seed_all(mode: str) -> None:
    import random
    from faker import Faker
    
    # Deterministic seeding
    random.seed(42)
    Faker.seed(42)
    
    await seed_login_users()
    
    print(f"\n=== Running {mode} seed mode ===")
    
    if mode == "minimal":
        print("Minimal seed finished.")
    elif mode == "standard":
        print("Standard seed generation...")
        print("Standard seed finished.")
    elif mode == "large":
        print("Large seed generation...")
        print("Large seed finished.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed Database")
    parser.add_argument("--mode", type=str, default="minimal", choices=["minimal", "standard", "large"], help="Seed dataset size")
    args = parser.parse_args()

    try:
        asyncio.run(seed_all(args.mode))
    except Exception as exc:
        print(f"\nSeed failed: {exc}")
        sys.exit(1)
