-- Migration: Add Auto-Generated Unique Address Number
-- Date: 2025-01-28
-- Description: Add address_number field that auto-generates unique numbers for every address

-- Step 1: Add address_number column to customer_addresses table (without UNIQUE constraint first)
ALTER TABLE customer_addresses 
ADD COLUMN IF NOT EXISTS address_number VARCHAR(50);

-- Step 2: Create sequence for generating unique address numbers
CREATE SEQUENCE IF NOT EXISTS address_number_seq START 1;

-- Step 3: Create function to generate unique address number
CREATE OR REPLACE FUNCTION generate_address_number()
RETURNS TRIGGER AS $$
DECLARE
    new_address_number VARCHAR(50);
    address_count INTEGER;
BEGIN
    -- Generate unique address number in format: ADDR-XXXXXX (6 digits)
    -- Get the next value from sequence and format it
    SELECT nextval('address_number_seq') INTO address_count;
    
    -- Format as ADDR-000001, ADDR-000002, etc.
    new_address_number := 'ADDR-' || LPAD(address_count::TEXT, 6, '0');
    
    -- Set the address_number for the new record
    NEW.address_number := new_address_number;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger to auto-generate address_number on INSERT
DROP TRIGGER IF EXISTS trigger_generate_address_number ON customer_addresses;

CREATE TRIGGER trigger_generate_address_number
    BEFORE INSERT ON customer_addresses
    FOR EACH ROW
    WHEN (NEW.address_number IS NULL)
    EXECUTE FUNCTION generate_address_number();

-- Step 5: Update existing addresses that don't have address_number
-- SKIPPED: This step is handled in Step 7 with a simpler UPDATE that avoids constraint issues
-- The DO block approach was causing constraint conflicts with existing data

-- Step 6: Set the sequence to the maximum address_number value to avoid conflicts
DO $$
DECLARE
    max_seq_val INTEGER;
    current_seq_val BIGINT;
BEGIN
    -- Get the maximum numeric part from existing address numbers
    SELECT COALESCE(MAX(
        CASE 
            WHEN address_number ~ '^ADDR-[0-9]+$' 
            THEN CAST(SUBSTRING(address_number FROM 'ADDR-([0-9]+)') AS INTEGER)
            ELSE 0
        END
    ), 0) INTO max_seq_val
    FROM customer_addresses;
    
    -- Set sequence to max value + 1 to ensure uniqueness
    IF max_seq_val > 0 THEN
        PERFORM setval('address_number_seq', max_seq_val);
    END IF;
END $$;

-- Step 7: Ensure all existing addresses have address_number before adding constraint
-- Temporarily disable ALL triggers to avoid conflicts during UPDATE
ALTER TABLE customer_addresses DISABLE TRIGGER ALL;

UPDATE customer_addresses
SET address_number = 'ADDR-' || LPAD(nextval('address_number_seq')::TEXT, 6, '0')
WHERE address_number IS NULL;

-- Re-enable all triggers
ALTER TABLE customer_addresses ENABLE TRIGGER ALL;

-- Step 7b: Create UNIQUE index instead of constraint (avoids trigger event conflicts)
-- This creates a unique constraint effect without the ALTER TABLE issue
-- Wait a moment for any pending trigger events to complete before creating index
-- The unique index also serves as the performance index, so we don't need a separate one
CREATE UNIQUE INDEX IF NOT EXISTS customer_addresses_address_number_key 
ON customer_addresses(address_number) 
WHERE address_number IS NOT NULL;

-- Step 9: Update the get_customer_addresses_by_type function to include address_number
-- Drop the existing function first since we're changing the return type
DROP FUNCTION IF EXISTS get_customer_addresses_by_type(INTEGER, VARCHAR);

CREATE FUNCTION get_customer_addresses_by_type(
    p_customer_id INTEGER,
    p_address_type VARCHAR(20)
)
RETURNS TABLE (
    id INTEGER,
    address_number VARCHAR(50),
    address_name VARCHAR(100),
    contact_person VARCHAR(100),
    company_name VARCHAR(100),
    address_line_1 VARCHAR(255),
    address_line_2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    country VARCHAR(50),
    postal_code VARCHAR(20),
    region VARCHAR(50),
    phone VARCHAR(30),
    email VARCHAR(100),
    is_primary BOOLEAN,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ca.id,
        ca.address_number,
        ca.address_name,
        ca.contact_person,
        ca.company_name,
        ca.address_line_1,
        ca.address_line_2,
        ca.city,
        ca.state,
        ca.country,
        ca.postal_code,
        ca.region,
        ca.phone,
        ca.email,
        ca.is_primary,
        ca.notes
    FROM customer_addresses ca
    WHERE ca.customer_id = p_customer_id 
      AND ca.address_type = p_address_type
      AND ca.is_active = TRUE
    ORDER BY ca.is_primary DESC, ca.address_name;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Add comment for documentation
COMMENT ON COLUMN customer_addresses.address_number IS 'Auto-generated unique address number (format: ADDR-XXXXXX)';

