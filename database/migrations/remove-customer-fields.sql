-- Remove fields from customer master table
-- Fields to remove: sort_key, cash_discount_terms, payment_guarantee_procedure, posting_block, alternative_payee

ALTER TABLE erp_customers DROP COLUMN IF EXISTS sort_key;
ALTER TABLE erp_customers DROP COLUMN IF EXISTS cash_discount_terms;
ALTER TABLE erp_customers DROP COLUMN IF EXISTS payment_guarantee_procedure;
ALTER TABLE erp_customers DROP COLUMN IF EXISTS posting_block;
ALTER TABLE erp_customers DROP COLUMN IF EXISTS alternative_payee;

