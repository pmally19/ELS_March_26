-- Migration: Enhance Customer Master for Multiple Address Types
-- Date: 2024-10-12
-- Description: Add fields to support sold-to, ship-to, and bill-to addresses in Customer Master

-- Add additional address fields to the main customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_address_line_1 VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_address_line_2 VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_city VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_state VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_country VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_postal_code VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_contact_person VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_phone VARCHAR(30);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_email VARCHAR(100);

ALTER TABLE customers ADD COLUMN IF NOT EXISTS shipping_address_line_1 VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shipping_address_line_2 VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shipping_city VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shipping_state VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shipping_country VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shipping_postal_code VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shipping_contact_person VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shipping_phone VARCHAR(30);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shipping_email VARCHAR(100);

-- Add flags to indicate which addresses are different from the main address
ALTER TABLE customers ADD COLUMN IF NOT EXISTS use_separate_billing_address BOOLEAN DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS use_separate_shipping_address BOOLEAN DEFAULT FALSE;

-- Add address relationship preferences
ALTER TABLE customers ADD COLUMN IF NOT EXISTS default_address_setup VARCHAR(50) DEFAULT 'standard'; -- 'standard', 'drop_ship', 'consignment'
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address_notes TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_billing_address ON customers(billing_city, billing_state, billing_country);
CREATE INDEX IF NOT EXISTS idx_customers_shipping_address ON customers(shipping_city, shipping_state, shipping_country);
CREATE INDEX IF NOT EXISTS idx_customers_address_setup ON customers(default_address_setup);

-- Add comments for documentation
COMMENT ON COLUMN customers.billing_address_line_1 IS 'Primary billing address line';
COMMENT ON COLUMN customers.billing_city IS 'Billing address city';
COMMENT ON COLUMN customers.billing_state IS 'Billing address state/province';
COMMENT ON COLUMN customers.billing_country IS 'Billing address country';
COMMENT ON COLUMN customers.billing_postal_code IS 'Billing address postal code';
COMMENT ON COLUMN customers.billing_contact_person IS 'Contact person for billing';
COMMENT ON COLUMN customers.billing_phone IS 'Phone number for billing contact';
COMMENT ON COLUMN customers.billing_email IS 'Email for billing contact';

COMMENT ON COLUMN customers.shipping_address_line_1 IS 'Primary shipping address line';
COMMENT ON COLUMN customers.shipping_city IS 'Shipping address city';
COMMENT ON COLUMN customers.shipping_state IS 'Shipping address state/province';
COMMENT ON COLUMN customers.shipping_country IS 'Shipping address country';
COMMENT ON COLUMN customers.shipping_postal_code IS 'Shipping address postal code';
COMMENT ON COLUMN customers.shipping_contact_person IS 'Contact person for shipping';
COMMENT ON COLUMN customers.shipping_phone IS 'Phone number for shipping contact';
COMMENT ON COLUMN customers.shipping_email IS 'Email for shipping contact';

COMMENT ON COLUMN customers.use_separate_billing_address IS 'Flag to indicate if billing address is different from main address';
COMMENT ON COLUMN customers.use_separate_shipping_address IS 'Flag to indicate if shipping address is different from main address';
COMMENT ON COLUMN customers.default_address_setup IS 'Default address relationship setup: standard, drop_ship, consignment';
COMMENT ON COLUMN customers.address_notes IS 'Notes about customer address preferences';

-- Create a function to get the appropriate address based on type
CREATE OR REPLACE FUNCTION get_customer_address(
    p_customer_id INTEGER,
    p_address_type VARCHAR(20) -- 'sold_to', 'ship_to', 'bill_to'
)
RETURNS TABLE (
    address_line_1 TEXT,
    address_line_2 TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    postal_code TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN p_address_type = 'bill_to' AND c.use_separate_billing_address THEN c.billing_address_line_1::TEXT
            WHEN p_address_type = 'ship_to' AND c.use_separate_shipping_address THEN c.shipping_address_line_1::TEXT
            ELSE c.address::TEXT
        END as address_line_1,
        CASE 
            WHEN p_address_type = 'bill_to' AND c.use_separate_billing_address THEN c.billing_address_line_2::TEXT
            WHEN p_address_type = 'ship_to' AND c.use_separate_shipping_address THEN c.shipping_address_line_2::TEXT
            ELSE NULL::TEXT
        END as address_line_2,
        CASE 
            WHEN p_address_type = 'bill_to' AND c.use_separate_billing_address THEN c.billing_city::TEXT
            WHEN p_address_type = 'ship_to' AND c.use_separate_shipping_address THEN c.shipping_city::TEXT
            ELSE c.city::TEXT
        END as city,
        CASE 
            WHEN p_address_type = 'bill_to' AND c.use_separate_billing_address THEN c.billing_state::TEXT
            WHEN p_address_type = 'ship_to' AND c.use_separate_shipping_address THEN c.shipping_state::TEXT
            ELSE c.state::TEXT
        END as state,
        CASE 
            WHEN p_address_type = 'bill_to' AND c.use_separate_billing_address THEN c.billing_country::TEXT
            WHEN p_address_type = 'ship_to' AND c.use_separate_shipping_address THEN c.shipping_country::TEXT
            ELSE c.country::TEXT
        END as country,
        CASE 
            WHEN p_address_type = 'bill_to' AND c.use_separate_billing_address THEN c.billing_postal_code::TEXT
            WHEN p_address_type = 'ship_to' AND c.use_separate_shipping_address THEN c.shipping_postal_code::TEXT
            ELSE c.postal_code::TEXT
        END as postal_code,
        CASE 
            WHEN p_address_type = 'bill_to' AND c.use_separate_billing_address THEN c.billing_contact_person::TEXT
            WHEN p_address_type = 'ship_to' AND c.use_separate_shipping_address THEN c.shipping_contact_person::TEXT
            ELSE c.name::TEXT
        END as contact_person,
        CASE 
            WHEN p_address_type = 'bill_to' AND c.use_separate_billing_address THEN c.billing_phone::TEXT
            WHEN p_address_type = 'ship_to' AND c.use_separate_shipping_address THEN c.shipping_phone::TEXT
            ELSE c.phone::TEXT
        END as phone,
        CASE 
            WHEN p_address_type = 'bill_to' AND c.use_separate_billing_address THEN c.billing_email::TEXT
            WHEN p_address_type = 'ship_to' AND c.use_separate_shipping_address THEN c.shipping_email::TEXT
            ELSE c.email::TEXT
        END as email
    FROM customers c
    WHERE c.id = p_customer_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments for the function
COMMENT ON FUNCTION get_customer_address(INTEGER, VARCHAR(20)) IS 'Returns the appropriate address for a customer based on address type (sold_to, ship_to, bill_to)';
