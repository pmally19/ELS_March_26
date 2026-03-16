-- Migration: Add inventory tracking fields and purchase order enhancements
-- This migration adds fields needed for proper SAP Business One compliance

-- Add ordered_quantity and committed_quantity to stock_balances table
DO $$
BEGIN
    -- Add ordered_quantity column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_balances' 
        AND column_name = 'ordered_quantity'
    ) THEN
        ALTER TABLE stock_balances ADD COLUMN ordered_quantity DECIMAL(15,3) DEFAULT 0;
        RAISE NOTICE 'Added ordered_quantity column to stock_balances';
    END IF;

    -- Add committed_quantity column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_balances' 
        AND column_name = 'committed_quantity'
    ) THEN
        ALTER TABLE stock_balances ADD COLUMN committed_quantity DECIMAL(15,3) DEFAULT 0;
        RAISE NOTICE 'Added committed_quantity column to stock_balances';
    END IF;

    -- Add reserved_quantity column if it doesn't exist (alias for committed_quantity)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_balances' 
        AND column_name = 'reserved_quantity'
    ) THEN
        ALTER TABLE stock_balances ADD COLUMN reserved_quantity DECIMAL(15,3) DEFAULT 0;
        RAISE NOTICE 'Added reserved_quantity column to stock_balances';
    END IF;
END $$;

-- Add address fields to purchase_orders
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'purchase_orders' 
        AND column_name = 'ship_to_address_id'
    ) THEN
        ALTER TABLE purchase_orders ADD COLUMN ship_to_address_id INTEGER;
        RAISE NOTICE 'Added ship_to_address_id to purchase_orders';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'purchase_orders' 
        AND column_name = 'pay_to_address_id'
    ) THEN
        ALTER TABLE purchase_orders ADD COLUMN pay_to_address_id INTEGER;
        RAISE NOTICE 'Added pay_to_address_id to purchase_orders';
    END IF;
END $$;

-- Add posted status to goods_receipts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'posted'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN posted BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added posted column to goods_receipts';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'posted_date'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN posted_date TIMESTAMP;
        RAISE NOTICE 'Added posted_date column to goods_receipts';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'purchase_order_id'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN purchase_order_id INTEGER;
        RAISE NOTICE 'Added purchase_order_id to goods_receipts';
    END IF;
END $$;

-- Add posted status to ap_invoices
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ap_invoices' 
        AND column_name = 'posted'
    ) THEN
        ALTER TABLE ap_invoices ADD COLUMN posted BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added posted column to ap_invoices';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ap_invoices' 
        AND column_name = 'posted_date'
    ) THEN
        ALTER TABLE ap_invoices ADD COLUMN posted_date TIMESTAMP;
        RAISE NOTICE 'Added posted_date column to ap_invoices';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ap_invoices' 
        AND column_name = 'grpo_id'
    ) THEN
        ALTER TABLE ap_invoices ADD COLUMN grpo_id INTEGER;
        RAISE NOTICE 'Added grpo_id to ap_invoices';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ap_invoices' 
        AND column_name = 'grpo_reference'
    ) THEN
        ALTER TABLE ap_invoices ADD COLUMN grpo_reference VARCHAR(100);
        RAISE NOTICE 'Added grpo_reference to ap_invoices';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ap_invoices' 
        AND column_name = 'purchase_order_id'
    ) THEN
        ALTER TABLE ap_invoices ADD COLUMN purchase_order_id INTEGER;
        RAISE NOTICE 'Added purchase_order_id to ap_invoices';
    END IF;
END $$;

-- Create payment_applications table (if it doesn't exist)
-- First check if it exists and add missing columns if needed
DO $$
BEGIN
    -- Create table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_applications') THEN
        CREATE TABLE payment_applications (
            id SERIAL PRIMARY KEY,
            payment_id INTEGER NOT NULL,
            invoice_id INTEGER NOT NULL,
            applied_amount DECIMAL(15,2) NOT NULL,
            application_date DATE NOT NULL DEFAULT CURRENT_DATE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        RAISE NOTICE 'Created payment_applications table';
    ELSE
        -- Table exists, add missing columns if needed
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payment_applications' AND column_name = 'payment_id'
        ) THEN
            ALTER TABLE payment_applications ADD COLUMN payment_id INTEGER;
            RAISE NOTICE 'Added payment_id column to payment_applications';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payment_applications' AND column_name = 'invoice_id'
        ) THEN
            ALTER TABLE payment_applications ADD COLUMN invoice_id INTEGER;
            RAISE NOTICE 'Added invoice_id column to payment_applications';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payment_applications' AND column_name = 'applied_amount'
        ) THEN
            ALTER TABLE payment_applications ADD COLUMN applied_amount DECIMAL(15,2);
            RAISE NOTICE 'Added applied_amount column to payment_applications';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payment_applications' AND column_name = 'application_date'
        ) THEN
            ALTER TABLE payment_applications ADD COLUMN application_date DATE DEFAULT CURRENT_DATE;
            RAISE NOTICE 'Added application_date column to payment_applications';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payment_applications' AND column_name = 'created_at'
        ) THEN
            ALTER TABLE payment_applications ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
            RAISE NOTICE 'Added created_at column to payment_applications';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payment_applications' AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE payment_applications ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
            RAISE NOTICE 'Added updated_at column to payment_applications';
        END IF;
    END IF;
