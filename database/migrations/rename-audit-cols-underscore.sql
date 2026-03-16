-- =============================================================
-- ELS+ Audit Trail — Rename to _ prefix convention
-- Table: company_codes
-- Renames 7 audit columns from camelCase → _prefix
-- Safe to re-run: uses IF EXISTS checks via DO blocks
-- =============================================================

DO $$
BEGIN
  -- _tenantId
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='company_codes' AND column_name='tenantId') THEN
    ALTER TABLE company_codes RENAME COLUMN "tenantId" TO "_tenantId";
  END IF;

  -- _createdBy
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='company_codes' AND column_name='createdBy') THEN
    ALTER TABLE company_codes RENAME COLUMN "createdBy" TO "_createdBy";
  END IF;

  -- _updatedBy
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='company_codes' AND column_name='updatedBy') THEN
    ALTER TABLE company_codes RENAME COLUMN "updatedBy" TO "_updatedBy";
  END IF;

  -- _createdAt
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='company_codes' AND column_name='createdAt') THEN
    ALTER TABLE company_codes RENAME COLUMN "createdAt" TO "_createdAt";
  END IF;

  -- _updatedAt
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='company_codes' AND column_name='updatedAt') THEN
    ALTER TABLE company_codes RENAME COLUMN "updatedAt" TO "_updatedAt";
  END IF;

  -- _isActive
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='company_codes' AND column_name='isActive') THEN
    ALTER TABLE company_codes RENAME COLUMN "isActive" TO "_isActive";
  END IF;

  -- _deletedAt
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='company_codes' AND column_name='deletedAt') THEN
    ALTER TABLE company_codes RENAME COLUMN "deletedAt" TO "_deletedAt";
  END IF;
END $$;

-- Update the trigger function to reference new column name
CREATE OR REPLACE FUNCTION set_audit_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."_updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
