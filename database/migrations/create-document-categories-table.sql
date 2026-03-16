-- Create document_categories table if it doesn't exist
-- This table stores document category master data

CREATE TABLE IF NOT EXISTS document_categories (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_categories_code ON document_categories(code);
CREATE INDEX IF NOT EXISTS idx_document_categories_is_active ON document_categories(is_active);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_document_categories_updated_at
    BEFORE UPDATE ON document_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_document_categories_updated_at();

-- Add comments
COMMENT ON TABLE document_categories IS 'Master data table for document categories - used to classify document types';
COMMENT ON COLUMN document_categories.code IS 'Unique code for the document category (e.g., SALES, PURCHASE, FINANCE, INVENTORY)';
COMMENT ON COLUMN document_categories.name IS 'Display name of the document category';
COMMENT ON COLUMN document_categories.description IS 'Description of the document category';
COMMENT ON COLUMN document_categories.is_active IS 'Active status flag';

