-- =============================================================
-- ELS+ Audit Trail — sd_sales_areas table
-- Existing: id, sales_org_code, distribution_channel_code, division_code, name, is_active, created_at, updated_at
-- Need to add: created_by, updated_by, _tenantId CHAR(3), _deletedAt
-- No triggers exist — add updated_at trigger
-- =============================================================

ALTER TABLE sd_sales_areas
  ADD COLUMN IF NOT EXISTS created_by   INTEGER,
  ADD COLUMN IF NOT EXISTS updated_by   INTEGER,
  ADD COLUMN IF NOT EXISTS "_tenantId"  CHAR(3)     NOT NULL DEFAULT '001',
  ADD COLUMN IF NOT EXISTS "_deletedAt" TIMESTAMPTZ;

-- CHECK constraint on _tenantId
ALTER TABLE sd_sales_areas DROP CONSTRAINT IF EXISTS chk_sd_sales_areas_tenantid;
ALTER TABLE sd_sales_areas
  ADD CONSTRAINT chk_sd_sales_areas_tenantid
  CHECK ("_tenantId" ~ '^[0-9]{3}$' AND "_tenantId" BETWEEN '001' AND '999');

-- Trigger: auto-set updated_at on UPDATE
CREATE OR REPLACE FUNCTION set_sd_sales_areas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sd_sales_areas_updated_at ON sd_sales_areas;
CREATE TRIGGER trg_sd_sales_areas_updated_at
  BEFORE UPDATE ON sd_sales_areas
  FOR EACH ROW EXECUTE FUNCTION set_sd_sales_areas_updated_at();
