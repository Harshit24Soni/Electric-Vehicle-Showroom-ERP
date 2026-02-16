import asyncio
import httpx
import random
import string
import os
import sys
from sqlalchemy import text

# Ensure backend is in path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.main import app
from app.auth.dependencies import get_current_staff
from app.db.session import engine

async def get_valid_admin_id():
    try:
        async with engine.begin() as conn:
            # Search for Admin or Dealer
            result = await conn.execute(text("SELECT staff_id FROM master.staff WHERE designation IN ('ADMIN', 'DEALER') AND is_active = true LIMIT 1"))
            row = result.mappings().first()
            return row['staff_id'] if row else None
    except Exception as e:
        print(f"Error fetching admin ID: {e}")
        return None

async def run_regression():
    print("Initializing...")
    admin_id = await get_valid_admin_id()
    if not admin_id:
        print("[CRITICAL] No active Admin/Dealer found in database.")
        print("   Cannot mock authentication. Please seed the database first.")
        return

    print(f"[OK] Using Staff ID {admin_id} for Admin emulation.")

    # Mock Admin User
    ADMIN_USER = {
        "staff_id": admin_id,
        "designation": "ADMIN",
        "is_active": True,
        "dealer_id": None,
    }
    
    # Override Auth Dependency
    app.dependency_overrides[get_current_staff] = lambda: ADMIN_USER
    
    # Generate random suffix
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    
    print(f"Starting Regression Test (Suffix: {suffix})...")
    
    # Init Client
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        
        # ==================== SETUP MODULE ====================
        print("\n[1/5] Testing Setup Module (Brand)...")
        brand_name = f"RegBrand_{suffix}"
        resp = await client.post("/setup/brands", json={"brand_name": brand_name})
        if resp.status_code in (200, 201):
            print(f"  [OK] Brand Created: {resp.json()['brand_name']}")
            brand_id = resp.json()['brand_id']
            
            # Update Brand
            resp = await client.put(f"/setup/brands/{brand_id}", json={"brand_name": f"{brand_name}_Upd"})
            if resp.status_code == 200:
                print(f"  [OK] Brand Updated: {resp.json()['brand_name']}")
            else:
                print(f"  [FAIL] Brand Update Failed: {resp.text}")
                
            # Delete Brand - MOVED TO END
            # resp = await client.delete(f"/setup/brands/{brand_id}")
            # if resp.status_code == 200: 
            #      print("  [OK] Brand Deleted")
            # else:
            #      print(f"  [FAIL] Brand Delete Failed: {resp.text}")
        else:
            print(f"  [FAIL] Brand Creation Failed: {resp.text}")

        # ==================== MASTER MODULE (Vehicle) ====================
        print("\n[2/5] Testing Master Module (Vehicle Hierarchy)...")
        
        # Create Vehicle Model
        model_name = f"RegModel_{suffix}"
        vm_payload = {
            "brand_id": brand_id,
            "model_name": model_name,
            "material_number": f"MAT-{suffix}",
            "colour": "Red",
            "battery_type": "Li-Ion"
        }
        resp = await client.post("/master/vehicle-models", json=vm_payload)
        vm_id = None
        if resp.status_code == 201:
            print(f"  [OK] Vehicle Model Created: {resp.json()['model_name']}")
            vm_id = resp.json()['vehicle_model_id']
        else:
            print(f"  [FAIL] VM Creation Failed: {resp.text}")

        # Create Vehicle
        if vm_id:
            chassis = f"REG-CH-{suffix}"
            v_payload = {
                "chassis_no": chassis,
                "vehicle_model_id": vm_id,
                "date_of_manufacture": "2026-01-01"
            }
            resp = await client.post("/master/vehicles", json=v_payload)
            if resp.status_code == 201:
                print(f"  [OK] Vehicle Created: {resp.json()['chassis_no']}")
                
                # Verify Get
                resp = await client.get(f"/master/vehicles/{chassis}")
                if resp.status_code == 200:
                    print(f"  [OK] Vehicle Retrieval Verified")
            else:
                print(f"  [FAIL] Vehicle Creation Failed: {resp.text}")

        # ==================== MASTER MODULE (Customer) ====================
        print("\n[3/5] Testing Master Module (Customer)...")
        cust_payload = {
            "name": f"Reg Customer {suffix}",
            "primary_phone": "".join(random.choices(string.digits, k=10)),
            "customer_type": "INDIVIDUAL",
            "address_line1": "Test Address"
        }
        resp = await client.post("/master/customers", json=cust_payload)
        cust_id = None
        if resp.status_code == 201:
            print(f"  [OK] Customer Created: {resp.json()['name']}")
            cust_id = resp.json()['customer_id']
            
            # Create Nominee
            nom_payload = {
                "nominee_name": "Nominee 1",
                "nominee_dob": "2000-01-01",
                "relation": "Spouse",
                "is_primary": True
            }
            resp = await client.post(f"/master/customers/{cust_id}/nominees", json=nom_payload)
            if resp.status_code == 201:
                print(f"  [OK] Nominee Created")
            else:
                 print(f"  [FAIL] Nominee Creation Failed: {resp.text}")
        else:
            print(f"  [FAIL] Customer Creation Failed: {resp.text}")

        # ==================== ADMIN (Staff) ====================
        print("\n[4/5] Testing Admin Module (Staff Lifecycle)...")
        staff_phone = "".join(random.choices(string.digits, k=10))
        staff_payload = {
            "full_name": f"Reg Staff {suffix}",
            "mobile_no": staff_phone,
            "email": f"staff{suffix}@test.com",
            "designation": "STAFF",
            "joined_date": "2026-02-01",
            "aadhaar_no": "".join(random.choices(string.digits, k=12))
        }
        resp = await client.post("/admin/staff", json=staff_payload)
        if resp.status_code == 201:
            data = resp.json()
            new_staff_id = data['staff_id']
            print(f"  [OK] Staff Created: {data['full_name']} (ID: {new_staff_id})")
            
            # Soft Delete
            resp = await client.delete(f"/admin/staff/{new_staff_id}")
            if resp.status_code == 204:
                print("  [OK] Staff Soft Deleted")
                
                # List and verify not included by default
                resp = await client.get("/admin/staff")
                ids = [s['staff_id'] for s in resp.json()]
                if new_staff_id not in ids:
                    print("  [OK] Verified: Deleted staff hidden from list")
                else:
                    print("  [FAIL] Failed: Deleted staff still visible in list")
                    
                # Restore
                resp = await client.post(f"/admin/staff/{new_staff_id}/restore")
                if resp.status_code == 200:
                    print("  [OK] Staff Restored")
                else:
                    print(f"  [FAIL] Restore Failed: {resp.text}")
            else:
                print(f"  [FAIL] Delete Failed: {resp.text}")
        else:
            print(f"  [FAIL] Staff Creation Failed: {resp.text}")

        print("\n[5/5] Regression Complete. Cleaning up...")
        if brand_id:
             resp = await client.delete(f"/setup/brands/{brand_id}")
             if resp.status_code == 200:
                 print("  [OK] Cleanup: Brand Deleted")
             else:
                 print(f"  [WARN] Cleanup Failed: {resp.text}")

if __name__ == "__main__":
    try:
        asyncio.run(run_regression())
    except ImportError:
        print("httpx not found or other import error.")
        import traceback
        traceback.print_exc()
