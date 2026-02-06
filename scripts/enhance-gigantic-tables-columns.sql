-- ENHANCE GIGANTIC TABLES WITH ADDITIONAL BUSINESS ANALYTICS COLUMNS
-- This script adds comprehensive enterprise analytics capabilities to both gigantic tables

-- ===================================================================
-- ENTERPRISE TRANSACTION REGISTRY ENHANCEMENTS
-- ===================================================================

-- Enhanced Business Analytics Columns
ALTER TABLE enterprise_transaction_registry 
ADD COLUMN IF NOT EXISTS business_process_category VARCHAR(30),
ADD COLUMN IF NOT EXISTS enterprise_level VARCHAR(20) DEFAULT 'OPERATIONAL',
ADD COLUMN IF NOT EXISTS financial_impact_score DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS operational_metrics JSONB,
ADD COLUMN IF NOT EXISTS predictive_analytics JSONB,
ADD COLUMN IF NOT EXISTS compliance_score DECIMAL(5,2) DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS automation_level VARCHAR(20) DEFAULT 'MANUAL',
ADD COLUMN IF NOT EXISTS integration_type VARCHAR(30) DEFAULT 'REAL_TIME',
ADD COLUMN IF NOT EXISTS data_quality_score DECIMAL(5,2) DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS business_continuity_flag BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS regulatory_requirements JSONB,
ADD COLUMN IF NOT EXISTS cross_functional_impact JSONB,
ADD COLUMN IF NOT EXISTS digital_transformation_metrics JSONB;

-- Performance and Efficiency Metrics
ALTER TABLE enterprise_transaction_registry 
ADD COLUMN IF NOT EXISTS processing_time_seconds INTEGER,
ADD COLUMN IF NOT EXISTS system_latency_ms INTEGER,
ADD COLUMN IF NOT EXISTS user_experience_rating DECIMAL(3,1),
ADD COLUMN IF NOT EXISTS error_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS retry_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS success_rate DECIMAL(5,2) DEFAULT 100.00;

-- Advanced Business Intelligence
ALTER TABLE enterprise_transaction_registry 
ADD COLUMN IF NOT EXISTS seasonality_factor DECIMAL(5,3) DEFAULT 1.000,
ADD COLUMN IF NOT EXISTS trend_indicator VARCHAR(15) DEFAULT 'STABLE',
ADD COLUMN IF NOT EXISTS market_conditions JSONB,
ADD COLUMN IF NOT EXISTS competitive_position VARCHAR(20),
ADD COLUMN IF NOT EXISTS customer_satisfaction_impact DECIMAL(4,2),
ADD COLUMN IF NOT EXISTS supplier_performance_impact DECIMAL(4,2);

-- Environmental and Sustainability
ALTER TABLE enterprise_transaction_registry 
ADD COLUMN IF NOT EXISTS carbon_footprint_kg DECIMAL(10,3),
ADD COLUMN IF NOT EXISTS sustainability_score DECIMAL(5,2) DEFAULT 50.00,
ADD COLUMN IF NOT EXISTS waste_reduction_factor DECIMAL(5,3) DEFAULT 1.000,
ADD COLUMN IF NOT EXISTS energy_consumption_kwh DECIMAL(10,3);

