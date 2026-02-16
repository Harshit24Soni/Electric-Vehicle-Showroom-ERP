
import asyncio
from sqlalchemy import text
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.db.session import engine

async def inspect():
    tables = [
        'payment_mode', 
        'expense_category', 
        'job_card_category', 
        'insurance_company', 
        'bank', 
        'document_type'
    ]
    async with engine.begin() as conn:
        for t in tables:
            result = await conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{t}' AND table_schema = 'master'"))
            columns = [row['column_name'] for row in result.mappings()]
            print(f"{t}: {columns}")

if __name__ == "__main__":
    asyncio.run(inspect())
