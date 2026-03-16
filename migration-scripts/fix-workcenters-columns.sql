-- Fix work_centers table columns to match modern schema
-- Add missing modern columns while preserving existing data

-- Add code column if it doesn't exist (copy from work_center_code)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'work_centers' AND column_name = 'code') THEN
        ALTER TABLE work_centers ADD COLUMN code character varying(20);
        UPDATE work_centers SET code = work_center_code WHERE work_center_code IS NOT NULL;
        ALTER TABLE work_centers ALTER COLUMN code SET NOT NULL;
    END IF;
END $$;

-- Add plant_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'work_centers' AND column_name = 'plant_id') THEN
        ALTER TABLE work_centers ADD COLUMN plant_id integer;
        -- Try to map plant_code to plant_id if plants table exists
        UPDATE work_centers 
        SET plant_id = p.id 
        FROM plants p 
        WHERE work_centers.plant_code = p.code 
        AND work_centers.plant_code IS NOT NULL;
    END IF;
END $$;

-- Add capacity column if it doesn't exist (copy from standard_available_capacity)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'work_centers' AND column_name = 'capacity') THEN
        ALTER TABLE work_centers ADD COLUMN capacity numeric(10,2);
        UPDATE work_centers SET capacity = standard_available_capacity WHERE standard_available_capacity IS NOT NULL;
    END IF;
END $$;

-- Add capacity_unit column if it doesn't exist (copy from capacity_category)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'work_centers' AND column_name = 'capacity_unit') THEN
        ALTER TABLE work_centers ADD COLUMN capacity_unit character varying(20);
        UPDATE work_centers SET capacity_unit = capacity_category WHERE capacity_category IS NOT NULL;
        UPDATE work_centers SET capacity_unit = 'units/day' WHERE capacity_unit IS NULL;
    END IF;
END $$;

-- Add cost_rate column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'work_centers' AND column_name = 'cost_rate') THEN
        ALTER TABLE work_centers ADD COLUMN cost_rate numeric(15,2);
    END IF;
END $$;

-- Add status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'work_centers' AND column_name = 'status') THEN
        ALTER TABLE work_centers ADD COLUMN status character varying(20) DEFAULT 'active';
        UPDATE work_centers SET status = CASE WHEN is_active = false THEN 'inactive' ELSE 'active' END;
    END IF;
END $$;

-- Add cost_center_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'work_centers' AND column_name = 'cost_center_id') THEN
        ALTER TABLE work_centers ADD COLUMN cost_center_id integer;
    END IF;
END $$;

-- Add company_code_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'work_centers' AND column_name = 'company_code_id') THEN
        ALTER TABLE work_centers ADD COLUMN company_code_id integer;
    END IF;
END $$;

-- Add active column if it doesn't exist (copy from is_active)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'work_centers' AND column_name = 'active') THEN
        ALTER TABLE work_centers ADD COLUMN active boolean DEFAULT true;
        UPDATE work_centers SET active = is_active WHERE is_active IS NOT NULL;
    END IF;
END $$;

-- Add unique constraint on code if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'work_centers' AND constraint_name = 'work_centers_code_key') THEN
        ALTER TABLE work_centers ADD CONSTRAINT work_centers_code_key UNIQUE (code);
    END IF;
END $$;

-- Add foreign key constraint for plant_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'work_centers' AND constraint_name = 'work_centers_plant_id_fkey') THEN
        ALTER TABLE work_centers ADD CONSTRAINT work_centers_plant_id_fkey 
        FOREIGN KEY (plant_id) REFERENCES plants(id);
    END IF;
END $$;

-- Add foreign key constraint for cost_center_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'work_centers' AND constraint_name = 'work_centers_cost_center_id_fkey') THEN
        ALTER TABLE work_centers ADD CONSTRAINT work_centers_cost_center_id_fkey 
        FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id);
    END IF;
END $$;

-- Add foreign key constraint for company_code_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'work_centers' AND constraint_name = 'work_centers_company_code_id_fkey') THEN
        ALTER TABLE work_centers ADD CONSTRAINT work_centers_company_code_id_fkey 
        FOREIGN KEY (company_code_id) REFERENCES company_codes(id);
    END IF;
END $$;

COMMIT;
