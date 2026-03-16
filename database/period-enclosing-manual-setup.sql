-- Manual SQL Setup for Period Enclosing Test Data
-- Run this if you prefer SQL over the Node.js script

-- Step 1: Create/Verify Company Code
INSERT INTO company_codes (code, name, currency, country, is_active, created_at, updated_at)
VALUES ('CCC8', 'Test Company CCC8', 'USD', 'US', true, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- Step 2: Get Company ID (replace with actual ID if needed)
-- SELECT id FROM company_codes WHERE code = 'CCC8';

-- Step 3: Create GL Accounts (replace {COMPANY_ID} with actual company_code_id)
-- AR Account
INSERT INTO gl_accounts (account_number, account_name, account_type, company_code_id, is_active, created_at, updated_at)
VALUES ('1200000', 'Accounts Receivable', 'ASSETS', {COMPANY_ID}, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Revenue Account
INSERT INTO gl_accounts (account_number, account_name, account_type, company_code_id, is_active, created_at, updated_at)
VALUES ('4000000', 'Sales Revenue', 'REVENUE', {COMPANY_ID}, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Expense Account
INSERT INTO gl_accounts (account_number, account_name, account_type, company_code_id, is_active, created_at, updated_at)
VALUES ('5000000', 'Operating Expenses', 'EXPENSE', {COMPANY_ID}, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Step 4: Create Accounting Documents
-- Document 1
INSERT INTO accounting_documents (
  document_number, document_type, company_code_id, posting_date, 
  fiscal_year, fiscal_period, status, created_at, updated_at
)
VALUES ('DOC-2025-12-001', 'GL', {COMPANY_ID}, CURRENT_DATE, 2025, 12, 'posted', NOW(), NOW())
ON CONFLICT (document_number) DO NOTHING;

-- Document 2
INSERT INTO accounting_documents (
  document_number, document_type, company_code_id, posting_date, 
  fiscal_year, fiscal_period, status, created_at, updated_at
)
VALUES ('DOC-2025-12-002', 'GL', {COMPANY_ID}, CURRENT_DATE, 2025, 12, 'posted', NOW(), NOW())
ON CONFLICT (document_number) DO NOTHING;

-- Document 3
INSERT INTO accounting_documents (
  document_number, document_type, company_code_id, posting_date, 
  fiscal_year, fiscal_period, status, created_at, updated_at
)
VALUES ('DOC-2025-12-003', 'GL', {COMPANY_ID}, CURRENT_DATE, 2025, 12, 'posted', NOW(), NOW())
ON CONFLICT (document_number) DO NOTHING;

-- Unbalanced Document
INSERT INTO accounting_documents (
  document_number, document_type, company_code_id, posting_date, 
  fiscal_year, fiscal_period, status, created_at, updated_at
)
VALUES ('DOC-2025-12-UNBALANCED', 'GL', {COMPANY_ID}, CURRENT_DATE, 2025, 12, 'posted', NOW(), NOW())
ON CONFLICT (document_number) DO NOTHING;

-- Step 5: Create GL Entries
-- Get account IDs first (replace {AR_ACCOUNT_ID}, {REVENUE_ACCOUNT_ID}, {EXPENSE_ACCOUNT_ID})

-- Document 1: Sales Transaction (Balanced)
-- Debit: AR $10,000
INSERT INTO gl_entries (
  gl_account_id, document_number, posting_date, fiscal_year, fiscal_period,
  debit_credit_indicator, amount, currency, posting_status, description, created_at, updated_at
)
SELECT id, 'DOC-2025-12-001', CURRENT_DATE, 2025, 12, 'D', 10000.00, 'USD', 'posted', 'Sales Invoice #001', NOW(), NOW()
FROM gl_accounts WHERE account_number = '1200000' AND company_code_id = {COMPANY_ID} LIMIT 1;

-- Credit: Revenue $10,000
INSERT INTO gl_entries (
  gl_account_id, document_number, posting_date, fiscal_year, fiscal_period,
  debit_credit_indicator, amount, currency, posting_status, description, created_at, updated_at
)
SELECT id, 'DOC-2025-12-001', CURRENT_DATE, 2025, 12, 'C', 10000.00, 'USD', 'posted', 'Sales Invoice #001', NOW(), NOW()
FROM gl_accounts WHERE account_number = '4000000' AND company_code_id = {COMPANY_ID} LIMIT 1;

-- Document 2: Expense Transaction (Balanced)
-- Debit: Expense $5,000
INSERT INTO gl_entries (
  gl_account_id, document_number, posting_date, fiscal_year, fiscal_period,
  debit_credit_indicator, amount, currency, posting_status, description, created_at, updated_at
)
SELECT id, 'DOC-2025-12-002', CURRENT_DATE, 2025, 12, 'D', 5000.00, 'USD', 'posted', 'Operating Expense', NOW(), NOW()
FROM gl_accounts WHERE account_number = '5000000' AND company_code_id = {COMPANY_ID} LIMIT 1;

-- Credit: AR $5,000 (using AR as cash account for simplicity)
INSERT INTO gl_entries (
  gl_account_id, document_number, posting_date, fiscal_year, fiscal_period,
  debit_credit_indicator, amount, currency, posting_status, description, created_at, updated_at
)
SELECT id, 'DOC-2025-12-002', CURRENT_DATE, 2025, 12, 'C', 5000.00, 'USD', 'posted', 'Operating Expense', NOW(), NOW()
FROM gl_accounts WHERE account_number = '1200000' AND company_code_id = {COMPANY_ID} LIMIT 1;

-- Document 3: Another Sales Transaction (Balanced)
-- Debit: AR $7,500
INSERT INTO gl_entries (
  gl_account_id, document_number, posting_date, fiscal_year, fiscal_period,
  debit_credit_indicator, amount, currency, posting_status, description, created_at, updated_at
)
SELECT id, 'DOC-2025-12-003', CURRENT_DATE, 2025, 12, 'D', 7500.00, 'USD', 'posted', 'Sales Invoice #002', NOW(), NOW()
FROM gl_accounts WHERE account_number = '1200000' AND company_code_id = {COMPANY_ID} LIMIT 1;

-- Credit: Revenue $7,500
INSERT INTO gl_entries (
  gl_account_id, document_number, posting_date, fiscal_year, fiscal_period,
  debit_credit_indicator, amount, currency, posting_status, description, created_at, updated_at
)
SELECT id, 'DOC-2025-12-003', CURRENT_DATE, 2025, 12, 'C', 7500.00, 'USD', 'posted', 'Sales Invoice #002', NOW(), NOW()
FROM gl_accounts WHERE account_number = '4000000' AND company_code_id = {COMPANY_ID} LIMIT 1;

-- Document 4: Unbalanced Entry (for testing)
-- Debit: AR $1,000 (no credit entry - unbalanced)
INSERT INTO gl_entries (
  gl_account_id, document_number, posting_date, fiscal_year, fiscal_period,
  debit_credit_indicator, amount, currency, posting_status, description, created_at, updated_at
)
SELECT id, 'DOC-2025-12-UNBALANCED', CURRENT_DATE, 2025, 12, 'D', 1000.00, 'USD', 'posted', 'Unbalanced Entry - Missing Credit', NOW(), NOW()
FROM gl_accounts WHERE account_number = '1200000' AND company_code_id = {COMPANY_ID} LIMIT 1;

-- Step 6: Create Period Closing Record
INSERT INTO period_end_closing (
  company_code_id, year, period, closing_type, status,
  validated_entries, unbalanced_entries, total_debits, total_credits,
  created_at, updated_at
)
SELECT id, 2025, 12, 'month_end', 'pending', 0, 0, '0.00', '0.00', NOW(), NOW()
FROM company_codes WHERE code = 'CCC8'
ON CONFLICT DO NOTHING;

-- Verification Queries
-- Check GL entries count
SELECT COUNT(*) as gl_entries_count
FROM gl_entries ge
INNER JOIN gl_accounts ga ON ge.gl_account_id = ga.id
WHERE ge.fiscal_year = 2025 
AND ge.fiscal_period = 12
AND ga.company_code_id = (SELECT id FROM company_codes WHERE code = 'CCC8');

-- Check for unbalanced entries
SELECT 
  ge.document_number,
  SUM(CASE WHEN ge.debit_credit_indicator = 'D' THEN ge.amount::numeric ELSE -ge.amount::numeric END) as balance
FROM gl_entries ge
INNER JOIN gl_accounts ga ON ge.gl_account_id = ga.id
WHERE ge.fiscal_year = 2025 
AND ge.fiscal_period = 12
AND ge.posting_status = 'posted'
AND ga.company_code_id = (SELECT id FROM company_codes WHERE code = 'CCC8')
GROUP BY ge.document_number
HAVING ABS(SUM(CASE WHEN ge.debit_credit_indicator = 'D' THEN ge.amount::numeric ELSE -ge.amount::numeric END)) > 0.01;

-- Check totals
SELECT 
  COALESCE(SUM(CASE WHEN ge.debit_credit_indicator = 'D' THEN ge.amount::numeric ELSE 0 END), 0) as total_debits,
  COALESCE(SUM(CASE WHEN ge.debit_credit_indicator = 'C' THEN ge.amount::numeric ELSE 0 END), 0) as total_credits
FROM gl_entries ge
INNER JOIN gl_accounts ga ON ge.gl_account_id = ga.id
WHERE ge.fiscal_year = 2025 
AND ge.fiscal_period = 12
AND ge.posting_status = 'posted'
AND ga.company_code_id = (SELECT id FROM company_codes WHERE code = 'CCC8');

