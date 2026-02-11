
import asyncio
import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.db.session import engine
from sqlalchemy import text

async def update_schema():
    async with engine.begin() as conn:
        print("Adding compliance detail columns to sales.delivery_checklist...")
        
        # Add columns if they don't exist
        columns = [
            "insurance_details TEXT",
            "subsidy_details TEXT",
            "rto_details TEXT",
            "celex_details TEXT"
        ]
        
        for col_def in columns:
            col_name = col_def.split()[0]
            try:
                await conn.execute(text(f"ALTER TABLE sales.delivery_checklist ADD COLUMN {col_def}"))
                print(f"Added column {col_name}")
            except Exception as e:
                # Catch duplicate column error
                if "duplicate" in str(e).lower() or "exists" in str(e).lower():
                    print(f"Column {col_name} already exists.")
                else:
                    print(f"Error adding {col_name}: {e}")

        print("Schema update completed successfully.")

if __name__ == "__main__":
    asyncio.run(update_schema())
