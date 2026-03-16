-- =============================================================
-- ELS+ Audit Trail — company_codes cleanup
-- Drop redundant _createdAt and _updatedAt (covered by created_at / updated_at)
-- Keep: _tenantId, _createdBy, _updatedBy, _isActive, _deletedAt
-- =============================================================

-- Drop redundant columns
ALTER TABLE company_codes DROP COLUMN IF EXISTS "_createdAt";
ALTER TABLE company_codes DROP COLUMN IF EXISTS "_updatedAt";

-- Update the trigger: set updated_at (the existing snake_case column)
-- _updatedAt is gone, so the trigger now only keeps updated_at fresh
CREATE OR REPLACE FUNCTION set_audit_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
