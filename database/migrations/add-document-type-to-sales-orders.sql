-- Migration: Add document_type column to sales_orders table
-- Date: 2025-11-18
-- Purpose: Support document types from sd_document_types table for sales orders

-- Add document_type column to sales_orders table
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS document_type VARCHAR(10);

-- Add comment
COMMENT ON COLUMN sales_orders.document_type IS 'Document type code from sd_document_types table (category=ORDER)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_sales_orders_document_type 
ON sales_orders(document_type);

-- Add foreign key constraint to sd_document_types (optional, can be removed if needed)
-- ALTER TABLE sales_orders
-- ADD CONSTRAINT fk_sales_orders_document_type 
-- FOREIGN KEY (document_type) 
-- REFERENCES sd_document_types(code) 
-- ON DELETE SET NULL;

