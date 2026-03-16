-- Migration: Add audit trail to Vendors Master Data
-- Description: Adds _tenantId, _deletedAt, created_by, updated_by to vendors and vendor_contacts tables.

BEGIN;

-- 1. Update vendors table
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS _tenantId CHAR(3) DEFAULT '001',
ADD COLUMN IF NOT EXISTS _deletedAt TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS created_by INTEGER,
ADD COLUMN IF NOT EXISTS updated_by INTEGER;

-- Add check constraint for tenant ID
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_vendors_tenant_id'
    ) THEN
        ALTER TABLE vendors
        ADD CONSTRAINT chk_vendors_tenant_id CHECK (_tenantId ~ '^[0-9]{3}$');
    END IF;
END $$;

-- 2. Update vendor_contacts table
ALTER TABLE vendor_contacts
ADD COLUMN IF NOT EXISTS _tenantId CHAR(3) DEFAULT '001',
ADD COLUMN IF NOT EXISTS _deletedAt TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS created_by INTEGER,
ADD COLUMN IF NOT EXISTS updated_by INTEGER;

-- Add check constraint for tenant ID
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_vendor_contacts_tenant_id'
    ) THEN
        ALTER TABLE vendor_contacts
        ADD CONSTRAINT chk_vendor_contacts_tenant_id CHECK (_tenantId ~ '^[0-9]{3}$');
    END IF;
END $$;


-- 3. Create or update trigger for vendors updated_at
CREATE OR REPLACE FUNCTION update_vendors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_vendors_timestamp ON vendors;

CREATE TRIGGER update_vendors_timestamp
    BEFORE UPDATE ON vendors
    FOR EACH ROW
    EXECUTE FUNCTION update_vendors_updated_at();


-- 4. Create or update trigger for vendor_contacts updated_at
CREATE OR REPLACE FUNCTION update_vendor_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_vendor_contacts_timestamp ON vendor_contacts;

CREATE TRIGGER update_vendor_contacts_timestamp
    BEFORE UPDATE ON vendor_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_vendor_contacts_updated_at();

COMMIT;
