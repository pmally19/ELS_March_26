-- Migration: Create Number Range Objects table
-- Purpose: Store number range object definitions for document numbering
-- No hardcoded data - all data must be configured by users

CREATE TABLE IF NOT EXISTS number_range_objects (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_by INTEGER
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_number_range_objects_code ON number_range_objects(code);
CREATE INDEX IF NOT EXISTS idx_number_range_objects_active ON number_range_objects(is_active);

-- Add comments
COMMENT ON TABLE number_range_objects IS 'Number range object definitions for document numbering - no hardcoded data';
COMMENT ON COLUMN number_range_objects.code IS 'Unique code for the number range object';
COMMENT ON COLUMN number_range_objects.name IS 'Display name of the number range object';
COMMENT ON COLUMN number_range_objects.description IS 'Description of what this object is used for';

