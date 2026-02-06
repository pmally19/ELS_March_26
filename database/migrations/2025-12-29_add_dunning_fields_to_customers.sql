-- Migration: Add Dunning Fields to Customer Master
-- Description: Adds dunning-related fields to erp_customers table
-- Date: 2025-12-29

-- Add dunning fields if they don't exist
ALTER TABLE erp_customers 
ADD COLUMN IF NOT EXISTS dunning_procedure VARCHAR(20),
ADD COLUMN IF NOT EXISTS dunning_block BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_dunning_date DATE,
ADD COLUMN IF NOT EXISTS last_dunning_level INTEGER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_dunning_procedure 
ON erp_customers(dunning_procedure) 
WHERE dunning_procedure IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_dunning_block 
ON erp_customers(dunning_block) 
WHERE dunning_block = true;

-- Add comments
COMMENT ON COLUMN erp_customers.dunning_procedure IS 'Dunning procedure code assigned to this customer';
COMMENT ON COLUMN erp_customers.dunning_block IS 'Block dunning notices for this customer';
COMMENT ON COLUMN erp_customers.last_dunning_date IS 'Date of last dunning notice sent';
COMMENT ON COLUMN erp_customers.last_dunning_level IS 'Level of last dunning notice sent (1-4)';

-- Update existing customers with default dunning procedure (optional)
-- UPDATE erp_customers SET dunning_procedure = 'STD' WHERE dunning_procedure IS NULL AND is_active = true;
