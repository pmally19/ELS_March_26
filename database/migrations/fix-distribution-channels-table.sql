-- Migration: Fix Distribution Channels table structure
-- Purpose: Ensure table structure matches schema and remove any inconsistencies
-- No hardcoded data - all data must be configured by users

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Add name column if it doesn't exist (should already exist based on check)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'distribution_channels' AND column_name = 'name'
  ) THEN
    ALTER TABLE distribution_channels ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT '';
    -- Update existing rows to use description as name if name is empty
    UPDATE distribution_channels SET name = description WHERE name = '' OR name IS NULL;
  END IF;

  -- Ensure description is nullable (should already be)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'distribution_channels' 
    AND column_name = 'description' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE distribution_channels ALTER COLUMN description DROP NOT NULL;
  END IF;

  -- Add sales_organization_id if it doesn't exist (should already exist)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'distribution_channels' AND column_name = 'sales_organization_id'
  ) THEN
    ALTER TABLE distribution_channels ADD COLUMN sales_organization_id INTEGER;
    -- Add foreign key if sales_organizations table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_organizations') THEN
      ALTER TABLE distribution_channels 
      ADD CONSTRAINT fk_distribution_channels_sales_org 
      FOREIGN KEY (sales_organization_id) REFERENCES sales_organizations(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- Add channel_type if it doesn't exist (should already exist)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'distribution_channels' AND column_name = 'channel_type'
  ) THEN
    ALTER TABLE distribution_channels ADD COLUMN channel_type VARCHAR(20);
  END IF;

  -- Ensure is_active exists and has default
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'distribution_channels' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE distribution_channels ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;

  -- Remove commission_group if it exists (not in current schema)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'distribution_channels' AND column_name = 'commission_group'
  ) THEN
    ALTER TABLE distribution_channels DROP COLUMN commission_group;
  END IF;

  -- Remove sales_organization_code if it exists (replaced by sales_organization_id)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'distribution_channels' AND column_name = 'sales_organization_code'
  ) THEN
    ALTER TABLE distribution_channels DROP COLUMN sales_organization_code;
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_distribution_channels_code ON distribution_channels(code);
CREATE INDEX IF NOT EXISTS idx_distribution_channels_sales_org ON distribution_channels(sales_organization_id);
CREATE INDEX IF NOT EXISTS idx_distribution_channels_active ON distribution_channels(is_active);

-- Add comment
COMMENT ON TABLE distribution_channels IS 'Distribution channels for sales organization configuration - no hardcoded data';

