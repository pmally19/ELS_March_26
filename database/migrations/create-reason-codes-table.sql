-- Create reason codes table for sales document integration
-- This migration creates the reason codes table with proper structure

-- Create reason codes table with new structure
CREATE TABLE IF NOT EXISTS reason_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(4) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    reason_category_key VARCHAR(1) NOT NULL, -- A=Order Block, B=Item Rejection, C=Discount, D=General
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reason_codes_code ON reason_codes(code);
CREATE INDEX IF NOT EXISTS idx_reason_codes_category ON reason_codes(reason_category_key);
CREATE INDEX IF NOT EXISTS idx_reason_codes_active ON reason_codes(is_active);

-- Insert sample reason codes for different categories
INSERT INTO reason_codes (code, name, description, reason_category_key, is_active) VALUES
-- Order Block reasons (Category A)
('A01', 'Credit Hold', 'Customer has exceeded credit limit', 'A', true),
('A02', 'Administrative Block', 'Order blocked by administrative review', 'A', true),
('A03', 'Payment Terms Violation', 'Customer payment terms not met', 'A', true),
('A04', 'Documentation Missing', 'Required documentation not provided', 'A', true),
('A05', 'Approval Required', 'Order requires management approval', 'A', true),

-- Item Rejection reasons (Category B)
('B01', 'Price Too High', 'Customer rejected due to high pricing', 'B', true),
('B02', 'Product Discontinued', 'Product no longer available', 'B', true),
('B03', 'Quality Issues', 'Product quality concerns', 'B', true),
('B04', 'Specification Mismatch', 'Product does not meet specifications', 'B', true),
('B05', 'Customer Request', 'Customer requested cancellation', 'B', true),
('B06', 'Inventory Unavailable', 'Insufficient inventory', 'B', true),

-- Discount reasons (Category C)
('C01', 'Volume Discount', 'Discount based on order volume', 'C', true),
('C02', 'Customer Loyalty', 'Loyalty program discount', 'C', true),
('C03', 'Promotional Offer', 'Special promotion discount', 'C', true),
('C04', 'Early Payment', 'Discount for early payment', 'C', true),
('C05', 'Contract Pricing', 'Contractual pricing agreement', 'C', true),

-- General reasons (Category D)
('D01', 'Customer Request', 'General customer request', 'D', true),
('D02', 'System Error', 'System-generated correction', 'D', true),
('D03', 'Manual Override', 'Manual system override', 'D', true),
('D04', 'Process Improvement', 'Process optimization change', 'D', true);

-- Add comments for documentation
COMMENT ON TABLE reason_codes IS 'Reason codes for sales document actions and justifications';
COMMENT ON COLUMN reason_codes.code IS 'Unique 2-4 character reason code identifier';
COMMENT ON COLUMN reason_codes.name IS 'Human-readable reason name';
COMMENT ON COLUMN reason_codes.description IS 'Detailed description of the reason';
COMMENT ON COLUMN reason_codes.reason_category_key IS 'Category key: A=Order Block, B=Item Rejection, C=Discount, D=General';
COMMENT ON COLUMN reason_codes.is_active IS 'Whether the reason code is currently active for use';
