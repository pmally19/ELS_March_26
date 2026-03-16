
-- Migration: Add 'module' column to posting_period_controls
-- Purpose: Enable granular period closing by business module

DO $$ 
BEGIN 
  -- Add module column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posting_period_controls' AND column_name = 'module') THEN
    ALTER TABLE posting_period_controls ADD COLUMN module VARCHAR(20) NOT NULL DEFAULT 'ALL';
    ALTER TABLE posting_period_controls ADD CONSTRAINT check_module CHECK (module IN ('ALL', 'ASSETS', 'CUSTOMERS', 'VENDORS', 'INVENTORY', 'GL'));
  END IF;

  -- Drop old unique constraint if exists
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_company_fiscal_period') THEN
    ALTER TABLE posting_period_controls DROP CONSTRAINT unique_company_fiscal_period;
  END IF;

  -- Add new unique constraint including module
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_company_fiscal_period_module') THEN
    ALTER TABLE posting_period_controls 
    ADD CONSTRAINT unique_company_fiscal_period_module UNIQUE (company_code_id, fiscal_year, period_from, period_to, module);
  END IF;

END $$;
