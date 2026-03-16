-- Migration: Add category column to sales_document_categories
-- Purpose: Enable dynamic category determination without hardcoded mappings

-- Step 1: Add the category column (nullable initially)
ALTER TABLE sales_document_categories 
ADD COLUMN IF NOT EXISTS category VARCHAR(20);

-- Step 2: Populate category based on document purpose
-- ORDER category: For ordering processes (inquiry, order, returns, contracts, etc.)
UPDATE sales_document_categories SET category = 'ORDER' 
WHERE id IN (1, 3, 4, 7, 8, 13, 14);  
-- Inquiry, Order, Returns, Contract, Scheduling Agreement, Sample Request, Complaint

-- BILLING category: For billing/invoicing documents  
UPDATE sales_document_categories SET category = 'BILLING'
WHERE id IN (5, 6, 9, 10);
-- Credit Memo, Debit Memo, Invoice, Proforma Invoice

-- DELIVERY category: For delivery/goods movement documents
UPDATE sales_document_categories SET category = 'DELIVERY'
WHERE id IN (11, 12);
-- Delivery Note, Goods Receipt

-- Step 3: Add check constraint to ensure only valid categories
ALTER TABLE sales_document_categories
ADD CONSTRAINT sales_doc_cat_category_check 
CHECK (category IN ('ORDER', 'DELIVERY', 'BILLING'));

-- Step 4: Make category NOT NULL after populating all data
ALTER TABLE sales_document_categories 
ALTER COLUMN category SET NOT NULL;

-- Step 5: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_sales_doc_cat_category 
ON sales_document_categories(category);

-- Verification: Show results
SELECT id, category_code, category_name, category,
       delivery_relevant, billing_relevant
FROM sales_document_categories 
ORDER BY category, id;
