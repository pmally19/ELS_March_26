-- =====================================================
-- TIME ENTRIES TABLE MIGRATION
-- Create table for employee time tracking and attendance
-- =====================================================

-- Drop table if exists (for clean reinstall)
DROP TABLE IF EXISTS time_entries CASCADE;

-- Create time_entries table
CREATE TABLE time_entries (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    time_type VARCHAR(50) NOT NULL DEFAULT 'Regular Hours',
    start_time TIME,
    end_time TIME,
    duration_hours DECIMAL(5,2) DEFAULT 0,
    work_order VARCHAR(20),
    activity VARCHAR(200),
    status VARCHAR(20) NOT NULL DEFAULT 'Draft',
    approved_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    approved_date DATE,
    company_code VARCHAR(4) DEFAULT '1000',
    cost_center_id INTEGER REFERENCES cost_centers(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true,
    
    -- Constraints
    CONSTRAINT chk_time_entry_status CHECK (status IN ('Draft', 'Submitted', 'Approved', 'Rejected')),
    CONSTRAINT chk_time_type CHECK (time_type IN ('Regular Hours', 'Overtime', 'Sick Leave', 'Vacation', 'Training', 'Maintenance')),
    CONSTRAINT chk_duration_positive CHECK (duration_hours >= 0)
);

-- Create indexes for performance
CREATE INDEX idx_time_entries_employee_id ON time_entries(employee_id);
CREATE INDEX idx_time_entries_work_date ON time_entries(work_date);
CREATE INDEX idx_time_entries_status ON time_entries(status);
CREATE INDEX idx_time_entries_company_code ON time_entries(company_code);
CREATE INDEX idx_time_entries_employee_date ON time_entries(employee_id, work_date);

-- Add comments for documentation
COMMENT ON TABLE time_entries IS 'Employee time tracking and attendance records';
COMMENT ON COLUMN time_entries.employee_id IS 'Reference to employees table';
COMMENT ON COLUMN time_entries.time_type IS 'Type of time entry (Regular, Overtime, Leave, etc.)';
COMMENT ON COLUMN time_entries.duration_hours IS 'Total hours worked/logged';
COMMENT ON COLUMN time_entries.status IS 'Approval status of the time entry';

-- Insert sample data (optional - for testing)
INSERT INTO time_entries (
    employee_id, 
    work_date, 
    time_type, 
    start_time, 
    end_time, 
    duration_hours, 
    activity, 
    status
) VALUES
(1, CURRENT_DATE, 'Regular Hours', '08:00:00', '17:00:00', 8.0, 'Production work', 'Approved'),
(1, CURRENT_DATE - INTERVAL '1 day', 'Regular Hours', '08:00:00', '17:00:00', 8.0, 'Quality control', 'Submitted');

-- Verify creation
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'time_entries'
ORDER BY ordinal_position;
