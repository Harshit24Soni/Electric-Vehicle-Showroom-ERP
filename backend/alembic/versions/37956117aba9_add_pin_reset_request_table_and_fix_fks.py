"""Add pin_reset_request table and fix FKs

Revision ID: 37956117aba9
Revises: 
Create Date: 2026-02-12 15:04:12.492198

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '37956117aba9'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('pin_reset_request',
    sa.Column('id', sa.BigInteger(), nullable=False),
    sa.Column('staff_id', sa.BigInteger(), nullable=False),
    sa.Column('request_type', sa.String(length=50), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('requested_at', sa.TIMESTAMP(), nullable=False),
    sa.Column('processed_at', sa.TIMESTAMP(), nullable=True),
    sa.Column('processed_by', sa.BigInteger(), nullable=True),
    sa.ForeignKeyConstraint(['processed_by'], ['master.staff.staff_id'], ),
    sa.ForeignKeyConstraint(['staff_id'], ['master.staff.staff_id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    schema='master'
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('pin_reset_request', schema='master')
