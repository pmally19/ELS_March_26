-- Add audit trail columns to industry_sectors
ALTER TABLE industry_sectors
ADD COLUMN IF NOT EXISTS "_tenantId" CHAR(3) DEFAULT '001',
ADD COLUMN IF NOT EXISTS "_deletedAt" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS created_by INTEGER,
ADD COLUMN IF NOT EXISTS updated_by INTEGER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_updated_at_industry_sectors ON industry_sectors;

-- Add updated_at trigger
CREATE TRIGGER trigger_updated_at_industry_sectors
  BEFORE UPDATE ON industry_sectors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
