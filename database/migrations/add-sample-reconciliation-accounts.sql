-- Add sample reconciliation accounts data
-- This migration adds comprehensive sample data for reconciliation accounts
-- Required for analyzing the whole application

-- First, ensure we have GL accounts for reconciliation accounts
-- Create sample GL accounts if they don't exist
DO $$
DECLARE
    gl_account_id_ar INTEGER;
    gl_account_id_ap INTEGER;
    gl_account_id_inv INTEGER;
    company_code_id_1 INTEGER;
    company_code_id_2 INTEGER;
    company_code_id_3 INTEGER;
BEGIN
    -- Get or create company codes
    SELECT id INTO company_code_id_1 FROM company_codes WHERE code = '1000' LIMIT 1;
    IF company_code_id_1 IS NULL THEN
        INSERT INTO company_codes (code, name, currency, country, active, created_at, updated_at)
        VALUES ('1000', 'Main Company', 'USD', 'US', true, NOW(), NOW())
        RETURNING id INTO company_code_id_1;
    END IF;

    SELECT id INTO company_code_id_2 FROM company_codes WHERE code = '2000' LIMIT 1;
    IF company_code_id_2 IS NULL THEN
        INSERT INTO company_codes (code, name, currency, country, active, created_at, updated_at)
        VALUES ('2000', 'Subsidiary Company', 'EUR', 'DE', true, NOW(), NOW())
        RETURNING id INTO company_code_id_2;
    END IF;

    SELECT id INTO company_code_id_3 FROM company_codes WHERE code = '3000' LIMIT 1;
    IF company_code_id_3 IS NULL THEN
        INSERT INTO company_codes (code, name, currency, country, active, created_at, updated_at)
        VALUES ('3000', 'Asia Pacific Company', 'SGD', 'SG', true, NOW(), NOW())
        RETURNING id INTO company_code_id_3;
    END IF;

    -- Get or create GL Accounts for Accounts Receivable
    SELECT id INTO gl_account_id_ar FROM gl_accounts WHERE account_number = '1200' LIMIT 1;
    IF gl_account_id_ar IS NULL THEN
        -- Try to get any existing AR reconciliation account
        SELECT id INTO gl_account_id_ar FROM gl_accounts 
        WHERE account_type = 'ASSETS' AND reconciliation_account = true 
        LIMIT 1;
        -- If still NULL, create a new one (let sequence handle ID)
        IF gl_account_id_ar IS NULL THEN
            INSERT INTO gl_accounts (
                account_number, account_name, account_type, balance_sheet_account, 
                reconciliation_account, is_active, created_at, updated_at, company_code_id
            )
            SELECT '1200', 'Accounts Receivable - Trade', 'ASSETS', true, true, true, NOW(), NOW(), company_code_id_1
            WHERE NOT EXISTS (SELECT 1 FROM gl_accounts WHERE account_number = '1200')
            RETURNING id INTO gl_account_id_ar;
            -- If still NULL, get the first available AR account
            IF gl_account_id_ar IS NULL THEN
                SELECT id INTO gl_account_id_ar FROM gl_accounts WHERE account_type = 'ASSETS' LIMIT 1;
            END IF;
        END IF;
    END IF;

    -- Get or create GL Account for Accounts Payable
    SELECT id INTO gl_account_id_ap FROM gl_accounts WHERE account_number = '2000' LIMIT 1;
    IF gl_account_id_ap IS NULL THEN
        -- Try to get any existing AP reconciliation account
        SELECT id INTO gl_account_id_ap FROM gl_accounts 
        WHERE account_type = 'LIABILITIES' AND reconciliation_account = true 
        LIMIT 1;
        -- If still NULL, create a new one
        IF gl_account_id_ap IS NULL THEN
            INSERT INTO gl_accounts (
                account_number, account_name, account_type, balance_sheet_account, 
                reconciliation_account, is_active, created_at, updated_at, company_code_id
            )
            SELECT '2000', 'Accounts Payable - Trade', 'LIABILITIES', true, true, true, NOW(), NOW(), company_code_id_1
            WHERE NOT EXISTS (SELECT 1 FROM gl_accounts WHERE account_number = '2000')
            RETURNING id INTO gl_account_id_ap;
            -- If still NULL, get the first available AP account
            IF gl_account_id_ap IS NULL THEN
                SELECT id INTO gl_account_id_ap FROM gl_accounts WHERE account_type = 'LIABILITIES' LIMIT 1;
            END IF;
        END IF;
    END IF;

    -- Get or create GL Account for Inventory
    SELECT id INTO gl_account_id_inv FROM gl_accounts WHERE account_number = '1400' LIMIT 1;
    IF gl_account_id_inv IS NULL THEN
        -- Try to get any existing inventory reconciliation account
        SELECT id INTO gl_account_id_inv FROM gl_accounts 
        WHERE account_type = 'ASSETS' AND reconciliation_account = true 
        LIMIT 1;
        -- If still NULL, create a new one
        IF gl_account_id_inv IS NULL THEN
            INSERT INTO gl_accounts (
                account_number, account_name, account_type, balance_sheet_account, 
                reconciliation_account, is_active, created_at, updated_at, company_code_id
            )
            SELECT '1400', 'Inventory - Raw Materials', 'ASSETS', true, true, true, NOW(), NOW(), company_code_id_1
            WHERE NOT EXISTS (SELECT 1 FROM gl_accounts WHERE account_number = '1400')
            RETURNING id INTO gl_account_id_inv;
            -- If still NULL, reuse AR account
            IF gl_account_id_inv IS NULL THEN
                gl_account_id_inv := gl_account_id_ar;
            END IF;
        END IF;
    END IF;

    -- Insert sample reconciliation accounts (AR - Accounts Receivable)
    INSERT INTO reconciliation_accounts (code, name, description, gl_account_id, account_type, company_code_id, is_active, created_at, updated_at)
    VALUES 
        ('AR001', 'Accounts Receivable - Domestic', 'Reconciliation account for domestic customer receivables', gl_account_id_ar, 'AR', company_code_id_1, true, NOW(), NOW()),
        ('AR002', 'Accounts Receivable - Export', 'Reconciliation account for export customer receivables', gl_account_id_ar, 'AR', company_code_id_1, true, NOW(), NOW()),
        ('AR003', 'Accounts Receivable - Intercompany', 'Reconciliation account for intercompany receivables', gl_account_id_ar, 'AR', company_code_id_1, true, NOW(), NOW()),
        ('AR004', 'Accounts Receivable - Europe', 'Reconciliation account for European customer receivables', gl_account_id_ar, 'AR', company_code_id_2, true, NOW(), NOW()),
        ('AR005', 'Accounts Receivable - Asia Pacific', 'Reconciliation account for Asia Pacific customer receivables', gl_account_id_ar, 'AR', company_code_id_3, true, NOW(), NOW())
    ON CONFLICT (code) DO NOTHING;

    -- Insert sample reconciliation accounts (AP - Accounts Payable)
    INSERT INTO reconciliation_accounts (code, name, description, gl_account_id, account_type, company_code_id, is_active, created_at, updated_at)
    VALUES 
        ('AP001', 'Accounts Payable - Domestic', 'Reconciliation account for domestic vendor payables', gl_account_id_ap, 'AP', company_code_id_1, true, NOW(), NOW()),
        ('AP002', 'Accounts Payable - Import', 'Reconciliation account for import vendor payables', gl_account_id_ap, 'AP', company_code_id_1, true, NOW(), NOW()),
        ('AP003', 'Accounts Payable - Intercompany', 'Reconciliation account for intercompany payables', gl_account_id_ap, 'AP', company_code_id_1, true, NOW(), NOW()),
        ('AP004', 'Accounts Payable - Europe', 'Reconciliation account for European vendor payables', gl_account_id_ap, 'AP', company_code_id_2, true, NOW(), NOW()),
        ('AP005', 'Accounts Payable - Asia Pacific', 'Reconciliation account for Asia Pacific vendor payables', gl_account_id_ap, 'AP', company_code_id_3, true, NOW(), NOW())
    ON CONFLICT (code) DO NOTHING;

    -- Insert sample reconciliation accounts (INVENTORY)
    INSERT INTO reconciliation_accounts (code, name, description, gl_account_id, account_type, company_code_id, is_active, created_at, updated_at)
    VALUES 
        ('INV001', 'Inventory - Raw Materials', 'Reconciliation account for raw materials inventory', gl_account_id_inv, 'INVENTORY', company_code_id_1, true, NOW(), NOW()),
        ('INV002', 'Inventory - Finished Goods', 'Reconciliation account for finished goods inventory', gl_account_id_inv, 'INVENTORY', company_code_id_1, true, NOW(), NOW()),
        ('INV003', 'Inventory - Work in Process', 'Reconciliation account for work in process inventory', gl_account_id_inv, 'INVENTORY', company_code_id_1, true, NOW(), NOW())
    ON CONFLICT (code) DO NOTHING;

    RAISE NOTICE 'Sample reconciliation accounts inserted successfully';
END $$;

