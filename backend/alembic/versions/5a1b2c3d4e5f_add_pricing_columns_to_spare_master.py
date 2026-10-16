"""Add pricing columns to module_spare_master

Revision ID: 5a1b2c3d4e5f
Revises: 4f9e1a8b2c3d
Create Date: 2026-10-15 22:04:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '5a1b2c3d4e5f'
down_revision: Union[str, Sequence[str], None] = '4f9e1a8b2c3d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE module_spare_master
        ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20),
        ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5, 2) DEFAULT 18.0,
        ADD COLUMN IF NOT EXISTS base_cost NUMERIC(12, 2),
        ADD COLUMN IF NOT EXISTS base_dlp NUMERIC(12, 2),
        ADD COLUMN IF NOT EXISTS base_ex_showroom NUMERIC(12, 2),
        ADD COLUMN IF NOT EXISTS base_mrp NUMERIC(12, 2),
        ADD COLUMN IF NOT EXISTS profit_margin_percent NUMERIC(6, 2);
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_module_spare_master_hsn_code ON module_spare_master (hsn_code);")


def downgrade() -> None:
    op.execute("""
        ALTER TABLE module_spare_master
        DROP COLUMN IF EXISTS hsn_code,
        DROP COLUMN IF EXISTS gst_rate,
        DROP COLUMN IF EXISTS base_cost,
        DROP COLUMN IF EXISTS base_dlp,
        DROP COLUMN IF EXISTS base_ex_showroom,
        DROP COLUMN IF EXISTS base_mrp,
        DROP COLUMN IF EXISTS profit_margin_percent;
    """)
