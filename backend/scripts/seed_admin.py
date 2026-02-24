import sys
import os
import asyncio

# Add the backend directory to sys.path so we can import 'app'
# This assumes the script is run from the repository root or backend root
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import AsyncSessionLocal
from app.auth.pin_utils import hash_pin
from app.domains.master.models import Staff
from sqlalchemy.future import select

async def seed_admin():
    print("Connecting to database...")
    async with AsyncSessionLocal() as session:
        # Check if admin already exists by mobile number
        result = await session.execute(select(Staff).filter(Staff.mobile_no == "9999999999"))
        existing_admin = result.scalars().first()
        
        if existing_admin:
            print(f"Admin user with mobile 9999999999 already exists (ID: {existing_admin.staff_id}).")
            return

        print("Creating initial Admin user...")
        admin = Staff(
            full_name="System Admin",
            mobile_no="9999999999",
            email="admin@showroom.com",
            designation="ADMIN",
            is_active=True,
            pin_hash=hash_pin("123456"),
            failed_attempts=0,
            is_pin_reset_required=False
        )
        
        session.add(admin)
        try:
            await session.commit()
            print("Initial Admin user created successfully!")
            print("Login Details:")
            print("  Mobile: 9999999999")
            print("  PIN: 123456")
        except Exception as e:
            await session.rollback()
            print(f"Error seeding admin user: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(seed_admin())
    except KeyboardInterrupt:
        pass
