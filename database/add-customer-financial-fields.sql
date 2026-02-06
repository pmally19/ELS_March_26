-- Add critical missing financial fields to customer master
-- This migration adds SAP-equivalent financial information fields

-- Add financial fields to customers table
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

-- Add financial fields to erp_customers table
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS reconciliation_account_code VARCHAR(10);
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS dunning_procedure VARCHAR(20);
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS dunning_block BOOLEAN DEFAULT FALSE;
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS payment_block BOOLEAN DEFAULT FALSE;
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS cash_discount_terms VARCHAR(50);
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS payment_guarantee_procedure VARCHAR(20);
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS credit_control_area VARCHAR(10);
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS risk_category VARCHAR(20);
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS credit_limit_currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS credit_exposure NUMERIC(15,2) DEFAULT 0;
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS credit_check_procedure VARCHAR(20);
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS tax_classification_code VARCHAR(10);
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS tax_exemption_certificate VARCHAR(50);
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS withholding_tax_code VARCHAR(10);
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS tax_jurisdiction VARCHAR(50);
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50);
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS bank_routing_number VARCHAR(20);
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS electronic_payment_method VARCHAR(20);
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS posting_block BOOLEAN DEFAULT FALSE;
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS deletion_flag BOOLEAN DEFAULT FALSE;
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS authorization_group VARCHAR(20);
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS alternative_payee VARCHAR(100);

-- Add financial fields to sales_customers table
ALTER TABLE sales_customers ADD COLUMN IF NOT EXISTS reconciliation_account_code VARCHAR(10);
ALTER TABLE sales_customers ADD COLUMN IF NOT EXISTS dunning_procedure VARCHAR(20);
ALTER TABLE sales_customers ADD COLUMN IF NOT EXISTS dunning_block BOOLEAN DEFAULT FALSE;
ALTER TABLE sales_customers ADD COLUMN IF NOT EXISTS payment_block BOOLEAN DEFAULT FALSE;
ALTER TABLE sales_customers ADD COLUMN IF NOT EXISTS cash_discount_terms VARCHAR(50);
ALTER TABLE sales_customers ADD COLUMN IF NOT EXISTS payment_guarantee_procedure VARCHAR(20);
ALTER TABLE sales_customers ADD COLUMN IF NOT EXISTS credit_control_area VARCHAR(10);
ALTER TABLE sales_customers ADD COLUMN IF NOT EXISTS risk_category VARCHAR(20);
ALTER TABLE sales_customers ADD COLUMN IF NOT EXISTS credit_limit_currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE sales_customers ADD COLUMN IF NOT EXISTS credit_exposure NUMERIC(15,2) DEFAULT 0;
ALTER TABLE sales_customers ADD COLUMN IF NOT EXISTS credit_check_procedure VARCHAR(20);
ALTER TABLE sales_customers ADD COLUMN IF NOT EXISTS tax_classification_code VARCHAR(10);
ALTER TABLE sales_customers ADD COLUMN IF NOT EXISTS tax_exemption_certificate VARCHAR(50);
ALTER TABLE sales_customers ADD COLUMN IF NOT EXISTS withholding_tax_code VARCHAR(10);
ALTER TABLE sales_customers ADD COLUMN IF NOT EXISTS tax_jurisdiction VARCHAR(50);
ALTER TABLE sales_customers ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50);
ALTER TABLE sales_customers ADD COLUMN IF NOT EXISTS bank_routing_number VARCHAR(20);
ALTER TABLE sales_customers ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE sales_customers ADD COLUMN IF NOT EXISTS electronic_payment_method VARCHAR(20);
ALTER TABLE sales_customers ADD COLUMN IF NOT EXISTS posting_block BOOLEAN DEFAULT FALSE;
ALTER TABLE sales_customers ADD COLUMN IF NOT EXISTS deletion_flag BOOLEAN DEFAULT FALSE;
ALTER TABLE sales_customers ADD COLUMN IF NOT EXISTS authorization_group VARCHAR(20);
ALTER TABLE sales_customers ADD COLUMN IF NOT EXISTS alternative_payee VARCHAR(100);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_reconciliation_account ON customers(reconciliation_account_code);
CREATE INDEX IF NOT EXISTS idx_customers_credit_control ON customers(credit_control_area);
CREATE INDEX IF NOT EXISTS idx_customers_risk_category ON customers(risk_category);
CREATE INDEX IF NOT EXISTS idx_customers_payment_block ON customers(payment_block);
CREATE INDEX IF NOT EXISTS idx_customers_dunning_block ON customers(dunning_block);

