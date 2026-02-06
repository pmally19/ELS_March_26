-- Create purchasing item categories table
CREATE TABLE IF NOT EXISTS purchasing_item_categories (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(code)
);

-- Insert standard SAP item categories
INSERT INTO purchasing_item_categories (code, name, description) VALUES 
('0', 'Standard', 'Standard procurement transaction'),
('K', 'Consignment', 'Vendor consignment stock'),
('L', 'Subcontracting', 'Subcontracting to vendor'),
('S', 'Third-Party', 'Third-party delivery to customer'),
('D', 'Service', 'Service procurement'),
('U', 'Stock Transfer', 'Stock transfer between plants'),
('B', 'Limit', 'Blanket order / Limit item')
ON CONFLICT (code) DO NOTHING;

-- Add item_category_id to purchase_requisition_items
ALTER TABLE purchase_requisition_items 
ADD COLUMN IF NOT EXISTS item_category_id INTEGER REFERENCES purchasing_item_categories(id);

-- Set default to 'Standard' for existing items
UPDATE purchase_requisition_items 
SET item_category_id = (SELECT id FROM purchasing_item_categories WHERE code = '0')
WHERE item_category_id IS NULL;
