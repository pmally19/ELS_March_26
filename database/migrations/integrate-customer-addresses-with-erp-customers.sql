-- Migration: Integrate customer addresses with erp_customers and remove customers table
-- Date: 2024-10-12
-- Description: Migrate customers to erp_customers, update customer_addresses references, then remove customers table

-- Step 1: Migrate customers that don't exist in erp_customers
INSERT INTO erp_customers (
    customer_code, name, type, description, address, city, state, country, 
    postal_code, phone, email, website, currency, payment_terms, 
    credit_limit, credit_rating, status, is_active, company_code_id, 
    created_at, updated_at
)
SELECT 
    COALESCE(c.code, 'CUST' || LPAD(c.id::text, 6, '0')) as customer_code,
    c.name,
    COALESCE(c.type, 'Business') as type,
    c.description,
    c.address,
    c.city,
    c.state,
    c.country,
    c.postal_code,
    c.phone,
    c.email,
    c.website,
    COALESCE(c.currency, 'USD') as currency,
    c.payment_terms,
    c.credit_limit,
    c.credit_rating,
    COALESCE(c.status, 'active') as status,
    COALESCE(c.is_active, true) as is_active,
    c.company_code_id,
    COALESCE(c.created_at, NOW()) as created_at,
    COALESCE(c.updated_at, NOW()) as updated_at
FROM customers c
WHERE NOT EXISTS (
    SELECT 1 FROM erp_customers ec 
    WHERE ec.name = c.name
);

-- Step 2: Create a mapping table for customer ID updates
CREATE TEMP TABLE customer_id_mapping AS
SELECT DISTINCT
    c.id as old_customer_id,
    ec.id as new_erp_customer_id,
    c.name
FROM customers c
JOIN erp_customers ec ON ec.name = c.name
WHERE ec.id = (
    SELECT ec2.id 
    FROM erp_customers ec2 
    WHERE ec2.name = c.name
    ORDER BY ec2.id 
    LIMIT 1
);

-- Step 3: Drop foreign key constraints temporarily
ALTER TABLE customer_addresses DROP CONSTRAINT IF EXISTS fk_customer_addresses_customer;
ALTER TABLE customer_address_relationships DROP CONSTRAINT IF EXISTS fk_customer_address_relationships_customer;

-- Step 4: Update customer_addresses to reference erp_customers
UPDATE customer_addresses 
SET customer_id = (
    SELECT new_erp_customer_id 
    FROM customer_id_mapping 
    WHERE old_customer_id = customer_addresses.customer_id
)
WHERE customer_id IN (SELECT old_customer_id FROM customer_id_mapping);

-- Step 5: Update customer_address_relationships to reference erp_customers
UPDATE customer_address_relationships 
SET customer_id = (
    SELECT new_erp_customer_id 
    FROM customer_id_mapping 
    WHERE old_customer_id = customer_address_relationships.customer_id
)
WHERE customer_id IN (SELECT old_customer_id FROM customer_id_mapping);

-- Step 6: Drop all remaining foreign key constraints that reference customers table
ALTER TABLE accounts_receivable DROP CONSTRAINT IF EXISTS accounts_receivable_customer_id_fkey;
ALTER TABLE ar_documents DROP CONSTRAINT IF EXISTS ar_documents_customer_id_fkey;
ALTER TABLE collection_activities DROP CONSTRAINT IF EXISTS collection_activities_customer_id_fkey;
ALTER TABLE customer_bank_relationships DROP CONSTRAINT IF EXISTS customer_bank_relationships_customer_id_fkey;
ALTER TABLE customer_credit_management DROP CONSTRAINT IF EXISTS customer_credit_management_customer_id_fkey;
ALTER TABLE copa_actuals DROP CONSTRAINT IF EXISTS fk_copa_customer;
ALTER TABLE customer_contacts DROP CONSTRAINT IF EXISTS fk_customer;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_customer_id_customers_id_fk;

-- Step 7: Drop the customers table
DROP TABLE IF EXISTS customers CASCADE;

-- Step 8: Add new foreign key constraints to reference erp_customers
ALTER TABLE customer_addresses 
ADD CONSTRAINT fk_customer_addresses_erp_customer 
FOREIGN KEY (customer_id) REFERENCES erp_customers(id) ON DELETE CASCADE;

ALTER TABLE customer_address_relationships 
ADD CONSTRAINT fk_customer_address_relationships_erp_customer 
FOREIGN KEY (customer_id) REFERENCES erp_customers(id) ON DELETE CASCADE;

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

-- Step 9: Clean up temporary table
DROP TABLE IF EXISTS customer_id_mapping;

-- Add comments for documentation
COMMENT ON TABLE erp_customers IS 'Master customer table - integrated from customers table';
COMMENT ON TABLE customer_addresses IS 'Customer addresses now reference erp_customers table';
COMMENT ON TABLE customer_address_relationships IS 'Customer address relationships now reference erp_customers table';
