-- Migration: Remove customers table and integrate with erp_customers
-- Date: 2024-10-12
-- Description: Safely remove the customers table and update all references to use erp_customers

-- Step 1: Drop all foreign key constraints that reference the customers table
ALTER TABLE accounts_receivable DROP CONSTRAINT IF EXISTS accounts_receivable_customer_id_fkey;
ALTER TABLE ar_documents DROP CONSTRAINT IF EXISTS ar_documents_customer_id_fkey;
ALTER TABLE collection_activities DROP CONSTRAINT IF EXISTS collection_activities_customer_id_fkey;
ALTER TABLE customer_bank_relationships DROP CONSTRAINT IF EXISTS customer_bank_relationships_customer_id_fkey;
ALTER TABLE customer_credit_management DROP CONSTRAINT IF EXISTS customer_credit_management_customer_id_fkey;
ALTER TABLE copa_actuals DROP CONSTRAINT IF EXISTS fk_copa_customer;
ALTER TABLE customer_contacts DROP CONSTRAINT IF EXISTS fk_customer;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_customer_id_customers_id_fk;
ALTER TABLE customer_addresses DROP CONSTRAINT IF EXISTS fk_customer_addresses_customer;
ALTER TABLE customer_address_relationships DROP CONSTRAINT IF EXISTS fk_customer_address_relationships_customer;

-- Step 2: Drop the customers table
DROP TABLE IF EXISTS customers CASCADE;

-- Step 3: Add new foreign key constraints to reference erp_customers instead
ALTER TABLE accounts_receivable 
ADD CONSTRAINT accounts_receivable_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES erp_customers(id);

ALTER TABLE ar_documents 
ADD CONSTRAINT ar_documents_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES erp_customers(id);

ALTER TABLE collection_activities 
ADD CONSTRAINT collection_activities_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES erp_customers(id);

ALTER TABLE customer_bank_relationships 
ADD CONSTRAINT customer_bank_relationships_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES erp_customers(id);

ALTER TABLE customer_credit_management 
ADD CONSTRAINT customer_credit_management_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES erp_customers(id);

ALTER TABLE copa_actuals 
ADD CONSTRAINT fk_copa_customer 
FOREIGN KEY (customer_id) REFERENCES erp_customers(id);

ALTER TABLE customer_contacts 
ADD CONSTRAINT fk_customer 
FOREIGN KEY (customer_id) REFERENCES erp_customers(id) ON DELETE CASCADE;

ALTER TABLE orders 
ADD CONSTRAINT orders_customer_id_erp_customers_id_fk 
FOREIGN KEY (customer_id) REFERENCES erp_customers(id);

ALTER TABLE customer_addresses 
ADD CONSTRAINT fk_customer_addresses_erp_customer 
FOREIGN KEY (customer_id) REFERENCES erp_customers(id) ON DELETE CASCADE;

ALTER TABLE customer_address_relationships 
ADD CONSTRAINT fk_customer_address_relationships_erp_customer 
FOREIGN KEY (customer_id) REFERENCES erp_customers(id) ON DELETE CASCADE;

-- Add comments for documentation
COMMENT ON TABLE erp_customers IS 'Master customer table - integrated from customers table';
