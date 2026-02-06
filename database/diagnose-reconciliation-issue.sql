-- Comprehensive Diagnostic Script for AR Reconciliation Issue
-- This script will identify why AR subledger and GL don't match

-- ============================================================================
-- STEP 1: Check AR Open Items Summary
-- ============================================================================
SELECT 
    'AR OPEN ITEMS SUMMARY' as section,
    COUNT(*) as total_items,
    COALESCE(SUM(outstanding_amount::numeric), 0) as total_outstanding,
    COUNT(DISTINCT gl_account_id) as distinct_gl_accounts,
    COUNT(DISTINCT document_number) as distinct_document_numbers
FROM ar_open_items
WHERE active = true
    AND status IN ('Open', 'Partial');

-- ============================================================================
-- STEP 2: Check GL Entries Summary for AR Accounts
-- ============================================================================
SELECT 
    'GL ENTRIES SUMMARY' as section,
    COUNT(*) as total_entries,
    COALESCE(SUM(amount::numeric) FILTER (WHERE debit_credit_indicator = 'D'), 0) as total_debits,
    COALESCE(SUM(amount::numeric) FILTER (WHERE debit_credit_indicator = 'C'), 0) as total_credits,
    COALESCE(SUM(amount::numeric) FILTER (WHERE debit_credit_indicator = 'D'), 0) - 
    COALESCE(SUM(amount::numeric) FILTER (WHERE debit_credit_indicator = 'C'), 0) as net_balance,
    COUNT(DISTINCT gl_account_id) as distinct_gl_accounts,
    COUNT(DISTINCT document_number) as distinct_document_numbers
FROM gl_entries ge
INNER JOIN gl_accounts ga ON ge.gl_account_id = ga.id
WHERE ga.account_type = 'ASSETS'
    AND (ga.account_name ILIKE '%receivable%' OR ga.account_name ILIKE '%AR%')
    AND ge.posting_status = 'posted';

-- ============================================================================
-- STEP 3: Find AR Open Items WITHOUT Matching GL Entries
-- ============================================================================
SELECT 
    'AR ITEMS MISSING GL ENTRIES' as section,
    aoi.id as ar_open_item_id,
    aoi.document_number,
    aoi.invoice_number,
    aoi.outstanding_amount::numeric as outstanding_amount,
    aoi.gl_account_id as ar_gl_account_id,
    ga.account_number as ar_account_number,
    ga.account_name as ar_account_name,
    aoi.status,
    aoi.posting_date,
    'Missing GL debit entry' as issue
FROM ar_open_items aoi
LEFT JOIN gl_accounts ga ON aoi.gl_account_id = ga.id
LEFT JOIN gl_entries ge ON ge.document_number = aoi.document_number 
    AND ge.gl_account_id = aoi.gl_account_id
    AND ge.debit_credit_indicator = 'D'
    AND ge.posting_status = 'posted'
WHERE aoi.active = true
    AND aoi.status IN ('Open', 'Partial')
    AND ge.id IS NULL
ORDER BY aoi.document_number;

-- ============================================================================
-- STEP 4: Check Document Number Mismatches
-- ============================================================================
SELECT 
    'DOCUMENT NUMBER MISMATCH ANALYSIS' as section,
    aoi.document_number as ar_document_number,
    aoi.gl_account_id as ar_gl_account_id,
    COUNT(ge.id) as matching_gl_entries,
    STRING_AGG(DISTINCT ge.document_number, ', ') as gl_document_numbers_found,
    STRING_AGG(DISTINCT CAST(ge.posting_status AS TEXT), ', ') as gl_posting_statuses
FROM ar_open_items aoi
LEFT JOIN gl_entries ge ON ge.document_number = aoi.document_number
WHERE aoi.active = true
    AND aoi.status IN ('Open', 'Partial')
GROUP BY aoi.document_number, aoi.gl_account_id
HAVING COUNT(ge.id) = 0 OR COUNT(ge.id) FILTER (WHERE ge.gl_account_id = aoi.gl_account_id AND ge.debit_credit_indicator = 'D' AND ge.posting_status = 'posted') = 0
ORDER BY aoi.document_number;

