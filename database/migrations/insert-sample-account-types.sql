-- Sample Account Types Data
-- This migration adds standard account types

INSERT INTO account_types (
    code, 
    name, 
    description, 
    category,
    is_active, 
    created_at, 
    updated_at
) VALUES
    -- Basic Account Types
    ('all', 'All', 'All account types allowed', 'general', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('customer', 'Customer', 'Customer account type', 'asset', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('vendor', 'Vendor', 'Vendor account type', 'liability', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('gl', 'GL Account', 'General Ledger account type', 'general', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('asset', 'Asset', 'Asset account type', 'asset', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- Financial Categories
    ('liability', 'Liability', 'Liability account type', 'liability', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('equity', 'Equity', 'Equity account type', 'equity', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('revenue', 'Revenue', 'Revenue account type', 'revenue', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('expense', 'Expense', 'Expense account type', 'expense', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- Specific Account Types
    ('cash', 'Cash', 'Cash account type', 'asset', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('bank', 'Bank', 'Bank account type', 'asset', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('accounts_receivable', 'Accounts Receivable', 'Accounts receivable account type', 'asset', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('accounts_payable', 'Accounts Payable', 'Accounts payable account type', 'liability', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('inventory', 'Inventory', 'Inventory account type', 'asset', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('fixed_asset', 'Fixed Asset', 'Fixed asset account type', 'asset', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- General Categories
    ('current_asset', 'Current Asset', 'Current asset account type', 'asset', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('current_liability', 'Current Liability', 'Current liability account type', 'liability', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('long_term_asset', 'Long Term Asset', 'Long term asset account type', 'asset', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('long_term_liability', 'Long Term Liability', 'Long term liability account type', 'liability', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

