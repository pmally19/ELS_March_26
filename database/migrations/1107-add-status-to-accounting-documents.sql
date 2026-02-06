-- Migration 1107: Add status column to accounting_documents
-- Fixes: "column ad.status does not exist" error in period end closing

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounting_documents' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE accounting_documents 
        ADD COLUMN status VARCHAR(20) DEFAULT 'Posted';
        
        -- Update existing records
        UPDATE accounting_documents 
        SET status = 'Posted' 
        WHERE status IS NULL;
        
        RAISE NOTICE 'Added status column to accounting_documents';
    ELSE
        RAISE NOTICE 'status column already exists in accounting_documents';
    END IF;
END $$;
