-- Create serial_number_profiles table (idempotent)
CREATE TABLE IF NOT EXISTS public.serial_number_profiles (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  serial_number_format VARCHAR(50),
  serial_number_length INTEGER DEFAULT 10,
  tracking_level VARCHAR(20) NOT NULL,
  warranty_tracking BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Helpful indexes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_snp_active'
  ) THEN
    CREATE INDEX idx_snp_active ON public.serial_number_profiles (is_active);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_snp_code_like'
  ) THEN
    CREATE INDEX idx_snp_code_like ON public.serial_number_profiles (code);
  END IF;
END $$;


