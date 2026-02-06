-- =====================================================
-- AP TILES DATA QUALITY FIX MIGRATION
-- Migration: 1003
-- Purpose: Fix data quality issues identified in gap analysis
-- =====================================================

BEGIN;

-- =====================================================
-- 1. FIX MISSING COMPANY CODES
-- =====================================================
DO $$
DECLARE
    default_company_id INTEGER;
BEGIN
    -- Get default company code
    SELECT id INTO default_company_id 
    FROM company_codes 
    WHERE active = true 
    ORDER BY id 
    LIMIT 1;

    IF default_company_id IS NOT NULL THEN
        -- Update vendors missing company code
        UPDATE vendors 
        SET company_code_id = default_company_id
        WHERE company_code_id IS NULL;
        
        RAISE NOTICE 'Fixed % vendors with missing company codes', 
            (SELECT COUNT(*) FROM vendors WHERE company_code_id = default_company_id);
    ELSE
        RAISE WARNING 'No active company code found - skipping vendor company code fix';
    END IF;
END $$;

-- =====================================================
-- 2. NORMALIZE STATUS VALUES
-- =====================================================

DO $$
DECLARE
    invoice_count INTEGER;
    payment_count INTEGER;
BEGIN
    -- Normalize accounts_payable statuses to lowercase
    UPDATE accounts_payable 
    SET status = LOWER(TRIM(status))
    WHERE status != LOWER(TRIM(status));
    
    GET DIAGNOSTICS invoice_count = ROW_COUNT;

    -- Normalize vendor_payments statuses to uppercase
    UPDATE vendor_payments 
    SET status = UPPER(TRIM(status))
    WHERE status != UPPER(TRIM(status));
    
    GET DIAGNOSTICS payment_count = ROW_COUNT;

    -- Normalize authorization_status to uppercase
    UPDATE vendor_payments 
    SET authorization_status = UPPER(TRIM(authorization_status))
    WHERE authorization_status IS NOT NULL 
      AND authorization_status != UPPER(TRIM(authorization_status));

    RAISE NOTICE 'Normalized % invoice statuses and % payment statuses', invoice_count, payment_count;
END $$;

-- =====================================================
-- 3. SYNC PAYMENT-INVOICE STATUSES
-- =====================================================

DO $$
DECLARE
    synced_count INTEGER;
BEGIN
    -- Mark invoices as paid when payments are posted/processed
    UPDATE accounts_payable ap
    SET status = 'paid',
        payment_date = vp.payment_date
    FROM vendor_payments vp
    WHERE ap.id = vp.invoice_id 
      AND vp.status IN ('POSTED', 'PROCESSED')
      AND ap.status NOT IN ('paid', 'Paid', 'PAID');
    
    GET DIAGNOSTICS synced_count = ROW_COUNT;
    
    RAISE NOTICE 'Synced % invoice statuses with payment statuses', synced_count;
END $$;

-- =====================================================
-- 4. CREATE TRIGGER FOR FUTURE STATUS SYNC
-- =====================================================

CREATE OR REPLACE FUNCTION sync_invoice_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- When payment is posted or processed, mark invoice as paid
    IF NEW.status IN ('POSTED', 'PROCESSED') AND NEW.invoice_id IS NOT NULL THEN
        UPDATE accounts_payable
        SET status = 'paid',
            payment_date = NEW.payment_date
        WHERE id = NEW.invoice_id
          AND status NOT IN ('paid', 'Paid', 'PAID');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_sync_invoice_status ON vendor_payments;

-- Create trigger
CREATE TRIGGER trigger_sync_invoice_status
    AFTER INSERT OR UPDATE OF status ON vendor_payments
    FOR EACH ROW
    EXECUTE FUNCTION sync_invoice_payment_status();

DO $$
BEGIN
    RAISE NOTICE 'Created trigger for automatic invoice-payment status sync';
END $$;

-- =====================================================
-- 5. BACKFILL RISK ASSESSMENTS
-- =====================================================

DO $$
DECLARE
    backfilled_count INTEGER;
BEGIN
    -- Set default risk level for payments without risk assessment
    UPDATE vendor_payments
    SET risk_level = 'LOW'
    WHERE risk_level IS NULL;
    
    GET DIAGNOSTICS backfilled_count = ROW_COUNT;
    
    RAISE NOTICE 'Backfilled % missing risk assessments with LOW default', backfilled_count;
END $$;

