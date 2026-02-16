"""audit columns and indexes

Revision ID: d4e5f6g7h8i9
Revises: c3d4e5f6g7h8
Create Date: 2026-02-16
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = 'd4e5f6g7h8i9'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6g7h8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

tables = [
    'brand', 'staff', 'vehicle_model', 'vehicle', 'vendor', 'customer', 'nominee', 
    'payment_mode', 'expense_category', 'job_card_category', 
    'insurance_company', 'bank', 'document_type'
]

def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)

    for table in tables:
        # Get existing columns and indexes
        columns = [c['name'] for c in inspector.get_columns(table, schema='master')]
        indexes = [i['name'] for i in inspector.get_indexes(table, schema='master')]
        
        # 1. updated_at
        if 'updated_at' not in columns:
            op.add_column(table, sa.Column('updated_at', sa.TIMESTAMP(), nullable=True), schema='master')
            
        # 2. created_by
        if 'created_by' not in columns:
             op.add_column(table, sa.Column('created_by', sa.BigInteger(), nullable=True), schema='master')
             op.create_foreign_key(f'fk_{table}_created_by', table, 'staff', ['created_by'], ['staff_id'], source_schema='master', referent_schema='master')
        
        # Index for created_by
        if f'idx_{table}_created_by' not in indexes:
             # Check if column exists now (it might have been added above or existed)
             # To be safe, we just try creating index if column is known to be there or added
             op.create_index(f'idx_{table}_created_by', table, ['created_by'], schema='master')

        # 3. updated_by
        if 'updated_by' not in columns:
             op.add_column(table, sa.Column('updated_by', sa.BigInteger(), nullable=True), schema='master')
             op.create_foreign_key(f'fk_{table}_updated_by', table, 'staff', ['updated_by'], ['staff_id'], source_schema='master', referent_schema='master')

        # Index for updated_by
        if f'idx_{table}_updated_by' not in indexes:
             op.create_index(f'idx_{table}_updated_by', table, ['updated_by'], schema='master')

def downgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    
    # Tables that definitely received new columns in this migration
    new_column_tables = ['brand', 'vehicle_model', 'vehicle', 'vendor', 'customer', 'nominee']
    # Staff already had some, so treat carefully or include? Staff missing updated_at, created_by, updated_by. yes.
    new_column_tables.append('staff')
    
    # Drop indexes from ALL tables (since we added them to all if missing)
    for table in tables:
         try:
            op.drop_index(f'idx_{table}_created_by', table, schema='master')
         except: pass
         try:
            op.drop_index(f'idx_{table}_updated_by', table, schema='master')
         except: pass

    # Drop columns/constraints ONLY from tables where we added them
    for table in new_column_tables:
        columns = [c['name'] for c in inspector.get_columns(table, schema='master')]
        
        if 'updated_by' in columns:
             try:
                op.drop_constraint(f'fk_{table}_updated_by', table, schema='master', type_='foreignkey')
             except: pass
             op.drop_column(table, 'updated_by', schema='master')

        if 'created_by' in columns:
             try:
                op.drop_constraint(f'fk_{table}_created_by', table, schema='master', type_='foreignkey')
             except: pass
             op.drop_column(table, 'created_by', schema='master')

        if 'updated_at' in columns:
            op.drop_column(table, 'updated_at', schema='master')

