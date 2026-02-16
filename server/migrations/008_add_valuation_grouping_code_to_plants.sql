-- Add Valuation Grouping Code to Plants
-- Date: 2026-02-10

-- Add foreign key column to plants table
ALTER TABLE plants 
ADD COLUMN valuation_grouping_code_id INTEGER REFERENCES valuation_grouping_codes(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_plants_valuation_grouping_code 
ON plants(valuation_grouping_code_id);

-- Add comment
COMMENT ON COLUMN plants.valuation_grouping_code_id IS 'Reference to valuation grouping code for material valuation at plant level';
