-- Migration: Create business_areas table
-- Description: Creates the business_areas table for financial reporting and consolidation
-- Date: 2025-10-28
-- Standard: Based on enterprise financial reporting requirements (4-character code standard)

-- Drop table if exists (for clean migration)
-- DROP TABLE IF EXISTS public.business_areas CASCADE;

-- Create business_areas table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.business_areas (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  description VARCHAR(100) NOT NULL,
  company_code_id INTEGER,
  parent_business_area_code VARCHAR(10),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add foreign key constraint to company_codes if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'business_areas_company_code_id_fkey'
  ) THEN
    ALTER TABLE public.business_areas 
    ADD CONSTRAINT business_areas_company_code_id_fkey 
    FOREIGN KEY (company_code_id) 
    REFERENCES company_codes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Rename consolidation_business_area to parent_business_area_code if old column exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_areas' 
    AND column_name = 'consolidation_business_area'
    AND table_schema = 'public'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_areas' 
    AND column_name = 'parent_business_area_code'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.business_areas 
    RENAME COLUMN consolidation_business_area TO parent_business_area_code;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_areas_company_code_id 
ON public.business_areas(company_code_id) WHERE company_code_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_business_areas_code 
ON public.business_areas(code);

CREATE INDEX IF NOT EXISTS idx_business_areas_is_active 
ON public.business_areas(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_business_areas_parent_code 
ON public.business_areas(parent_business_area_code) WHERE parent_business_area_code IS NOT NULL;

-- Note: Self-referencing foreign key for parent_business_area_code is optional
-- It can be added later if hierarchical validation is needed
-- For now, parent_business_area_code is just a text field for flexibility

-- Add comment to table
COMMENT ON TABLE public.business_areas IS 'Business areas for financial reporting and consolidation purposes';

-- Add comments to columns
COMMENT ON COLUMN public.business_areas.id IS 'Primary key identifier';
COMMENT ON COLUMN public.business_areas.code IS 'Unique business area code (recommended 4 characters, max 10)';
COMMENT ON COLUMN public.business_areas.description IS 'Business area description or name (max 100 characters)';
COMMENT ON COLUMN public.business_areas.company_code_id IS 'Optional reference to company code for multi-company scenarios';
COMMENT ON COLUMN public.business_areas.parent_business_area_code IS 'Parent business area code for hierarchical reporting structures';
COMMENT ON COLUMN public.business_areas.is_active IS 'Active status flag - false indicates inactive/deleted';
COMMENT ON COLUMN public.business_areas.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN public.business_areas.updated_at IS 'Record last update timestamp';
