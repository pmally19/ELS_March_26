-- Add reference column to billing_documents table if it doesn't exist
ALTER TABLE billing_documents 
ADD COLUMN IF NOT EXISTS reference VARCHAR(255);

-- Add company_code_id column if it doesn't exist
ALTER TABLE billing_documents 
ADD COLUMN IF NOT EXISTS company_code_id INTEGER;

-- Add index on company_code_id if column exists
CREATE INDEX IF NOT EXISTS idx_billing_documents_company_code_id 
ON billing_documents(company_code_id);

COMMENT ON COLUMN billing_documents.reference IS 'Optional reference number or text for the billing document';

