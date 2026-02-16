"""fix missing columns

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6g7
Create Date: 2026-02-16
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6g7h8'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6g7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    
    # Brand columns
    brand_cols = [c['name'] for c in inspector.get_columns('brand', schema='master')]
    
    if 'is_active' not in brand_cols:
        op.add_column('brand', sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False), schema='master')
        
    if 'created_at' not in brand_cols:
        op.add_column('brand', sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()), schema='master')

    # Staff columns
    staff_cols = [c['name'] for c in inspector.get_columns('staff', schema='master')]
    
    if 'is_deleted' not in staff_cols:
        op.add_column('staff', sa.Column('is_deleted', sa.Boolean(), server_default=sa.text('false'), nullable=False), schema='master')
        
    if 'deleted_by' not in staff_cols:
        op.add_column('staff', sa.Column('deleted_by', sa.BigInteger(), nullable=True), schema='master')
        op.create_foreign_key(
            'fk_staff_deleted_by',
            'staff', 'staff',
            ['deleted_by'], ['staff_id'],
            source_schema='master', referent_schema='master'
        )
        
    # Index
    indexes = [i['name'] for i in inspector.get_indexes('staff', schema='master')]
    if 'idx_staff_is_deleted' not in indexes:
        op.create_index('idx_staff_is_deleted', 'staff', ['is_deleted'], schema='master')


def downgrade() -> None:
    try:
        op.drop_constraint('fk_staff_deleted_by', 'staff', schema='master', type_='foreignkey')
        op.drop_column('staff', 'deleted_by', schema='master')
        op.drop_column('staff', 'is_deleted', schema='master')
        op.drop_column('brand', 'created_at', schema='master')
        op.drop_column('brand', 'is_active', schema='master')
    except Exception:
        pass
