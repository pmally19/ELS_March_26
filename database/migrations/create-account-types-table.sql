-- Create account_types table if it doesn't exist
-- This table stores account type master data for document types

CREATE TABLE IF NOT EXISTS account_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    category VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_account_types_code ON account_types(code);
CREATE INDEX IF NOT EXISTS idx_account_types_category ON account_types(category);
CREATE INDEX IF NOT EXISTS idx_account_types_is_active ON account_types(is_active);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_account_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_account_types_updated_at
    BEFORE UPDATE ON account_types
    FOR EACH ROW
    EXECUTE FUNCTION update_account_types_updated_at();

-- Add comments
COMMENT ON TABLE account_types IS 'Master data table for account types - used to classify document types (e.g., customer, vendor, GL, asset, etc.)';
COMMENT ON COLUMN account_types.code IS 'Unique code for the account type (e.g., customer, vendor, gl, asset)';
COMMENT ON COLUMN account_types.name IS 'Display name of the account type';
COMMENT ON COLUMN account_types.description IS 'Description of the account type';
COMMENT ON COLUMN account_types.category IS 'Category classification (e.g., asset, liability, equity, revenue, expense)';
COMMENT ON COLUMN account_types.is_active IS 'Active status flag';

