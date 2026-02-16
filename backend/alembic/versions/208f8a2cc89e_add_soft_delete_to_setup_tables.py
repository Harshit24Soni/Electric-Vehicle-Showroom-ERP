"""add_soft_delete_to_setup_tables

Revision ID: 208f8a2cc89e
Revises: f6b943995328
Create Date: 2026-02-17 00:52:16.366372

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '208f8a2cc89e'
down_revision: Union[str, Sequence[str], None] = 'f6b943995328'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    tables = [
        'payment_mode', 
        'expense_category', 
        'job_card_category', 
        'insurance_company', 
        'bank', 
        'document_type'
    ]
    for t in tables:
        op.add_column(t, sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False), schema='master')
        op.add_column(t, sa.Column('deleted_at', sa.DateTime(), nullable=True), schema='master')
        op.add_column(t, sa.Column('deleted_by', sa.BigInteger(), nullable=True), schema='master')
        op.create_foreign_key(f'fk_{t}_deleted_by', t, 'staff', ['deleted_by'], ['staff_id'], source_schema='master', referent_schema='master')



def downgrade() -> None:
    """Downgrade schema."""
    pass
