-- Migration: Ensure GL Accounts for Vendor Payments
-- Description: Creates default GL accounts for AP and Bank if they don't exist, and ensures bank accounts are linked to GL accounts
-- Date: 2025-11-11

-- 1. Create default Accounts Payable GL account if it doesn't exist
DO $$
DECLARE
    ap_account_exists BOOLEAN;
    ap_account_id INTEGER;
BEGIN
    -- Check if AP account exists
    SELECT EXISTS (
        SELECT 1 FROM gl_accounts
        WHERE account_type = 'LIABILITIES'
          AND (
            account_group ILIKE '%PAYABLE%' 
            OR account_group ILIKE '%ACCOUNTS_PAYABLE%'
            OR account_number LIKE '2100%'
          )
          AND is_active = true
    ) INTO ap_account_exists;

    -- If AP account doesn't exist, create one
    IF NOT ap_account_exists THEN
        INSERT INTO gl_accounts (
            account_number, account_name, account_type, account_group,
            balance_sheet_account, pl_account, block_posting, reconciliation_account,
            is_active, created_at, updated_at
        ) VALUES (
            '2100-0000',
            'Accounts Payable',
            'LIABILITIES',
            'ACCOUNTS_PAYABLE',
            true,
            false,
            false,
            true,
            true,
            NOW(),
            NOW()
        )
        RETURNING id INTO ap_account_id;
        
        RAISE NOTICE 'Created default AP GL account with ID: %', ap_account_id;
    ELSE
        RAISE NOTICE 'AP GL account already exists';
    END IF;
END $$;

-- 2. Create default Bank GL account if it doesn't exist
DO $$
DECLARE
    bank_account_exists BOOLEAN;
    bank_account_id INTEGER;
BEGIN
    -- Check if Bank account exists
    SELECT EXISTS (
        SELECT 1 FROM gl_accounts
        WHERE account_type = 'ASSETS'
          AND (
            account_group ILIKE '%BANK%' 
            OR account_group ILIKE '%CASH%'
            OR account_number LIKE '1000%'
          )
          AND is_active = true
    ) INTO bank_account_exists;

    -- If Bank account doesn't exist, create one
    IF NOT bank_account_exists THEN
        INSERT INTO gl_accounts (
            account_number, account_name, account_type, account_group,
            balance_sheet_account, pl_account, block_posting, reconciliation_account,
            is_active, created_at, updated_at
        ) VALUES (
            '1000-0000',
            'Bank Account',
            'ASSETS',
            'BANK_ACCOUNTS',
            true,
            false,
            false,
            true,
            true,
            NOW(),
            NOW()
        )
        RETURNING id INTO bank_account_id;
        
        RAISE NOTICE 'Created default Bank GL account with ID: %', bank_account_id;
    ELSE
        RAISE NOTICE 'Bank GL account already exists';
    END IF;
END $$;

-- 3. Update bank accounts that don't have GL accounts linked
-- Link them to the default bank GL account (or the first available bank GL account)
DO $$
DECLARE
    default_bank_gl_id INTEGER;
    bank_without_gl_count INTEGER;
BEGIN
    -- Find the first active bank GL account
    SELECT id INTO default_bank_gl_id
    FROM gl_accounts
    WHERE account_type = 'ASSETS'
      AND (
        account_group ILIKE '%BANK%' 
        OR account_group ILIKE '%CASH%'
        OR account_number LIKE '1000%'
      )
      AND is_active = true
    ORDER BY 
      CASE 
        WHEN account_group ILIKE '%BANK%' THEN 1
        WHEN account_number LIKE '1000%' THEN 2
        ELSE 3
      END,
      account_number
    LIMIT 1;

    -- Count bank accounts without GL accounts
    SELECT COUNT(*) INTO bank_without_gl_count
    FROM bank_accounts
    WHERE gl_account_id IS NULL
      AND is_active = true;

    -- Update bank accounts that don't have GL accounts
    IF default_bank_gl_id IS NOT NULL AND bank_without_gl_count > 0 THEN
        UPDATE bank_accounts
        SET gl_account_id = default_bank_gl_id,
            updated_at = NOW()
        WHERE gl_account_id IS NULL
          AND is_active = true;
        
        RAISE NOTICE 'Updated % bank account(s) to link to GL account ID: %', bank_without_gl_count, default_bank_gl_id;
    ELSIF default_bank_gl_id IS NULL THEN
        RAISE WARNING 'No bank GL account found. Please create a bank GL account and link it to bank accounts manually.';
    ELSE
        RAISE NOTICE 'All bank accounts already have GL accounts linked';
    END IF;
END $$;

-- 4. Add constraint to ensure bank accounts have GL accounts (if not already exists)
DO $$
BEGIN
    -- Check if constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'bank_accounts_gl_account_id_not_null'
          AND table_name = 'bank_accounts'
    ) THEN
        -- Add check constraint (via ALTER TABLE)
        -- Note: We can't make it NOT NULL directly if there are NULL values
        -- So we'll just add a comment for now
        COMMENT ON COLUMN bank_accounts.gl_account_id IS 'Required: Bank accounts must be linked to a GL account for payment processing';
    END IF;
END $$;

-- 5. Create index on gl_accounts for faster lookups
CREATE INDEX IF NOT EXISTS idx_gl_accounts_account_type_group 
ON gl_accounts(account_type, account_group) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_gl_accounts_account_number 
ON gl_accounts(account_number) 
WHERE is_active = true;

-- 6. Create index on bank_accounts.gl_account_id for faster joins
CREATE INDEX IF NOT EXISTS idx_bank_accounts_gl_account_id 
ON bank_accounts(gl_account_id) 
WHERE is_active = true;

-- Add comments for documentation
COMMENT ON TABLE gl_accounts IS 'General Ledger accounts table. Accounts Payable accounts must have account_type = LIABILITIES and account_group containing PAYABLE. Bank accounts must have account_type = ASSETS and account_group containing BANK.';
COMMENT ON COLUMN bank_accounts.gl_account_id IS 'Required: Links bank account to GL account. Must reference an ASSETS type GL account.';

