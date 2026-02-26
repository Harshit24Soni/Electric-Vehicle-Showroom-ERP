"""Add chassis_no to test_ride

Revision ID: e93e104f7d30
Revises: 6ba373ec961c
Create Date: 2026-02-25 22:58:23.186983

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e93e104f7d30'
down_revision: Union[str, Sequence[str], None] = '6ba373ec961c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add the chassis_no column
    op.add_column('test_ride', 
        sa.Column('chassis_no', sa.String(length=50), nullable=False), 
        schema='crm'
    )
    
    # 2. Add the foreign key mapping it to the Master vehicle table
    op.create_foreign_key(
        'fk_test_ride_chassis_no_vehicle', 
        'test_ride', 'vehicle', 
        ['chassis_no'], ['chassis_no'], 
        source_schema='crm', referent_schema='master'
    )


def downgrade() -> None:
    # 1. Drop the foreign key
    op.drop_constraint('fk_test_ride_chassis_no_vehicle', 'test_ride', schema='crm', type_='foreignkey')
    
    # 2. Drop the column
    op.drop_column('test_ride', 'chassis_no', schema='crm')