-- =====================================================
-- 6. CLEAN UP PAYMENT TERMS
-- =====================================================

DO $$
DECLARE
    fixed_count INTEGER;
BEGIN
    -- Fix unrealistic payment terms (> 365 days)
    UPDATE vendors
    SET payment_terms = 'Net 30'
    WHERE payment_terms SIMILAR TO '[0-9]+ days'
      AND CAST(REPLACE(payment_terms, ' days', '') AS INTEGER) > 365;
    
    GET DIAGNOSTICS fixed_count = ROW_COUNT;

    -- Standardize common payment terms
    UPDATE vendors SET payment_terms = 'Net 30' WHERE payment_terms IN ('30 days', '30', 'net 30', 'NET 30');
    UPDATE vendors SET payment_terms = 'Net 60' WHERE payment_terms IN ('60 days', '60', 'net 60', 'NET 60');
    UPDATE vendors SET payment_terms = 'Net 90' WHERE payment_terms IN ('90 days', '90', 'net 90', 'NET 90');

    RAISE NOTICE 'Cleaned up payment terms (fixed % unrealistic terms)', fixed_count;
END $$;

-- =====================================================
-- 7. ADD DATA QUALITY CONSTRAINTS (OPTIONAL - COMMENTED OUT)
-- =====================================================

-- Uncomment to enforce data quality going forward

-- ALTER TABLE vendors 
--     ALTER COLUMN company_code_id SET NOT NULL;

-- ALTER TABLE accounts_payable
--     ALTER COLUMN company_code_id SET NOT NULL;

-- RAISE NOTICE 'Added NOT NULL constraints for data quality';

-- =====================================================
-- 8. CREATE DATA QUALITY VIEW
-- =====================================================

CREATE OR REPLACE VIEW v_ap_data_quality AS
SELECT
    'Vendors' as entity,
    COUNT(*) as total_records,
    COUNT(CASE WHEN company_code_id IS NULL THEN 1 END) as missing_company_code,
    COUNT(CASE WHEN email IS NULL OR email = '' THEN 1 END) as missing_email,
    COUNT(CASE WHEN payment_terms IS NULL THEN 1 END) as missing_payment_terms
FROM vendors
WHERE is_active = true

UNION ALL

SELECT
    'Invoices' as entity,
    COUNT(*) as total_records,
    COUNT(CASE WHEN company_code_id IS NULL THEN 1 END) as missing_company_code,
    COUNT(CASE WHEN vendor_id IS NULL THEN 1 END) as missing_vendor,
    COUNT(CASE WHEN status IS NULL THEN 1 END) as missing_status
FROM accounts_payable
WHERE active = true

UNION ALL

SELECT
    'Payments' as entity,
    COUNT(*) as total_records,
    COUNT(CASE WHEN vendor_id IS NULL THEN 1 END) as missing_vendor,
    COUNT(CASE WHEN invoice_id IS NULL THEN 1 END) as missing_invoice,
    COUNT(CASE WHEN risk_level IS NULL THEN 1 END) as missing_risk_assessment
FROM vendor_payments;

DO $$
BEGIN
    RAISE NOTICE 'Created data quality monitoring view: v_ap_data_quality';
END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

DO $$
DECLARE
    vendor_issues INTEGER;
    invoice_issues INTEGER;
    payment_issues INTEGER;
BEGIN
    SELECT COUNT(*) INTO vendor_issues FROM vendors WHERE company_code_id IS NULL;
    SELECT COUNT(*) INTO invoice_issues FROM accounts_payable WHERE company_code_id IS NULL;
    SELECT COUNT(*) INTO payment_issues FROM vendor_payments WHERE risk_level IS NULL;
    
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'MIGRATION COMPLETE - VERIFICATION RESULTS:';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Vendors missing company_code: %', vendor_issues;
    RAISE NOTICE 'Invoices missing company_code: %', invoice_issues;
    RAISE NOTICE 'Payments missing risk assessment: %', payment_issues;
    RAISE NOTICE '==============================================';
    
    IF vendor_issues = 0 AND invoice_issues = 0 AND payment_issues = 0 THEN
        RAISE NOTICE '✅ ALL DATA QUALITY ISSUES FIXED!';
    ELSE
        RAISE WARNING '⚠️  Some issues remain - review above';
    END IF;
END $$;

COMMIT;

-- Query to check data quality view
-- SELECT * FROM v_ap_data_quality;
