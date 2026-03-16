-- Add audit trial columns to credit_control_areas
ALTER TABLE credit_control_areas
ADD COLUMN IF NOT EXISTS "_tenantId" CHAR(3) DEFAULT '001',
ADD COLUMN IF NOT EXISTS "_deletedAt" TIMESTAMPTZ;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_updated_at_credit_control_areas ON credit_control_areas;

-- Add updated_at trigger
CREATE TRIGGER trigger_updated_at_credit_control_areas
  BEFORE UPDATE ON credit_control_areas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
