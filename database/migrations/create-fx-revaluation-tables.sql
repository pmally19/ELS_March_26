-- FX Revaluation Tables

CREATE TABLE IF NOT EXISTS fx_revaluation_runs (
    id SERIAL PRIMARY KEY,
    company_code_id INTEGER REFERENCES company_codes(id),
    fiscal_period_id INTEGER REFERENCES fiscal_periods(id),
    revaluation_date DATE NOT NULL,
    reference VARCHAR(50),
    description TEXT,
    total_gain DECIMAL(15,2) DEFAULT 0,
    total_loss DECIMAL(15,2) DEFAULT 0,
    net_impact DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'DRAFT', -- 'DRAFT', 'POSTED', 'REVERSED'
    journal_entry_id INTEGER REFERENCES journal_entries(id),
    reversal_journal_entry_id INTEGER REFERENCES journal_entries(id), -- Auto-reversal in next period
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    posted_at TIMESTAMP,
    posted_by VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS fx_revaluation_items (
    id SERIAL PRIMARY KEY,
    run_id INTEGER REFERENCES fx_revaluation_runs(id) ON DELETE CASCADE,
    gl_account_id INTEGER REFERENCES gl_accounts(id),
    currency_code VARCHAR(3) NOT NULL,
    foreign_balance DECIMAL(15,2) NOT NULL,
    
    -- Rate details
    book_value_local DECIMAL(15,2) NOT NULL, -- Current balance in local currency
    revalued_amount_local DECIMAL(15,2) NOT NULL, -- Balance at new rate
    
    exchange_rate_used DECIMAL(10,6) NOT NULL,
    unrealized_gain_loss DECIMAL(15,2) NOT NULL, -- Difference
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fx_runs_period ON fx_revaluation_runs(fiscal_period_id);
CREATE INDEX IF NOT EXISTS idx_fx_items_run ON fx_revaluation_items(run_id);
