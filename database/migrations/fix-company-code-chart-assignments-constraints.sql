-- Migration: Fix Company Code Chart of Accounts Assignments Constraints
-- Purpose: Ensure proper constraints and indexes for company_code_chart_assignments table
-- Date: 2025-12-13

BEGIN;

-- 1. Ensure table exists with proper structure
CREATE TABLE IF NOT EXISTS company_code_chart_assignments (
    id SERIAL PRIMARY KEY,
    company_code_id INTEGER NOT NULL REFERENCES company_codes(id) ON DELETE CASCADE,
    chart_of_accounts_id INTEGER NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    fiscal_year_variant_id INTEGER REFERENCES fiscal_year_variants(id) ON DELETE SET NULL,
    assigned_date TIMESTAMP NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add missing columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_code_chart_assignments' AND column_name = 'fiscal_year_variant_id') THEN
        ALTER TABLE company_code_chart_assignments ADD COLUMN fiscal_year_variant_id INTEGER REFERENCES fiscal_year_variants(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_code_chart_assignments' AND column_name = 'updated_at') THEN
        ALTER TABLE company_code_chart_assignments ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- 3. Create unique constraint: One active assignment per company code per fiscal year variant
-- Note: This allows multiple assignments if fiscal_year_variant_id differs
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_company_code_chart_active'
    ) THEN
        CREATE UNIQUE INDEX unique_company_code_chart_active 
        ON company_code_chart_assignments (company_code_id, fiscal_year_variant_id) 
        WHERE is_active = TRUE;
    END IF;
END $$;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_code_chart_assignments_company_code 
    ON company_code_chart_assignments(company_code_id);

CREATE INDEX IF NOT EXISTS idx_company_code_chart_assignments_chart_of_accounts 
    ON company_code_chart_assignments(chart_of_accounts_id);

CREATE INDEX IF NOT EXISTS idx_company_code_chart_assignments_active 
    ON company_code_chart_assignments(is_active) 
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_company_code_chart_assignments_fiscal_year 
    ON company_code_chart_assignments(fiscal_year_variant_id) 
    WHERE fiscal_year_variant_id IS NOT NULL;

-- 5. Add comments
COMMENT ON TABLE company_code_chart_assignments IS 'Assigns Chart of Accounts to Company Codes. Enforces S/4HANA standard: One active COA per Company Code per Fiscal Year Variant.';
COMMENT ON COLUMN company_code_chart_assignments.company_code_id IS 'Company Code that will use this Chart of Accounts';
COMMENT ON COLUMN company_code_chart_assignments.chart_of_accounts_id IS 'Chart of Accounts assigned to the Company Code';
COMMENT ON COLUMN company_code_chart_assignments.fiscal_year_variant_id IS 'Optional: Fiscal Year Variant for this assignment (allows different COA per fiscal year)';
COMMENT ON COLUMN company_code_chart_assignments.is_active IS 'Only one active assignment per company code per fiscal year variant';

COMMIT;

