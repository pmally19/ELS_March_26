-- Migration: Add Finance & Cost Integration Fields to Inventory Tables
-- Date: 2025-11-13
-- Description: Adds missing fields for cost center, profit center, COGS, landed costs, overhead, WIP, and variance tracking

-- ===================================================================
-- 1. STOCK_MOVEMENTS TABLE ENHANCEMENTS
-- ===================================================================

-- Add cost center ID (foreign key to cost_centers table)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_movements' 
        AND column_name = 'cost_center_id'
    ) THEN
        ALTER TABLE stock_movements ADD COLUMN cost_center_id INTEGER;
        RAISE NOTICE 'Added cost_center_id to stock_movements';
    END IF;
END $$;

-- Add profit center ID (foreign key to profit_centers table)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_movements' 
        AND column_name = 'profit_center_id'
    ) THEN
        ALTER TABLE stock_movements ADD COLUMN profit_center_id INTEGER;
        RAISE NOTICE 'Added profit_center_id to stock_movements';
    END IF;
END $$;

-- Add COGS amount (for sales deliveries)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_movements' 
        AND column_name = 'cogs_amount'
    ) THEN
        ALTER TABLE stock_movements ADD COLUMN cogs_amount NUMERIC(15,2);
        RAISE NOTICE 'Added cogs_amount to stock_movements';
    END IF;
END $$;

-- Add landed cost components
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_movements' 
        AND column_name = 'freight_cost'
    ) THEN
        ALTER TABLE stock_movements ADD COLUMN freight_cost NUMERIC(15,2);
        RAISE NOTICE 'Added freight_cost to stock_movements';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_movements' 
        AND column_name = 'duty_cost'
    ) THEN
        ALTER TABLE stock_movements ADD COLUMN duty_cost NUMERIC(15,2);
        RAISE NOTICE 'Added duty_cost to stock_movements';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_movements' 
        AND column_name = 'handling_cost'
    ) THEN
        ALTER TABLE stock_movements ADD COLUMN handling_cost NUMERIC(15,2);
        RAISE NOTICE 'Added handling_cost to stock_movements';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_movements' 
        AND column_name = 'insurance_cost'
    ) THEN
        ALTER TABLE stock_movements ADD COLUMN insurance_cost NUMERIC(15,2);
        RAISE NOTICE 'Added insurance_cost to stock_movements';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_movements' 
        AND column_name = 'total_landed_cost'
    ) THEN
        ALTER TABLE stock_movements ADD COLUMN total_landed_cost NUMERIC(15,2);
        RAISE NOTICE 'Added total_landed_cost to stock_movements';
    END IF;
END $$;

-- Add overhead allocation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_movements' 
        AND column_name = 'overhead_amount'
    ) THEN
        ALTER TABLE stock_movements ADD COLUMN overhead_amount NUMERIC(15,2);
        RAISE NOTICE 'Added overhead_amount to stock_movements';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_movements' 
        AND column_name = 'overhead_rate'
    ) THEN
        ALTER TABLE stock_movements ADD COLUMN overhead_rate NUMERIC(5,2);
        RAISE NOTICE 'Added overhead_rate to stock_movements';
    END IF;
END $$;

-- Add WIP tracking
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_movements' 
        AND column_name = 'wip_amount'
    ) THEN
        ALTER TABLE stock_movements ADD COLUMN wip_amount NUMERIC(15,2);
        RAISE NOTICE 'Added wip_amount to stock_movements';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_movements' 
        AND column_name = 'production_order_id'
    ) THEN
        ALTER TABLE stock_movements ADD COLUMN production_order_id INTEGER;
        RAISE NOTICE 'Added production_order_id to stock_movements';
    END IF;
END $$;

-- Add variance tracking
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_movements' 
        AND column_name = 'standard_cost'
    ) THEN
        ALTER TABLE stock_movements ADD COLUMN standard_cost NUMERIC(15,2);
        RAISE NOTICE 'Added standard_cost to stock_movements';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_movements' 
        AND column_name = 'actual_cost'
    ) THEN
        ALTER TABLE stock_movements ADD COLUMN actual_cost NUMERIC(15,2);
        RAISE NOTICE 'Added actual_cost to stock_movements';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_movements' 
        AND column_name = 'variance_amount'
    ) THEN
        ALTER TABLE stock_movements ADD COLUMN variance_amount NUMERIC(15,2);
        RAISE NOTICE 'Added variance_amount to stock_movements';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_movements' 
        AND column_name = 'variance_type'
    ) THEN
        ALTER TABLE stock_movements ADD COLUMN variance_type VARCHAR(20);
        RAISE NOTICE 'Added variance_type to stock_movements';
    END IF;
END $$;

