-- Migration: Create Transfer Orders Tables
-- Date: 2024-10-15
-- Description: Create transfer_orders and transfer_order_items tables for warehouse management

-- Create transfer_orders table
CREATE TABLE IF NOT EXISTS transfer_orders (
    id SERIAL PRIMARY KEY,
    transfer_number VARCHAR(20) NOT NULL UNIQUE,
    sales_order_id INTEGER,
    delivery_id INTEGER,
    from_plant VARCHAR(4) NOT NULL,
    to_plant VARCHAR(4) NOT NULL,
    from_storage_location VARCHAR(4) NOT NULL,
    to_storage_location VARCHAR(4) NOT NULL,
    transfer_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'OPEN',
    movement_type VARCHAR(4) DEFAULT '101',
    reference_document VARCHAR(20),
    reference_document_type VARCHAR(10),
    created_by INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_transfer_orders_sales_order 
        FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE SET NULL,
    CONSTRAINT fk_transfer_orders_delivery 
        FOREIGN KEY (delivery_id) REFERENCES delivery_documents(id) ON DELETE SET NULL,
    CONSTRAINT fk_transfer_orders_from_plant 
        FOREIGN KEY (from_plant) REFERENCES plants(code) ON DELETE RESTRICT,
    CONSTRAINT fk_transfer_orders_to_plant 
        FOREIGN KEY (to_plant) REFERENCES plants(code) ON DELETE RESTRICT
);

-- Create transfer_order_items table
CREATE TABLE IF NOT EXISTS transfer_order_items (
    id SERIAL PRIMARY KEY,
    transfer_order_id INTEGER NOT NULL,
    line_item INTEGER NOT NULL,
    material_id INTEGER NOT NULL,
    material_code VARCHAR(20),
    material_description TEXT,
    requested_quantity NUMERIC(13,3) NOT NULL,
    confirmed_quantity NUMERIC(13,3) DEFAULT 0,
    unit VARCHAR(3) DEFAULT 'EA',
    from_storage_location VARCHAR(4) NOT NULL,
    to_storage_location VARCHAR(4) NOT NULL,
    batch VARCHAR(20),
    serial_number VARCHAR(20),
    status VARCHAR(20) DEFAULT 'OPEN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_transfer_order_items_transfer_order 
        FOREIGN KEY (transfer_order_id) REFERENCES transfer_orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_transfer_order_items_material 
        FOREIGN KEY (material_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transfer_orders_sales_order_id ON transfer_orders(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_transfer_orders_delivery_id ON transfer_orders(delivery_id);
CREATE INDEX IF NOT EXISTS idx_transfer_orders_status ON transfer_orders(status);
CREATE INDEX IF NOT EXISTS idx_transfer_orders_transfer_date ON transfer_orders(transfer_date);
CREATE INDEX IF NOT EXISTS idx_transfer_order_items_transfer_order_id ON transfer_order_items(transfer_order_id);
CREATE INDEX IF NOT EXISTS idx_transfer_order_items_material_id ON transfer_order_items(material_id);
CREATE INDEX IF NOT EXISTS idx_transfer_order_items_status ON transfer_order_items(status);

-- Add comments for documentation
COMMENT ON TABLE transfer_orders IS 'Transfer orders for warehouse movement between plants/storage locations';
COMMENT ON TABLE transfer_order_items IS 'Individual items within transfer orders';

COMMENT ON COLUMN transfer_orders.transfer_number IS 'Unique transfer order number';
COMMENT ON COLUMN transfer_orders.sales_order_id IS 'Reference to originating sales order';
COMMENT ON COLUMN transfer_orders.delivery_id IS 'Reference to delivery document';
COMMENT ON COLUMN transfer_orders.from_plant IS 'Source plant code';
COMMENT ON COLUMN transfer_orders.to_plant IS 'Destination plant code';
COMMENT ON COLUMN transfer_orders.movement_type IS 'SAP movement type (101=transfer, 201=issue, etc.)';
COMMENT ON COLUMN transfer_orders.status IS 'Transfer order status (OPEN, CONFIRMED, COMPLETED, CANCELLED)';

COMMENT ON COLUMN transfer_order_items.line_item IS 'Line item number within transfer order';
COMMENT ON COLUMN transfer_order_items.material_id IS 'Product/material being transferred';
COMMENT ON COLUMN transfer_order_items.requested_quantity IS 'Quantity requested for transfer';
COMMENT ON COLUMN transfer_order_items.confirmed_quantity IS 'Quantity confirmed for transfer';
COMMENT ON COLUMN transfer_order_items.from_storage_location IS 'Source storage location';
COMMENT ON COLUMN transfer_order_items.to_storage_location IS 'Destination storage location';
