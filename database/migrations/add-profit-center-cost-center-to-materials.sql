-- Migration: Add Profit Center and Cost Center to Materials Table
-- Purpose: Enable profit center and cost center assignment at material master level
-- Database: mallyerp
-- Date: 2025-01-28

-- Add profit_center field if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'materials' 
        AND column_name = 'profit_center'
    ) THEN
        ALTER TABLE materials 
        ADD COLUMN profit_center VARCHAR(20);
        COMMENT ON COLUMN materials.profit_center IS 'Profit center code assigned to this material';
    END IF;
END $$;

-- Add cost_center field if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'materials' 
        AND column_name = 'cost_center'
    ) THEN
        ALTER TABLE materials 
        ADD COLUMN cost_center VARCHAR(20);
        COMMENT ON COLUMN materials.cost_center IS 'Cost center code assigned to this material';
    END IF;
END $$;

-- Create index on profit_center for faster lookups
CREATE INDEX IF NOT EXISTS idx_materials_profit_center ON materials(profit_center) WHERE profit_center IS NOT NULL;

-- Create index on cost_center for faster lookups
CREATE INDEX IF NOT EXISTS idx_materials_cost_center ON materials(cost_center) WHERE cost_center IS NOT NULL;

