import asyncio
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import text
from app.db.session import engine

async def update_crm_schema():
    print("Starting CRM schema update...")
    
    tables = ["lead", "enquiry"]
    schema = "crm"
    
    async with engine.begin() as conn:
        for table in tables:
            print(f"Checking {schema}.{table} for created_by_staff_id column...")
            try:
                await conn.execute(text(f"""
                    DO $$ 
                    BEGIN 
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                       WHERE table_schema='{schema}' AND table_name='{table}' AND column_name='created_by_staff_id') THEN 
                            ALTER TABLE {schema}.{table} ADD COLUMN created_by_staff_id BIGINT;
                            
                            -- Set default for existing rows (assuming 1 is Admin/System)
                            UPDATE {schema}.{table} SET created_by_staff_id = owner_staff_id WHERE created_by_staff_id IS NULL;
                            
                            -- Make it not null after update
                            ALTER TABLE {schema}.{table} ALTER COLUMN created_by_staff_id SET NOT NULL;
                            
                            -- Add foreign key
                            ALTER TABLE {schema}.{table} ADD CONSTRAINT fk_{table}_created_by 
                                FOREIGN KEY (created_by_staff_id) REFERENCES master.staff(staff_id);
                                
                            RAISE NOTICE 'Added created_by_staff_id to {schema}.{table}';
                        END IF; 
                    END $$;
                """))
                print(f"Verified created_by_staff_id for {schema}.{table}")
            except Exception as e:
                print(f"Error updating {schema}.{table}: {e}")

    print("CRM schema update complete.")

if __name__ == "__main__":
    asyncio.run(update_crm_schema())
