-- Migration: Add Address Tables and Columns for Ship-To Address Functionality
-- Date: 2025-01-28
-- Description: Creates addresses table and adds address_id columns to plants and storage_locations
-- This migration ensures all tables needed for ship-to address functionality exist

-- Note: This migration is safe to run multiple times (idempotent)

-- Create addresses table if it doesn't exist
CREATE TABLE IF NOT EXISTS addresses (
    id SERIAL PRIMARY KEY,
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50),
    country VARCHAR(50) NOT NULL,
    postal_code VARCHAR(20),
    region VARCHAR(50),
    contact_person VARCHAR(100),
    phone VARCHAR(30),
    email VARCHAR(100),
    address_type VARCHAR(50), -- 'warehouse', 'office', 'shipping', etc.
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    created_by INTEGER,
    updated_by INTEGER
);

-- Create index on addresses
CREATE INDEX IF NOT EXISTS idx_addresses_city ON addresses(city);
CREATE INDEX IF NOT EXISTS idx_addresses_country ON addresses(country);
CREATE INDEX IF NOT EXISTS idx_addresses_active ON addresses(is_active);

-- Add address_id to plants table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'plants' 
        AND column_name = 'address_id'
    ) THEN
        ALTER TABLE plants ADD COLUMN address_id INTEGER;
        ALTER TABLE plants ADD CONSTRAINT fk_plants_address 
            FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added address_id to plants table';
    END IF;
END $$;

-- Add address_id to storage_locations table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'storage_locations' 
        AND column_name = 'address_id'
    ) THEN
        ALTER TABLE storage_locations ADD COLUMN address_id INTEGER;
        ALTER TABLE storage_locations ADD CONSTRAINT fk_storage_locations_address 
            FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added address_id to storage_locations table';
    END IF;
END $$;

-- Create company_addresses table if it doesn't exist
CREATE TABLE IF NOT EXISTS company_addresses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    address_line_2 TEXT,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50),
    country VARCHAR(50) NOT NULL,
    postal_code VARCHAR(20),
    region VARCHAR(50),
    phone VARCHAR(30),
    email VARCHAR(100),
    contact_person VARCHAR(100),
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    address_type VARCHAR(50), -- 'headquarters', 'warehouse', 'branch', etc.
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    created_by INTEGER,
    updated_by INTEGER
);

-- Create index on company_addresses
CREATE INDEX IF NOT EXISTS idx_company_addresses_active ON company_addresses(is_active);
CREATE INDEX IF NOT EXISTS idx_company_addresses_default ON company_addresses(is_default);

-- Ensure only one default company address
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_addresses_one_default 
    ON company_addresses(is_default) 
    WHERE is_default = TRUE AND is_active = TRUE;

-- Add comments
COMMENT ON TABLE addresses IS 'Generic addresses table for warehouses, plants, storage locations, etc.';
COMMENT ON TABLE company_addresses IS 'Company addresses (headquarters, branches, warehouses)';
COMMENT ON COLUMN plants.address_id IS 'Reference to address in addresses table';
COMMENT ON COLUMN storage_locations.address_id IS 'Reference to address in addresses table';
COMMENT ON COLUMN company_addresses.is_default IS 'Indicates if this is the default company address';

