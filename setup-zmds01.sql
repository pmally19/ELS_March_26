-- SQL Script to Create ZMDS01 Pricing Procedure and Steps
-- Based on SAP Configuration from Image
--
-- Run this script to create the complete ZMDS01 pricing procedure

-- ============================================================================
-- STEP 1: Create ZMDS01 Pricing Procedure (if not exists)
-- ============================================================================

INSERT INTO pricing_procedures (
  procedure_code,
  procedure_name,
  description,
  is_active
) VALUES (
  'ZMDS01',
  'MCML - Standard Sales',
  'Standard sales pricing procedure for MCML',
  true
)
ON CONFLICT (procedure_code) DO NOTHING;

-- Get the procedure ID for use in steps
-- (Manually replace {procedure_id} below with the actual ID from pricing_procedures table)

-- ============================================================================
-- STEP 2: Create Condition Types (Prerequisites)
-- ============================================================================

-- Note: These assume condition_types table has these columns:
-- condition_code, condition_name, condition_class, calculation_type, plus_minus, is_active

INSERT INTO condition_types (condition_code, condition_name, condition_class, calculation_type, plus_minus, is_active)
VALUES 
  ('ZHPO', 'MCML - Sales Price', 'Prices', 'A', '+', true),
  ('ZBPO', 'BICL - Sales Price', 'Prices', 'A', '+', true),
  ('ZMGT', 'MCML - Sales Price', 'Prices', 'A', '+', true),
  ('ZVHM', 'VAT output - Cement', 'Taxes', 'A', '+', true),
  ('ZNGR', 'NCML - Gross Value', 'Subtotal', 'C', '+', true),
  ('R100', '100% discount', 'Discount', 'A', '-', true),
  ('ZNSE', 'MCML - Sales Excess', 'Surcharge', 'A', '+', true),
  ('ZNFE', 'MCML - Freight', 'Freight', 'B', '+', true),
  ('ZND2', 'MCML - Qty Based Discount', 'Discount', 'A', '-', true)
ON CONFLICT (condition_code) DO NOTHING;

-- ============================================================================
-- STEP 3: Create Pricing Procedure Steps
-- ============================================================================

-- First, get the procedure ID:
DO $$
DECLARE
  v_procedure_id INTEGER;
BEGIN
  SELECT id INTO v_procedure_id FROM pricing_procedures WHERE procedure_code = 'ZMDS01';
  
  -- Insert all steps
  INSERT INTO pricing_procedure_steps (
    procedure_id, 
    step_number, 
    condition_type_code, 
    is_mandatory, 
    calculation_base, 
    account_key
  ) VALUES
    (v_procedure_id, 20, 'ZHPO', true, 'net', 'ERL'),
    (v_procedure_id, 25, 'ZBPO', false, 'net', 'ERL'),
    (v_procedure_id, 30, 'ZMGT', false, 'net', NULL),
    (v_procedure_id, 35, 'ZVHM', true, 'net', 'ZMV'),
    (v_procedure_id, 100, 'ZNGR', false, 'net', 'ZNR'),
    (v_procedure_id, 110, 'R100', false, 'net', 'ZNS'),
    (v_procedure_id, 160, 'ZNSE', false, 'net', 'ZNS'),
    (v_procedure_id, 190, 'ZNFE', false, 'net', 'ZHF'),
    (v_procedure_id, 210, 'ZND2', false, 'net', 'ZND')
  ON CONFLICT (procedure_id, step_number) DO NOTHING;
  
  RAISE NOTICE 'ZMDS01 pricing procedure setup complete!';
  
END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Verify the setup
SELECT 
  pp.procedure_code,
  pp.procedure_name,
  pps.step_number,
  pps.condition_type_code,
  ct.condition_name,
  pps.is_mandatory,
  pps.calculation_base,
  pps.account_key
FROM pricing_procedures pp
JOIN pricing_procedure_steps pps ON pp.id = pps.procedure_id
LEFT JOIN condition_types ct ON pps.condition_type_code = ct.condition_code
WHERE pp.procedure_code = 'ZMDS01'
ORDER BY pps.step_number;
