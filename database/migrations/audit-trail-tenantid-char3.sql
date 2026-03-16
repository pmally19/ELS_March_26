-- =============================================================
-- ELS+ Audit Trail — Fix _tenantId type to CHAR(3) on company_codes
-- Previous discussion: _tenantId must be CHAR(3), range '001'–'999'
-- This applies to company_codes as the pilot table.
-- All future tables will use CHAR(3) from day one.
-- =============================================================

-- Step 1: Create the tenants lookup table (if not already done)
CREATE TABLE IF NOT EXISTS tenants (
  "tenantId"  CHAR(3)      PRIMARY KEY
                           CHECK ("tenantId" ~ '^[0-9]{3}$'
                             AND  "tenantId" BETWEEN '001' AND '999'),
  name        TEXT         NOT NULL,
  active      BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Seed the default tenant '001'
INSERT INTO tenants ("tenantId", name)
VALUES ('001', 'Default Tenant')
ON CONFLICT DO NOTHING;

-- Step 2: Drop existing CHECK constraint on _tenantId if any
ALTER TABLE company_codes
  DROP CONSTRAINT IF EXISTS chk_tenantid_range;

-- Step 3: Change _tenantId column from INTEGER → CHAR(3)
--         Convert existing integer values (e.g. 1 → '001')
ALTER TABLE company_codes
  ALTER COLUMN "_tenantId" TYPE CHAR(3)
    USING LPAD("_tenantId"::TEXT, 3, '0');

-- Step 4: Set default to '001' for new rows
ALTER TABLE company_codes
  ALTER COLUMN "_tenantId" SET DEFAULT '001';

-- Step 5: Add CHECK constraint — only '001' to '999' accepted
ALTER TABLE company_codes
  ADD CONSTRAINT chk_tenantid_range
  CHECK ("_tenantId" ~ '^[0-9]{3}$'
     AND "_tenantId" BETWEEN '001' AND '999');
