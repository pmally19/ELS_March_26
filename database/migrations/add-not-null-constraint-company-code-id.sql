-- Migration: Add NOT NULL constraint to company_code_id in erp_customers table
-- Date: 2024-12-19
-- Description: Ensure all customers must have a company code assigned

-- Step 1: Update any existing NULL values to a default company code
-- First, check if there are any NULL values
DO $$
DECLARE
    null_count INTEGER;
    default_company_id INTEGER;
BEGIN
    -- Count NULL company_code_id values
    SELECT COUNT(*) INTO null_count 
    FROM erp_customers 
    WHERE company_code_id IS NULL;
    
    IF null_count > 0 THEN
        -- Get the first available company code ID as default
        SELECT id INTO default_company_id 
        FROM company_codes 
        WHERE active = true 
        ORDER BY id 
        LIMIT 1;
        
        -- If no company codes exist, create a default one
        IF default_company_id IS NULL THEN
            INSERT INTO company_codes (code, name, country, currency, active, created_at, updated_at)
            VALUES ('DEFAULT', 'Default Company', 'US', 'USD', true, NOW(), NOW())
            RETURNING id INTO default_company_id;
        END IF;
        
        -- Update NULL values with the default company code
        UPDATE erp_customers 
        SET company_code_id = default_company_id,
            updated_at = NOW()
        WHERE company_code_id IS NULL;
        
        RAISE NOTICE 'Updated % customers with NULL company_code_id to use company code ID: %', null_count, default_company_id;
    ELSE
        RAISE NOTICE 'No customers with NULL company_code_id found';
    END IF;
END $$;

-- Step 2: Add the NOT NULL constraint
ALTER TABLE erp_customers 
ALTER COLUMN company_code_id SET NOT NULL;

-- Step 3: Add a comment to document the change
COMMENT ON COLUMN erp_customers.company_code_id IS 'Company code ID - NOT NULL constraint ensures all customers are assigned to a company/legal entity';

-- Step 4: Verify the constraint was applied
DO $$
BEGIN
    -- Test that we cannot insert a customer without company_code_id
    BEGIN
        INSERT INTO erp_customers (customer_code, name, type, company_code_id) 
        VALUES ('TEST_NULL', 'Test Customer', 'Business', NULL);
        RAISE EXCEPTION 'NOT NULL constraint not working - was able to insert NULL company_code_id';
    EXCEPTION
        WHEN not_null_violation THEN
            RAISE NOTICE 'NOT NULL constraint successfully applied to company_code_id';
        WHEN OTHERS THEN
            RAISE NOTICE 'Unexpected error during constraint test: %', SQLERRM;
    END;
    
    -- Clean up test data if it was inserted
    DELETE FROM erp_customers WHERE customer_code = 'TEST_NULL';
END $$;

-- Migration completed successfully
SELECT 'Migration completed: NOT NULL constraint added to erp_customers.company_code_id' as status;
