-- Create tax master tables (neutral naming)
-- tax_profiles and tax_rules

CREATE TABLE IF NOT EXISTS public.tax_profiles (
  id SERIAL PRIMARY KEY,
  profile_code VARCHAR(12) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  country VARCHAR(3),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tax_rules (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES public.tax_profiles(id) ON DELETE CASCADE,
  rule_code VARCHAR(12) NOT NULL,
  title VARCHAR(120) NOT NULL,
  rate_percent NUMERIC(5,2) NOT NULL,
  jurisdiction VARCHAR(50),
  applies_to VARCHAR(20),
  posting_account VARCHAR(20),
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tax_rules_profile ON public.tax_rules(profile_id);
CREATE INDEX IF NOT EXISTS idx_tax_rules_active ON public.tax_rules(is_active);