END $$;

-- Add foreign key constraints if tables exist (skip if they don't)
-- First, clean up any orphaned records that would violate the constraint
DO $$
BEGIN
    -- Clean up orphaned payment_applications records (only if columns exist)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_applications') THEN
        -- Check if payment_id column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payment_applications' AND column_name = 'payment_id'
        ) THEN
            -- Remove records with invalid payment_id if ap_payments table exists
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ap_payments') THEN
                DELETE FROM payment_applications 
                WHERE payment_id NOT IN (SELECT id FROM ap_payments);
            END IF;
        END IF;
        
        -- Check if invoice_id column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payment_applications' AND column_name = 'invoice_id'
        ) THEN
            -- Remove records with invalid invoice_id if ap_invoices table exists
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ap_invoices') THEN
                DELETE FROM payment_applications 
                WHERE invoice_id NOT IN (SELECT id FROM ap_invoices);
            END IF;
        END IF;
    END IF;
END $$;

-- Now add foreign key constraints
DO $$
BEGIN
    -- Check if ap_payments table exists before adding FK
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ap_payments') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'payment_applications_fk_payment'
        ) THEN
            BEGIN
                ALTER TABLE payment_applications 
                ADD CONSTRAINT payment_applications_fk_payment 
                FOREIGN KEY (payment_id) REFERENCES ap_payments(id) ON DELETE CASCADE;
                RAISE NOTICE 'Added foreign key constraint payment_applications_fk_payment';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not add foreign key constraint payment_applications_fk_payment: %', SQLERRM;
            END;
        END IF;
    END IF;

    -- Check if ap_invoices table exists before adding FK
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ap_invoices') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'payment_applications_fk_invoice'
        ) THEN
            BEGIN
                ALTER TABLE payment_applications 
                ADD CONSTRAINT payment_applications_fk_invoice 
                FOREIGN KEY (invoice_id) REFERENCES ap_invoices(id) ON DELETE CASCADE;
                RAISE NOTICE 'Added foreign key constraint payment_applications_fk_invoice';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not add foreign key constraint payment_applications_fk_invoice: %', SQLERRM;
            END;
        END IF;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payment_applications_payment_id ON payment_applications(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_applications_invoice_id ON payment_applications(invoice_id);

-- Create document_settings table for address defaulting
CREATE TABLE IF NOT EXISTS document_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default document settings
INSERT INTO document_settings (setting_key, setting_value, description)
VALUES 
    ('use_warehouse_address_for_po_ship_to', 'true', 'Use warehouse address as default ship-to address for purchase orders'),
    ('perpetual_inventory_enabled', 'true', 'Enable perpetual inventory with GR/IR clearing account'),
    ('default_po_status', 'OPEN', 'Default status for new purchase orders'),
    ('default_currency', NULL, 'Default currency for purchase orders (leave NULL to use vendor/company currency)')
ON CONFLICT (setting_key) DO NOTHING;

-- Add GR/IR clearing account reference (store account number)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'document_settings' 
        AND column_name = 'setting_category'
    ) THEN
        ALTER TABLE document_settings ADD COLUMN setting_category VARCHAR(50);
        RAISE NOTICE 'Added setting_category to document_settings';
    END IF;
END $$;

-- Update available_quantity calculation trigger (if needed)
-- Note: available_quantity should be calculated as: quantity - committed_quantity + ordered_quantity
-- This will be handled in application logic for now

-- Create ap_invoice_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS ap_invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL,
    material_id INTEGER,
    material_code VARCHAR(50),
    quantity DECIMAL(15,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add comments
COMMENT ON COLUMN stock_balances.ordered_quantity IS 'Quantity ordered from vendors (from purchase orders)';
COMMENT ON COLUMN stock_balances.committed_quantity IS 'Quantity committed to sales orders or production';
COMMENT ON COLUMN stock_balances.reserved_quantity IS 'Alias for committed_quantity - reserved for orders';
COMMENT ON COLUMN purchase_orders.ship_to_address_id IS 'Address where goods should be shipped';
COMMENT ON COLUMN purchase_orders.pay_to_address_id IS 'Address for payment (from vendor master)';
COMMENT ON COLUMN goods_receipts.posted IS 'Whether GRPO has been posted (locked for editing)';
COMMENT ON COLUMN ap_invoices.posted IS 'Whether A/P Invoice has been posted (locked for editing)';

