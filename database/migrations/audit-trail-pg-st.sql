-- =============================================================
-- ELS+ Audit Trail — purchase_groups & supply_types
-- Existing: id, code, name, description, is_active, created_at, updated_at, created_by, updated_by, version, valid_from, valid_to, active
-- Need to add: _tenantId CHAR(3), _deletedAt
-- No triggers exist — add updated_at triggers
-- =============================================================

-- 1. purchase_groups
ALTER TABLE purchase_groups
  ADD COLUMN IF NOT EXISTS "_tenantId"  CHAR(3)     NOT NULL DEFAULT '001',
  ADD COLUMN IF NOT EXISTS "_deletedAt" TIMESTAMPTZ;

ALTER TABLE purchase_groups DROP CONSTRAINT IF EXISTS chk_purchase_groups_tenantid;
ALTER TABLE purchase_groups
  ADD CONSTRAINT chk_purchase_groups_tenantid
  CHECK ("_tenantId" ~ '^[0-9]{3}$' AND "_tenantId" BETWEEN '001' AND '999');

CREATE OR REPLACE FUNCTION set_purchase_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_purchase_groups_updated_at ON purchase_groups;
CREATE TRIGGER trg_purchase_groups_updated_at
  BEFORE UPDATE ON purchase_groups
  FOR EACH ROW EXECUTE FUNCTION set_purchase_groups_updated_at();

-- 2. supply_types
ALTER TABLE supply_types
  ADD COLUMN IF NOT EXISTS "_tenantId"  CHAR(3)     NOT NULL DEFAULT '001',
  ADD COLUMN IF NOT EXISTS "_deletedAt" TIMESTAMPTZ;

ALTER TABLE supply_types DROP CONSTRAINT IF EXISTS chk_supply_types_tenantid;
ALTER TABLE supply_types
  ADD CONSTRAINT chk_supply_types_tenantid
  CHECK ("_tenantId" ~ '^[0-9]{3}$' AND "_tenantId" BETWEEN '001' AND '999');

CREATE OR REPLACE FUNCTION set_supply_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_supply_types_updated_at ON supply_types;
CREATE TRIGGER trg_supply_types_updated_at
  BEFORE UPDATE ON supply_types
  FOR EACH ROW EXECUTE FUNCTION set_supply_types_updated_at();
