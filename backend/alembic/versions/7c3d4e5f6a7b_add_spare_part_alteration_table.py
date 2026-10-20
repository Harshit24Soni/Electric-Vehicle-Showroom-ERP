"""Add spare part alteration audit table

Revision ID: 7c3d4e5f6a7b
Revises: 6b2c3d4e5f6a
Create Date: 2026-10-18 17:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7c3d4e5f6a7b'
down_revision: Union[str, Sequence[str], None] = '6b2c3d4e5f6a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'module_spare_part_alteration' not in tables:
        op.create_table(
            'module_spare_part_alteration',
            sa.Column('alteration_id', sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column('spare_id', sa.BigInteger(), nullable=False),
            sa.Column('part_code', sa.String(length=50), nullable=False),
            sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('action_type', sa.String(length=50), nullable=False),
            sa.Column('source_reference', sa.String(length=255), nullable=True),
            sa.Column('altered_by_id', sa.BigInteger(), nullable=True),
            sa.Column('altered_by_name', sa.String(length=100), nullable=True),
            sa.Column('changes', sa.JSON(), nullable=False),
            sa.Column('snapshot_before', sa.JSON(), nullable=False),
            sa.Column('snapshot_after', sa.JSON(), nullable=False),
            sa.Column('is_reverted', sa.Boolean(), server_default=sa.text('false'), nullable=False),
            sa.Column('reverted_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('reverted_by_id', sa.BigInteger(), nullable=True),
            sa.ForeignKeyConstraint(['altered_by_id'], ['staff.staff_id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['reverted_by_id'], ['staff.staff_id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['spare_id'], ['module_spare_master.spare_id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('alteration_id')
        )
    
    existing_indexes = [idx['name'] for idx in inspector.get_indexes('module_spare_part_alteration')] if 'module_spare_part_alteration' in (inspector.get_table_names()) else []
    if 'idx_mod_spare_alt_spare_id' not in existing_indexes:
        op.create_index('idx_mod_spare_alt_spare_id', 'module_spare_part_alteration', ['spare_id'], unique=False)
    if 'idx_mod_spare_alt_part_code' not in existing_indexes:
        op.create_index('idx_mod_spare_alt_part_code', 'module_spare_part_alteration', ['part_code'], unique=False)
    if 'idx_mod_spare_alt_timestamp' not in existing_indexes:
        op.create_index('idx_mod_spare_alt_timestamp', 'module_spare_part_alteration', ['timestamp'], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'module_spare_part_alteration' in inspector.get_table_names():
        existing_indexes = [idx['name'] for idx in inspector.get_indexes('module_spare_part_alteration')]
        if 'idx_mod_spare_alt_timestamp' in existing_indexes:
            op.drop_index('idx_mod_spare_alt_timestamp', table_name='module_spare_part_alteration')
        if 'idx_mod_spare_alt_part_code' in existing_indexes:
            op.drop_index('idx_mod_spare_alt_part_code', table_name='module_spare_part_alteration')
        if 'idx_mod_spare_alt_spare_id' in existing_indexes:
            op.drop_index('idx_mod_spare_alt_spare_id', table_name='module_spare_part_alteration')
        op.drop_table('module_spare_part_alteration')

