-- Fix Historical GL Entries - Set posting_status to 'posted'
-- This updates existing GL entries that may not have posting_status = 'posted'
-- Run this to fix historical reconciliation discrepancies

-- Update GL entries for AR accounts (Accounts Receivable)
UPDATE gl_entries
SET posting_status = 'posted'
WHERE (posting_status IS NULL OR posting_status != 'posted')
  AND gl_account_id IN (
      SELECT id FROM gl_accounts 
      WHERE account_type = 'ASSETS'
        AND (account_name ILIKE '%receivable%' 
             OR account_name ILIKE '%AR%'
             OR account_number ILIKE '%1200%'
             OR account_number ILIKE '%120%')
  );

-- Update GL entries for AP accounts (Accounts Payable)
UPDATE gl_entries
SET posting_status = 'posted'
WHERE (posting_status IS NULL OR posting_status != 'posted')
  AND gl_account_id IN (
      SELECT id FROM gl_accounts 
      WHERE account_type = 'LIABILITIES'
        AND (account_name ILIKE '%payable%' 
             OR account_name ILIKE '%AP%'
             OR account_number ILIKE '%2100%'
             OR account_number ILIKE '%210%')
  );

-- Update ALL GL entries that don't have posting_status = 'posted'
-- (for any account type, if needed)
UPDATE gl_entries
SET posting_status = 'posted'
WHERE posting_status IS NULL 
   OR (posting_status != 'posted' AND posting_status != 'pending' AND posting_status != 'draft');

-- Show summary of what was updated
SELECT 
    'Summary' as report_type,
    COUNT(*) FILTER (WHERE posting_status = 'posted') as entries_with_posted_status,
    COUNT(*) FILTER (WHERE posting_status IS NULL OR posting_status != 'posted') as entries_without_posted_status,
    COUNT(*) as total_entries
FROM gl_entries;

-- Show breakdown by posting status
SELECT 
    posting_status,
    COUNT(*) as count,
    SUM(amount::numeric) FILTER (WHERE debit_credit_indicator = 'D') as total_debits,
    SUM(amount::numeric) FILTER (WHERE debit_credit_indicator = 'C') as total_credits
FROM gl_entries
GROUP BY posting_status
ORDER BY posting_status;

