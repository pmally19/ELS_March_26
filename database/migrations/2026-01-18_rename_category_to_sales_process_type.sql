-- Migration: Rename category column to sales_process_type
-- This provides better semantic meaning

-- Rename the column
ALTER TABLE sales_document_categories 
RENAME COLUMN category TO sales_process_type;

-- Drop old constraint and create new one with updated name
ALTER TABLE sales_document_categories
DROP CONSTRAINT IF EXISTS sales_doc_cat_category_check;

ALTER TABLE sales_document_categories
ADD CONSTRAINT sales_doc_cat_process_type_check 
CHECK (sales_process_type IN ('ORDER', 'DELIVERY', 'BILLING'));

-- Drop old index and create new one
DROP INDEX IF EXISTS idx_sales_doc_cat_category;

CREATE INDEX idx_sales_doc_cat_process_type 
ON sales_document_categories(sales_process_type);

-- Verification
SELECT id, category_code, category_name, sales_process_type
FROM sales_document_categories 
ORDER BY sales_process_type, id;
