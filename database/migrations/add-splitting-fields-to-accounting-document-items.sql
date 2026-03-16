-- Migration: Add Document Splitting Fields to accounting_document_items
-- Purpose: Add fields needed for document splitting functionality
-- Database: mallyerp
-- Date: 2025-01-28

-- Add profit_center field if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounting_document_items' 
        AND column_name = 'profit_center'
    ) THEN
        ALTER TABLE accounting_document_items 
        ADD COLUMN profit_center VARCHAR(20);
    END IF;
END $$;

-- Add business_area field if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounting_document_items' 
        AND column_name = 'business_area'
    ) THEN
        ALTER TABLE accounting_document_items 
        ADD COLUMN business_area VARCHAR(10);
    END IF;
END $$;

-- Add segment field if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounting_document_items' 
        AND column_name = 'segment'
    ) THEN
        ALTER TABLE accounting_document_items 
        ADD COLUMN segment VARCHAR(20);
    END IF;
END $$;

-- Add cost_center field if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounting_document_items' 
        AND column_name = 'cost_center'
    ) THEN
        ALTER TABLE accounting_document_items 
        ADD COLUMN cost_center VARCHAR(20);
    END IF;
END $$;

-- Add split_document_id field for tracking original document
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounting_document_items' 
        AND column_name = 'split_document_id'
    ) THEN
        ALTER TABLE accounting_document_items 
        ADD COLUMN split_document_id INTEGER REFERENCES accounting_documents(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add split_characteristic_value field
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounting_document_items' 
        AND column_name = 'split_characteristic_value'
    ) THEN
        ALTER TABLE accounting_document_items 
        ADD COLUMN split_characteristic_value VARCHAR(100);
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounting_doc_items_profit_center 
ON accounting_document_items(profit_center) WHERE profit_center IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_accounting_doc_items_business_area 
ON accounting_document_items(business_area) WHERE business_area IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_accounting_doc_items_segment 
ON accounting_document_items(segment) WHERE segment IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_accounting_doc_items_cost_center 
ON accounting_document_items(cost_center) WHERE cost_center IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_accounting_doc_items_split_doc 
ON accounting_document_items(split_document_id) WHERE split_document_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN accounting_document_items.profit_center IS 'Profit center assignment for document splitting';
COMMENT ON COLUMN accounting_document_items.business_area IS 'Business area assignment for document splitting';
COMMENT ON COLUMN accounting_document_items.segment IS 'Segment assignment for document splitting';
COMMENT ON COLUMN accounting_document_items.cost_center IS 'Cost center assignment for document splitting';
COMMENT ON COLUMN accounting_document_items.split_document_id IS 'Reference to original document if this item was created by splitting';
COMMENT ON COLUMN accounting_document_items.split_characteristic_value IS 'Value of the characteristic used for splitting this item';