-- Add financial posting tracking
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_movements' 
        AND column_name = 'gl_document_number'
    ) THEN
        ALTER TABLE stock_movements ADD COLUMN gl_document_number VARCHAR(20);
        RAISE NOTICE 'Added gl_document_number to stock_movements';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_movements' 
        AND column_name = 'financial_posting_status'
    ) THEN
        ALTER TABLE stock_movements ADD COLUMN financial_posting_status VARCHAR(20) DEFAULT 'PENDING';
        RAISE NOTICE 'Added financial_posting_status to stock_movements';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_movements' 
        AND column_name = 'financial_posting_error'
    ) THEN
        ALTER TABLE stock_movements ADD COLUMN financial_posting_error TEXT;
        RAISE NOTICE 'Added financial_posting_error to stock_movements';
    END IF;
END $$;

-- Add write-off/write-down tracking
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_movements' 
        AND column_name = 'write_off_amount'
    ) THEN
        ALTER TABLE stock_movements ADD COLUMN write_off_amount NUMERIC(15,2);
        RAISE NOTICE 'Added write_off_amount to stock_movements';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_movements' 
        AND column_name = 'write_down_amount'
    ) THEN
        ALTER TABLE stock_movements ADD COLUMN write_down_amount NUMERIC(15,2);
        RAISE NOTICE 'Added write_down_amount to stock_movements';
    END IF;
END $$;

-- Add foreign key constraints (only if referenced tables have primary keys)
DO $$
BEGIN
    -- Cost center foreign key - check if cost_centers has primary key on id
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'cost_centers'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'cost_centers' 
        AND tc.constraint_type = 'PRIMARY KEY'
        AND kcu.column_name = 'id'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_schema = 'public' 
            AND table_name = 'stock_movements' 
            AND constraint_name = 'fk_stock_movements_cost_center'
        ) THEN
            ALTER TABLE stock_movements 
            ADD CONSTRAINT fk_stock_movements_cost_center 
                FOREIGN KEY (cost_center_id) 
                REFERENCES cost_centers(id) 
                ON DELETE SET NULL;
            RAISE NOTICE 'Added foreign key constraint for cost_center_id';
        END IF;
    END IF;
    
    -- Profit center foreign key - check if profit_centers has primary key on id
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'profit_centers'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'profit_centers' 
        AND tc.constraint_type = 'PRIMARY KEY'
        AND kcu.column_name = 'id'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_schema = 'public' 
            AND table_name = 'stock_movements' 
            AND constraint_name = 'fk_stock_movements_profit_center'
        ) THEN
            ALTER TABLE stock_movements 
            ADD CONSTRAINT fk_stock_movements_profit_center 
                FOREIGN KEY (profit_center_id) 
                REFERENCES profit_centers(id) 
                ON DELETE SET NULL;
            RAISE NOTICE 'Added foreign key constraint for profit_center_id';
        END IF;
    END IF;
    
    -- Production order foreign key - check if production_orders has primary key on id
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'production_orders'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'production_orders' 
        AND tc.constraint_type = 'PRIMARY KEY'
        AND kcu.column_name = 'id'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_schema = 'public' 
            AND table_name = 'stock_movements' 
            AND constraint_name = 'fk_stock_movements_production_order'
        ) THEN
            ALTER TABLE stock_movements 
            ADD CONSTRAINT fk_stock_movements_production_order 
                FOREIGN KEY (production_order_id) 
                REFERENCES production_orders(id) 
                ON DELETE SET NULL;
            RAISE NOTICE 'Added foreign key constraint for production_order_id';
        END IF;
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_cost_center_id ON stock_movements(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_profit_center_id ON stock_movements(profit_center_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_production_order_id ON stock_movements(production_order_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_financial_posting_status ON stock_movements(financial_posting_status);
CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_type_cogs ON stock_movements(movement_type) WHERE cogs_amount IS NOT NULL;

-- ===================================================================
-- 2. STOCK_BALANCES TABLE ENHANCEMENTS
-- ===================================================================

-- Add standard cost
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_balances' 
        AND column_name = 'standard_cost'
    ) THEN
        ALTER TABLE stock_balances ADD COLUMN standard_cost NUMERIC(15,2);
        RAISE NOTICE 'Added standard_cost to stock_balances';
    END IF;
END $$;

-- Add cost center ID
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_balances' 
        AND column_name = 'cost_center_id'
    ) THEN
        ALTER TABLE stock_balances ADD COLUMN cost_center_id INTEGER;
        RAISE NOTICE 'Added cost_center_id to stock_balances';
    END IF;
END $$;

-- Add profit center ID
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_balances' 
        AND column_name = 'profit_center_id'
    ) THEN
        ALTER TABLE stock_balances ADD COLUMN profit_center_id INTEGER;
        RAISE NOTICE 'Added profit_center_id to stock_balances';
    END IF;
