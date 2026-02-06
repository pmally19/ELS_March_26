-- Migration: Create Item Category Determination Table
-- Date: 2026-01-17
-- Purpose: Implement SAP SD Item Category Determination for sales order processing

-- Drop existing table if exists (for clean migration)
DROP TABLE IF EXISTS item_category_determination CASCADE;

-- Create item_category_determination table
CREATE TABLE item_category_determination (
    id SERIAL PRIMARY KEY,
    
    -- Determination Key Fields (SAP: TVAK)
    sales_document_type VARCHAR(4) NOT NULL,      -- Sales Document Type (e.g., 'OR', 'TA')
    item_category_group VARCHAR(4) NOT NULL,      -- Item Category Group from Material (MTPOS)
    usage VARCHAR(4),                              -- Usage indicator (optional)
    higher_level_item_category VARCHAR(4),         -- Higher-level item category (for sub-items)
    
    -- Result Field
    item_category VARCHAR(4) NOT NULL,             -- Determined Item Category (e.g., 'TAN', 'TAD')
    
    -- Additional Fields
    description TEXT,                              -- Description of this determination rule
    is_active BOOLEAN DEFAULT true NOT NULL,       -- Active status
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Unique constraint: Each combination should be unique
    CONSTRAINT uk_item_cat_det_combination UNIQUE (
        sales_document_type, 
        item_category_group, 
        COALESCE(usage, ''), 
        COALESCE(higher_level_item_category, '')
    )
);

-- Create indexes for performance
CREATE INDEX idx_item_cat_det_sales_doc_type ON item_category_determination(sales_document_type);
CREATE INDEX idx_item_cat_det_item_cat_group ON item_category_determination(item_category_group);
CREATE INDEX idx_item_cat_det_item_category ON item_category_determination(item_category);
CREATE INDEX idx_item_cat_det_active ON item_category_determination(is_active);

-- Add foreign key constraint to item_category_groups table
ALTER TABLE item_category_determination 
    ADD CONSTRAINT fk_item_cat_det_item_cat_group 
    FOREIGN KEY (item_category_group) 
    REFERENCES item_category_groups(group_code)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- Add comment to table
COMMENT ON TABLE item_category_determination IS 'SAP SD Item Category Determination table';

-- Add comments to columns
COMMENT ON COLUMN item_category_determination.sales_document_type IS 'Sales Document Type';
COMMENT ON COLUMN item_category_determination.item_category_group IS 'Item Category Group from Material Master';
COMMENT ON COLUMN item_category_determination.usage IS 'Usage indicator for special processing';
COMMENT ON COLUMN item_category_determination.higher_level_item_category IS 'Higher-level item category for sub-items';
COMMENT ON COLUMN item_category_determination.item_category IS 'Resulting item category to be assigned';

-- Insert standard item category determination data (using business-friendly codes, no SAP terminology)
INSERT INTO item_category_determination (
    sales_document_type,
    item_category_group,
    usage,
    higher_level_item_category,
    item_category,
    description,
    is_active
) VALUES
    ('STANDARD', 'NORM', NULL, NULL, 'STD', 'Standard Order - Normal Item', true),
    ('STANDARD', 'DIEN', NULL, NULL, 'SVC', 'Standard Order - Service Item', true),
    ('STANDARD', 'TEXT', NULL, NULL, 'TXT', 'Standard Order - Text Item', true),
    ('STANDARD', 'VERP', NULL, NULL, 'PKG', 'Standard Order - Packaging Material', true),
    ('RETURN', 'NORM', NULL, NULL, 'RET', 'Returns - Normal Item', true),
    ('RETURN', 'DIEN', NULL, NULL, 'RETSVC', 'Returns - Service Item', true),
    ('QUOTE', 'NORM', NULL, NULL, 'QN', 'Quotation - Normal Item', true),
    ('QUOTE', 'DIEN', NULL, NULL, 'QS', 'Quotation - Service Item', true),
    ('CONTRACT', 'NORM', NULL, NULL, 'CN', 'Contract - Normal Item', true),
    ('CONTRACT', 'DIEN', NULL, NULL, 'CS', 'Contract - Service Item', true),
    ('SCHEDULE', 'NORM', NULL, NULL, 'SCH', 'Scheduling Agreement - Normal Item', true),
    ('CASH', 'NORM', NULL, NULL, 'CSH', 'Cash Sales - Normal Item', true),
    ('RUSH', 'NORM', NULL, NULL, 'RUSH', 'Rush Order - Normal Item', true),
    ('CREDIT', 'NORM', NULL, NULL, 'CR', 'Credit Memo - Normal Item', true),
    ('DEBIT', 'NORM', NULL, NULL, 'DB', 'Debit Memo - Normal Item', true),
    ('STANDARD', 'NORM', 'CHSP', NULL, 'FREE', 'Standard Order - Free Goods Item', true),
    ('CONSIGN_FILL', 'NORM', NULL, NULL, 'CFILL', 'Consignment Fill-Up - Normal Item', true),
    ('CONSIGN_PICK', 'NORM', NULL, NULL, 'CPICK', 'Consignment Pick-Up - Normal Item', true),
    ('SAMPLE', 'NORM', NULL, NULL, 'SMPL', 'Sample Order - Normal Item', true),
    ('INTERCO', 'NORM', NULL, NULL, 'IC', 'Inter-company Order - Normal Item', true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_item_category_determination_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_item_category_determination_updated_at
    BEFORE UPDATE ON item_category_determination
    FOR EACH ROW
    EXECUTE FUNCTION update_item_category_determination_updated_at();
