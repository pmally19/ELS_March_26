-- Add number_range_id column referencing number_ranges table
ALTER TABLE gl_account_groups ADD COLUMN number_range_id INTEGER REFERENCES number_ranges(id);

-- Drop old manual number range columns
ALTER TABLE gl_account_groups DROP COLUMN number_range_start;
ALTER TABLE gl_account_groups DROP COLUMN number_range_end;
