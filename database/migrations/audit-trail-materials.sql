-- Add audit trail columns to materials
ALTER TABLE materials
ADD COLUMN IF NOT EXISTS "_tenantId" CHAR(3) DEFAULT '001',
ADD COLUMN IF NOT EXISTS "_deletedAt" TIMESTAMPTZ;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_updated_at_materials ON materials;

-- Add updated_at trigger
CREATE TRIGGER trigger_updated_at_materials
  BEFORE UPDATE ON materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
