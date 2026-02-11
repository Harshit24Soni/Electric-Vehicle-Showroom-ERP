"""
Inspect all registered SQLAlchemy models.
Run with: python -m app.scripts.inspect_models
"""
import inspect

from app.db.base import Base
from app.bootstrap import init_models


def main():
    init_models()

    print("Inspecting SQLAlchemy mappers...")
    try:
        for mapper in Base.registry.mappers:
            cls = mapper.class_
            table_name = mapper.local_table.name if mapper.local_table is not None else "None"
            print(f"Class: {cls.__name__}, Table: {table_name}")
            try:
                print(f"  File: {inspect.getfile(cls)}")
            except Exception:
                print("  File: unknown")
    except Exception as e:
        print(f"Error iterating mappers: {e}")


if __name__ == "__main__":
    main()
