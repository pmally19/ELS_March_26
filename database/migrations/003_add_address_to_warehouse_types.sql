-- Migration: Add Address Fields to Warehouse Types
-- Date: 2025-01-28
-- Description: Adds address columns to warehouse_types table

-- Add address columns to warehouse_types table
DO $$
BEGIN
    -- Add address_line_1
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'warehouse_types' 
        AND column_name = 'address_line_1'
    ) THEN
        ALTER TABLE warehouse_types ADD COLUMN address_line_1 VARCHAR(255);
        RAISE NOTICE 'Added address_line_1 to warehouse_types';
    END IF;

    -- Add address_line_2
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'warehouse_types' 
        AND column_name = 'address_line_2'
    ) THEN
        ALTER TABLE warehouse_types ADD COLUMN address_line_2 VARCHAR(255);
        RAISE NOTICE 'Added address_line_2 to warehouse_types';
    END IF;

    -- Add city
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'warehouse_types' 
        AND column_name = 'city'
    ) THEN
        ALTER TABLE warehouse_types ADD COLUMN city VARCHAR(100);
        RAISE NOTICE 'Added city to warehouse_types';
    END IF;

    -- Add state
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'warehouse_types' 
        AND column_name = 'state'
    ) THEN
        ALTER TABLE warehouse_types ADD COLUMN state VARCHAR(50);
        RAISE NOTICE 'Added state to warehouse_types';
    END IF;

    -- Add country
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'warehouse_types' 
        AND column_name = 'country'
    ) THEN
        ALTER TABLE warehouse_types ADD COLUMN country VARCHAR(50);
        RAISE NOTICE 'Added country to warehouse_types';
    END IF;

    -- Add postal_code
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'warehouse_types' 
        AND column_name = 'postal_code'
    ) THEN
        ALTER TABLE warehouse_types ADD COLUMN postal_code VARCHAR(20);
        RAISE NOTICE 'Added postal_code to warehouse_types';
    END IF;

    -- Add contact_person
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'warehouse_types' 
        AND column_name = 'contact_person'
    ) THEN
        ALTER TABLE warehouse_types ADD COLUMN contact_person VARCHAR(100);
        RAISE NOTICE 'Added contact_person to warehouse_types';
    END IF;

    -- Add phone
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'warehouse_types' 
        AND column_name = 'phone'
    ) THEN
        ALTER TABLE warehouse_types ADD COLUMN phone VARCHAR(30);
        RAISE NOTICE 'Added phone to warehouse_types';
    END IF;

    -- Add email
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'warehouse_types' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE warehouse_types ADD COLUMN email VARCHAR(100);
        RAISE NOTICE 'Added email to warehouse_types';
    END IF;
END $$;

-- Add comments
COMMENT ON COLUMN warehouse_types.address_line_1 IS 'Primary address line for warehouse type';
COMMENT ON COLUMN warehouse_types.address_line_2 IS 'Secondary address line (suite, unit, etc.)';
COMMENT ON COLUMN warehouse_types.city IS 'City where warehouse type is located';
COMMENT ON COLUMN warehouse_types.state IS 'State or province';
COMMENT ON COLUMN warehouse_types.country IS 'Country';
COMMENT ON COLUMN warehouse_types.postal_code IS 'Postal or ZIP code';
COMMENT ON COLUMN warehouse_types.contact_person IS 'Contact person name';
COMMENT ON COLUMN warehouse_types.phone IS 'Contact phone number';
COMMENT ON COLUMN warehouse_types.email IS 'Contact email address';

