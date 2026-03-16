-- Migration: Fix document_flow column lengths
-- Date: 2025-10-28
-- Description: Increase document type columns to allow full document type names

-- Alter the document type columns to allow longer names
ALTER TABLE document_flow 
ALTER COLUMN source_document_type TYPE VARCHAR(20);

ALTER TABLE document_flow 
ALTER COLUMN target_document_type TYPE VARCHAR(20);

-- Add comments
COMMENT ON COLUMN document_flow.source_document_type IS 'Source document type (e.g., SALES_ORDER, DELIVERY, BILLING)';
COMMENT ON COLUMN document_flow.target_document_type IS 'Target document type (e.g., DELIVERY, BILLING, PAYMENT)';

