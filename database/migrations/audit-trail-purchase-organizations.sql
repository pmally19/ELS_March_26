-- =============================================================
-- ELS+ Audit Trail — purchase_organizations table
-- Existing: id, code, name, description, company_code_id, currency, is_active, created_at, updated_at, created_by, updated_by, version, valid_from, valid_to, status, notes, active, address, city, state, country, postal_code, phone, email, manager
-- Need to add: _tenantId CHAR(3), _deletedAt
-- No triggers exist — add updated_at trigger
-- =============================================================

ALTER TABLE purchase_organizations
  ADD COLUMN IF NOT EXISTS "_tenantId"  CHAR(3)     NOT NULL DEFAULT '001',
  ADD COLUMN IF NOT EXISTS "_deletedAt" TIMESTAMPTZ;

-- CHECK constraint on _tenantId
ALTER TABLE purchase_organizations DROP CONSTRAINT IF EXISTS chk_purchase_organizations_tenantid;
ALTER TABLE purchase_organizations
  ADD CONSTRAINT chk_purchase_organizations_tenantid
  CHECK ("_tenantId" ~ '^[0-9]{3}$' AND "_tenantId" BETWEEN '001' AND '999');

-- Trigger: auto-set updated_at on UPDATE
CREATE OR REPLACE FUNCTION set_purchase_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_purchase_organizations_updated_at ON purchase_organizations;
CREATE TRIGGER trg_purchase_organizations_updated_at
  BEFORE UPDATE ON purchase_organizations
  FOR EACH ROW EXECUTE FUNCTION set_purchase_organizations_updated_at();
