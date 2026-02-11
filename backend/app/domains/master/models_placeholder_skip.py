from datetime import date, datetime
from typing import Optional, List
from sqlalchemy import BigInteger, String, Date, Text, Boolean, Integer, Numeric, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

# ... Existing Customer, Nominee, etc. ...
# We need to append the new history models or create a partial file updates. 
# Since I cannot see the whole file to replace, I will read it first or append if I can.
# Wait, I viewed the file earlier (master/models.py was viewed partially or fully?).
# Step 44 viewed master/models.py 1-142.
# I'll rely on append or creating a new file `app/domains/master/models_history.py` and importing it in `__init__.py` or `models.py`.
# But SQLAlchemy needs them in the same Base registry.
# Best practice is to edit `app/domains/master/models.py`.
# I should view it fully first to make sure I don't break it.

# I will skip this write for now and view the file first.
