-- =====================================================================
-- Add cost_center_id to profit_centers table
-- Date: 2025-12-31
-- Purpose: Link profit centers to cost centers for auto-fill in Material Master
-- =====================================================================

-- Add cost_center_id column to profit_centers table
ALTER TABLE profit_centers 
ADD COLUMN cost_center_id INTEGER REFERENCES cost_centers(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_profit_centers_cost_center ON profit_centers(cost_center_id);

-- Add comment
COMMENT ON COLUMN profit_centers.cost_center_id IS 'Foreign key to cost_centers table - each profit center can be linked to a cost center';

-- Populate sample data: link profit centers to cost centers based on category/segment matching
-- Manufacturing profit center -> Production cost center
UPDATE profit_centers 
SET cost_center_id = (
  SELECT id FROM cost_centers WHERE cost_center_category = 'PRODUCTION' LIMIT 1
) 
WHERE profit_center = 'PC-MFG-001';

-- Retail/Sales profit centers -> Sales cost center
UPDATE profit_centers 
SET cost_center_id = (
  SELECT id FROM cost_centers WHERE cost_center_category = 'SALES' LIMIT 1
) 
WHERE profit_center IN ('PC-RETAIL-001', 'PC-GOV-001', 'PC-EXP-001');

-- Service profit center -> Service cost center
UPDATE profit_centers 
SET cost_center_id = (
  SELECT id FROM cost_centers WHERE cost_center_category = 'SERVICE' LIMIT 1
) 
WHERE profit_center = 'PC-SERV-001';

-- Verify the updates
SELECT 
  pc.profit_center, 
  pc.description as profit_center_desc,
  cc.cost_center,
  cc.description as cost_center_desc
FROM profit_centers pc
LEFT JOIN cost_centers cc ON pc.cost_center_id = cc.id
ORDER BY pc.profit_center;
