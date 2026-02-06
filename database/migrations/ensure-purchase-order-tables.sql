-- Migration to ensure purchase_orders and purchase_order_items tables exist with correct structure
-- This migration is idempotent - it can be run multiple times safely

-- Ensure purchase_orders table exists first (needed for foreign key)
DO $$
BEGIN
    -- Create purchase_orders table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_orders') THEN
        CREATE TABLE purchase_orders (
            id SERIAL PRIMARY KEY,
            order_number VARCHAR(20) NOT NULL UNIQUE,
            vendor_id INTEGER,
            purchase_organization_id INTEGER,
            company_code_id INTEGER,
            plant_id INTEGER,
            order_date DATE NOT NULL,
            delivery_date DATE,
            payment_terms VARCHAR(50),
            currency_id INTEGER,
            exchange_rate NUMERIC(10,4) DEFAULT 1.0,
            total_amount NUMERIC(15,2),
            tax_amount NUMERIC(15,2),
            discount_amount NUMERIC(15,2),
            net_amount NUMERIC(15,2),
            status VARCHAR(20) DEFAULT 'OPEN',
            created_by INTEGER,
            approved_by INTEGER,
            approval_date TIMESTAMP WITHOUT TIME ZONE,
            notes TEXT,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            active BOOLEAN DEFAULT true,
            vendor_name VARCHAR(255)
        );
        RAISE NOTICE 'Created purchase_orders table';
    END IF;

    -- Add currency column if it doesn't exist (as string for currency code like 'USD', 'EUR')
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'purchase_orders' 
        AND column_name = 'currency'
    ) THEN
        ALTER TABLE purchase_orders ADD COLUMN currency VARCHAR(10) DEFAULT 'USD';
        RAISE NOTICE 'Added currency column to purchase_orders table';
    END IF;
END $$;

-- Ensure purchase_order_items table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_order_items') THEN
        CREATE TABLE purchase_order_items (
            id SERIAL PRIMARY KEY,
            purchase_order_id INTEGER,
            line_number INTEGER NOT NULL,
            material_id INTEGER,
            description TEXT,
            quantity NUMERIC(15,3) NOT NULL,
            unit_price NUMERIC(15,2) NOT NULL,
            total_price NUMERIC(15,2) NOT NULL,
            delivery_date DATE,
            plant_id INTEGER,
            storage_location_id INTEGER,
            tax_code VARCHAR(10),
            discount_percent NUMERIC(5,2),
            received_quantity NUMERIC(15,3) DEFAULT 0,
            invoiced_quantity NUMERIC(15,3) DEFAULT 0,
            status VARCHAR(20) DEFAULT 'OPEN',
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            active BOOLEAN DEFAULT true,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        RAISE NOTICE 'Created purchase_order_items table';
    END IF;

    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'purchase_order_items' 
        AND constraint_name = 'purchase_order_items_purchase_order_id_fkey'
    ) THEN
        ALTER TABLE purchase_order_items 
        ADD CONSTRAINT purchase_order_items_purchase_order_id_fkey 
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint to purchase_order_items';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_purchase_order_id 
    ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_material_id 
    ON purchase_order_items(material_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor_id 
    ON purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_number 
    ON purchase_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status 
    ON purchase_orders(status);

-- Add comments
COMMENT ON TABLE purchase_orders IS 'Main purchase orders table';
COMMENT ON TABLE purchase_order_items IS 'Line items for purchase orders';
COMMENT ON COLUMN purchase_orders.currency IS 'Currency code (e.g., USD, EUR, GBP)';
COMMENT ON COLUMN purchase_order_items.line_number IS 'Line item number within the purchase order';
COMMENT ON COLUMN purchase_order_items.quantity IS 'Ordered quantity';
COMMENT ON COLUMN purchase_order_items.unit_price IS 'Price per unit';
COMMENT ON COLUMN purchase_order_items.total_price IS 'Total price (quantity × unit_price)';

