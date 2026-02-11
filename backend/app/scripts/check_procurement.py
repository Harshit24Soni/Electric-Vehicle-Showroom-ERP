"""
Check procurement model registration.
Run with: python -m app.scripts.check_procurement
"""
from app.bootstrap import init_models


def main():
    try:
        from app.domains.procurement import models
        print("Successfully imported app.domains.procurement.models")
        print("Attributes:")
        for attr in dir(models):
            if not attr.startswith("_"):
                print(f"  {attr}")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()