-- ============================================================================
-- STEP 5: Check GL Account ID Mismatches
-- ============================================================================
SELECT 
    'GL ACCOUNT ID MISMATCH ANALYSIS' as section,
    aoi.document_number,
    aoi.gl_account_id as ar_gl_account_id,
    ga.account_number as ar_account_number,
    STRING_AGG(DISTINCT CAST(ge.gl_account_id AS TEXT), ', ') as gl_account_ids_found,
    STRING_AGG(DISTINCT ga2.account_number, ', ') as gl_account_numbers_found
FROM ar_open_items aoi
LEFT JOIN gl_accounts ga ON aoi.gl_account_id = ga.id
LEFT JOIN gl_entries ge ON ge.document_number = aoi.document_number
LEFT JOIN gl_accounts ga2 ON ge.gl_account_id = ga2.id
WHERE aoi.active = true
    AND aoi.status IN ('Open', 'Partial')
    AND ge.document_number = aoi.document_number
GROUP BY aoi.document_number, aoi.gl_account_id, ga.account_number
HAVING COUNT(ge.id) FILTER (WHERE ge.gl_account_id = aoi.gl_account_id AND ge.debit_credit_indicator = 'D' AND ge.posting_status = 'posted') = 0
ORDER BY aoi.document_number;

-- ============================================================================
-- STEP 6: Check Posting Status Values
-- ============================================================================
SELECT 
    'POSTING STATUS ANALYSIS' as section,
    ge.posting_status,
    COUNT(*) as count,
    SUM(amount::numeric) FILTER (WHERE debit_credit_indicator = 'D') as total_debits,
    SUM(amount::numeric) FILTER (WHERE debit_credit_indicator = 'C') as total_credits
FROM gl_entries ge
INNER JOIN gl_accounts ga ON ge.gl_account_id = ga.id
WHERE ga.account_type = 'ASSETS'
    AND (ga.account_name ILIKE '%receivable%' OR ga.account_name ILIKE '%AR%')
GROUP BY ge.posting_status
ORDER BY ge.posting_status;

-- ============================================================================
-- STEP 7: Sample AR Open Items with Details
-- ============================================================================
SELECT 
    'SAMPLE AR OPEN ITEMS' as section,
    aoi.id,
    aoi.document_number,
    aoi.invoice_number,
    aoi.outstanding_amount::numeric,
    aoi.gl_account_id,
    ga.account_number,
    ga.account_name,
    aoi.status,
    aoi.posting_date,
    aoi.created_at
FROM ar_open_items aoi
LEFT JOIN gl_accounts ga ON aoi.gl_account_id = ga.id
WHERE aoi.active = true
    AND aoi.status IN ('Open', 'Partial')
ORDER BY aoi.document_number
LIMIT 10;

-- ============================================================================
-- STEP 8: Sample GL Entries for AR Accounts
-- ============================================================================
SELECT 
    'SAMPLE GL ENTRIES (AR ACCOUNTS)' as section,
    ge.id,
    ge.document_number,
    ge.gl_account_id,
    ga.account_number,
    ga.account_name,
    ge.amount::numeric,
    ge.debit_credit_indicator,
    ge.posting_status,
    ge.posting_date,
    ge.created_at
FROM gl_entries ge
INNER JOIN gl_accounts ga ON ge.gl_account_id = ga.id
WHERE ga.account_type = 'ASSETS'
    AND (ga.account_name ILIKE '%receivable%' OR ga.account_name ILIKE '%AR%')
ORDER BY ge.document_number
LIMIT 10;

-- ============================================================================
-- STEP 9: Check Billing Documents and Their GL Postings
-- ============================================================================
SELECT 
    'BILLING DOCUMENTS GL POSTING STATUS' as section,
    bd.id as billing_id,
    bd.billing_number,
    bd.accounting_document_number,
    bd.posting_status as billing_posting_status,
    bd.total_amount::numeric,
    COUNT(ge.id) as gl_entry_count,
    STRING_AGG(DISTINCT ge.posting_status, ', ') as gl_posting_statuses,
    SUM(ge.amount::numeric) FILTER (WHERE ge.debit_credit_indicator = 'D') as gl_debit_total
FROM billing_documents bd
LEFT JOIN gl_entries ge ON ge.document_number = bd.accounting_document_number
WHERE bd.posting_status = 'POSTED'
    OR bd.accounting_document_number IS NOT NULL
GROUP BY bd.id, bd.billing_number, bd.accounting_document_number, bd.posting_status, bd.total_amount
ORDER BY bd.accounting_document_number
LIMIT 20;

