-- 1. Updates to inventory.spare_master
ALTER TABLE inventory.spare_master 
ADD COLUMN IF NOT EXISTS is_temporary BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Updates to procurement.spare_purchase
ALTER TABLE procurement.spare_purchase
ADD COLUMN IF NOT EXISTS include_in_accounting BOOLEAN NOT NULL DEFAULT TRUE;

-- 3. Move Vehicle Purchase tables to procurement schema
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'inventory' AND table_name = 'vehicle_purchase') THEN
        ALTER TABLE inventory.vehicle_purchase SET SCHEMA procurement;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'inventory' AND table_name = 'vehicle_purchase_detail') THEN
        ALTER TABLE inventory.vehicle_purchase_detail SET SCHEMA procurement;
    END IF;
END $$;

-- 4. Updates to procurement.vehicle_purchase (after move)
-- Note: 'vehicle_purchase' is now in 'procurement' schema
ALTER TABLE procurement.vehicle_purchase
ADD COLUMN IF NOT EXISTS include_in_accounting BOOLEAN NOT NULL DEFAULT TRUE;

-- 5. Create Pricing History Tables
CREATE TABLE IF NOT EXISTS master.spare_price_history (
    history_id BIGSERIAL PRIMARY KEY,
    spare_id BIGINT NOT NULL REFERENCES inventory.spare_master(spare_id),
    price NUMERIC(12,2) NOT NULL,
    margin NUMERIC(5,2) NOT NULL,
    effective_from TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effective_to TIMESTAMP WITHOUT TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by BIGINT REFERENCES master.staff(staff_id),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS master.vehicle_price_history (
    history_id BIGSERIAL PRIMARY KEY,
    vehicle_model_id BIGINT NOT NULL REFERENCES master.vehicle_model(vehicle_model_id),
    price NUMERIC(12,2) NOT NULL,
    effective_from TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effective_to TIMESTAMP WITHOUT TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by BIGINT REFERENCES master.staff(staff_id),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for history
CREATE INDEX IF NOT EXISTS idx_spare_price_history_spare ON master.spare_price_history(spare_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_price_history_model ON master.vehicle_price_history(vehicle_model_id);
