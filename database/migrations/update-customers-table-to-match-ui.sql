-- Migration: Update customers table to match UI requirements
-- Date: 2024-10-12
-- Description: Add missing fields to customers table to match CustomerMaster UI

-- Add missing fields to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_code VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'Business';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS industry VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS segment VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS state VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS country VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS region VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS alt_phone VARCHAR(30);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit_group_id INTEGER;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS discount_group VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS price_group VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS incoterms VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shipping_method VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS delivery_terms VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS delivery_route VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sales_rep_id INTEGER;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS parent_customer_id INTEGER;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_b2b BOOLEAN DEFAULT true;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_b2c BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_code_id INTEGER;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_by INTEGER;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add financial enhancement fields (if not already added)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS reconciliation_account_code VARCHAR(10);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS dunning_procedure VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS dunning_block BOOLEAN DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS payment_block BOOLEAN DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS cash_discount_terms VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS payment_guarantee_procedure VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_control_area VARCHAR(10);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS risk_category VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit_currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_exposure NUMERIC(15,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_check_procedure VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_classification_code VARCHAR(10);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_exemption_certificate VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS withholding_tax_code VARCHAR(10);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_jurisdiction VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS bank_routing_number VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS electronic_payment_method VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS posting_block BOOLEAN DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS deletion_flag BOOLEAN DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS authorization_group VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS alternative_payee VARCHAR(100);

-- Update existing records to have default values
UPDATE customers SET 
  customer_code = COALESCE(customer_code, 'CUST' || LPAD(id::text, 6, '0')),
  type = COALESCE(type, 'Business'),
  currency = COALESCE(currency, 'USD'),
  status = COALESCE(status, 'active'),
  is_b2b = COALESCE(is_b2b, true),
  is_b2c = COALESCE(is_b2c, false),
  is_vip = COALESCE(is_vip, false),
  version = COALESCE(version, 1),
  credit_limit_currency = COALESCE(credit_limit_currency, 'USD'),
  credit_exposure = COALESCE(credit_exposure, 0)
WHERE customer_code IS NULL OR type IS NULL OR currency IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_customer_code ON customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(type);
CREATE INDEX IF NOT EXISTS idx_customers_industry ON customers(industry);
CREATE INDEX IF NOT EXISTS idx_customers_segment ON customers(segment);
CREATE INDEX IF NOT EXISTS idx_customers_country ON customers(country);
CREATE INDEX IF NOT EXISTS idx_customers_company_code_id ON customers(company_code_id);
CREATE INDEX IF NOT EXISTS idx_customers_credit_limit_group_id ON customers(credit_limit_group_id);
CREATE INDEX IF NOT EXISTS idx_customers_sales_rep_id ON customers(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_customers_parent_customer_id ON customers(parent_customer_id);

-- Add comments for documentation
COMMENT ON COLUMN customers.customer_code IS 'Unique customer code identifier';
COMMENT ON COLUMN customers.type IS 'Customer type (Business, Individual, etc.)';
COMMENT ON COLUMN customers.industry IS 'Customer industry classification';
COMMENT ON COLUMN customers.segment IS 'Customer market segment';
COMMENT ON COLUMN customers.credit_limit_group_id IS 'Reference to credit limit group';
COMMENT ON COLUMN customers.sales_rep_id IS 'Assigned sales representative';
COMMENT ON COLUMN customers.parent_customer_id IS 'Parent customer for hierarchical relationships';
COMMENT ON COLUMN customers.is_b2b IS 'Business-to-business customer flag';
COMMENT ON COLUMN customers.is_b2c IS 'Business-to-consumer customer flag';
COMMENT ON COLUMN customers.is_vip IS 'VIP customer status flag';
COMMENT ON COLUMN customers.tags IS 'Customer tags for categorization';
COMMENT ON COLUMN customers.company_code_id IS 'Associated company code';
COMMENT ON COLUMN customers.version IS 'Record version for optimistic locking';
