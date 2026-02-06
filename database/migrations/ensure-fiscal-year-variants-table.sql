-- Migration: Ensure fiscal_year_variants table structure matches schema
-- Purpose: Fix fiscal year variants table to match codebase schema

-- Check if table exists and has correct structure
DO $$
BEGIN
  -- Create table if it doesn't exist
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'fiscal_year_variants') THEN
    CREATE TABLE fiscal_year_variants (
      id SERIAL PRIMARY KEY,
      variant_id VARCHAR(10) NOT NULL UNIQUE,
      description VARCHAR(255) NOT NULL,
      posting_periods INTEGER DEFAULT 12,
      special_periods INTEGER DEFAULT 0,
      year_shift INTEGER DEFAULT 0,
      fiscal_calendar_id INTEGER,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    RAISE NOTICE 'Created fiscal_year_variants table';
  ELSE
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'fiscal_year_variants' AND column_name = 'fiscal_calendar_id') THEN
      ALTER TABLE fiscal_year_variants ADD COLUMN fiscal_calendar_id INTEGER;
      RAISE NOTICE 'Added fiscal_calendar_id column';
    END IF;
    
    -- Ensure variant_id is unique
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'fiscal_year_variants_variant_id_key'
    ) THEN
      ALTER TABLE fiscal_year_variants ADD CONSTRAINT fiscal_year_variants_variant_id_key UNIQUE (variant_id);
      RAISE NOTICE 'Added unique constraint on variant_id';
    END IF;
    
    -- Update column types if needed
    ALTER TABLE fiscal_year_variants 
      ALTER COLUMN variant_id TYPE VARCHAR(10),
      ALTER COLUMN description TYPE VARCHAR(255),
      ALTER COLUMN posting_periods SET DEFAULT 12,
      ALTER COLUMN special_periods SET DEFAULT 0,
      ALTER COLUMN year_shift SET DEFAULT 0,
      ALTER COLUMN active SET DEFAULT true;
    
    RAISE NOTICE 'Updated fiscal_year_variants table structure';
  END IF;
END $$;

-- Create index on variant_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_fiscal_year_variants_variant_id ON fiscal_year_variants(variant_id);

-- Create index on active status
CREATE INDEX IF NOT EXISTS idx_fiscal_year_variants_active ON fiscal_year_variants(active);

