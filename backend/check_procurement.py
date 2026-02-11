
import sys
import os

sys.path.append(os.getcwd())

try:
    from app.domains.procurement import models
    print("Successfully imported app.domains.procurement.models")
    print("Attributes:")
    for attr in dir(models):
        print(attr)
except Exception as e:
    print(f"Error: {e}")
