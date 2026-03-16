-- Migration: Enhance goods_receipts table with order details and document support
-- This addresses gaps identified in GOODS_RECEIPT_ANALYSIS.md

-- Add missing columns for order details tracking
DO $$
BEGIN
    -- Add ordered_quantity column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'ordered_quantity'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN ordered_quantity NUMERIC(15,3);
        RAISE NOTICE 'Added ordered_quantity column to goods_receipts';
    END IF;

    -- Add po_item_id column (reference to purchase_order_items)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'po_item_id'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN po_item_id INTEGER;
        RAISE NOTICE 'Added po_item_id column to goods_receipts';
    END IF;

    -- Add expected_delivery_date column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'expected_delivery_date'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN expected_delivery_date DATE;
        RAISE NOTICE 'Added expected_delivery_date column to goods_receipts';
    END IF;

    -- Add remaining_quantity column (calculated field)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'remaining_quantity'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN remaining_quantity NUMERIC(15,3);
        RAISE NOTICE 'Added remaining_quantity column to goods_receipts';
    END IF;

    -- Ensure delivery_note and bill_of_lading columns exist (they should already exist but check anyway)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'delivery_note'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN delivery_note VARCHAR(100);
        RAISE NOTICE 'Added delivery_note column to goods_receipts';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'bill_of_lading'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN bill_of_lading VARCHAR(100);
        RAISE NOTICE 'Added bill_of_lading column to goods_receipts';
    END IF;
END $$;

-- Add foreign key constraint for po_item_id if purchase_order_items table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_order_items') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'goods_receipts_fk_po_item'
        ) THEN
            BEGIN
                ALTER TABLE goods_receipts 
                ADD CONSTRAINT goods_receipts_fk_po_item 
                FOREIGN KEY (po_item_id) REFERENCES purchase_order_items(id);
                RAISE NOTICE 'Added foreign key constraint goods_receipts_fk_po_item';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not add foreign key constraint goods_receipts_fk_po_item: %', SQLERRM;
            END;
        END IF;
    END IF;
END $$;

-- Create goods_receipt_documents table for document uploads
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
        
        RAISE NOTICE 'Created goods_receipt_documents table';
    END IF;
    
    -- Add foreign key constraint separately (only if it doesn't exist)
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

-- Add indexes for performance (only if table and column exist)
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
            CREATE INDEX IF NOT EXISTS idx_goods_receipt_documents_gr_id ON goods_receipt_documents(goods_receipt_id);
        END IF;
        
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'goods_receipt_documents' 
            AND column_name = 'document_type'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_goods_receipt_documents_type ON goods_receipt_documents(document_type);
        END IF;
        
        RAISE NOTICE 'Created indexes for goods_receipt_documents';
    END IF;
END $$;

-- Add indexes for goods_receipts (only if columns exist)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'po_item_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_goods_receipts_po_item_id ON goods_receipts(po_item_id);
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'ordered_quantity'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_goods_receipts_ordered_quantity ON goods_receipts(ordered_quantity);
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN goods_receipts.ordered_quantity IS 'Original ordered quantity from purchase order item';
COMMENT ON COLUMN goods_receipts.po_item_id IS 'Reference to purchase_order_items table';
COMMENT ON COLUMN goods_receipts.expected_delivery_date IS 'Expected delivery date from purchase order item';
COMMENT ON COLUMN goods_receipts.remaining_quantity IS 'Remaining quantity to be received (ordered_quantity - received_quantity)';
COMMENT ON COLUMN goods_receipts.delivery_note IS 'Delivery note reference number or text';
COMMENT ON COLUMN goods_receipts.bill_of_lading IS 'Bill of lading reference number or text';
COMMENT ON TABLE goods_receipt_documents IS 'Stores uploaded documents related to goods receipts';

