-- Migration: Create account_id_master table
-- This table stores account identifiers for bank accounts used in payment processing

CREATE TABLE IF NOT EXISTS account_id_master (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(10) NOT NULL UNIQUE,
    description VARCHAR(100) NOT NULL,
    bank_master_id INTEGER,
    company_code_id INTEGER,
    account_number VARCHAR(50),
    account_type VARCHAR(20) DEFAULT 'checking',
    currency VARCHAR(3) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraints
ALTER TABLE account_id_master
ADD CONSTRAINT fk_account_id_bank_master 
FOREIGN KEY (bank_master_id) 
REFERENCES bank_master(id)
ON DELETE SET NULL;

ALTER TABLE account_id_master
ADD CONSTRAINT fk_account_id_company_code 
FOREIGN KEY (company_code_id) 
REFERENCES company_codes(id)
ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_account_id_master_account_id ON account_id_master(account_id);
CREATE INDEX IF NOT EXISTS idx_account_id_master_bank_master_id ON account_id_master(bank_master_id);
CREATE INDEX IF NOT EXISTS idx_account_id_master_company_code_id ON account_id_master(company_code_id);
CREATE INDEX IF NOT EXISTS idx_account_id_master_is_active ON account_id_master(is_active);

-- Add comments
COMMENT ON TABLE account_id_master IS 'Master data for account identifiers used in payment processing';
COMMENT ON COLUMN account_id_master.account_id IS 'Unique account identifier code';
COMMENT ON COLUMN account_id_master.bank_master_id IS 'Reference to bank master record';
COMMENT ON COLUMN account_id_master.company_code_id IS 'Reference to company code for multi-company support';

