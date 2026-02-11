-- Migration for Staff Management Schema Expansion
-- Adding: dealer_id, Personal Details, Address Details, Bank Details, Emergency Contact

-- 1. Hierarchy
ALTER TABLE master.staff 
ADD COLUMN IF NOT EXISTS dealer_id BIGINT REFERENCES master.staff(staff_id);

-- 2. Personal Details
ALTER TABLE master.staff 
ADD COLUMN IF NOT EXISTS joining_date DATE,
ADD COLUMN IF NOT EXISTS aadhaar_no VARCHAR(12),
ADD COLUMN IF NOT EXISTS pan_no VARCHAR(10);

-- 3. Address Details
ALTER TABLE master.staff
ADD COLUMN IF NOT EXISTS address_line1 TEXT,
ADD COLUMN IF NOT EXISTS address_line2 TEXT,
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS state VARCHAR(100),
ADD COLUMN IF NOT EXISTS pincode VARCHAR(10);

-- 4. Bank Details
ALTER TABLE master.staff
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS bank_account_no VARCHAR(50),
ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(20),
ADD COLUMN IF NOT EXISTS upi_id VARCHAR(50); -- Added upi_id as noticed in schemas.py

-- 5. Emergency Contact
ALTER TABLE master.staff
ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS emergency_contact_no VARCHAR(15);
