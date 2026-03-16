-- Migration: Fix goods_receipt_documents table structure and column sizes
-- This fixes the table structure to match the expected schema

-- First, drop the old goods_receipt_documents table if it has wrong structure
DO $$
BEGIN
    -- Check if table exists and has wrong columns
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipt_documents'
    ) THEN
        -- Check if it has the old structure (has receipt_number instead of goods_receipt_id)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'goods_receipt_documents'
            AND column_name = 'receipt_number'
        ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'goods_receipt_documents'
            AND column_name = 'goods_receipt_id'
        ) THEN
            -- Drop the old table
            DROP TABLE IF EXISTS goods_receipt_documents CASCADE;
            RAISE NOTICE 'Dropped old goods_receipt_documents table with wrong structure';
        END IF;
    END IF;
END $$;

-- Create the correct goods_receipt_documents table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipt_documents'
    ) THEN
        CREATE TABLE goods_receipt_documents (
            id SERIAL PRIMARY KEY,
            goods_receipt_id INTEGER NOT NULL,
            document_type VARCHAR(50) NOT NULL,  -- 'DELIVERY_NOTE', 'BILL_OF_LADING', 'INSPECTION_REPORT', 'OTHER'
            document_name VARCHAR(255) NOT NULL,
            file_path VARCHAR(500) NOT NULL,
            file_size BIGINT,
            mime_type VARCHAR(100),
            uploaded_by VARCHAR(100),
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            description TEXT,
            CONSTRAINT goods_receipt_documents_type_check CHECK (
                document_type IN ('DELIVERY_NOTE', 'BILL_OF_LADING', 'INSPECTION_REPORT', 'OTHER')
            )
        );
        
        RAISE NOTICE 'Created goods_receipt_documents table with correct structure';
    END IF;
    
    -- Add foreign key constraint if goods_receipts table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goods_receipts') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'goods_receipt_documents_fk_gr'
        ) THEN
            BEGIN
                ALTER TABLE goods_receipt_documents 
                ADD CONSTRAINT goods_receipt_documents_fk_gr 
                FOREIGN KEY (goods_receipt_id) REFERENCES goods_receipts(id) ON DELETE CASCADE;
                RAISE NOTICE 'Added foreign key constraint goods_receipt_documents_fk_gr';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not add foreign key constraint: %', SQLERRM;
            END;
        END IF;
    END IF;
END $$;

-- Fix delivery_note and bill_of_lading column sizes
DO $$
BEGIN
    -- Fix delivery_note column size
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'delivery_note'
        AND character_maximum_length < 100
    ) THEN
        ALTER TABLE goods_receipts 
        ALTER COLUMN delivery_note TYPE VARCHAR(100);
        RAISE NOTICE 'Updated delivery_note column to VARCHAR(100)';
    END IF;
    
    -- Fix bill_of_lading column size
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'bill_of_lading'
        AND character_maximum_length < 100
    ) THEN
        ALTER TABLE goods_receipts 
        ALTER COLUMN bill_of_lading TYPE VARCHAR(100);
        RAISE NOTICE 'Updated bill_of_lading column to VARCHAR(100)';
    END IF;
END $$;

-- Add indexes for goods_receipt_documents
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipt_documents'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'goods_receipt_documents' 
            AND column_name = 'goods_receipt_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_goods_receipt_documents_gr_id 
            ON goods_receipt_documents(goods_receipt_id);
        END IF;
        
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'goods_receipt_documents' 
            AND column_name = 'document_type'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_goods_receipt_documents_type 
            ON goods_receipt_documents(document_type);
        END IF;
        
        RAISE NOTICE 'Created indexes for goods_receipt_documents';
    END IF;
END $$;

-- Add comments
COMMENT ON TABLE goods_receipt_documents IS 'Stores uploaded documents related to goods receipts';
COMMENT ON COLUMN goods_receipt_documents.goods_receipt_id IS 'Foreign key to goods_receipts table';
COMMENT ON COLUMN goods_receipt_documents.document_type IS 'Type of document: DELIVERY_NOTE, BILL_OF_LADING, INSPECTION_REPORT, or OTHER';

