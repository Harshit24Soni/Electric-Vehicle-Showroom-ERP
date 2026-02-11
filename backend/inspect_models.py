
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.db.base import Base

# Import all models to ensure they are registered
# We can try to import main to trigger imports
try:
    from app.main import app
except Exception as e:
    print(f"Error importing app: {e}")

print("Inspecting SQLAlchemy mappers...")
try:
    for mapper in Base.registry.mappers:
        cls = mapper.class_
        print(f"Class: {cls.__name__}, Table: {mapper.local_table.name if mapper.local_table is not None else 'None'}")
        import inspect
        try:
            print(f"  File: {inspect.getfile(cls)}")
        except:
            print("  File: unknown")
except Exception as e:
    print(f"Error iterating mappers: {e}")
