"""add_soft_delete_to_brand

Revision ID: f6b943995328
Revises: 824443986cc0
Create Date: 2026-02-17 00:45:29.622156

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f6b943995328'
down_revision: Union[str, Sequence[str], None] = '824443986cc0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('brand', sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False), schema='master')
    # deleted_at already exists
    op.add_column('brand', sa.Column('deleted_by', sa.BigInteger(), nullable=True), schema='master')
    op.create_foreign_key('fk_brand_deleted_by', 'brand', 'staff', ['deleted_by'], ['staff_id'], source_schema='master', referent_schema='master')



def downgrade() -> None:
    """Downgrade schema."""
    pass
