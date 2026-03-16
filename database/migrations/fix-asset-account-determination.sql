-- Fix Asset Account Determination: Remove hardcoded values, defaults, and SAP terminology
-- Database: mallyerp
-- Password: Mokshith@21

-- 1. Create transaction_types master data table (if not exists)
CREATE TABLE IF NOT EXISTS transaction_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT transaction_types_code_unique UNIQUE(code)
);

CREATE INDEX IF NOT EXISTS idx_transaction_types_code ON transaction_types(code);
CREATE INDEX IF NOT EXISTS idx_transaction_types_active ON transaction_types(is_active);

-- 2. Create account_categories master data table (if not exists)
CREATE TABLE IF NOT EXISTS account_categories (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    account_type VARCHAR(20) NOT NULL, -- BALANCE_SHEET or PROFIT_LOSS
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT account_categories_code_unique UNIQUE(code)
);

CREATE INDEX IF NOT EXISTS idx_account_categories_code ON account_categories(code);
CREATE INDEX IF NOT EXISTS idx_account_categories_active ON account_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_account_categories_type ON account_categories(account_type);

-- 3. Update asset_account_determination table to use foreign keys
-- First, add new columns for foreign keys
ALTER TABLE asset_account_determination 
    ADD COLUMN IF NOT EXISTS transaction_type_id INTEGER REFERENCES transaction_types(id),
    ADD COLUMN IF NOT EXISTS account_category_id INTEGER REFERENCES account_categories(id);

-- 4. Migrate existing data (if any) - we'll handle this in the script
-- For now, keep both columns for backward compatibility during migration

-- 5. Remove any default values from asset_account_determination
ALTER TABLE asset_account_determination 
    ALTER COLUMN is_active DROP DEFAULT IF EXISTS;

-- 6. Make sure all required fields are NOT NULL
ALTER TABLE asset_account_determination 
    ALTER COLUMN asset_class_id SET NOT NULL,
    ALTER COLUMN transaction_type SET NOT NULL,
    ALTER COLUMN account_category SET NOT NULL,
    ALTER COLUMN gl_account_id SET NOT NULL,
    ALTER COLUMN is_active SET NOT NULL,
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET NOT NULL;

-- 7. Add comments to remove SAP terminology references
COMMENT ON TABLE asset_account_determination IS 'Asset account determination rules - maps asset classes and transaction types to GL accounts';
COMMENT ON TABLE transaction_types IS 'Master data for asset transaction types';
COMMENT ON TABLE account_categories IS 'Master data for account categories used in asset account determination';

