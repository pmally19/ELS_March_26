-- =============================================================
-- ELS+ Audit Trail — sd_divisions table
-- Existing: id, code, name, description, is_active, created_at, updated_at
-- Need to add: created_by, updated_by, _tenantId CHAR(3), _deletedAt
-- No triggers exist — add updated_at trigger
-- =============================================================

ALTER TABLE sd_divisions
  ADD COLUMN IF NOT EXISTS created_by   INTEGER,
  ADD COLUMN IF NOT EXISTS updated_by   INTEGER,
  ADD COLUMN IF NOT EXISTS "_tenantId"  CHAR(3)     NOT NULL DEFAULT '001',
  ADD COLUMN IF NOT EXISTS "_deletedAt" TIMESTAMPTZ;

-- CHECK constraint on _tenantId
ALTER TABLE sd_divisions DROP CONSTRAINT IF EXISTS chk_sd_divisions_tenantid;
ALTER TABLE sd_divisions
  ADD CONSTRAINT chk_sd_divisions_tenantid
  CHECK ("_tenantId" ~ '^[0-9]{3}$' AND "_tenantId" BETWEEN '001' AND '999');

-- Trigger: auto-set updated_at on UPDATE
CREATE OR REPLACE FUNCTION set_sd_divisions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sd_divisions_updated_at ON sd_divisions;
CREATE TRIGGER trg_sd_divisions_updated_at
  BEFORE UPDATE ON sd_divisions
  FOR EACH ROW EXECUTE FUNCTION set_sd_divisions_updated_at();
