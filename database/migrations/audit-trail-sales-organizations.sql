-- =============================================================
-- ELS+ Audit Trail — sales_organizations table (REAL DATA TABLE)
-- This has 4 rows of actual business data (codes 1000/2000/3000)
-- Current cols: id, code, name, description, company_code_id,
--               created_at, updated_at, org_code
-- Add: status, is_active, created_by, updated_by,
--      _tenantId CHAR(3), _deletedAt
-- =============================================================

ALTER TABLE sales_organizations
  ADD COLUMN IF NOT EXISTS status       TEXT        NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_active    BOOLEAN     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by   INTEGER,
  ADD COLUMN IF NOT EXISTS updated_by   INTEGER,
  ADD COLUMN IF NOT EXISTS "_tenantId"  CHAR(3)     NOT NULL DEFAULT '001',
  ADD COLUMN IF NOT EXISTS "_deletedAt" TIMESTAMPTZ;

-- CHECK constraint on _tenantId
ALTER TABLE sales_organizations DROP CONSTRAINT IF EXISTS chk_sales_orgs_tenantid;
ALTER TABLE sales_organizations
  ADD CONSTRAINT chk_sales_orgs_tenantid
  CHECK ("_tenantId" ~ '^[0-9]{3}$' AND "_tenantId" BETWEEN '001' AND '999');

-- Trigger: auto-set updated_at on UPDATE
CREATE OR REPLACE FUNCTION set_sales_orgs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sales_orgs_updated_at ON sales_organizations;
CREATE TRIGGER trg_sales_orgs_updated_at
  BEFORE UPDATE ON sales_organizations
  FOR EACH ROW EXECUTE FUNCTION set_sales_orgs_updated_at();
