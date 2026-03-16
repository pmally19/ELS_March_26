-- Migration: Add description column to reconciliation_accounts table if it doesn't exist
-- This fixes the error: column "description" does not exist

-- Check if column exists, if not add it
DO $$
BEGIN
    -- Check if description column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'reconciliation_accounts' 
        AND column_name = 'description'
    ) THEN
        -- Add description column
        ALTER TABLE reconciliation_accounts 
        ADD COLUMN description TEXT;
        
        RAISE NOTICE 'Added description column to reconciliation_accounts table';
    ELSE
        RAISE NOTICE 'description column already exists in reconciliation_accounts table';
    END IF;
END $$;

-- Add comment to the column
COMMENT ON COLUMN reconciliation_accounts.description IS 'Description of the reconciliation account';

