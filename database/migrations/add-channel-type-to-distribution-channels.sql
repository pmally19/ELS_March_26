-- Migration: Add channel_type and is_active columns to distribution_channels table
-- This migration is idempotent - it will not fail if columns already exist

-- Add channel_type column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'distribution_channels' 
        AND column_name = 'channel_type'
    ) THEN
        ALTER TABLE distribution_channels 
        ADD COLUMN channel_type VARCHAR(20);
        RAISE NOTICE 'Added channel_type column to distribution_channels';
    ELSE
        RAISE NOTICE 'channel_type column already exists in distribution_channels';
    END IF;
END $$;

-- Add is_active column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'distribution_channels' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE distribution_channels 
        ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;
        RAISE NOTICE 'Added is_active column to distribution_channels';
    ELSE
        RAISE NOTICE 'is_active column already exists in distribution_channels';
    END IF;
END $$;

-- Update existing records to have default values if needed
UPDATE distribution_channels 
SET channel_type = NULL 
WHERE channel_type IS NULL;

UPDATE distribution_channels 
SET is_active = true 
WHERE is_active IS NULL;

-- Create index on channel_type for better query performance
CREATE INDEX IF NOT EXISTS idx_distribution_channels_channel_type 
ON distribution_channels(channel_type);

CREATE INDEX IF NOT EXISTS idx_distribution_channels_is_active 
ON distribution_channels(is_active);

