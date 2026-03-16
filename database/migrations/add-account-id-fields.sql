-- Migration: Add missing ERP-standard fields to account_id_master table
-- Adds: GL Account, Routing Number, IBAN, Account Holder Name

-- Add GL Account ID (link to General Ledger for accounting integration)
ALTER TABLE account_id_master 
ADD COLUMN IF NOT EXISTS gl_account_id INTEGER;

-- Add Routing/Transit Number (for US banking operations)
ALTER TABLE account_id_master 
ADD COLUMN IF NOT EXISTS routing_number VARCHAR(20);

-- Add IBAN (International Bank Account Number for international operations)
ALTER TABLE account_id_master 
ADD COLUMN IF NOT EXISTS iban VARCHAR(34);

-- Add Account Holder Name (legal account holder information)
ALTER TABLE account_id_master 
ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(100);

-- Add foreign key constraint for GL Account (if gl_accounts table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gl_accounts') THEN
        ALTER TABLE account_id_master
        ADD CONSTRAINT fk_account_id_gl_account 
        FOREIGN KEY (gl_account_id) 
        REFERENCES gl_accounts(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_account_id_master_gl_account_id 
ON account_id_master(gl_account_id);

CREATE INDEX IF NOT EXISTS idx_account_id_master_routing_number 
ON account_id_master(routing_number);

CREATE INDEX IF NOT EXISTS idx_account_id_master_iban 
ON account_id_master(iban);

-- Add comments
COMMENT ON COLUMN account_id_master.gl_account_id IS 'Reference to General Ledger account for accounting integration';
COMMENT ON COLUMN account_id_master.routing_number IS 'Bank routing/transit number (US banking standard)';
COMMENT ON COLUMN account_id_master.iban IS 'International Bank Account Number (ISO 13616 standard)';
COMMENT ON COLUMN account_id_master.account_holder_name IS 'Legal name of the account holder';

