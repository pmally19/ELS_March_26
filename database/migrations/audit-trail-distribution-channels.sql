-- =============================================================
-- ELS+ Audit Trail — distribution_channels table
-- Existing: id, code, name, description, sales_organization_id,
--           created_at, updated_at, channel_type, is_active
-- Need to add: created_by, updated_by, _tenantId CHAR(3), _deletedAt
-- No triggers exist — add updated_at trigger
-- =============================================================

ALTER TABLE distribution_channels
  ADD COLUMN IF NOT EXISTS created_by   INTEGER,
  ADD COLUMN IF NOT EXISTS updated_by   INTEGER,
  ADD COLUMN IF NOT EXISTS "_tenantId"  CHAR(3)     NOT NULL DEFAULT '001',
  ADD COLUMN IF NOT EXISTS "_deletedAt" TIMESTAMPTZ;

-- CHECK constraint on _tenantId
ALTER TABLE distribution_channels DROP CONSTRAINT IF EXISTS chk_dist_channels_tenantid;
ALTER TABLE distribution_channels
  ADD CONSTRAINT chk_dist_channels_tenantid
  CHECK ("_tenantId" ~ '^[0-9]{3}$' AND "_tenantId" BETWEEN '001' AND '999');

-- Trigger: auto-set updated_at on UPDATE
CREATE OR REPLACE FUNCTION set_dist_channels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dist_channels_updated_at ON distribution_channels;
CREATE TRIGGER trg_dist_channels_updated_at
  BEFORE UPDATE ON distribution_channels
  FOR EACH ROW EXECUTE FUNCTION set_dist_channels_updated_at();
