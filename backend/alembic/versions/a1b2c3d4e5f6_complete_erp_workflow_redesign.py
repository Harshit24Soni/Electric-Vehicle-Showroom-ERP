"""complete_erp_workflow_redesign

Revision ID: a1b2c3d4e5f6
Revises: 37956117aba9
Create Date: 2026-02-14

Adds:
- New columns to crm.lead (expected_purchase_days, next_followup_date, lead_status, etc.)
- New columns to sales.sale (sale_stage, stage_updated_at, is_direct_sale; lead_id made nullable)
- New tables: crm.lead_followup, sales.sale_stage_history, sales.sale_payment,
  sales.sale_document, sales.sale_portal_tracking, service.service_followup,
  insurance.insurance_followup
- Performance indexes
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '37956117aba9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ========================================================================
    # PART 1: ENHANCE crm.lead TABLE
    # ========================================================================
    op.add_column('lead', sa.Column('expected_purchase_days', sa.Integer(), nullable=True), schema='crm')
    op.add_column('lead', sa.Column('next_followup_date', sa.Date(), nullable=True), schema='crm')
    op.add_column('lead', sa.Column('lead_status', sa.String(20), nullable=True, server_default='WARM'), schema='crm')
    op.add_column('lead', sa.Column('visit_date', sa.TIMESTAMP(), nullable=True, server_default=sa.func.now()), schema='crm')
    op.add_column('lead', sa.Column('is_converted', sa.Boolean(), nullable=True, server_default=sa.text('false')), schema='crm')
    op.add_column('lead', sa.Column('converted_sale_id', sa.BigInteger(), nullable=True), schema='crm')

    # ========================================================================
    # PART 2: ENHANCE sales.sale TABLE
    # ========================================================================
    op.add_column('sale', sa.Column('sale_stage', sa.String(50), nullable=True, server_default='ENQUIRY'), schema='sales')
    op.add_column('sale', sa.Column('stage_updated_at', sa.TIMESTAMP(), nullable=True), schema='sales')
    op.add_column('sale', sa.Column('is_direct_sale', sa.Boolean(), nullable=True, server_default=sa.text('false')), schema='sales')

    # Make lead_id nullable for direct sales (walk-in)
    op.alter_column('sale', 'lead_id', existing_type=sa.BigInteger(), nullable=True, schema='sales')

    # ========================================================================
    # PART 3: CREATE crm.lead_followup TABLE
    # ========================================================================
    op.create_table(
        'lead_followup',
        sa.Column('lead_followup_id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('lead_id', sa.BigInteger(), sa.ForeignKey('crm.lead.lead_id', ondelete='CASCADE'), nullable=False),
        sa.Column('followup_date', sa.TIMESTAMP(), nullable=False, server_default=sa.func.now()),
        sa.Column('remarks', sa.Text(), nullable=False),
        sa.Column('outcome_status', sa.String(20), nullable=False),
        sa.Column('next_followup_date', sa.Date(), nullable=True),
        sa.Column('staff_id', sa.BigInteger(), sa.ForeignKey('master.staff.staff_id'), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        schema='crm'
    )

    # ========================================================================
    # PART 4: CREATE sales.sale_stage_history TABLE
    # ========================================================================
    op.create_table(
        'sale_stage_history',
        sa.Column('stage_history_id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('sale_id', sa.BigInteger(), sa.ForeignKey('sales.sale.sale_id', ondelete='CASCADE'), nullable=False),
        sa.Column('from_stage', sa.String(50), nullable=True),
        sa.Column('to_stage', sa.String(50), nullable=False),
        sa.Column('changed_by_staff_id', sa.BigInteger(), sa.ForeignKey('master.staff.staff_id'), nullable=False),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        schema='sales'
    )

    # ========================================================================
    # PART 5: CREATE sales.sale_payment TABLE
    # ========================================================================
    op.create_table(
        'sale_payment',
        sa.Column('sale_payment_id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('sale_id', sa.BigInteger(), sa.ForeignKey('sales.sale.sale_id', ondelete='CASCADE'), nullable=False),
        sa.Column('payment_type', sa.String(20), nullable=False),
        sa.Column('payment_mode', sa.String(20), nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('reference_number', sa.String(100), nullable=True),
        sa.Column('payment_date', sa.TIMESTAMP(), nullable=False, server_default=sa.func.now()),
        sa.Column('bank_name', sa.String(100), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_by_staff_id', sa.BigInteger(), sa.ForeignKey('master.staff.staff_id'), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        schema='sales'
    )

    # ========================================================================
    # PART 6: CREATE sales.sale_document TABLE
    # ========================================================================
    op.create_table(
        'sale_document',
        sa.Column('sale_document_id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('sale_id', sa.BigInteger(), sa.ForeignKey('sales.sale.sale_id', ondelete='CASCADE'), nullable=False),
        sa.Column('document_type', sa.String(50), nullable=False),
        sa.Column('document_number', sa.String(50), nullable=False, unique=True),
        sa.Column('generated_date', sa.TIMESTAMP(), nullable=False, server_default=sa.func.now()),
        sa.Column('generated_by_staff_id', sa.BigInteger(), sa.ForeignKey('master.staff.staff_id'), nullable=False),
        sa.Column('is_printed', sa.Boolean(), server_default=sa.text('false')),
        sa.Column('print_count', sa.Integer(), server_default=sa.text('0')),
        sa.Column('last_printed_at', sa.TIMESTAMP(), nullable=True),
        schema='sales'
    )

    # ========================================================================
    # PART 7: CREATE sales.sale_portal_tracking TABLE
    # ========================================================================
    op.create_table(
        'sale_portal_tracking',
        sa.Column('portal_tracking_id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('sale_id', sa.BigInteger(), sa.ForeignKey('sales.sale.sale_id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('insurance_status', sa.String(20), nullable=False, server_default='PENDING'),
        sa.Column('insurance_completed_date', sa.TIMESTAMP(), nullable=True),
        sa.Column('insurance_policy_number', sa.String(100), nullable=True),
        sa.Column('subsidy_status', sa.String(20), nullable=False, server_default='PENDING'),
        sa.Column('subsidy_completed_date', sa.TIMESTAMP(), nullable=True),
        sa.Column('subsidy_reference', sa.String(100), nullable=True),
        sa.Column('rto_status', sa.String(20), nullable=False, server_default='PENDING'),
        sa.Column('rto_completed_date', sa.TIMESTAMP(), nullable=True),
        sa.Column('registration_number', sa.String(20), nullable=True, unique=True),
        sa.Column('celex_status', sa.String(20), nullable=False, server_default='PENDING'),
        sa.Column('celex_completed_date', sa.TIMESTAMP(), nullable=True),
        sa.Column('number_plate_ordered_date', sa.Date(), nullable=True),
        sa.Column('number_plate_fixed_date', sa.Date(), nullable=True),
        sa.Column('form_20_generated', sa.Boolean(), server_default=sa.text('false')),
        sa.Column('helmet_invoice_generated', sa.Boolean(), server_default=sa.text('false')),
        sa.Column('all_portals_completed', sa.Boolean(), server_default=sa.text('false')),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=True),
        schema='sales'
    )

    # ========================================================================
    # PART 8: CREATE service.service_followup TABLE
    # ========================================================================
    op.create_table(
        'service_followup',
        sa.Column('service_followup_id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('job_card_id', sa.BigInteger(), sa.ForeignKey('service.job_card.job_card_id', ondelete='CASCADE'), nullable=False),
        sa.Column('service_type', sa.String(50), nullable=False),
        sa.Column('next_service_date', sa.Date(), nullable=False),
        sa.Column('km_at_service', sa.Integer(), nullable=True),
        sa.Column('next_service_km', sa.Integer(), nullable=True),
        sa.Column('is_completed', sa.Boolean(), server_default=sa.text('false')),
        sa.Column('completed_date', sa.TIMESTAMP(), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        schema='service'
    )

    # ========================================================================
    # PART 9: CREATE insurance.insurance_followup TABLE
    # ========================================================================
    op.create_table(
        'insurance_followup',
        sa.Column('insurance_followup_id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('policy_id', sa.BigInteger(), sa.ForeignKey('insurance.policy.policy_id', ondelete='CASCADE'), nullable=False),
        sa.Column('renewal_date', sa.Date(), nullable=False),
        sa.Column('reminder_days_before', sa.Integer(), server_default=sa.text('30')),
        sa.Column('is_renewed', sa.Boolean(), server_default=sa.text('false')),
        sa.Column('renewed_date', sa.TIMESTAMP(), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        schema='insurance'
    )

    # ========================================================================
    # PART 10: INDEXES FOR PERFORMANCE
    # ========================================================================
    op.create_index('idx_lead_next_followup', 'lead', ['next_followup_date'], schema='crm')
    op.create_index('idx_lead_lead_status', 'lead', ['lead_status'], schema='crm')
    op.create_index('idx_lead_is_converted', 'lead', ['is_converted'], schema='crm')
    op.create_index('idx_lead_followup_lead', 'lead_followup', ['lead_id'], schema='crm')
    op.create_index('idx_sale_sale_stage', 'sale', ['sale_stage'], schema='sales')
    op.create_index('idx_sale_payment_sale', 'sale_payment', ['sale_id'], schema='sales')
    op.create_index('idx_sale_document_sale', 'sale_document', ['sale_id'], schema='sales')
    op.create_index('idx_service_followup_date', 'service_followup', ['next_service_date'], schema='service')
    op.create_index('idx_insurance_followup_date', 'insurance_followup', ['renewal_date'], schema='insurance')


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_insurance_followup_date', table_name='insurance_followup', schema='insurance')
    op.drop_index('idx_service_followup_date', table_name='service_followup', schema='service')
    op.drop_index('idx_sale_document_sale', table_name='sale_document', schema='sales')
    op.drop_index('idx_sale_payment_sale', table_name='sale_payment', schema='sales')
    op.drop_index('idx_sale_sale_stage', table_name='sale', schema='sales')
    op.drop_index('idx_lead_followup_lead', table_name='lead_followup', schema='crm')
    op.drop_index('idx_lead_is_converted', table_name='lead', schema='crm')
    op.drop_index('idx_lead_lead_status', table_name='lead', schema='crm')
    op.drop_index('idx_lead_next_followup', table_name='lead', schema='crm')

    # Drop new tables in reverse order
    op.drop_table('insurance_followup', schema='insurance')
    op.drop_table('service_followup', schema='service')
    op.drop_table('sale_portal_tracking', schema='sales')
    op.drop_table('sale_document', schema='sales')
    op.drop_table('sale_payment', schema='sales')
    op.drop_table('sale_stage_history', schema='sales')
    op.drop_table('lead_followup', schema='crm')

    # Revert sales.sale changes
    op.alter_column('sale', 'lead_id', existing_type=sa.BigInteger(), nullable=False, schema='sales')
    op.drop_column('sale', 'is_direct_sale', schema='sales')
    op.drop_column('sale', 'stage_updated_at', schema='sales')
    op.drop_column('sale', 'sale_stage', schema='sales')

    # Revert crm.lead changes
    op.drop_column('lead', 'converted_sale_id', schema='crm')
    op.drop_column('lead', 'is_converted', schema='crm')
    op.drop_column('lead', 'visit_date', schema='crm')
    op.drop_column('lead', 'lead_status', schema='crm')
    op.drop_column('lead', 'next_followup_date', schema='crm')
    op.drop_column('lead', 'expected_purchase_days', schema='crm')
