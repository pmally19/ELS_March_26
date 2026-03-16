-- Create Tax Categories table
CREATE TABLE IF NOT EXISTS tax_categories (
    id SERIAL PRIMARY KEY,
    tax_category_code VARCHAR(2) NOT NULL UNIQUE,
    description VARCHAR(50) NOT NULL,
    tax_type VARCHAR(20) NOT NULL CHECK (tax_type IN ('INPUT_TAX', 'OUTPUT_TAX', 'BOTH')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_tax_categories_code ON tax_categories(tax_category_code);
CREATE INDEX idx_tax_categories_active ON tax_categories(is_active);

-- Add comments
COMMENT ON TABLE tax_categories IS 'Tax categories for GL account assignment and tax determination';
COMMENT ON COLUMN tax_categories.tax_category_code IS '2-character tax category code (SAP standard)';
COMMENT ON COLUMN tax_categories.description IS 'Description of the tax category';
COMMENT ON COLUMN tax_categories.tax_type IS 'Type of tax: INPUT_TAX, OUTPUT_TAX, or BOTH';
COMMENT ON COLUMN tax_categories.is_active IS 'Whether the tax category is active';

-- Insert common SAP standard tax categories
INSERT INTO tax_categories (tax_category_code, description, tax_type, is_active) VALUES
('A1', 'Standard Input Tax', 'INPUT_TAX', true),
('A2', 'Reduced Input Tax', 'INPUT_TAX', true),
('V1', 'Standard Output Tax', 'OUTPUT_TAX', true),
('V2', 'Reduced Output Tax', 'OUTPUT_TAX', true),
('01', 'General Tax Category', 'BOTH', true),
('02', 'Tax-Exempt Category', 'BOTH', true)
ON CONFLICT (tax_category_code) DO NOTHING;
