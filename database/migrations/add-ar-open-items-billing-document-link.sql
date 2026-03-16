-- Migration: Add billing_document_id to ar_open_items table and remove defaults
-- This migration updates the ar_open_items table to link to billing_documents
-- and removes hardcoded default values as per requirements

-- Step 1: Add billing_document_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ar_open_items' 
        AND column_name = 'billing_document_id'
    ) THEN
        ALTER TABLE ar_open_items 
        ADD COLUMN billing_document_id INTEGER;
        
        COMMENT ON COLUMN ar_open_items.billing_document_id IS 'Foreign key reference to billing_documents table';
    END IF;
END $$;

-- Step 2: Remove default values from status column
DO $$
BEGIN
    ALTER TABLE ar_open_items 
    ALTER COLUMN status DROP DEFAULT;
    
    -- Update existing records that have NULL status to 'Open' if needed
    UPDATE ar_open_items 
    SET status = 'Open' 
    WHERE status IS NULL;
    
    -- Make status NOT NULL if it isn't already
    ALTER TABLE ar_open_items 
    ALTER COLUMN status SET NOT NULL;
EXCEPTION
    WHEN OTHERS THEN
        -- Column might already be NOT NULL, ignore error
        NULL;
END $$;

-- Step 3: Remove default values from created_at column
DO $$
BEGIN
    ALTER TABLE ar_open_items 
    ALTER COLUMN created_at DROP DEFAULT;
    
    -- Update existing records that have NULL created_at
    UPDATE ar_open_items 
    SET created_at = NOW() 
    WHERE created_at IS NULL;
    
    -- Make created_at NOT NULL if it isn't already
    ALTER TABLE ar_open_items 
    ALTER COLUMN created_at SET NOT NULL;
EXCEPTION
    WHEN OTHERS THEN
        -- Column might already be NOT NULL, ignore error
        NULL;
END $$;

-- Step 4: Remove default values from active column
DO $$
BEGIN
    ALTER TABLE ar_open_items 
    ALTER COLUMN active DROP DEFAULT;
    
    -- Update existing records that have NULL active to true if needed
    UPDATE ar_open_items 
    SET active = true 
    WHERE active IS NULL;
    
    -- Make active NOT NULL if it isn't already
    ALTER TABLE ar_open_items 
    ALTER COLUMN active SET NOT NULL;
EXCEPTION
    WHEN OTHERS THEN
        -- Column might already be NOT NULL, ignore error
        NULL;
END $$;

-- Step 5: Create index on billing_document_id for better performance
CREATE INDEX IF NOT EXISTS idx_ar_open_items_billing_document_id 
    ON ar_open_items(billing_document_id);

-- Step 6: Create index on customer_id and status for better query performance
CREATE INDEX IF NOT EXISTS idx_ar_open_items_customer_status 
    ON ar_open_items(customer_id, status);

-- Step 7: Add foreign key constraint if billing_documents table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'billing_documents') THEN
        -- Drop existing constraint if it exists
        ALTER TABLE ar_open_items 
        DROP CONSTRAINT IF EXISTS fk_ar_open_items_billing_document;
        
        -- Add foreign key constraint
        ALTER TABLE ar_open_items 
        ADD CONSTRAINT fk_ar_open_items_billing_document 
        FOREIGN KEY (billing_document_id) 
        REFERENCES billing_documents(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Step 8: Add comments
COMMENT ON COLUMN ar_open_items.billing_document_id IS 'Foreign key reference to billing_documents table';
COMMENT ON COLUMN ar_open_items.status IS 'Status of the open item (Open, Partial, Cleared, Disputed) - no default value';
COMMENT ON COLUMN ar_open_items.created_at IS 'Creation timestamp - no default value';
COMMENT ON COLUMN ar_open_items.active IS 'Active status - no default value';

