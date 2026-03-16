-- Add missing fields to incoterms table
-- Migration: Add riskTransferPoint, costResponsibility, and applicableTransport fields

ALTER TABLE sd_incoterms 
ADD COLUMN risk_transfer_point VARCHAR(100),
ADD COLUMN cost_responsibility VARCHAR(200),
ADD COLUMN applicable_transport VARCHAR(20);

-- Add comments for documentation
COMMENT ON COLUMN sd_incoterms.risk_transfer_point IS 'Where risk transfers from seller to buyer';
COMMENT ON COLUMN sd_incoterms.cost_responsibility IS 'Who is responsible for costs';
COMMENT ON COLUMN sd_incoterms.applicable_transport IS 'Transport modes: SEA, LAND, AIR, MULTIMODAL';

-- Update existing records with default values based on incoterms rules
UPDATE sd_incoterms SET 
  risk_transfer_point = CASE 
    WHEN incoterms_key = 'EXW' THEN 'At seller''s premises'
    WHEN incoterms_key = 'FCA' THEN 'At carrier or seller''s premises'
    WHEN incoterms_key = 'CPT' THEN 'At carrier''s premises'
    WHEN incoterms_key = 'CIP' THEN 'At carrier''s premises'
    WHEN incoterms_key = 'DAP' THEN 'At buyer''s premises'
    WHEN incoterms_key = 'DPU' THEN 'At buyer''s premises'
    WHEN incoterms_key = 'DDP' THEN 'At buyer''s premises'
    WHEN incoterms_key = 'FAS' THEN 'Alongside ship'
    WHEN incoterms_key = 'FOB' THEN 'On board ship'
    WHEN incoterms_key = 'CFR' THEN 'On board ship'
    WHEN incoterms_key = 'CIF' THEN 'On board ship'
    ELSE 'As per incoterms rules'
  END,
  cost_responsibility = CASE 
    WHEN incoterms_key = 'EXW' THEN 'Buyer responsible for all costs'
    WHEN incoterms_key = 'FCA' THEN 'Seller pays to carrier, buyer pays from carrier'
    WHEN incoterms_key = 'CPT' THEN 'Seller pays freight, buyer pays insurance'
    WHEN incoterms_key = 'CIP' THEN 'Seller pays freight and insurance'
    WHEN incoterms_key = 'DAP' THEN 'Seller pays all costs to destination'
    WHEN incoterms_key = 'DPU' THEN 'Seller pays all costs to destination'
    WHEN incoterms_key = 'DDP' THEN 'Seller pays all costs including duties'
    WHEN incoterms_key = 'FAS' THEN 'Seller pays to alongside ship'
    WHEN incoterms_key = 'FOB' THEN 'Seller pays to on board ship'
    WHEN incoterms_key = 'CFR' THEN 'Seller pays freight, buyer pays insurance'
    WHEN incoterms_key = 'CIF' THEN 'Seller pays freight and insurance'
    ELSE 'As per incoterms rules'
  END,
  applicable_transport = CASE 
    WHEN category LIKE '%Sea%' OR category LIKE '%Waterway%' THEN 'SEA'
    WHEN category LIKE '%Air%' THEN 'AIR'
    WHEN category LIKE '%Land%' OR category LIKE '%Road%' OR category LIKE '%Rail%' THEN 'LAND'
    WHEN category = 'All Modes' THEN 'MULTIMODAL'
    ELSE 'MULTIMODAL'
  END
WHERE risk_transfer_point IS NULL;
