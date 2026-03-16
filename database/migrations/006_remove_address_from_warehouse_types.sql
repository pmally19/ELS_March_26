-- Migration: Remove Address Fields from Warehouse Types
-- Date: 2025-01-28
-- Description: Removes address columns from warehouse_types table as ship-to addresses are no longer stored in warehouse types

-- Drop address columns from warehouse_types table
DO $$
BEGIN
    -- Drop address_line_1
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'warehouse_types' 
        AND column_name = 'address_line_1'
    ) THEN
        ALTER TABLE warehouse_types DROP COLUMN address_line_1;
        RAISE NOTICE 'Dropped address_line_1 from warehouse_types';
    END IF;

    -- Drop address_line_2
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'warehouse_types' 
        AND column_name = 'address_line_2'
    ) THEN
        ALTER TABLE warehouse_types DROP COLUMN address_line_2;
        RAISE NOTICE 'Dropped address_line_2 from warehouse_types';
    END IF;

    -- Drop city
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'warehouse_types' 
        AND column_name = 'city'
    ) THEN
        ALTER TABLE warehouse_types DROP COLUMN city;
        RAISE NOTICE 'Dropped city from warehouse_types';
    END IF;

    -- Drop state
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'warehouse_types' 
        AND column_name = 'state'
    ) THEN
        ALTER TABLE warehouse_types DROP COLUMN state;
        RAISE NOTICE 'Dropped state from warehouse_types';
    END IF;

    -- Drop country
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'warehouse_types' 
        AND column_name = 'country'
    ) THEN
        ALTER TABLE warehouse_types DROP COLUMN country;
        RAISE NOTICE 'Dropped country from warehouse_types';
    END IF;

    -- Drop postal_code
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'warehouse_types' 
        AND column_name = 'postal_code'
    ) THEN
        ALTER TABLE warehouse_types DROP COLUMN postal_code;
        RAISE NOTICE 'Dropped postal_code from warehouse_types';
    END IF;

    -- Drop contact_person
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'warehouse_types' 
        AND column_name = 'contact_person'
    ) THEN
        ALTER TABLE warehouse_types DROP COLUMN contact_person;
        RAISE NOTICE 'Dropped contact_person from warehouse_types';
    END IF;

    -- Drop phone
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'warehouse_types' 
        AND column_name = 'phone'
    ) THEN
        ALTER TABLE warehouse_types DROP COLUMN phone;
        RAISE NOTICE 'Dropped phone from warehouse_types';
    END IF;

    -- Drop email
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'warehouse_types' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE warehouse_types DROP COLUMN email;
        RAISE NOTICE 'Dropped email from warehouse_types';
    END IF;
END $$;

