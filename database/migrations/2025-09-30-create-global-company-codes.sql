-- Create table for Global Company Codes (to match shared/schema.ts definition)
-- Safe to run multiple times

CREATE TABLE IF NOT EXISTS public.global_company_codes (
    id SERIAL PRIMARY KEY,
    global_code VARCHAR(4) NOT NULL UNIQUE,
    description VARCHAR(50) NOT NULL,
    consolidation_company VARCHAR(4),
    reporting_currency VARCHAR(3) NOT NULL,
    consolidation_chart VARCHAR(4),
    elimination_ledger VARCHAR(2),
    management_type VARCHAR(10) DEFAULT 'CENTRAL',
    active_status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optional helpful indexes
CREATE INDEX IF NOT EXISTS idx_global_company_codes_active_status ON public.global_company_codes(active_status);

-- Upsert a default sample record for ease of testing (id will auto-increment)
INSERT INTO public.global_company_codes (global_code, description, consolidation_company, reporting_currency, consolidation_chart, elimination_ledger, management_type, active_status)
VALUES ('G100', 'Global Consolidation Co', '1000', 'USD', 'YCOA', '00', 'CENTRAL', TRUE)
ON CONFLICT (global_code) DO UPDATE SET
  description = EXCLUDED.description,
  consolidation_company = EXCLUDED.consolidation_company,
  reporting_currency = EXCLUDED.reporting_currency,
  consolidation_chart = EXCLUDED.consolidation_chart,
  elimination_ledger = EXCLUDED.elimination_ledger,
  management_type = EXCLUDED.management_type,
  active_status = EXCLUDED.active_status,
  updated_at = CURRENT_TIMESTAMP;


