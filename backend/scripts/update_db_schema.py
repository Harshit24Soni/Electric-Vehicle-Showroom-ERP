import asyncio
import sys
import os

# Add the parent directory to sys.path to allow imports from app
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import text
from app.db.session import engine

async def update_schema():
    print("Starting schema update...")
    
    # List of tables to add deleted_at to
    tables = [
        ("master", "customer"),
        ("master", "nominee"),
        ("master", "staff"),
        ("master", "brand"),
        ("master", "vehicle_model"),
        ("master", "vehicle"),
        ("master", "vendor"),
        ("crm", "lead"),
        ("crm", "enquiry"),
        ("crm", "followup_schedule"),
        ("crm", "test_ride")
    ]

    async with engine.begin() as conn:
        for schema, table in tables:
            print(f"Checking {schema}.{table} for deleted_at column...")
            try:
                # Add deleted_at column if it doesn't exist
                await conn.execute(text(f"""
                    DO $$ 
                    BEGIN 
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                       WHERE table_schema='{schema}' AND table_name='{table}' AND column_name='deleted_at') THEN 
                            ALTER TABLE {schema}.{table} ADD COLUMN deleted_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL; 
                            RAISE NOTICE 'Added deleted_at to {schema}.{table}';
                        END IF; 
                    END $$;
                """))
                print(f"Verified deleted_at for {schema}.{table}")
            except Exception as e:
                print(f"Error updating {schema}.{table}: {e}")

        # Add totp_secret to master.staff
        print("Checking master.staff for totp_secret column...")
        try:
             await conn.execute(text("""
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                   WHERE table_schema='master' AND table_name='staff' AND column_name='totp_secret') THEN 
                        ALTER TABLE master.staff ADD COLUMN totp_secret VARCHAR(100) DEFAULT NULL; 
                        RAISE NOTICE 'Added totp_secret to master.staff';
                    END IF; 
                END $$;
            """))
             print("Verified totp_secret for master.staff")
        except Exception as e:
            print(f"Error updating master.staff: {e}")

    print("Schema update complete.")

if __name__ == "__main__":
    asyncio.run(update_schema())
