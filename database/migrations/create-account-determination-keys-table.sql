-- Migration: Create Account Determination Keys Master Data Table
-- Purpose: Store unique account determination key configurations
-- No hardcoded data - all data must be configured by users

CREATE TABLE IF NOT EXISTS account_determination_keys (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_account_determination_keys_code ON account_determination_keys(code);
CREATE INDEX IF NOT EXISTS idx_account_determination_keys_active ON account_determination_keys(is_active);

COMMENT ON TABLE account_determination_keys IS 'Master data table for account determination key configurations';
COMMENT ON COLUMN account_determination_keys.code IS 'Unique code identifier for the account determination key';
COMMENT ON COLUMN account_determination_keys.name IS 'Display name of the account determination key';
COMMENT ON COLUMN account_determination_keys.description IS 'Description of the account determination configuration';
COMMENT ON COLUMN account_determination_keys.is_active IS 'Whether this account determination key is active and available for use';

