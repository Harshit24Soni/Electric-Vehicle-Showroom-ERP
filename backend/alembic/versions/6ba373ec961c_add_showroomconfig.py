"""Add ShowroomConfig

Revision ID: 6ba373ec961c
Revises: 1fc31015d7c6
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '6ba373ec961c'
down_revision: Union[str, None] = '1fc31015d7c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table('showroom_config',
        sa.Column('config_id', sa.Integer(), nullable=False),
        sa.Column('dealership_name', sa.String(length=150), nullable=False),
        sa.Column('legal_entity_name', sa.String(length=150), nullable=False),
        sa.Column('gstin', sa.String(length=15), nullable=False),
        sa.Column('registered_address', sa.Text(), nullable=False),
        sa.Column('city', sa.String(length=100), nullable=False),
        sa.Column('state', sa.String(length=100), nullable=False),
        sa.Column('pincode', sa.String(length=10), nullable=False),
        sa.Column('contact_email', sa.String(length=150), nullable=False),
        sa.Column('contact_mobile', sa.String(length=15), nullable=False),
        sa.Column('bank_name', sa.String(length=100), nullable=True),
        sa.Column('bank_account_no', sa.String(length=50), nullable=True),
        sa.Column('bank_ifsc', sa.String(length=20), nullable=True),
        
        # Audit Fields
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        
        sa.ForeignKeyConstraint(['created_by'], ['master.staff.staff_id'], ),
        sa.ForeignKeyConstraint(['updated_by'], ['master.staff.staff_id'], ),
        sa.PrimaryKeyConstraint('config_id'),
        schema='master'
    )

def downgrade() -> None:
    op.drop_table('showroom_config', schema='master')