END $$;

-- Add foreign key constraints for stock_balances (only if referenced tables have primary keys)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'cost_centers'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'cost_centers' 
        AND tc.constraint_type = 'PRIMARY KEY'
        AND kcu.column_name = 'id'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_schema = 'public' 
            AND table_name = 'stock_balances' 
            AND constraint_name = 'fk_stock_balances_cost_center'
        ) THEN
            ALTER TABLE stock_balances 
            ADD CONSTRAINT fk_stock_balances_cost_center 
                FOREIGN KEY (cost_center_id) 
                REFERENCES cost_centers(id) 
                ON DELETE SET NULL;
        END IF;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'profit_centers'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'profit_centers' 
        AND tc.constraint_type = 'PRIMARY KEY'
        AND kcu.column_name = 'id'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_schema = 'public' 
            AND table_name = 'stock_balances' 
            AND constraint_name = 'fk_stock_balances_profit_center'
        ) THEN
            ALTER TABLE stock_balances 
            ADD CONSTRAINT fk_stock_balances_profit_center 
                FOREIGN KEY (profit_center_id) 
                REFERENCES profit_centers(id) 
                ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- ===================================================================
-- 3. GOODS_RECEIPTS TABLE ENHANCEMENTS
-- ===================================================================

-- Add landed cost fields to goods_receipts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'freight_cost'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN freight_cost NUMERIC(15,2) DEFAULT 0;
        RAISE NOTICE 'Added freight_cost to goods_receipts';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'duty_cost'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN duty_cost NUMERIC(15,2) DEFAULT 0;
        RAISE NOTICE 'Added duty_cost to goods_receipts';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'handling_cost'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN handling_cost NUMERIC(15,2) DEFAULT 0;
        RAISE NOTICE 'Added handling_cost to goods_receipts';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'insurance_cost'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN insurance_cost NUMERIC(15,2) DEFAULT 0;
        RAISE NOTICE 'Added insurance_cost to goods_receipts';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'total_landed_cost'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN total_landed_cost NUMERIC(15,2);
        RAISE NOTICE 'Added total_landed_cost to goods_receipts';
    END IF;
END $$;

-- Add cost center and profit center to goods_receipts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'cost_center_id'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN cost_center_id INTEGER;
        RAISE NOTICE 'Added cost_center_id to goods_receipts';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'profit_center_id'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN profit_center_id INTEGER;
        RAISE NOTICE 'Added profit_center_id to goods_receipts';
    END IF;
END $$;

-- Add financial posting status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'financial_posting_status'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN financial_posting_status VARCHAR(20) DEFAULT 'PENDING';
        RAISE NOTICE 'Added financial_posting_status to goods_receipts';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'gl_document_number'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN gl_document_number VARCHAR(20);
        RAISE NOTICE 'Added gl_document_number to goods_receipts';
    END IF;
END $$;

-- ===================================================================
-- 4. PRODUCTION_ORDERS TABLE ENHANCEMENTS (for WIP tracking)
-- ===================================================================

-- Add WIP cost fields to production_orders
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'production_orders' 
        AND column_name = 'wip_material_cost'
    ) THEN
        ALTER TABLE production_orders ADD COLUMN wip_material_cost NUMERIC(15,2) DEFAULT 0;
        RAISE NOTICE 'Added wip_material_cost to production_orders';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'production_orders' 
        AND column_name = 'wip_labor_cost'
    ) THEN
        ALTER TABLE production_orders ADD COLUMN wip_labor_cost NUMERIC(15,2) DEFAULT 0;
        RAISE NOTICE 'Added wip_labor_cost to production_orders';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'production_orders' 
        AND column_name = 'wip_overhead_cost'
    ) THEN
        ALTER TABLE production_orders ADD COLUMN wip_overhead_cost NUMERIC(15,2) DEFAULT 0;
        RAISE NOTICE 'Added wip_overhead_cost to production_orders';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'production_orders' 
        AND column_name = 'wip_total_cost'
    ) THEN
        ALTER TABLE production_orders ADD COLUMN wip_total_cost NUMERIC(15,2) DEFAULT 0;
        RAISE NOTICE 'Added wip_total_cost to production_orders';
    END IF;
END $$;

-- ===================================================================
-- 5. COST_CENTERS TABLE ENHANCEMENTS (for overhead rates)
-- ===================================================================

