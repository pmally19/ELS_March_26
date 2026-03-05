-- =============================================================
-- ELS+ SaaS Audit Trail — Pilot Migration
-- Table: company_codes
-- Standard: 7 columns (tenantId, createdBy, updatedBy,
--            createdAt, updatedAt, isActive, deletedAt)
-- Safe to re-run: all statements use IF NOT EXISTS / OR REPLACE
-- =============================================================

-- 1. Add the 7 audit columns
ALTER TABLE company_codes
  ADD COLUMN IF NOT EXISTS "tenantId"  INTEGER       DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "createdBy" INTEGER,
  ADD COLUMN IF NOT EXISTS "updatedBy" INTEGER,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ   DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ   DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "isActive"  BOOLEAN       NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

-- 2. Back-fill existing rows so nothing is NULL
UPDATE company_codes
SET
  "tenantId"  = COALESCE("tenantId",  1),
  "createdBy" = COALESCE("createdBy", 1),
  "isActive"  = COALESCE("isActive",  true),
  "createdAt" = COALESCE("createdAt", created_at, now()),
  "updatedAt" = COALESCE("updatedAt", updated_at, now())
WHERE "tenantId" IS NULL
   OR "createdBy" IS NULL
   OR "createdAt" IS NULL;

-- 3. Create a trigger function that auto-sets "updatedAt" on every UPDATE
--    (ACID-compliant: runs inside the same transaction as the UPDATE)
CREATE OR REPLACE FUNCTION set_audit_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach the trigger to company_codes
--    Drop first so this is safe to re-run
DROP TRIGGER IF EXISTS trg_company_codes_updated_at ON company_codes;

CREATE TRIGGER trg_company_codes_updated_at
  BEFORE UPDATE ON company_codes
  FOR EACH ROW
  EXECUTE FUNCTION set_audit_updated_at();
