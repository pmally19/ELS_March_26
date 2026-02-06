-- Fix GL accounts with mismatched Chart of Accounts
-- This script updates GL accounts to match their company code's assigned CoA

DO $$
DECLARE
    mismatch_count INTEGER;
BEGIN
    -- Update GL accounts to match company code's CoA
    UPDATE gl_accounts ga
    SET chart_of_accounts_id = cc.chart_of_accounts_id
    FROM company_codes cc
    WHERE ga.company_code_id = cc.id
      AND ga.chart_of_accounts_id != cc.chart_of_accounts_id
      AND cc.chart_of_accounts_id IS NOT NULL;
    
    GET DIAGNOSTICS mismatch_count = ROW_COUNT;
    
    RAISE NOTICE 'Updated % GL accounts to match company code CoA assignment', mismatch_count;
END $$;

-- Verify the fix
SELECT 
    COUNT(*) as total_mismatches
FROM gl_accounts ga
INNER JOIN company_codes cc ON ga.company_code_id = cc.id
WHERE ga.chart_of_accounts_id != cc.chart_of_accounts_id
  AND cc.chart_of_accounts_id IS NOT NULL;