-- Add overhead rate to cost_centers if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cost_centers' 
        AND column_name = 'overhead_rate'
    ) THEN
        ALTER TABLE cost_centers ADD COLUMN overhead_rate NUMERIC(5,2);
        RAISE NOTICE 'Added overhead_rate to cost_centers';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cost_centers' 
        AND column_name = 'overhead_calculation_method'
    ) THEN
        ALTER TABLE cost_centers ADD COLUMN overhead_calculation_method VARCHAR(20);
        RAISE NOTICE 'Added overhead_calculation_method to cost_centers';
    END IF;
END $$;

-- ===================================================================
-- 6. ADD COMMENTS FOR DOCUMENTATION
-- ===================================================================

COMMENT ON COLUMN stock_movements.cost_center_id IS 'Reference to cost center for cost allocation';
COMMENT ON COLUMN stock_movements.profit_center_id IS 'Reference to profit center for profitability analysis';
COMMENT ON COLUMN stock_movements.cogs_amount IS 'Cost of goods sold amount for sales deliveries (Movement Type 601)';
COMMENT ON COLUMN stock_movements.freight_cost IS 'Freight cost component of landed cost';
COMMENT ON COLUMN stock_movements.duty_cost IS 'Import duty/tax component of landed cost';
COMMENT ON COLUMN stock_movements.handling_cost IS 'Handling charges component of landed cost';
COMMENT ON COLUMN stock_movements.insurance_cost IS 'Insurance cost component of landed cost';
COMMENT ON COLUMN stock_movements.total_landed_cost IS 'Total landed cost (unit_price + freight + duty + handling + insurance)';
COMMENT ON COLUMN stock_movements.overhead_amount IS 'Overhead cost allocated to this movement';
COMMENT ON COLUMN stock_movements.overhead_rate IS 'Overhead rate used for calculation';
COMMENT ON COLUMN stock_movements.wip_amount IS 'Work in process cost for production movements';
COMMENT ON COLUMN stock_movements.production_order_id IS 'Reference to production order for WIP tracking';
COMMENT ON COLUMN stock_movements.standard_cost IS 'Standard cost for variance analysis';
COMMENT ON COLUMN stock_movements.actual_cost IS 'Actual cost incurred';
COMMENT ON COLUMN stock_movements.variance_amount IS 'Variance amount (actual - standard)';
COMMENT ON COLUMN stock_movements.variance_type IS 'Type of variance (PRICE, QUANTITY, MIX, etc.)';
COMMENT ON COLUMN stock_movements.gl_document_number IS 'GL document number for financial posting';
COMMENT ON COLUMN stock_movements.financial_posting_status IS 'Status of financial posting (PENDING, POSTED, FAILED)';
COMMENT ON COLUMN stock_movements.financial_posting_error IS 'Error message if financial posting failed';
COMMENT ON COLUMN stock_movements.write_off_amount IS 'Amount written off for inventory losses';
COMMENT ON COLUMN stock_movements.write_down_amount IS 'Amount written down for inventory devaluation';

COMMENT ON COLUMN stock_balances.standard_cost IS 'Standard cost for this material at this location';
COMMENT ON COLUMN stock_balances.cost_center_id IS 'Default cost center for this stock balance';
COMMENT ON COLUMN stock_balances.profit_center_id IS 'Default profit center for this stock balance';

COMMENT ON COLUMN goods_receipts.freight_cost IS 'Freight cost for this goods receipt';
COMMENT ON COLUMN goods_receipts.duty_cost IS 'Import duty/tax for this goods receipt';
COMMENT ON COLUMN goods_receipts.handling_cost IS 'Handling charges for this goods receipt';
COMMENT ON COLUMN goods_receipts.insurance_cost IS 'Insurance cost for this goods receipt';
COMMENT ON COLUMN goods_receipts.total_landed_cost IS 'Total landed cost including all additional costs';
COMMENT ON COLUMN goods_receipts.cost_center_id IS 'Cost center for this goods receipt';
COMMENT ON COLUMN goods_receipts.profit_center_id IS 'Profit center for this goods receipt';
COMMENT ON COLUMN goods_receipts.financial_posting_status IS 'Status of financial posting';
COMMENT ON COLUMN goods_receipts.gl_document_number IS 'GL document number for financial posting';

COMMENT ON COLUMN production_orders.wip_material_cost IS 'Material cost accumulated in WIP';
COMMENT ON COLUMN production_orders.wip_labor_cost IS 'Labor cost accumulated in WIP';
COMMENT ON COLUMN production_orders.wip_overhead_cost IS 'Overhead cost accumulated in WIP';
COMMENT ON COLUMN production_orders.wip_total_cost IS 'Total WIP cost (material + labor + overhead)';

COMMENT ON COLUMN cost_centers.overhead_rate IS 'Overhead allocation rate for this cost center';
COMMENT ON COLUMN cost_centers.overhead_calculation_method IS 'Method for overhead calculation (PERCENTAGE, ACTIVITY_BASED, etc.)';

