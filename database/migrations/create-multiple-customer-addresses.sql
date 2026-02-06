-- Migration: Create Multiple Customer Addresses System
-- Date: 2024-10-15
-- Description: Create tables for managing multiple addresses per customer (sold-to, bill-to, ship-to, payer-to)

-- Create customer_addresses table for storing multiple addresses per customer
CREATE TABLE IF NOT EXISTS customer_addresses (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    address_type VARCHAR(20) NOT NULL CHECK (address_type IN ('sold_to', 'bill_to', 'ship_to', 'payer_to')),
    address_name VARCHAR(100) NOT NULL, -- User-friendly name like "Main Office", "Warehouse", "Billing HQ"
    contact_person VARCHAR(100),
    company_name VARCHAR(100),
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50),
    country VARCHAR(50) NOT NULL,
    postal_code VARCHAR(20),
    region VARCHAR(50),
    phone VARCHAR(30),
    email VARCHAR(100),
    is_primary BOOLEAN DEFAULT FALSE, -- Primary address for this type
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    created_by INTEGER,
    updated_by INTEGER,
    
    -- Foreign key constraints
    CONSTRAINT fk_customer_addresses_customer 
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Unique constraint: only one primary address per type per customer
    CONSTRAINT uk_customer_addresses_primary 
        UNIQUE (customer_id, address_type, is_primary) 
        DEFERRABLE INITIALLY DEFERRED
);

