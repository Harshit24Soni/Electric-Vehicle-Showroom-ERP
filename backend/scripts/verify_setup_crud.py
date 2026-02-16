import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.db.session import engine
from sqlalchemy import text
from app.domains.setup import services

async def get_valid_staff_id():
    async with engine.begin() as conn:
        result = await conn.execute(text("SELECT staff_id FROM master.staff LIMIT 1"))
        row = result.mappings().first()
        if row:
            return row['staff_id']
        raise Exception("No staff found in database")

async def test_brand(staff_id):
    print("\nTesting Brand...")
    name = "Test Brand Py"
    # Create
    try:
        brand = await services.create_brand({"brand_name": name}, staff_id)
        print(f"  Created: {brand['brand_id']}")
    except ValueError as e:
        # If exists, finding it to delete and retry
        print(f"  Brand exists, finding and deleting...")
        brands = await services.list_brands()
        existing = next((b for b in brands if b['brand_name'] == name), None)
        if existing:
            await services.delete_brand(existing['brand_id'])
            brand = await services.create_brand({"brand_name": name}, staff_id)
            print(f"  Re-created: {brand['brand_id']}")
    
    id = brand['brand_id']
    
    # Update
    updated = await services.update_brand(id, {"brand_name": name + " Upd"}, staff_id)
    assert updated['brand_name'] == name + " Upd"
    print(f"  Updated: {id}")
    
    # Delete
    await services.delete_brand(id)
    print(f"  Deleted: {id}")
    
    # Verify
    brands = await services.list_brands()
    assert not any(b['brand_id'] == id for b in brands)
    print("  Verified Gone")

async def test_payment_mode(staff_id):
    print("\nTesting Payment Mode...")
    data = {"mode_name": "Test Pay", "description": "Desc"}
    item = await services.create_payment_mode(data, staff_id)
    id = item['payment_mode_id']
    print(f"  Created: {id}")
    
    updated = await services.update_payment_mode(id, {"mode_name": "Test Pay Upd", "is_active": False}, staff_id)
    assert updated['mode_name'] == "Test Pay Upd"
    assert updated['is_active'] is False
    print(f"  Updated: {id}")
    
    await services.delete_payment_mode(id)
    print(f"  Deleted: {id}")

async def test_expense_category(staff_id):
    print("\nTesting Expense Category...")
    data = {"category_name": "Test Exp", "description": "Desc"}
    item = await services.create_expense_category(data, staff_id)
    id = item['expense_category_id']
    print(f"  Created: {id}")
    
    updated = await services.update_expense_category(id, {"category_name": "Test Exp Upd"}, staff_id)
    assert updated['category_name'] == "Test Exp Upd"
    
    await services.delete_expense_category(id)
    print(f"  Deleted: {id}")

async def test_job_card_category(staff_id):
    print("\nTesting Job Card Category...")
    data = {"category_name": "Test Job", "description": "Desc"}
    item = await services.create_job_card_category(data, staff_id)
    id = item['job_card_category_id']
    print(f"  Created: {id}")
    
    updated = await services.update_job_card_category(id, {"category_name": "Test Job Upd"}, staff_id)
    assert updated['category_name'] == "Test Job Upd"
    
    await services.delete_job_card_category(id)
    print(f"  Deleted: {id}")

async def test_insurance_company(staff_id):
    print("\nTesting Insurance Company...")
    data = {
        "company_name": "Test Ins", "contact_person": "Mr Test", 
        "contact_number": "123", "email": "t@t.com", "address": "Addr", "gstin": "GST"
    }
    item = await services.create_insurance_company(data, staff_id)
    id = item['insurance_company_id']
    print(f"  Created: {id}")
    
    updated = await services.update_insurance_company(id, {"company_name": "Test Ins Upd"}, staff_id)
    assert updated['company_name'] == "Test Ins Upd"
    
    await services.delete_insurance_company(id)
    print(f"  Deleted: {id}")

async def test_bank(staff_id):
    print("\nTesting Bank...")
    data = {
        "bank_name": "Test Bank", "branch": "Main", 
        "ifsc_code": "TEST001", "address": "Addr", "contact_number": "123"
    }
    item = await services.create_bank(data, staff_id)
    id = item['bank_id']
    print(f"  Created: {id}")
    
    updated = await services.update_bank(id, {"bank_name": "Test Bank Upd"}, staff_id)
    assert updated['bank_name'] == "Test Bank Upd"
    
    await services.delete_bank(id)
    print(f"  Deleted: {id}")

async def test_document_type(staff_id):
    print("\nTesting Document Type...")
    data = {
        "type_name": "Test Doc", "description": "Desc", 
        "applicable_to": "customer", "is_mandatory": True
    }
    item = await services.create_document_type(data, staff_id)
    id = item['document_type_id']
    print(f"  Created: {id}")
    
    updated = await services.update_document_type(id, {"type_name": "Test Doc Upd", "is_mandatory": False}, staff_id)
    assert updated['type_name'] == "Test Doc Upd"
    assert updated['is_mandatory'] is False
    
    await services.delete_document_type(id)
    print(f"  Deleted: {id}")

async def main():
    try:
        staff_id = await get_valid_staff_id()
        print(f"Using Staff ID: {staff_id}")
        
        await test_brand(staff_id)
        await test_payment_mode(staff_id)
        await test_expense_category(staff_id)
        await test_job_card_category(staff_id)
        await test_insurance_company(staff_id)
        await test_bank(staff_id)
        await test_document_type(staff_id)
        
        print("\nALL CRUD TESTS PASSED")
    except Exception as e:
        print(f"\nFAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
