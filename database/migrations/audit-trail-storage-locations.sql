-- =============================================================
-- ELS+ Audit Trail — storage_locations table
-- Confirmed existing: created_by, updated_by, is_active, created_at, updated_at
-- Only need to add: _tenantId CHAR(3), _deletedAt
-- No existing trigger — add updated_at trigger
-- =============================================================

ALTER TABLE storage_locations
  ADD COLUMN IF NOT EXISTS "_tenantId"  CHAR(3)     NOT NULL DEFAULT '001',
  ADD COLUMN IF NOT EXISTS "_deletedAt" TIMESTAMPTZ;

-- CHECK constraint: only '001' to '999'
ALTER TABLE storage_locations DROP CONSTRAINT IF EXISTS chk_storage_locations_tenantid;
ALTER TABLE storage_locations
  ADD CONSTRAINT chk_storage_locations_tenantid
  CHECK ("_tenantId" ~ '^[0-9]{3}$' AND "_tenantId" BETWEEN '001' AND '999');

-- Trigger: auto-set updated_at on every UPDATE
CREATE OR REPLACE FUNCTION set_storage_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_storage_locations_updated_at ON storage_locations;
CREATE TRIGGER trg_storage_locations_updated_at
  BEFORE UPDATE ON storage_locations
  FOR EACH ROW EXECUTE FUNCTION set_storage_locations_updated_at();
