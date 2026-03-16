-- =============================================================
-- ELS+ Audit Trail — sd_sales_organizations table (PRIMARY)
-- Table: sd_sales_organizations (26 cols, fullly featured)
-- Already has: created_by, updated_by, is_active, created_at, updated_at
-- Need to add: _tenantId CHAR(3), _deletedAt
-- Legacy: sales_organizations (8 cols) — minimal fallback, skip audit
-- =============================================================

ALTER TABLE sd_sales_organizations
  ADD COLUMN IF NOT EXISTS "_tenantId"  CHAR(3)     NOT NULL DEFAULT '001',
  ADD COLUMN IF NOT EXISTS "_deletedAt" TIMESTAMPTZ;

-- CHECK constraint
ALTER TABLE sd_sales_organizations DROP CONSTRAINT IF EXISTS chk_sd_sales_orgs_tenantid;
ALTER TABLE sd_sales_organizations
  ADD CONSTRAINT chk_sd_sales_orgs_tenantid
  CHECK ("_tenantId" ~ '^[0-9]{3}$' AND "_tenantId" BETWEEN '001' AND '999');

-- Trigger: auto-set updated_at on UPDATE (no trigger existed)
CREATE OR REPLACE FUNCTION set_sd_sales_orgs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sd_sales_orgs_updated_at ON sd_sales_organizations;
CREATE TRIGGER trg_sd_sales_orgs_updated_at
  BEFORE UPDATE ON sd_sales_organizations
  FOR EACH ROW EXECUTE FUNCTION set_sd_sales_orgs_updated_at();
