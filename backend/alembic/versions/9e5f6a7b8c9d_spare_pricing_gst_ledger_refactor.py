"""Add canonical pricing columns, GST ledger, discount rules, and pricing audit tables

Revision ID: 9e5f6a7b8c9d
Revises: 8d4e5f6a7b8c
Create Date: 2026-10-22 13:10:00.000000

"""

from typing import Sequence, Union
from alembic import op

revision: str = "9e5f6a7b8c9d"
down_revision: Union[str, Sequence[str], None] = "8d4e5f6a7b8c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add canonical columns to module_spare_master
    op.execute("ALTER TABLE module_spare_master ADD COLUMN IF NOT EXISTS accounting_wac NUMERIC(12, 2);")
    op.execute("ALTER TABLE module_spare_master ADD COLUMN IF NOT EXISTS manufacturer_dlp NUMERIC(12, 2);")
    op.execute("ALTER TABLE module_spare_master ADD COLUMN IF NOT EXISTS manufacturer_mrp NUMERIC(12, 2);")

    # 2. Safely backfill canonical columns from existing data
    op.execute(
        "UPDATE module_spare_master SET accounting_wac = COALESCE(base_cost, base_dlp) "
        "WHERE accounting_wac IS NULL AND (base_cost IS NOT NULL OR base_dlp IS NOT NULL);"
    )
    op.execute(
        "UPDATE module_spare_master SET manufacturer_dlp = base_dlp "
        "WHERE manufacturer_dlp IS NULL AND base_dlp IS NOT NULL;"
    )
    op.execute(
        "UPDATE module_spare_master SET manufacturer_mrp = base_mrp "
        "WHERE manufacturer_mrp IS NULL AND base_mrp IS NOT NULL;"
    )

    # 3. Create Discount Rules table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS module_discount_rule (
            rule_id BIGSERIAL PRIMARY KEY,
            rule_name VARCHAR(150) NOT NULL,
            target_type VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER',
            discount_type VARCHAR(30) NOT NULL DEFAULT 'PERCENTAGE',
            discount_value NUMERIC(12, 2) NOT NULL,
            applicable_entity_id BIGINT,
            spare_id BIGINT REFERENCES module_spare_master(spare_id) ON DELETE CASCADE,
            vehicle_model_id BIGINT,
            min_quantity INTEGER NOT NULL DEFAULT 0,
            min_basket_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            threshold_is_pre_tax BOOLEAN NOT NULL DEFAULT TRUE,
            stacking_mode VARCHAR(20) NOT NULL DEFAULT 'STACKABLE',
            priority INTEGER NOT NULL DEFAULT 0,
            max_discount_amount NUMERIC(12, 2),
            start_date TIMESTAMP,
            expiry_date TIMESTAMP,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_by_staff_id BIGINT,
            created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
            is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
            deleted_at TIMESTAMP WITHOUT TIME ZONE
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_mod_discount_target ON module_discount_rule(target_type);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_mod_discount_spare ON module_discount_rule(spare_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_mod_discount_active ON module_discount_rule(is_active);")

    # 4. Create Pricing Alerts table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS module_pricing_alert (
            alert_id BIGSERIAL PRIMARY KEY,
            spare_id BIGINT NOT NULL REFERENCES module_spare_master(spare_id) ON DELETE CASCADE,
            part_code VARCHAR(50) NOT NULL,
            alert_type VARCHAR(50) NOT NULL,
            severity VARCHAR(20) NOT NULL DEFAULT 'WARNING',
            current_wac NUMERIC(12, 2) NOT NULL,
            current_mrp NUMERIC(12, 2) NOT NULL,
            expected_margin_percent NUMERIC(6, 2),
            message TEXT NOT NULL,
            calculation_details JSONB NOT NULL DEFAULT '{}'::jsonb,
            status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
            acknowledged_by BIGINT,
            acknowledged_at TIMESTAMP,
            resolved_by BIGINT,
            resolved_at TIMESTAMP,
            resolution_reason TEXT,
            risk_fingerprint VARCHAR(100) NOT NULL,
            created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
            is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
            deleted_at TIMESTAMP WITHOUT TIME ZONE
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_mod_pricing_alert_spare ON module_pricing_alert(spare_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_mod_pricing_alert_status ON module_pricing_alert(status);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_mod_pricing_alert_severity ON module_pricing_alert(severity);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_mod_pricing_alert_fingerprint ON module_pricing_alert(risk_fingerprint);")

    # 5. Create Loss Sale Exceptions table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS module_loss_sale_exception (
            exception_id BIGSERIAL PRIMARY KEY,
            sale_id BIGINT,
            spare_id BIGINT NOT NULL REFERENCES module_spare_master(spare_id) ON DELETE RESTRICT,
            part_code VARCHAR(50) NOT NULL,
            quantity INTEGER NOT NULL,
            requested_by_staff_id BIGINT NOT NULL,
            authorized_by_staff_id BIGINT NOT NULL,
            expected_revenue NUMERIC(12, 2) NOT NULL,
            expected_cost NUMERIC(12, 2) NOT NULL,
            expected_loss NUMERIC(12, 2) NOT NULL,
            expected_margin NUMERIC(6, 2) NOT NULL,
            reason TEXT NOT NULL,
            policy_version VARCHAR(50) NOT NULL DEFAULT 'v2.0',
            created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_mod_loss_exc_sale ON module_loss_sale_exception(sale_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_mod_loss_exc_spare ON module_loss_sale_exception(spare_id);")

    # 6. Create Price Change Audit Events table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS module_price_change_audit_event (
            event_id BIGSERIAL PRIMARY KEY,
            spare_id BIGINT NOT NULL REFERENCES module_spare_master(spare_id) ON DELETE CASCADE,
            part_code VARCHAR(50) NOT NULL,
            change_type VARCHAR(50) NOT NULL,
            old_value NUMERIC(12, 2),
            new_value NUMERIC(12, 2),
            difference_amount NUMERIC(12, 2),
            difference_percent NUMERIC(6, 2),
            source_document VARCHAR(100),
            reason TEXT,
            actor_staff_id BIGINT,
            actor_name VARCHAR(100),
            effective_timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
            recorded_timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
            profit_impact_margin NUMERIC(6, 2),
            created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_mod_price_audit_spare ON module_price_change_audit_event(spare_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_mod_price_audit_type ON module_price_change_audit_event(change_type);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_mod_price_audit_effective ON module_price_change_audit_event(effective_timestamp);")

    # 7. Create GST ITC Credit Record table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS gst_itc_credit_record (
            itc_id BIGSERIAL PRIMARY KEY,
            purchase_id BIGINT,
            invoice_number VARCHAR(100) NOT NULL,
            invoice_date DATE NOT NULL,
            vendor_id BIGINT,
            vendor_name VARCHAR(150),
            vendor_gstin VARCHAR(20),
            taxable_value NUMERIC(12, 2) NOT NULL,
            cgst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            sgst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            igst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            total_tax NUMERIC(12, 2) NOT NULL,
            total_invoice_value NUMERIC(12, 2) NOT NULL,
            eligibility_status VARCHAR(30) NOT NULL DEFAULT 'ELIGIBLE',
            claim_status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
            claimed_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            utilized_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            reversal_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            tax_period VARCHAR(10) NOT NULL,
            is_reconciled BOOLEAN NOT NULL DEFAULT FALSE,
            reconciliation_notes TEXT,
            created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
            is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
            deleted_at TIMESTAMP WITHOUT TIME ZONE
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_gst_itc_period ON gst_itc_credit_record(tax_period);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_gst_itc_vendor ON gst_itc_credit_record(vendor_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_gst_itc_eligibility ON gst_itc_credit_record(eligibility_status);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_gst_itc_claim_status ON gst_itc_credit_record(claim_status);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_gst_itc_invoice_num ON gst_itc_credit_record(invoice_number);")

    # 8. Create GST Output Tax Record table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS gst_output_tax_record (
            output_tax_id BIGSERIAL PRIMARY KEY,
            sale_id BIGINT,
            invoice_number VARCHAR(100) NOT NULL,
            invoice_date DATE NOT NULL,
            customer_name VARCHAR(150),
            taxable_value NUMERIC(12, 2) NOT NULL,
            cgst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            sgst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            igst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            total_tax NUMERIC(12, 2) NOT NULL,
            total_invoice_value NUMERIC(12, 2) NOT NULL,
            tax_period VARCHAR(10) NOT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
            itc_utilized_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            cash_paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            is_reconciled BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
            is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
            deleted_at TIMESTAMP WITHOUT TIME ZONE
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_gst_output_period ON gst_output_tax_record(tax_period);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_gst_output_sale ON gst_output_tax_record(sale_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_gst_output_status ON gst_output_tax_record(status);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_gst_output_invoice_num ON gst_output_tax_record(invoice_number);")

    # 9. Create GST Utilization Entry table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS gst_utilization_entry (
            utilization_id BIGSERIAL PRIMARY KEY,
            itc_id BIGINT NOT NULL REFERENCES gst_itc_credit_record(itc_id) ON DELETE RESTRICT,
            output_tax_id BIGINT REFERENCES gst_output_tax_record(output_tax_id) ON DELETE RESTRICT,
            amount_utilized NUMERIC(12, 2) NOT NULL,
            tax_component VARCHAR(10) NOT NULL,
            tax_period VARCHAR(10) NOT NULL,
            utilization_date TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
            authorized_by_staff_id BIGINT,
            remarks TEXT,
            created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_gst_util_itc ON gst_utilization_entry(itc_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_gst_util_output ON gst_utilization_entry(output_tax_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_gst_util_period ON gst_utilization_entry(tax_period);")

    # 10. Create GST Reconciliation Period table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS gst_reconciliation_period (
            period_id BIGSERIAL PRIMARY KEY,
            period_code VARCHAR(10) UNIQUE NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
            total_input_itc_recorded NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
            total_eligible_itc NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
            total_ineligible_itc NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
            total_output_tax NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
            total_itc_utilized NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
            total_cash_paid NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
            itc_carried_forward NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
            closed_at TIMESTAMP WITHOUT TIME ZONE,
            closed_by_staff_id BIGINT,
            created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_gst_period_code ON gst_reconciliation_period(period_code);")

    # 11. Ensure AuditMixin and SoftDeleteMixin columns are present on all new tables
    for tbl in [
        "module_discount_rule", "module_pricing_alert", "module_loss_sale_exception",
        "module_price_change_audit_event", "gst_itc_credit_record", "gst_output_tax_record",
        "gst_utilization_entry", "gst_reconciliation_period"
    ]:
        op.execute(f"ALTER TABLE {tbl} ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES staff(staff_id) ON DELETE SET NULL;")
        op.execute(f"ALTER TABLE {tbl} ADD COLUMN IF NOT EXISTS updated_by BIGINT REFERENCES staff(staff_id) ON DELETE SET NULL;")

    for tbl in [
        "module_discount_rule", "module_pricing_alert", "gst_itc_credit_record", "gst_output_tax_record"
    ]:
        op.execute(f"ALTER TABLE {tbl} ADD COLUMN IF NOT EXISTS deleted_by BIGINT REFERENCES staff(staff_id) ON DELETE SET NULL;")
        op.execute(f"ALTER TABLE {tbl} ADD COLUMN IF NOT EXISTS restored_at TIMESTAMP WITH TIME ZONE;")
        op.execute(f"ALTER TABLE {tbl} ADD COLUMN IF NOT EXISTS restored_by BIGINT REFERENCES staff(staff_id) ON DELETE SET NULL;")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS gst_utilization_entry CASCADE;")
    op.execute("DROP TABLE IF EXISTS gst_reconciliation_period CASCADE;")
    op.execute("DROP TABLE IF EXISTS gst_output_tax_record CASCADE;")
    op.execute("DROP TABLE IF EXISTS gst_itc_credit_record CASCADE;")
    op.execute("DROP TABLE IF EXISTS module_price_change_audit_event CASCADE;")
    op.execute("DROP TABLE IF EXISTS module_loss_sale_exception CASCADE;")
    op.execute("DROP TABLE IF EXISTS module_pricing_alert CASCADE;")
    op.execute("DROP TABLE IF EXISTS module_discount_rule CASCADE;")
    op.execute("ALTER TABLE module_spare_master DROP COLUMN IF EXISTS accounting_wac;")
    op.execute("ALTER TABLE module_spare_master DROP COLUMN IF EXISTS manufacturer_dlp;")
    op.execute("ALTER TABLE module_spare_master DROP COLUMN IF EXISTS manufacturer_mrp;")
