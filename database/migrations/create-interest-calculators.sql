-- Migration: Create Interest Calculators master data table
-- Purpose: Manage interest calculation methods for various financial scenarios

BEGIN;

CREATE TABLE interest_calculators (
    id SERIAL PRIMARY KEY,
    
    -- Core Identification
    calculator_code VARCHAR(20) NOT NULL UNIQUE,
    calculator_name VARCHAR(100) NOT NULL,
    
    -- Interest Configuration
    interest_type VARCHAR(20) NOT NULL,  -- 'simple', 'compound', 'declining_balance'
    calculation_basis VARCHAR(20) NOT NULL,  -- '365', '360', 'actual'
    frequency VARCHAR(20) NOT NULL,  -- 'daily', 'monthly', 'quarterly', 'annually'
    
    -- Calculation Details
    formula TEXT,
    default_rate DECIMAL(10,4),  -- Default interest rate in percentage
    
    -- Rounding Configuration
    rounding_method VARCHAR(20) DEFAULT 'round_nearest',
    rounding_precision INTEGER DEFAULT 2,
    
    -- Documentation
    description TEXT,
    
    -- Status & Audit
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_interest_calculators_code ON interest_calculators(calculator_code);
CREATE INDEX idx_interest_calculators_type ON interest_calculators(interest_type);
CREATE INDEX idx_interest_calculators_active ON interest_calculators(is_active);

-- Add comments for documentation
COMMENT ON TABLE interest_calculators IS 'Master data for interest calculation methods';
COMMENT ON COLUMN interest_calculators.calculator_code IS 'Unique identifier code (e.g., INT001, INT_DAILY)';
COMMENT ON COLUMN interest_calculators.calculator_name IS 'Display name for the calculation method';
COMMENT ON COLUMN interest_calculators.interest_type IS 'Type: simple, compound, or declining_balance';
COMMENT ON COLUMN interest_calculators.calculation_basis IS 'Day count convention: 365, 360, or actual';
COMMENT ON COLUMN interest_calculators.frequency IS 'Calculation frequency: daily, monthly, quarterly, annually';
COMMENT ON COLUMN interest_calculators.formula IS 'Custom calculation formula (optional)';
COMMENT ON COLUMN interest_calculators.default_rate IS 'Default interest rate in percentage';

-- Insert sample data
INSERT INTO interest_calculators (calculator_code, calculator_name, interest_type, calculation_basis, frequency, formula, default_rate, description) VALUES
('INT_DAILY', 'Daily Simple Interest', 'simple', '365', 'daily', 'principal * rate * days / 365', 5.50, 'Standard daily simple interest calculation using 365-day year'),
('INT_COMPOUND', 'Monthly Compound Interest', 'compound', '365', 'monthly', 'principal * ((1 + rate/12)^months - 1)', 6.00, 'Compound interest calculated monthly with monthly compounding'),
('INT_CUSTOMER', 'Customer Late Payment', 'simple', '365', 'daily', 'principal * rate * days / 365', 18.00, 'Interest charged on overdue customer invoices (18% annual)'),
('INT_VENDOR', 'Vendor Early Discount', 'simple', '360', 'daily', 'principal * rate * days / 360', 2.00, 'Discount for early payment to vendors using 360-day convention');

COMMIT;
