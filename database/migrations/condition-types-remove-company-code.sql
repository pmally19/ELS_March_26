-- SAP Standard: Condition types are client-level, no company code
-- Drop company_code_id from condition_types table

ALTER TABLE condition_types DROP COLUMN IF EXISTS company_code_id;

-- Drop old constraint (based on condition_code + company_code_id)
ALTER TABLE condition_types DROP CONSTRAINT IF EXISTS condition_types_condition_code_company_code_id_key;
ALTER TABLE condition_types DROP CONSTRAINT IF EXISTS uq_condition_types_code_company;
ALTER TABLE condition_types DROP CONSTRAINT IF EXISTS uq_condition_types_code;

-- Add unique constraint on condition_code alone (client-level, SAP standard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_condition_types_code'
  ) THEN
    ALTER TABLE condition_types ADD CONSTRAINT uq_condition_types_code UNIQUE (condition_code);
  END IF;
END $$;