-- Create customer_address_relationships table for linking different address types
CREATE TABLE IF NOT EXISTS customer_address_relationships (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    relationship_name VARCHAR(100) NOT NULL, -- User-friendly name like "Standard Setup", "Drop Ship Setup"
    sold_to_address_id INTEGER,
    bill_to_address_id INTEGER,
    ship_to_address_id INTEGER,
    payer_to_address_id INTEGER,
    is_default BOOLEAN DEFAULT FALSE, -- Default relationship for this customer
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    created_by INTEGER,
    updated_by INTEGER,
    
    -- Foreign key constraints
    CONSTRAINT fk_customer_address_relationships_customer 
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    CONSTRAINT fk_customer_address_relationships_sold_to 
        FOREIGN KEY (sold_to_address_id) REFERENCES customer_addresses(id) ON DELETE SET NULL,
    CONSTRAINT fk_customer_address_relationships_bill_to 
        FOREIGN KEY (bill_to_address_id) REFERENCES customer_addresses(id) ON DELETE SET NULL,
    CONSTRAINT fk_customer_address_relationships_ship_to 
        FOREIGN KEY (ship_to_address_id) REFERENCES customer_addresses(id) ON DELETE SET NULL,
    CONSTRAINT fk_customer_address_relationships_payer_to 
        FOREIGN KEY (payer_to_address_id) REFERENCES customer_addresses(id) ON DELETE SET NULL,
    
    -- Ensure at least one address is specified
    CONSTRAINT chk_customer_address_relationships_at_least_one 
        CHECK (sold_to_address_id IS NOT NULL OR bill_to_address_id IS NOT NULL OR ship_to_address_id IS NOT NULL OR payer_to_address_id IS NOT NULL)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_type ON customer_addresses(address_type);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_primary ON customer_addresses(customer_id, address_type, is_primary);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_active ON customer_addresses(is_active);

CREATE INDEX IF NOT EXISTS idx_customer_address_relationships_customer_id ON customer_address_relationships(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_address_relationships_default ON customer_address_relationships(customer_id, is_default);
CREATE INDEX IF NOT EXISTS idx_customer_address_relationships_active ON customer_address_relationships(is_active);

-- Create triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_customer_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_customer_addresses_updated_at
    BEFORE UPDATE ON customer_addresses
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_addresses_updated_at();

CREATE TRIGGER trigger_customer_address_relationships_updated_at
    BEFORE UPDATE ON customer_address_relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_addresses_updated_at();

-- Create a function to ensure only one primary address per type per customer
CREATE OR REPLACE FUNCTION ensure_single_primary_address()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting is_primary to TRUE, set all others of the same type to FALSE
    IF NEW.is_primary = TRUE THEN
        UPDATE customer_addresses 
        SET is_primary = FALSE 
        WHERE customer_id = NEW.customer_id 
          AND address_type = NEW.address_type 
          AND id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_primary_address
    BEFORE INSERT OR UPDATE ON customer_addresses
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_primary_address();

-- Create a function to ensure only one default relationship per customer
CREATE OR REPLACE FUNCTION ensure_single_default_relationship()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting is_default to TRUE, set all others for this customer to FALSE
    IF NEW.is_default = TRUE THEN
        UPDATE customer_address_relationships 
        SET is_default = FALSE 
        WHERE customer_id = NEW.customer_id 
          AND id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_default_relationship
    BEFORE INSERT OR UPDATE ON customer_address_relationships
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_relationship();

-- Create a function to get customer addresses by type
CREATE OR REPLACE FUNCTION get_customer_addresses_by_type(
    p_customer_id INTEGER,
    p_address_type VARCHAR(20)
)
RETURNS TABLE (
    id INTEGER,
    address_name VARCHAR(100),
    contact_person VARCHAR(100),
    company_name VARCHAR(100),
    address_line_1 VARCHAR(255),
    address_line_2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    country VARCHAR(50),
    postal_code VARCHAR(20),
    region VARCHAR(50),
    phone VARCHAR(30),
    email VARCHAR(100),
    is_primary BOOLEAN,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ca.id,
        ca.address_name,
        ca.contact_person,
        ca.company_name,
        ca.address_line_1,
        ca.address_line_2,
        ca.city,
        ca.state,
        ca.country,
        ca.postal_code,
        ca.region,
        ca.phone,
        ca.email,
        ca.is_primary,
        ca.notes
    FROM customer_addresses ca
    WHERE ca.customer_id = p_customer_id 
      AND ca.address_type = p_address_type
      AND ca.is_active = TRUE
    ORDER BY ca.is_primary DESC, ca.address_name;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get customer address relationships
CREATE OR REPLACE FUNCTION get_customer_address_relationships(
    p_customer_id INTEGER
)
RETURNS TABLE (
    id INTEGER,
    relationship_name VARCHAR(100),
    sold_to_address_id INTEGER,
    bill_to_address_id INTEGER,
    ship_to_address_id INTEGER,
    payer_to_address_id INTEGER,
    is_default BOOLEAN,
    sold_to_address_name VARCHAR(100),
    bill_to_address_name VARCHAR(100),
    ship_to_address_name VARCHAR(100),
    payer_to_address_name VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        car.id,
        car.relationship_name,
        car.sold_to_address_id,
        car.bill_to_address_id,
        car.ship_to_address_id,
        car.payer_to_address_id,
        car.is_default,
        sota.address_name as sold_to_address_name,
        bta.address_name as bill_to_address_name,
        sta.address_name as ship_to_address_name,
        pta.address_name as payer_to_address_name
    FROM customer_address_relationships car
    LEFT JOIN customer_addresses sota ON car.sold_to_address_id = sota.id
    LEFT JOIN customer_addresses bta ON car.bill_to_address_id = bta.id
    LEFT JOIN customer_addresses sta ON car.ship_to_address_id = sta.id
    LEFT JOIN customer_addresses pta ON car.payer_to_address_id = pta.id
    WHERE car.customer_id = p_customer_id 
      AND car.is_active = TRUE
    ORDER BY car.is_default DESC, car.relationship_name;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE customer_addresses IS 'Stores multiple addresses for each customer with different purposes (sold-to, bill-to, ship-to, payer-to)';
COMMENT ON COLUMN customer_addresses.address_type IS 'Type of address: sold_to, bill_to, ship_to, or payer_to';
COMMENT ON COLUMN customer_addresses.address_name IS 'User-friendly name for the address (e.g., Main Office, Warehouse)';
COMMENT ON COLUMN customer_addresses.is_primary IS 'Indicates if this is the primary address for this type';
COMMENT ON COLUMN customer_addresses.contact_person IS 'Contact person at this address';

COMMENT ON TABLE customer_address_relationships IS 'Defines relationships between different address types for a customer';
COMMENT ON COLUMN customer_address_relationships.sold_to_address_id IS 'Address where the sale is made to';
COMMENT ON COLUMN customer_address_relationships.bill_to_address_id IS 'Address where invoices are sent to';
COMMENT ON COLUMN customer_address_relationships.ship_to_address_id IS 'Address where goods are shipped to';
COMMENT ON COLUMN customer_address_relationships.payer_to_address_id IS 'Address where payments are made from';
COMMENT ON COLUMN customer_address_relationships.is_default IS 'Default address relationship for this customer';
COMMENT ON COLUMN customer_address_relationships.relationship_name IS 'User-friendly name for this address relationship setup';

-- Add comments for the functions
COMMENT ON FUNCTION get_customer_addresses_by_type(INTEGER, VARCHAR(20)) IS 'Returns all addresses of a specific type for a customer';
COMMENT ON FUNCTION get_customer_address_relationships(INTEGER) IS 'Returns all address relationships for a customer with address names';
