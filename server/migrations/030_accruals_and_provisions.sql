-- ============================================================
-- Migration 030: Accruals & Provisions
-- Adds configuration and entry tables for managing accruals 
-- and provisions with approval workflows.
-- ============================================================

-- Step 1: Create Reversal Reasons (SAP-style codes 01-05)
CREATE TABLE IF NOT EXISTS reversal_reasons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,       -- e.g., '01', '02'
    description VARCHAR(100) NOT NULL,      -- e.g., 'Reversal in current period', 'Reversal in closed period'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert standard SAP reversal reasons if table is empty
INSERT INTO reversal_reasons (code, description)
SELECT '01', 'Reversal in current period'
WHERE NOT EXISTS (SELECT 1 FROM reversal_reasons WHERE code = '01');

INSERT INTO reversal_reasons (code, description)
SELECT '02', 'Reversal in closed period'
WHERE NOT EXISTS (SELECT 1 FROM reversal_reasons WHERE code = '02');

INSERT INTO reversal_reasons (code, description)
SELECT '03', 'Actual reversal in current period'
WHERE NOT EXISTS (SELECT 1 FROM reversal_reasons WHERE code = '03');

INSERT INTO reversal_reasons (code, description)
SELECT '04', 'Actual reversal in closed period'
WHERE NOT EXISTS (SELECT 1 FROM reversal_reasons WHERE code = '04');

INSERT INTO reversal_reasons (code, description)
SELECT '05', 'Accrual/Deferral posting'
WHERE NOT EXISTS (SELECT 1 FROM reversal_reasons WHERE code = '05');

-- Step 2: Create Provision Types
CREATE TABLE IF NOT EXISTS provision_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,       -- e.g., 'LEGAL', 'AUDIT'
    description VARCHAR(100) NOT NULL,      -- e.g., 'Legal provisioning', 'Audit fees'
    default_expense_account_id INTEGER REFERENCES gl_accounts(id),
    default_provision_account_id INTEGER REFERENCES gl_accounts(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default provision types if empty
INSERT INTO provision_types (code, description)
SELECT 'LEGAL', 'Legal provisions'
WHERE NOT EXISTS (SELECT 1 FROM provision_types WHERE code = 'LEGAL');

INSERT INTO provision_types (code, description)
SELECT 'AUDIT', 'Audit fees provisions'
WHERE NOT EXISTS (SELECT 1 FROM provision_types WHERE code = 'AUDIT');

INSERT INTO provision_types (code, description)
SELECT 'WARRANTY', 'Warranty provisions'
WHERE NOT EXISTS (SELECT 1 FROM provision_types WHERE code = 'WARRANTY');

INSERT INTO provision_types (code, description)
SELECT 'BAD_DEBT', 'Bad debt provisions'
WHERE NOT EXISTS (SELECT 1 FROM provision_types WHERE code = 'BAD_DEBT');

INSERT INTO provision_types (code, description)
SELECT 'TAX', 'Tax provisions'
WHERE NOT EXISTS (SELECT 1 FROM provision_types WHERE code = 'TAX');

INSERT INTO provision_types (code, description)
SELECT 'CUSTOM', 'Custom provisions'
WHERE NOT EXISTS (SELECT 1 FROM provision_types WHERE code = 'CUSTOM');

-- Step 3: Create Provision Entries Table
CREATE TABLE IF NOT EXISTS provision_entries (
    id SERIAL PRIMARY KEY,
    company_code_id INTEGER NOT NULL REFERENCES company_codes(id),
    document_number VARCHAR(50) UNIQUE,     -- AC/PR document number
    provision_type_id INTEGER NOT NULL REFERENCES provision_types(id),
    
    amount DECIMAL(15,2) NOT NULL,
    currency_id INTEGER NOT NULL REFERENCES currencies(id),
    
    posting_date DATE NOT NULL,
    fiscal_year INTEGER NOT NULL,
    fiscal_period INTEGER NOT NULL,
    
    expense_account_id INTEGER NOT NULL REFERENCES gl_accounts(id),
    provision_account_id INTEGER NOT NULL REFERENCES gl_accounts(id),
    cost_center_id INTEGER REFERENCES cost_centers(id),
    profit_center_id INTEGER REFERENCES profit_centers(id),
    
    is_accrual BOOLEAN DEFAULT false,       -- True if this is an Accrual (doc type AC vs PR)
    description TEXT,
    
    -- Status tracking: DRAFT -> APPROVED -> POSTED -> REVERSED
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'POSTED', 'REVERSED', 'REJECTED')),
    
    -- Reversal data
    reversal_date DATE,
    reversal_reason_id INTEGER REFERENCES reversal_reasons(id),
    reversal_document_number VARCHAR(50),   -- Link to reversed GL doc
    
    journal_entry_id INTEGER REFERENCES journal_entries(id), -- Link to primary GL doc
    
    created_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prov_company ON provision_entries(company_code_id);
CREATE INDEX IF NOT EXISTS idx_prov_status ON provision_entries(status);
CREATE INDEX IF NOT EXISTS idx_prov_dates ON provision_entries(posting_date);


