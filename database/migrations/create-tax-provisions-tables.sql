-- Tax Provisions Tables
-- Stores monthly tax provision calculations

CREATE TABLE IF NOT EXISTS tax_provision_config (
    id SERIAL PRIMARY KEY,
    company_code_id INTEGER REFERENCES company_codes(id),
    provision_type VARCHAR(50) NOT NULL, -- 'income_tax', 'sales_tax', 'vat', 'withholding_tax'
    tax_rate DECIMAL(5,2) NOT NULL,
    expense_account_id INTEGER REFERENCES gl_accounts(id), -- Tax expense account
    liability_account_id INTEGER REFERENCES gl_accounts(id), -- Tax payable account
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS tax_provisions (
    id SERIAL PRIMARY KEY,
    company_code_id INTEGER REFERENCES company_codes(id),
    fiscal_period_id INTEGER REFERENCES fiscal_periods(id),
    year INTEGER NOT NULL,
    period INTEGER NOT NULL,
    provision_type VARCHAR(50) NOT NULL, -- 'income_tax', 'sales_tax', 'vat'
    taxable_amount DECIMAL(15,2), -- Base amount for calculation
    tax_rate DECIMAL(5,2),
    provision_amount DECIMAL(15,2) NOT NULL,
    actual_amount DECIMAL(15,2), -- Actual tax paid (for reconciliation)
    variance DECIMAL(15,2), -- Provision vs actual
    expense_gl_account_id INTEGER REFERENCES gl_accounts(id),
    liability_gl_account_id INTEGER REFERENCES gl_accounts(id),
    posted BOOLEAN DEFAULT FALSE,
    journal_entry_id INTEGER REFERENCES journal_entries(id),
    posting_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_tax_provisions_period ON tax_provisions(fiscal_period_id);
CREATE INDEX IF NOT EXISTS idx_tax_provisions_company ON tax_provisions(company_code_id);
CREATE INDEX IF NOT EXISTS idx_tax_provisions_type ON tax_provisions(provision_type);