-- Risk Management Enhanced
ALTER TABLE enterprise_transaction_registry 
ADD COLUMN IF NOT EXISTS operational_risk_level VARCHAR(15) DEFAULT 'LOW',
ADD COLUMN IF NOT EXISTS financial_risk_exposure DECIMAL(15,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS geopolitical_risk_factor DECIMAL(5,3) DEFAULT 1.000,
ADD COLUMN IF NOT EXISTS cyber_security_rating VARCHAR(15) DEFAULT 'SECURE';

-- Future-Ready Extensions
ALTER TABLE enterprise_transaction_registry 
ADD COLUMN IF NOT EXISTS ai_model_version VARCHAR(20),
ADD COLUMN IF NOT EXISTS blockchain_hash VARCHAR(128),
ADD COLUMN IF NOT EXISTS iot_device_data JSONB,
ADD COLUMN IF NOT EXISTS quantum_readiness BOOLEAN DEFAULT false;

-- ===================================================================
-- MATERIAL MOVEMENT REGISTRY ENHANCEMENTS
-- ===================================================================

-- Enhanced Material Analytics Columns
ALTER TABLE material_movement_registry 
ADD COLUMN IF NOT EXISTS material_process_category VARCHAR(30),
ADD COLUMN IF NOT EXISTS enterprise_level VARCHAR(20) DEFAULT 'OPERATIONAL',
ADD COLUMN IF NOT EXISTS inventory_impact_score DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS supply_chain_metrics JSONB,
ADD COLUMN IF NOT EXISTS demand_planning_data JSONB,
ADD COLUMN IF NOT EXISTS warehouse_efficiency_score DECIMAL(5,2) DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS automation_level VARCHAR(20) DEFAULT 'MANUAL',
ADD COLUMN IF NOT EXISTS integration_type VARCHAR(30) DEFAULT 'REAL_TIME',
ADD COLUMN IF NOT EXISTS data_quality_score DECIMAL(5,2) DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS criticality VARCHAR(15) DEFAULT 'NORMAL',
ADD COLUMN IF NOT EXISTS temperature_requirements JSONB,
ADD COLUMN IF NOT EXISTS handling_instructions JSONB;

-- Performance and Efficiency Metrics
ALTER TABLE material_movement_registry 
ADD COLUMN IF NOT EXISTS picking_time_seconds INTEGER,
ADD COLUMN IF NOT EXISTS packing_time_seconds INTEGER,
ADD COLUMN IF NOT EXISTS movement_accuracy_rate DECIMAL(5,2) DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS damage_incidents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS return_rate DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS cycle_count_variance DECIMAL(10,3) DEFAULT 0.000;

-- Advanced Material Intelligence
ALTER TABLE material_movement_registry 
ADD COLUMN IF NOT EXISTS seasonality_factor DECIMAL(5,3) DEFAULT 1.000,
ADD COLUMN IF NOT EXISTS demand_trend VARCHAR(15) DEFAULT 'STABLE',
ADD COLUMN IF NOT EXISTS supplier_reliability DECIMAL(5,2) DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS alternative_sources_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lead_time_variability DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS demand_volatility DECIMAL(5,2) DEFAULT 0.00;

-- Environmental and Sustainability
ALTER TABLE material_movement_registry 
ADD COLUMN IF NOT EXISTS carbon_footprint_kg DECIMAL(10,3),
ADD COLUMN IF NOT EXISTS sustainability_score DECIMAL(5,2) DEFAULT 50.00,
ADD COLUMN IF NOT EXISTS waste_generated_kg DECIMAL(10,3),
ADD COLUMN IF NOT EXISTS recyclable_content DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS energy_consumption_kwh DECIMAL(10,3),
ADD COLUMN IF NOT EXISTS water_usage_liters DECIMAL(10,3);

-- Risk Management Enhanced
ALTER TABLE material_movement_registry 
ADD COLUMN IF NOT EXISTS material_risk_level VARCHAR(15) DEFAULT 'LOW',
ADD COLUMN IF NOT EXISTS obsolescence_risk DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS price_volatility_risk DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS stockout_probability DECIMAL(5,2) DEFAULT 0.00;

-- Quality Management Advanced
ALTER TABLE material_movement_registry 
ADD COLUMN IF NOT EXISTS defect_rate DECIMAL(5,4) DEFAULT 0.0000,
ADD COLUMN IF NOT EXISTS quality_grade VARCHAR(10) DEFAULT 'A',
ADD COLUMN IF NOT EXISTS inspection_results JSONB,
ADD COLUMN IF NOT EXISTS certification_requirements JSONB,
ADD COLUMN IF NOT EXISTS traceability_chain JSONB;

-- Technology Integration
ALTER TABLE material_movement_registry 
ADD COLUMN IF NOT EXISTS rfid_tag_data JSONB,
ADD COLUMN IF NOT EXISTS barcode_information JSONB,
ADD COLUMN IF NOT EXISTS gps_coordinates JSONB,
ADD COLUMN IF NOT EXISTS sensor_readings JSONB;

-- Future-Ready Extensions
ALTER TABLE material_movement_registry 
ADD COLUMN IF NOT EXISTS ai_model_version VARCHAR(20),
ADD COLUMN IF NOT EXISTS blockchain_hash VARCHAR(128),
ADD COLUMN IF NOT EXISTS iot_device_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS digital_twin_reference VARCHAR(100),
ADD COLUMN IF NOT EXISTS quantum_readiness BOOLEAN DEFAULT false;

-- Business Intelligence Advanced
ALTER TABLE material_movement_registry 
ADD COLUMN IF NOT EXISTS cross_docking_eligible BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS consolidation_opportunity BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS route_optimization_flag BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS inventory_optimization_score DECIMAL(5,2) DEFAULT 50.00;

-- ===================================================================
-- INDEXES FOR ENHANCED ANALYTICS
-- ===================================================================

-- Performance indexes for new analytics columns
CREATE INDEX IF NOT EXISTS idx_etr_business_process_category ON enterprise_transaction_registry(business_process_category);
CREATE INDEX IF NOT EXISTS idx_etr_enterprise_level ON enterprise_transaction_registry(enterprise_level);
CREATE INDEX IF NOT EXISTS idx_etr_automation_level ON enterprise_transaction_registry(automation_level);
CREATE INDEX IF NOT EXISTS idx_etr_trend_indicator ON enterprise_transaction_registry(trend_indicator);

CREATE INDEX IF NOT EXISTS idx_mmr_material_process_category ON material_movement_registry(material_process_category);
CREATE INDEX IF NOT EXISTS idx_mmr_enterprise_level ON material_movement_registry(enterprise_level);
CREATE INDEX IF NOT EXISTS idx_mmr_criticality ON material_movement_registry(criticality);
CREATE INDEX IF NOT EXISTS idx_mmr_demand_trend ON material_movement_registry(demand_trend);

-- JSON indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_etr_operational_metrics_gin ON enterprise_transaction_registry USING GIN (operational_metrics);
CREATE INDEX IF NOT EXISTS idx_etr_predictive_analytics_gin ON enterprise_transaction_registry USING GIN (predictive_analytics);
CREATE INDEX IF NOT EXISTS idx_mmr_supply_chain_metrics_gin ON material_movement_registry USING GIN (supply_chain_metrics);
CREATE INDEX IF NOT EXISTS idx_mmr_demand_planning_data_gin ON material_movement_registry USING GIN (demand_planning_data);

-- ===================================================================
-- ANALYTICS VIEWS FOR ENHANCED REPORTING
-- ===================================================================

-- Enhanced Financial Transaction Analytics View
CREATE OR REPLACE VIEW enhanced_financial_analytics AS
SELECT 
    etr.id,
    etr.transaction_uuid,
    etr.business_process_category,
    etr.enterprise_level,
    etr.financial_impact_score,
    etr.trend_indicator,
    etr.automation_level,
    etr.sustainability_score,
    etr.operational_risk_level,
    etr.net_amount,
    etr.currency_code,
    etr.business_date,
    etr.processing_time_seconds,
    etr.success_rate,
    etr.carbon_footprint_kg,
    -- Analytics calculations
    CASE 
        WHEN etr.financial_impact_score >= 80 THEN 'HIGH_IMPACT'
        WHEN etr.financial_impact_score >= 50 THEN 'MEDIUM_IMPACT'
        ELSE 'LOW_IMPACT'
    END as impact_category,
    CASE 
        WHEN etr.automation_level = 'FULLY_AUTOMATED' THEN 'DIGITAL_LEADER'
        WHEN etr.automation_level = 'SEMI_AUTOMATED' THEN 'DIGITAL_ADOPTER'
        ELSE 'DIGITAL_FOLLOWER'
    END as digital_maturity
FROM enterprise_transaction_registry etr
WHERE etr.processing_status = 'ACTIVE';

-- Enhanced Material Movement Analytics View
CREATE OR REPLACE VIEW enhanced_material_analytics AS
SELECT 
    mmr.id,
    mmr.movement_uuid,
    mmr.material_process_category,
    mmr.enterprise_level,
    mmr.inventory_impact_score,
    mmr.demand_trend,
    mmr.criticality,
    mmr.warehouse_efficiency_score,
    mmr.supplier_reliability,
    mmr.sustainability_score,
    mmr.total_valuation,
    mmr.movement_quantity,
    mmr.execution_date,
    mmr.picking_time_seconds,
    mmr.movement_accuracy_rate,
    mmr.carbon_footprint_kg,
    -- Analytics calculations
    CASE 
        WHEN mmr.criticality = 'CRITICAL' AND mmr.stockout_probability > 50 THEN 'URGENT_ACTION'
        WHEN mmr.criticality = 'HIGH' AND mmr.supplier_reliability < 80 THEN 'RISK_REVIEW'
        WHEN mmr.demand_trend = 'INCREASING' AND mmr.alternative_sources_available = false THEN 'CAPACITY_PLANNING'
        ELSE 'NORMAL_OPERATIONS'
    END as action_required,
    CASE 
        WHEN mmr.warehouse_efficiency_score >= 90 THEN 'EXCELLENT'
        WHEN mmr.warehouse_efficiency_score >= 70 THEN 'GOOD'
        WHEN mmr.warehouse_efficiency_score >= 50 THEN 'FAIR'
        ELSE 'NEEDS_IMPROVEMENT'
    END as efficiency_rating
FROM material_movement_registry mmr
WHERE mmr.processing_status = 'COMPLETED';

-- ===================================================================
-- SAMPLE DATA POPULATION WITH NEW COLUMNS
-- ===================================================================

-- Update existing enterprise transaction registry records with sample enhanced data
UPDATE enterprise_transaction_registry 
SET 
    business_process_category = CASE 
        WHEN transaction_category = 'SALES' THEN 'ORDER_TO_CASH'
        WHEN transaction_category = 'PURCHASE' THEN 'PROCURE_TO_PAY'
        WHEN transaction_category = 'PRODUCTION' THEN 'PLAN_TO_PRODUCE'
        ELSE 'FINANCIAL_MANAGEMENT'
    END,
    financial_impact_score = CASE 
        WHEN ABS(net_amount::NUMERIC) > 100000 THEN 95.00
        WHEN ABS(net_amount::NUMERIC) > 50000 THEN 75.00
        WHEN ABS(net_amount::NUMERIC) > 10000 THEN 55.00
        ELSE 25.00
    END,
    automation_level = CASE 
        WHEN source_application LIKE '%AUTOMATED%' THEN 'FULLY_AUTOMATED'
        WHEN source_application LIKE '%INTEGRATION%' THEN 'SEMI_AUTOMATED'
        ELSE 'MANUAL'
    END,
    trend_indicator = CASE 
        WHEN EXTRACT(MONTH FROM business_date) IN (11, 12, 1) THEN 'INCREASING'
        WHEN EXTRACT(MONTH FROM business_date) IN (6, 7, 8) THEN 'DECREASING'
        ELSE 'STABLE'
    END,
    processing_time_seconds = FLOOR(RANDOM() * 300) + 30,
    success_rate = 95.00 + (RANDOM() * 5),
    sustainability_score = 40.00 + (RANDOM() * 40),
    operational_risk_level = CASE 
        WHEN ABS(net_amount::NUMERIC) > 100000 THEN 'HIGH'
        WHEN ABS(net_amount::NUMERIC) > 25000 THEN 'MEDIUM'
        ELSE 'LOW'
    END
WHERE business_process_category IS NULL;

-- Update existing material movement registry records with sample enhanced data
UPDATE material_movement_registry 
SET 
    material_process_category = CASE 
        WHEN movement_category = 'RECEIPT' THEN 'INBOUND'
        WHEN movement_category = 'ISSUE' THEN 'OUTBOUND'
        WHEN movement_category = 'TRANSFER' THEN 'INTERNAL_TRANSFER'
        ELSE 'PRODUCTION'
    END,
    inventory_impact_score = CASE 
        WHEN ABS(total_valuation::NUMERIC) > 50000 THEN 85.00
        WHEN ABS(total_valuation::NUMERIC) > 20000 THEN 65.00
        WHEN ABS(total_valuation::NUMERIC) > 5000 THEN 45.00
        ELSE 25.00
    END,
    criticality = CASE 
        WHEN material_identifier LIKE '%CRITICAL%' OR material_identifier LIKE '%EMERGENCY%' THEN 'CRITICAL'
        WHEN ABS(total_valuation::NUMERIC) > 25000 THEN 'HIGH'
        WHEN ABS(total_valuation::NUMERIC) > 5000 THEN 'NORMAL'
        ELSE 'LOW'
    END,
    demand_trend = CASE 
        WHEN EXTRACT(MONTH FROM execution_date) IN (3, 4, 5) THEN 'INCREASING'
        WHEN EXTRACT(MONTH FROM execution_date) IN (9, 10, 11) THEN 'DECREASING'
        ELSE 'STABLE'
    END,
    warehouse_efficiency_score = 85.00 + (RANDOM() * 15),
    supplier_reliability = 90.00 + (RANDOM() * 10),
    sustainability_score = 45.00 + (RANDOM() * 35),
    picking_time_seconds = FLOOR(RANDOM() * 600) + 60,
    movement_accuracy_rate = 96.00 + (RANDOM() * 4),
    material_risk_level = CASE 
        WHEN criticality = 'CRITICAL' THEN 'HIGH'
        WHEN criticality = 'HIGH' THEN 'MEDIUM'
        ELSE 'LOW'
    END
WHERE material_process_category IS NULL;

-- ===================================================================
-- CONFIRMATION MESSAGE
-- ===================================================================

SELECT 'Gigantic Tables Enhanced Successfully!' as status,
       'Added comprehensive business analytics columns to both enterprise tables' as message,
       'Enhanced views and indexes created for advanced reporting capabilities' as analytics,
       'Sample data populated for immediate testing and demonstration' as data_status;