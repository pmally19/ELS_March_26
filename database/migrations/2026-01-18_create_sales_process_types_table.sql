-- Create sales_process_types master data table
-- This table stores the different process types (ORDER, DELIVERY, BILLING)
-- and can be extended in the future if needed

CREATE TABLE IF NOT EXISTS sales_process_types (
    id SERIAL PRIMARY KEY,
    process_code VARCHAR(20) NOT NULL UNIQUE,
    process_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_sales_process_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sales_process_types_updated_at
    BEFORE UPDATE ON sales_process_types
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_process_types_updated_at();

-- Insert the 3 standard process types
INSERT INTO sales_process_types (process_code, process_name, description) VALUES
('ORDER', 'Order Processing', 'For sales orders, quotations, contracts, and other ordering processes'),
('DELIVERY', 'Delivery Processing', 'For delivery notes, goods receipts, and shipping documents'),
('BILLING', 'Billing Processing', 'For invoices, credit memos, debit memos, and other billing documents')
ON CONFLICT (process_code) DO NOTHING;

-- Now update sales_document_categories to reference this table
-- First, add the foreign key column (nullable initially)
ALTER TABLE sales_document_categories 
ADD COLUMN IF NOT EXISTS sales_process_type_id INTEGER;

-- Populate the FK based on existing sales_process_type values
UPDATE sales_document_categories sdc
SET sales_process_type_id = spt.id
FROM sales_process_types spt
WHERE sdc.sales_process_type = spt.process_code;

-- Make it NOT NULL after populating
ALTER TABLE sales_document_categories 
ALTER COLUMN sales_process_type_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE sales_document_categories
ADD CONSTRAINT fk_sales_process_type
FOREIGN KEY (sales_process_type_id) REFERENCES sales_process_types(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_sales_doc_cat_process_type_id 
ON sales_document_categories(sales_process_type_id);

-- Verification
SELECT sdc.id, sdc.category_code, sdc.category_name, 
       spt.process_code, spt.process_name
FROM sales_document_categories sdc
JOIN sales_process_types spt ON sdc.sales_process_type_id = spt.id
ORDER BY spt.process_code, sdc.category_code
LIMIT 10;
