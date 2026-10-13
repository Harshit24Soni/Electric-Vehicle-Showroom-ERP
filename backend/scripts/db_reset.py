import os
import sys
import argparse
import asyncio
import subprocess

# Add project root to sys.path so we can import app
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

# Parse args before loading settings
parser = argparse.ArgumentParser(description="Reset Database")
parser.add_argument("--env", type=str, required=True, choices=["development", "test"], help="Environment to reset")
args = parser.parse_args()

if args.env == "test":
    os.environ["ENVIRONMENT"] = "test"
    from pathlib import Path
    from dotenv import load_dotenv
    for candidate in [Path(".env.test"), Path("backend/.env.test")]:
        if candidate.is_file():
            load_dotenv(dotenv_path=candidate, override=True)
            break

# Now import settings
from app.core.config import settings
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def reset_db(env: str):
    if env == "production":
        print("ERROR: Cannot reset production database!")
        exit(1)
        
    db_url = str(settings.DATABASE_URL)
    if "prod" in db_url.lower():
        print("ERROR: Suspicious production URL detected!")
        exit(1)

    print(f"Target Database: {db_url}")
    print("Resetting database schemas...")
    
    # We must drop all tables. We will do this by dropping the public schema and recreating it.
    engine = create_async_engine(db_url, isolation_level="AUTOCOMMIT")
    async with engine.connect() as conn:
        await conn.execute(text("DROP SCHEMA public CASCADE;"))
        await conn.execute(text("CREATE SCHEMA public;"))
        await conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))
    
    await engine.dispose()
    print("Database reset successful.")
    
    print("Running alembic migrations...")
    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], check=True)

if __name__ == "__main__":
    asyncio.run(reset_db(args.env))