CREATE INDEX IF NOT EXISTS idx_erp_customers_reconciliation_account ON erp_customers(reconciliation_account_code);
CREATE INDEX IF NOT EXISTS idx_erp_customers_credit_control ON erp_customers(credit_control_area);
CREATE INDEX IF NOT EXISTS idx_erp_customers_risk_category ON erp_customers(risk_category);
CREATE INDEX IF NOT EXISTS idx_erp_customers_payment_block ON erp_customers(payment_block);
CREATE INDEX IF NOT EXISTS idx_erp_customers_dunning_block ON erp_customers(dunning_block);

CREATE INDEX IF NOT EXISTS idx_sales_customers_reconciliation_account ON sales_customers(reconciliation_account_code);
CREATE INDEX IF NOT EXISTS idx_sales_customers_credit_control ON sales_customers(credit_control_area);
CREATE INDEX IF NOT EXISTS idx_sales_customers_risk_category ON sales_customers(risk_category);
CREATE INDEX IF NOT EXISTS idx_sales_customers_payment_block ON sales_customers(payment_block);
CREATE INDEX IF NOT EXISTS idx_sales_customers_dunning_block ON sales_customers(dunning_block);

-- Add comments for documentation
COMMENT ON COLUMN customers.reconciliation_account_code IS 'GL reconciliation account for customer transactions';
COMMENT ON COLUMN customers.dunning_procedure IS 'Procedure for overdue payment reminders';
COMMENT ON COLUMN customers.dunning_block IS 'Block dunning for this customer';
COMMENT ON COLUMN customers.payment_block IS 'Block payments for this customer';
COMMENT ON COLUMN customers.cash_discount_terms IS 'Cash discount conditions';
COMMENT ON COLUMN customers.payment_guarantee_procedure IS 'Payment guarantee setup';
COMMENT ON COLUMN customers.credit_control_area IS 'Credit management area';
COMMENT ON COLUMN customers.risk_category IS 'Customer risk classification';
COMMENT ON COLUMN customers.credit_limit_currency IS 'Currency for credit limit';
COMMENT ON COLUMN customers.credit_exposure IS 'Current credit exposure amount';
COMMENT ON COLUMN customers.credit_check_procedure IS 'Credit check process';
COMMENT ON COLUMN customers.tax_classification_code IS 'Detailed tax classification';
COMMENT ON COLUMN customers.tax_exemption_certificate IS 'Tax exemption details';
COMMENT ON COLUMN customers.withholding_tax_code IS 'Tax withholding requirements';
COMMENT ON COLUMN customers.tax_jurisdiction IS 'Tax jurisdiction information';
COMMENT ON COLUMN customers.bank_account_number IS 'Customer bank account number';
COMMENT ON COLUMN customers.bank_routing_number IS 'Bank routing information';
COMMENT ON COLUMN customers.bank_name IS 'Customer bank name';
COMMENT ON COLUMN customers.electronic_payment_method IS 'Preferred electronic payment method';
COMMENT ON COLUMN customers.posting_block IS 'Block financial postings';
COMMENT ON COLUMN customers.deletion_flag IS 'Mark for deletion';
COMMENT ON COLUMN customers.authorization_group IS 'Authorization group for access control';
COMMENT ON COLUMN customers.alternative_payee IS 'Alternative payee information';
