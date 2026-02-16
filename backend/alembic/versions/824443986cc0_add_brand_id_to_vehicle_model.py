"""add_brand_id_to_vehicle_model

Revision ID: 824443986cc0
Revises: d4e5f6g7h8i9
Create Date: 2026-02-17 00:28:53.610512

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '824443986cc0'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6g7h8i9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('vehicle_model', sa.Column('brand_id', sa.BigInteger(), nullable=True), schema='master')
    op.create_foreign_key('fk_vehicle_model_brand', 'vehicle_model', 'brand', ['brand_id'], ['brand_id'], source_schema='master', referent_schema='master')



def downgrade() -> None:
    """Downgrade schema."""
    pass
