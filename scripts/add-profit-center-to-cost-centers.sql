-- Add profit_center_id column to cost_centers table for auto-fill functionality
-- This allows materials to auto-populate cost center when profit center is selected

DO $$
BEGIN
    -- Add profit_center_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cost_centers' AND column_name = 'profit_center_id'
    ) THEN
        ALTER TABLE cost_centers ADD COLUMN profit_center_id INTEGER;
    END IF;
END $$;

-- Update existing cost centers to link with profit centers based on controlling area
-- This creates a reasonable default relationship
UPDATE cost_centers cc
SET profit_center_id = (
    SELECT pc.id 
    FROM profit_centers pc 
    WHERE pc.controlling_area = cc.controlling_area 
    LIMIT 1
)
WHERE cc.profit_center_id IS NULL
AND cc.controlling_area IS NOT NULL;

-- Also match by company code if controlling area doesn't match
UPDATE cost_centers cc
SET profit_center_id = (
    SELECT pc.id 
    FROM profit_centers pc 
    WHERE pc.company_code_id = cc.company_code_id 
    LIMIT 1
)
WHERE cc.profit_center_id IS NULL
AND cc.company_code_id IS NOT NULL;

-- Add foreign key constraint (optional - might fail if there are orphan records)
-- ALTER TABLE cost_centers 
-- ADD CONSTRAINT fk_cost_centers_profit_centers 
-- FOREIGN KEY (profit_center_id) REFERENCES profit_centers(id);
