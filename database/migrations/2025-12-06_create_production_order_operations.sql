-- Ensure work_centers has primary key constraint
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'work_centers') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'work_centers' AND constraint_type = 'PRIMARY KEY'
        ) THEN
            ALTER TABLE work_centers ADD PRIMARY KEY (id);
        END IF;
    END IF;
END $$;

-- Create production_order_operations table
-- Tracks individual operations within a production order
CREATE TABLE IF NOT EXISTS production_order_operations (
    id SERIAL PRIMARY KEY,
    production_order_id INTEGER NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
    operation_number VARCHAR(10) NOT NULL,
    description TEXT,
    work_center_id INTEGER,
    sequence_number INTEGER NOT NULL DEFAULT 0,
    
    -- Planned times (in minutes)
    setup_time_minutes NUMERIC DEFAULT 0,
    machine_time_minutes NUMERIC DEFAULT 0,
    labor_time_minutes NUMERIC DEFAULT 0,
    teardown_time_minutes NUMERIC DEFAULT 0,
    base_quantity NUMERIC DEFAULT 1,
    
    -- Actual times (from confirmation)
    actual_setup_time_minutes NUMERIC,
    actual_machine_time_minutes NUMERIC,
    actual_labor_time_minutes NUMERIC,
    actual_teardown_time_minutes NUMERIC,
    
    -- Quantities
    planned_quantity NUMERIC,
    actual_quantity NUMERIC,
    confirmed_quantity NUMERIC,
    scrap_quantity NUMERIC DEFAULT 0,
    
    -- Status and dates
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, CANCELLED
    planned_start_date TIMESTAMP,
    planned_end_date TIMESTAMP,
    actual_start_date TIMESTAMP,
    actual_end_date TIMESTAMP,
    
    -- Confirmation data
    confirmed_by INTEGER REFERENCES users(id),
    confirmation_date TIMESTAMP,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(production_order_id, operation_number)
);

CREATE INDEX IF NOT EXISTS idx_po_operations_order ON production_order_operations(production_order_id);
CREATE INDEX IF NOT EXISTS idx_po_operations_status ON production_order_operations(status);
CREATE INDEX IF NOT EXISTS idx_po_operations_work_center ON production_order_operations(work_center_id);
CREATE INDEX IF NOT EXISTS idx_po_operations_sequence ON production_order_operations(production_order_id, sequence_number);

COMMENT ON TABLE production_order_operations IS 'Individual operations within a production order';
COMMENT ON COLUMN production_order_operations.operation_number IS 'Operation sequence number (e.g., 010, 020)';

-- Add foreign key constraint for work_center_id if work_centers table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'work_centers') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'production_order_operations' 
            AND constraint_name = 'production_order_operations_work_center_id_fkey'
        ) THEN
            ALTER TABLE production_order_operations
            ADD CONSTRAINT production_order_operations_work_center_id_fkey
            FOREIGN KEY (work_center_id) REFERENCES work_centers(id);
        END IF;
    END IF;
END $$;

