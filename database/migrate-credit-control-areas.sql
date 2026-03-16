-- Migration script to add credit control area data to the database
-- This script inserts sample credit control areas with proper foreign key references
-- Run this script to migrate hardcoded data to the database

DO $$
DECLARE
    company_code_us_id INTEGER;
    company_code_eu_id INTEGER;
BEGIN
    -- Get company code IDs (use first available if specific codes don't exist)
    SELECT id INTO company_code_us_id FROM company_codes WHERE code = '1000' LIMIT 1;
    IF company_code_us_id IS NULL THEN
        SELECT id INTO company_code_us_id FROM company_codes ORDER BY id LIMIT 1;
    END IF;
    
    SELECT id INTO company_code_eu_id FROM company_codes WHERE code = '2000' LIMIT 1;
    IF company_code_eu_id IS NULL THEN
        SELECT id INTO company_code_eu_id FROM company_codes ORDER BY id LIMIT 1;
    END IF;
    
    -- Insert Credit Control Area US (A000)
    INSERT INTO credit_control_areas (
      code, name, description, company_code_id, currency,
      credit_checking_group, credit_period, grace_percentage,
      review_frequency, status, is_active, created_at, updated_at
    )
    VALUES (
      'A000',
      'Credit Control Area US',
      'Credit control for US operations',
      COALESCE(company_code_us_id, 1),
      'USD',
      '01',
      30,
      10.00,
      'monthly',
      'active',
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (code) DO UPDATE
    SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      company_code_id = EXCLUDED.company_code_id,
      currency = EXCLUDED.currency,
      credit_checking_group = EXCLUDED.credit_checking_group,
      credit_period = EXCLUDED.credit_period,
      grace_percentage = EXCLUDED.grace_percentage,
      review_frequency = EXCLUDED.review_frequency,
      status = EXCLUDED.status,
      is_active = EXCLUDED.is_active,
      updated_at = NOW();
    
    -- Insert Credit Control Area EU (A001)
    INSERT INTO credit_control_areas (
      code, name, description, company_code_id, currency,
      credit_checking_group, credit_period, grace_percentage,
      review_frequency, status, is_active, created_at, updated_at
    )
    VALUES (
      'A001',
      'Credit Control Area EU',
      'Credit control for European operations',
      COALESCE(company_code_eu_id, company_code_us_id, 1),
      'EUR',
      '02',
      30,
      10.00,
      'monthly',
      'active',
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (code) DO UPDATE
    SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      company_code_id = EXCLUDED.company_code_id,
      currency = EXCLUDED.currency,
      credit_checking_group = EXCLUDED.credit_checking_group,
      credit_period = EXCLUDED.credit_period,
      grace_percentage = EXCLUDED.grace_percentage,
      review_frequency = EXCLUDED.review_frequency,
      status = EXCLUDED.status,
      is_active = EXCLUDED.is_active,
      updated_at = NOW();
END $$;


-- Verify the inserted data
SELECT 
  cca.id,
  cca.code,
  cca.name,
  cca.description,
  cc.code as company_code,
  cc.name as company_name,
  cca.currency,
  cca.status,
  cca.is_active
FROM credit_control_areas cca
LEFT JOIN company_codes cc ON cca.company_code_id = cc.id
ORDER BY cca.code;

