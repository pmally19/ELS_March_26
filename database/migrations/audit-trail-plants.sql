-- =============================================================
-- ELS+ Audit Trail — plants table (UPDATED based on actual schema check)
-- Confirmed existing: created_by, updated_by, is_active, created_at, updated_at
-- Only need to add: _tenantId CHAR(3), _deletedAt
-- No new trigger needed: plants_sync_trigger already fires on UPDATE
-- =============================================================

ALTER TABLE plants
  ADD COLUMN IF NOT EXISTS "_tenantId"  CHAR(3)     NOT NULL DEFAULT '001',
  ADD COLUMN IF NOT EXISTS "_deletedAt" TIMESTAMPTZ;

-- CHECK constraint: only '001' to '999' accepted
ALTER TABLE plants DROP CONSTRAINT IF EXISTS chk_plants_tenantid;
ALTER TABLE plants
  ADD CONSTRAINT chk_plants_tenantid
  CHECK ("_tenantId" ~ '^[0-9]{3}$' AND "_tenantId" BETWEEN '001' AND '999');
