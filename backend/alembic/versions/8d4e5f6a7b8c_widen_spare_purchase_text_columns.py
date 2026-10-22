"""Widen spare_purchase invoice_document_id and docket_reference to Text

Revision ID: 8d4e5f6a7b8c
Revises: 7c3d4e5f6a7b
Create Date: 2026-10-20 18:50:00.000000

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "8d4e5f6a7b8c"
down_revision: Union[str, Sequence[str], None] = "7c3d4e5f6a7b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "spare_purchase",
        "invoice_document_id",
        type_=sa.Text(),
        existing_type=sa.String(length=100),
        existing_nullable=True,
    )
    op.alter_column(
        "spare_purchase",
        "docket_reference",
        type_=sa.Text(),
        existing_type=sa.String(length=100),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "spare_purchase",
        "invoice_document_id",
        type_=sa.String(length=100),
        existing_type=sa.Text(),
        existing_nullable=True,
    )
    op.alter_column(
        "spare_purchase",
        "docket_reference",
        type_=sa.String(length=100),
        existing_type=sa.Text(),
        existing_nullable=True,
    )
