-- Fix movement_types table columns to match expected schema
-- Add missing columns while preserving existing data

-- Add movement_type_code column if it doesn't exist (copy from movement_code)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'movement_types' AND column_name = 'movement_type_code') THEN
        ALTER TABLE movement_types ADD COLUMN movement_type_code character varying(3);
        UPDATE movement_types SET movement_type_code = movement_code WHERE movement_code IS NOT NULL;
        ALTER TABLE movement_types ALTER COLUMN movement_type_code SET NOT NULL;
    END IF;
END $$;

-- Add description column if it doesn't exist (copy from movement_name)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'movement_types' AND column_name = 'description') THEN
        ALTER TABLE movement_types ADD COLUMN description character varying(100);
        UPDATE movement_types SET description = movement_name WHERE movement_name IS NOT NULL;
        ALTER TABLE movement_types ALTER COLUMN description SET NOT NULL;
    END IF;
END $$;

-- Add movement_class column if it doesn't exist (copy from movement_category)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'movement_types' AND column_name = 'movement_class') THEN
        ALTER TABLE movement_types ADD COLUMN movement_class character varying(20);
        UPDATE movement_types SET movement_class = movement_category WHERE movement_category IS NOT NULL;
        ALTER TABLE movement_types ALTER COLUMN movement_class SET NOT NULL;
    END IF;
END $$;

-- Add transaction_type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'movement_types' AND column_name = 'transaction_type') THEN
        ALTER TABLE movement_types ADD COLUMN transaction_type character varying(20) DEFAULT 'inventory';
    END IF;
END $$;

-- Add inventory_direction column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'movement_types' AND column_name = 'inventory_direction') THEN
        ALTER TABLE movement_types ADD COLUMN inventory_direction character varying(10) DEFAULT 'increase';
    END IF;
END $$;

-- Add special_stock_indicator column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'movement_types' AND column_name = 'special_stock_indicator') THEN
        ALTER TABLE movement_types ADD COLUMN special_stock_indicator character varying(10);
    END IF;
END $$;

-- Add valuation_impact column if it doesn't exist (copy from value_update)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'movement_types' AND column_name = 'valuation_impact') THEN
        ALTER TABLE movement_types ADD COLUMN valuation_impact boolean DEFAULT true;
        UPDATE movement_types SET valuation_impact = value_update WHERE value_update IS NOT NULL;
    END IF;
END $$;

-- Add quantity_impact column if it doesn't exist (copy from quantity_update)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'movement_types' AND column_name = 'quantity_impact') THEN
        ALTER TABLE movement_types ADD COLUMN quantity_impact boolean DEFAULT true;
        UPDATE movement_types SET quantity_impact = quantity_update WHERE quantity_update IS NOT NULL;
    END IF;
END $$;

-- Add gl_account_determination column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'movement_types' AND column_name = 'gl_account_determination') THEN
        ALTER TABLE movement_types ADD COLUMN gl_account_determination character varying(20);
    END IF;
END $$;

-- Add company_code_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'movement_types' AND column_name = 'company_code_id') THEN
        ALTER TABLE movement_types ADD COLUMN company_code_id integer DEFAULT 1;
    END IF;
END $$;

-- Add is_active column if it doesn't exist (copy from active)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'movement_types' AND column_name = 'is_active') THEN
        ALTER TABLE movement_types ADD COLUMN is_active boolean DEFAULT true;
        UPDATE movement_types SET is_active = active WHERE active IS NOT NULL;
    END IF;
END $$;

-- Add created_by column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'movement_types' AND column_name = 'created_by') THEN
        ALTER TABLE movement_types ADD COLUMN created_by integer;
    END IF;
END $$;

-- Add updated_by column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'movement_types' AND column_name = 'updated_by') THEN
        ALTER TABLE movement_types ADD COLUMN updated_by integer;
    END IF;
END $$;

COMMIT;
