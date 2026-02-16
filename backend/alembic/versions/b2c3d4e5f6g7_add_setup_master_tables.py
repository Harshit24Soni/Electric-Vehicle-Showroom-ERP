"""Add setup master tables (payment_mode, expense_category, job_card_category, insurance_company, bank, document_type)

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2026-02-16

Adds:
- master.payment_mode
- master.expense_category
- master.job_card_category
- master.insurance_company
- master.bank
- master.document_type
- master.staff soft-delete columns (is_deleted, deleted_by)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6g7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ========================================================================
    # PART 1: PAYMENT MODE TABLE
    # ========================================================================
    op.create_table(
        'payment_mode',
        sa.Column('payment_mode_id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('mode_name', sa.String(100), nullable=False, unique=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('created_by', sa.BigInteger(), sa.ForeignKey('master.staff.staff_id'), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), sa.ForeignKey('master.staff.staff_id'), nullable=True),
        schema='master'
    )

    # ========================================================================
    # PART 2: EXPENSE CATEGORY TABLE
    # ========================================================================
    op.create_table(
        'expense_category',
        sa.Column('expense_category_id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('category_name', sa.String(100), nullable=False, unique=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('created_by', sa.BigInteger(), sa.ForeignKey('master.staff.staff_id'), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), sa.ForeignKey('master.staff.staff_id'), nullable=True),
        schema='master'
    )

    # ========================================================================
    # PART 3: JOB CARD CATEGORY TABLE
    # ========================================================================
    op.create_table(
        'job_card_category',
        sa.Column('job_card_category_id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('category_name', sa.String(100), nullable=False, unique=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('created_by', sa.BigInteger(), sa.ForeignKey('master.staff.staff_id'), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), sa.ForeignKey('master.staff.staff_id'), nullable=True),
        schema='master'
    )

    # ========================================================================
    # PART 4: INSURANCE COMPANY TABLE
    # ========================================================================
    op.create_table(
        'insurance_company',
        sa.Column('insurance_company_id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('company_name', sa.String(255), nullable=False, unique=True),
        sa.Column('contact_person', sa.String(255), nullable=True),
        sa.Column('contact_number', sa.String(20), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('gstin', sa.String(20), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('created_by', sa.BigInteger(), sa.ForeignKey('master.staff.staff_id'), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), sa.ForeignKey('master.staff.staff_id'), nullable=True),
        schema='master'
    )

    # ========================================================================
    # PART 5: BANK TABLE
    # ========================================================================
    op.create_table(
        'bank',
        sa.Column('bank_id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('bank_name', sa.String(255), nullable=False),
        sa.Column('branch', sa.String(255), nullable=True),
        sa.Column('ifsc_code', sa.String(11), nullable=False),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('contact_number', sa.String(20), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('created_by', sa.BigInteger(), sa.ForeignKey('master.staff.staff_id'), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), sa.ForeignKey('master.staff.staff_id'), nullable=True),
        schema='master'
    )

    # ========================================================================
    # PART 6: DOCUMENT TYPE TABLE
    # ========================================================================
    op.create_table(
        'document_type',
        sa.Column('document_type_id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('type_name', sa.String(100), nullable=False, unique=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('applicable_to', sa.String(20), nullable=True),  # customer, vendor, vehicle, sale, all
        sa.Column('is_mandatory', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=True),
        schema='master'
    )

    # ========================================================================
    # PART 7: STAFF SOFT-DELETE COLUMNS (for REQ 3)
    # ========================================================================
    op.add_column('staff', sa.Column('is_deleted', sa.Boolean(),
                  server_default=sa.text('false'), nullable=False), schema='master')
    op.add_column('staff', sa.Column('deleted_by', sa.BigInteger(),
                  nullable=True), schema='master')
    op.create_foreign_key(
        'fk_staff_deleted_by',
        'staff', 'staff',
        ['deleted_by'], ['staff_id'],
        source_schema='master', referent_schema='master'
    )

    # ========================================================================
    # PART 7.1: BRAND TABLE FIXES
    # ========================================================================
    op.add_column('brand', sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False), schema='master')
    op.add_column('brand', sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()), schema='master')

    # ========================================================================
    # PART 8: INDEXES
    # ========================================================================
    op.create_index('idx_payment_mode_active', 'payment_mode', ['is_active'], schema='master')
    op.create_index('idx_expense_category_active', 'expense_category', ['is_active'], schema='master')
    op.create_index('idx_job_card_category_active', 'job_card_category', ['is_active'], schema='master')
    op.create_index('idx_insurance_company_active', 'insurance_company', ['is_active'], schema='master')
    op.create_index('idx_bank_active', 'bank', ['is_active'], schema='master')
    op.create_index('idx_document_type_active', 'document_type', ['is_active'], schema='master')
    op.create_index('idx_staff_is_deleted', 'staff', ['is_deleted'], schema='master')


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_staff_is_deleted', table_name='staff', schema='master')
    op.drop_index('idx_document_type_active', table_name='document_type', schema='master')
    op.drop_index('idx_bank_active', table_name='bank', schema='master')
    op.drop_index('idx_insurance_company_active', table_name='insurance_company', schema='master')
    op.drop_index('idx_job_card_category_active', table_name='job_card_category', schema='master')
    op.drop_index('idx_expense_category_active', table_name='expense_category', schema='master')
    op.drop_index('idx_payment_mode_active', table_name='payment_mode', schema='master')

    # Drop staff soft-delete columns
    op.drop_constraint('fk_staff_deleted_by', 'staff', schema='master', type_='foreignkey')
    op.drop_column('staff', 'deleted_by', schema='master')
    op.drop_column('staff', 'is_deleted', schema='master')

    # Drop brand columns
    op.drop_column('brand', 'created_at', schema='master')
    op.drop_column('brand', 'is_active', schema='master')

    # Drop tables in reverse order
    op.drop_table('document_type', schema='master')
    op.drop_table('bank', schema='master')
    op.drop_table('insurance_company', schema='master')
    op.drop_table('job_card_category', schema='master')
    op.drop_table('expense_category', schema='master')
    op.drop_table('payment_mode', schema='master')
