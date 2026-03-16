-- Create batch_classes table
CREATE TABLE IF NOT EXISTS batch_classes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    batch_number_format VARCHAR(50),
    shelf_life_days INTEGER,
    expiration_required BOOLEAN NOT NULL DEFAULT false,
    lot_tracking_required BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert sample data
INSERT INTO batch_classes (code, name, description, batch_number_format, shelf_life_days, expiration_required, lot_tracking_required, is_active) VALUES
('BC001', 'Raw Materials', 'Batch class for raw materials and components', 'RM-{YYYY}-{MM}-{DD}-{####}', 365, true, true, true),
('BC002', 'Finished Goods', 'Batch class for finished products', 'FG-{YYYY}-{MM}-{DD}-{####}', 730, true, true, true),
('BC003', 'Chemicals', 'Batch class for chemical products with special handling requirements', 'CH-{YYYY}-{MM}-{DD}-{####}', 180, true, true, true),
('BC004', 'Pharmaceuticals', 'Batch class for pharmaceutical products with strict compliance requirements', 'PH-{YYYY}-{MM}-{DD}-{####}', 1095, true, true, true),
('BC005', 'Food Products', 'Batch class for food and beverage products', 'FD-{YYYY}-{MM}-{DD}-{####}', 90, true, true, true),
('BC006', 'Electronics', 'Batch class for electronic components and devices', 'EL-{YYYY}-{MM}-{DD}-{####}', 1095, false, true, true),
('BC007', 'Textiles', 'Batch class for textile and fabric products', 'TX-{YYYY}-{MM}-{DD}-{####}', 365, false, true, true),
('BC008', 'Automotive', 'Batch class for automotive parts and components', 'AU-{YYYY}-{MM}-{DD}-{####}', 1825, true, true, true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_batch_classes_code ON batch_classes(code);
CREATE INDEX IF NOT EXISTS idx_batch_classes_is_active ON batch_classes(is_active);
CREATE INDEX IF NOT EXISTS idx_batch_classes_name ON batch_classes(name);
