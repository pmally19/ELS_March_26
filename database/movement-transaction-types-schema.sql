-- Movement Transaction Types Table
-- Separate from asset transaction types, following SAP ECC standard

CREATE TABLE IF NOT EXISTS movement_transaction_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    -- 'GOODS_RECEIPT', 'GOODS_ISSUE', 'TRANSFER', 'ADJUSTMENT'
    affects_inventory BOOLEAN DEFAULT true,
    direction VARCHAR(20),
    -- 'INCREASE', 'DECREASE', 'NEUTRAL'
    requires_reference BOOLEAN DEFAULT false,
    -- Requires PO/SO/DO reference
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

-- Create indexes
CREATE INDEX idx_movement_transaction_types_code ON movement_transaction_types(code);

CREATE INDEX idx_movement_transaction_types_category ON movement_transaction_types(category);

CREATE INDEX idx_movement_transaction_types_active ON movement_transaction_types(is_active);

-- Add comment
COMMENT ON TABLE movement_transaction_types IS 'Master data for inventory movement transaction types (separate from asset transaction types, following SAP ECC standard)';

COMMENT ON COLUMN movement_transaction_types.category IS 'Category: GOODS_RECEIPT, GOODS_ISSUE, TRANSFER, ADJUSTMENT';

COMMENT ON COLUMN movement_transaction_types.direction IS 'Inventory direction: INCREASE, DECREASE, NEUTRAL';

-- Update movement_types table to reference movement transaction types
ALTER TABLE movement_types
ADD COLUMN IF NOT EXISTS movement_transaction_type_id INTEGER REFERENCES movement_transaction_types(id);

-- Create index for the foreign key
CREATE INDEX IF NOT EXISTS idx_movement_types_transaction_type_id ON movement_types(movement_transaction_type_id);

-- Note: Keep existing transaction_type column for backward compatibility during migration
-- Can be dropped after successful data migration
