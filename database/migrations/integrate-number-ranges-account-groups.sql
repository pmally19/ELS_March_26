-- Integrate Number Ranges with Account Groups
-- This migration adds proper foreign key relationship between account_groups and sd_number_ranges

-- Step 1: Add number_range_id column to account_groups if it doesn't exist
ALTER TABLE account_groups 
  ADD COLUMN IF NOT EXISTS number_range_id INTEGER;

-- Step 2: Add foreign key constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'account_groups_number_range_id_fkey'
  ) THEN
    ALTER TABLE account_groups 
    ADD CONSTRAINT account_groups_number_range_id_fkey 
    FOREIGN KEY (number_range_id) 
    REFERENCES sd_number_ranges(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- Step 3: Sync existing number ranges to account groups
-- If account_groups has number_range_from/to that matches a number range, link them
UPDATE account_groups ag
SET number_range_id = nr.id
FROM sd_number_ranges nr
WHERE ag.number_range_id IS NULL
  AND (
    (ag.number_range_from = nr.from_number AND ag.number_range_to = nr.to_number)
    OR (ag.account_range_from = nr.from_number AND ag.account_range_to = nr.to_number)
  )
  AND nr.external = false;

-- Step 4: Populate number_range_from/to from linked number range if not already set
UPDATE account_groups ag
SET 
  number_range_from = COALESCE(ag.number_range_from, ag.account_range_from, nr.from_number),
  number_range_to = COALESCE(ag.number_range_to, ag.account_range_to, nr.to_number),
  account_range_from = COALESCE(ag.account_range_from, nr.from_number),
  account_range_to = COALESCE(ag.account_range_to, nr.to_number)
FROM sd_number_ranges nr
WHERE ag.number_range_id = nr.id
  AND (ag.number_range_from IS NULL OR ag.account_range_from IS NULL);

-- Step 5: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_account_groups_number_range_id 
  ON account_groups(number_range_id);

-- Step 6: Add comments
COMMENT ON COLUMN account_groups.number_range_id IS 'Foreign key to sd_number_ranges table for automatic number assignment';
COMMENT ON COLUMN account_groups.number_range_from IS 'Starting number for account number range (synced from linked number range)';
COMMENT ON COLUMN account_groups.number_range_to IS 'Ending number for account number range (synced from linked number range)';

