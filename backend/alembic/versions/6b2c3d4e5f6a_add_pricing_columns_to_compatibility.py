"""Add pricing columns to module_spare_part_vehicle_compatibility

Revision ID: 6b2c3d4e5f6a
Revises: 5a1b2c3d4e5f
Create Date: 2026-10-15 22:06:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '6b2c3d4e5f6a'
down_revision: Union[str, Sequence[str], None] = '5a1b2c3d4e5f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE module_spare_part_vehicle_compatibility
        ADD COLUMN IF NOT EXISTS ex_factory_price NUMERIC(12, 2),
        ADD COLUMN IF NOT EXISTS dlp NUMERIC(12, 2),
        ADD COLUMN IF NOT EXISTS ex_showroom_price NUMERIC(12, 2),
        ADD COLUMN IF NOT EXISTS customer_mrp NUMERIC(12, 2),
        ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5, 2) DEFAULT 18.0,
        ADD COLUMN IF NOT EXISTS profit_margin_percent NUMERIC(6, 2),
        ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE module_spare_part_vehicle_compatibility
        DROP COLUMN IF EXISTS ex_factory_price,
        DROP COLUMN IF EXISTS dlp,
        DROP COLUMN IF EXISTS ex_showroom_price,
        DROP COLUMN IF EXISTS customer_mrp,
        DROP COLUMN IF EXISTS gst_rate,
        DROP COLUMN IF EXISTS profit_margin_percent,
        DROP COLUMN IF EXISTS is_primary;
    """)
