-- Enterprise Reporting Views for Business Intelligence
-- 4 comprehensive views for Finance and Material/Inventory reporting

-- 1. FINANCE VIEW - Comprehensive Financial Reporting
CREATE OR REPLACE VIEW FinanceView AS
SELECT 
    -- Core Transaction Info
    etr.id as transaction_id,
    etr.transaction_uuid,
    etr.reference_document,
    etr.business_date,
    etr.posting_date,
    etr.fiscal_period,
    
    -- Financial Details
    etr.primary_account,
    etr.offset_account,
    etr.debit_amount,
    etr.credit_amount,
    etr.net_amount,
    etr.currency_code,
    etr.base_currency_amount,
    etr.tax_amount,
    etr.discount_amount,
    
    -- Master Data Integration
    etr.company_master_ref as company,
    etr.plant_master_ref as plant,
    etr.customer_master_ref as customer,
    etr.vendor_master_ref as vendor,
    etr.material_master_ref as material,
    etr.cost_center_master_ref as cost_center,
    etr.employee_master_ref as employee,
    
    -- GL Account Master Data
    etr.gl_account_master->>'primary_account_name' as account_name,
    etr.gl_account_master->>'account_type' as account_type,
    etr.gl_account_master->>'account_group' as account_group,
    
    -- Business Classification
    etr.transaction_category,
    etr.source_application,
    etr.processing_status,
    etr.approval_status,
    
    -- Organizational Hierarchy
    etr.organizational_hierarchy->>'business_area' as business_area,
    etr.organizational_hierarchy->>'functional_area' as functional_area,
    etr.organizational_hierarchy->>'reporting_segment' as reporting_segment,
    etr.profit_center_code,
    etr.cost_center_code,
    etr.business_unit_code,
    etr.project_code,
    
    -- Financial Analytics
    CASE 
        WHEN etr.debit_amount > 0 THEN 'DEBIT_ENTRY'
        WHEN etr.credit_amount > 0 THEN 'CREDIT_ENTRY'
        ELSE 'ZERO_ENTRY'
    END as entry_type,
    
    CASE 
        WHEN ABS(etr.net_amount) > 1000000 THEN 'MAJOR'
        WHEN ABS(etr.net_amount) > 100000 THEN 'SIGNIFICANT'
        WHEN ABS(etr.net_amount) > 10000 THEN 'STANDARD'
        ELSE 'MINOR'
    END as transaction_magnitude,
    
    -- Audit Trail
    etr.created_timestamp,
    etr.modified_timestamp,
    etr.version_number,
    etr.notes,
    
    -- Risk Assessment
    CASE 
        WHEN etr.processing_status = 'CANCELLED' THEN 'HIGH_RISK'
        WHEN etr.approval_status = 'PENDING' THEN 'MEDIUM_RISK'
        WHEN ABS(etr.net_amount) > 5000000 THEN 'HIGH_VALUE_RISK'
        ELSE 'LOW_RISK'
    END as risk_level,
    
    -- Period Analytics
    EXTRACT(YEAR FROM etr.business_date) as fiscal_year,
    EXTRACT(QUARTER FROM etr.business_date) as fiscal_quarter,
    EXTRACT(MONTH FROM etr.business_date) as fiscal_month,
    TO_CHAR(etr.business_date, 'YYYY-MM') as year_month,
    
    -- Performance Metrics
    CASE etr.transaction_category
        WHEN 'SALES' THEN etr.net_amount
        ELSE 0
    END as revenue_impact,
    
    CASE etr.transaction_category
        WHEN 'PURCHASE' THEN ABS(etr.net_amount)
        ELSE 0
    END as cost_impact,
    
    CASE etr.transaction_category
        WHEN 'PRODUCTION' THEN ABS(etr.net_amount)
        ELSE 0
    END as production_cost
    
FROM enterprise_transaction_registry etr
WHERE etr.processing_status = 'ACTIVE';

-- 2. MATERIAL FLOW VIEW - Material Movement Analytics
CREATE OR REPLACE VIEW MaterialFlowView AS
SELECT 
    -- Core Movement Info
    mmr.id as movement_id,
    mmr.movement_uuid,
    mmr.movement_sequence,
    mmr.originating_document,
    mmr.execution_date,
    mmr.posting_date,
    mmr.effective_date,
    
    -- Movement Classification
    mmr.movement_category,
    mmr.movement_subcategory,
    mmr.business_transaction_type,
    mmr.processing_status,
    
    -- Material Details
    mmr.material_identifier,
    mmr.material_description,
    mmr.movement_quantity,
    mmr.base_unit_measure,
    mmr.unit_valuation,
    mmr.total_valuation,
    
    -- Location Information
    mmr.destination_location_code,
    mmr.storage_zone_code,
    mmr.warehouse_section,
    
    -- Master Data Integration
    mmr.plant_master_ref as plant,
    mmr.material_master_ref as material,
    mmr.vendor_master_ref as vendor,
    mmr.customer_master_ref as customer,
    mmr.work_center_master_ref as work_center,
    mmr.bom_master_ref as bom,
    mmr.routing_master_ref as routing,
    mmr.personnel_master_ref as personnel,
    
    -- Business Partner Info
    mmr.business_partner_code,
    
    -- Material Classification
    mmr.master_data_enrichment->>'material_classification' as material_class,
    mmr.master_data_enrichment->>'business_impact' as business_impact,
    mmr.master_data_enrichment->>'quality_requirements' as quality_req,
    mmr.master_data_enrichment->>'storage_requirements' as storage_req,
    
    -- Organizational Context
    mmr.organizational_context->>'operational_area' as operational_area,
    mmr.organizational_context->>'value_stream' as value_stream,
    mmr.organizational_context->>'cost_allocation' as cost_allocation,
    
    -- Movement Analytics
    CASE mmr.movement_category
        WHEN 'RECEIPT' THEN 'INBOUND'
        WHEN 'ISSUE' THEN 'OUTBOUND'
        WHEN 'TRANSFER' THEN 'INTERNAL'
        ELSE 'OTHER'
    END as flow_direction,
    
    CASE 
        WHEN mmr.movement_quantity > 0 THEN 'POSITIVE_MOVEMENT'
        WHEN mmr.movement_quantity < 0 THEN 'NEGATIVE_MOVEMENT'
        ELSE 'ZERO_MOVEMENT'
    END as quantity_direction,
    
    CASE 
        WHEN ABS(mmr.total_valuation) > 1000000 THEN 'HIGH_VALUE'
        WHEN ABS(mmr.total_valuation) > 100000 THEN 'MEDIUM_VALUE'
        WHEN ABS(mmr.total_valuation) > 10000 THEN 'STANDARD_VALUE'
        ELSE 'LOW_VALUE'
    END as value_category,
    
    -- Quality and Compliance
    mmr.quality_status,
    mmr.batch_identifier,
    mmr.expiration_date,
    mmr.manufacturing_date,
    
    -- Timing Analysis
    EXTRACT(YEAR FROM mmr.execution_date) as movement_year,
    EXTRACT(QUARTER FROM mmr.execution_date) as movement_quarter,
    EXTRACT(MONTH FROM mmr.execution_date) as movement_month,
    TO_CHAR(mmr.execution_date, 'YYYY-MM') as year_month,
    
    -- Performance Metrics
    ABS(mmr.movement_quantity) as absolute_quantity,
    ABS(mmr.total_valuation) as absolute_value,
    
    -- Inventory Impact
    CASE mmr.movement_category
        WHEN 'RECEIPT' THEN mmr.movement_quantity
        ELSE 0
    END as inventory_increase,
    
    CASE mmr.movement_category
        WHEN 'ISSUE' THEN ABS(mmr.movement_quantity)
        ELSE 0
    END as inventory_decrease,
    
    -- Audit Trail
    mmr.created_timestamp,
    mmr.version_number
    
FROM material_movement_registry mmr
WHERE mmr.processing_status = 'COMPLETED';

-- 3. INVENTORY FLOW VIEW - Inventory Management Analytics
CREATE OR REPLACE VIEW InventoryFlowView AS
SELECT 
    -- Material Summary
    mmr.material_identifier,
    mmr.material_description,
    mmr.master_data_enrichment->>'material_classification' as material_type,
    
    -- Location Summary
    mmr.destination_location_code as location,
    mmr.plant_master_ref as plant,
    
    -- Quantity Analytics
    SUM(CASE WHEN mmr.movement_category = 'RECEIPT' THEN mmr.movement_quantity ELSE 0 END) as total_receipts,
    SUM(CASE WHEN mmr.movement_category = 'ISSUE' THEN ABS(mmr.movement_quantity) ELSE 0 END) as total_issues,
    SUM(mmr.movement_quantity) as net_movement,
    COUNT(*) as total_movements,
    
    -- Value Analytics  
    SUM(CASE WHEN mmr.movement_category = 'RECEIPT' THEN mmr.total_valuation ELSE 0 END) as total_receipt_value,
    SUM(CASE WHEN mmr.movement_category = 'ISSUE' THEN ABS(mmr.total_valuation) ELSE 0 END) as total_issue_value,
    SUM(mmr.total_valuation) as net_value_movement,
    
    -- Average Metrics
    AVG(CASE WHEN mmr.movement_category = 'RECEIPT' THEN mmr.unit_valuation END) as avg_receipt_cost,
    AVG(CASE WHEN mmr.movement_category = 'ISSUE' THEN mmr.unit_valuation END) as avg_issue_cost,
    AVG(ABS(mmr.movement_quantity)) as avg_movement_quantity,
    
    -- Time Period
    EXTRACT(YEAR FROM mmr.execution_date) as year,
    EXTRACT(QUARTER FROM mmr.execution_date) as quarter,
    EXTRACT(MONTH FROM mmr.execution_date) as month,
    
    -- Business Context
    mmr.organizational_context->>'value_stream' as primary_value_stream,
    mmr.master_data_enrichment->>'business_impact' as business_importance,
    
    -- Activity Level
    CASE 
        WHEN COUNT(*) > 10 THEN 'HIGH_ACTIVITY'
        WHEN COUNT(*) > 5 THEN 'MEDIUM_ACTIVITY'
        WHEN COUNT(*) > 1 THEN 'LOW_ACTIVITY'
        ELSE 'MINIMAL_ACTIVITY'
    END as activity_level,
    
    -- Velocity Metrics
    MAX(mmr.execution_date) as last_movement_date,
    MIN(mmr.execution_date) as first_movement_date,
    
    -- Performance Indicators
    CASE 
        WHEN SUM(mmr.movement_quantity) > 0 THEN 'NET_INCREASE'
        WHEN SUM(mmr.movement_quantity) < 0 THEN 'NET_DECREASE'
        ELSE 'BALANCED'
    END as inventory_trend
    
FROM material_movement_registry mmr
WHERE mmr.processing_status = 'COMPLETED'
GROUP BY 
    mmr.material_identifier, mmr.material_description, 
    mmr.master_data_enrichment->>'material_classification',
    mmr.destination_location_code, mmr.plant_master_ref,
    EXTRACT(YEAR FROM mmr.execution_date), EXTRACT(QUARTER FROM mmr.execution_date), 
    EXTRACT(MONTH FROM mmr.execution_date),
    mmr.organizational_context->>'value_stream',
    mmr.master_data_enrichment->>'business_impact';

-- 4. FINANCIAL MATERIAL INTEGRATION VIEW - Complete Business Process View
CREATE OR REPLACE VIEW FinancialMaterialIntegrationView AS
SELECT 
    -- Document Linking
    etr.reference_document as business_document,
    etr.transaction_uuid as financial_transaction,
    mmr.movement_uuid as material_movement,
    
    -- Business Process Classification
    etr.transaction_category as financial_category,
    mmr.movement_category as material_category,
    etr.source_application as financial_app,
    mmr.business_transaction_type as material_process,
    
    -- Integrated Values
    etr.net_amount as financial_impact,
    mmr.total_valuation as material_impact,
    ABS(etr.net_amount - mmr.total_valuation) as variance,
    
    -- Master Data Integration
    COALESCE(etr.customer_master_ref, etr.vendor_master_ref, 'INTERNAL') as business_partner,
    COALESCE(etr.material_master_ref, mmr.material_master_ref) as material,
    COALESCE(etr.plant_master_ref, mmr.plant_master_ref) as plant,
    
    -- Account Classification
    etr.gl_account_master->>'account_type' as account_type,
    etr.gl_account_master->>'account_group' as account_group,
    
    -- Material Classification
    mmr.master_data_enrichment->>'material_classification' as material_type,
    mmr.master_data_enrichment->>'business_impact' as material_importance,
    
    -- Organizational Integration
    etr.organizational_hierarchy->>'business_area' as business_area,
    mmr.organizational_context->>'value_stream' as value_stream,
    
    -- Process Flow Analysis
    CASE 
        WHEN etr.transaction_category = 'SALES' AND mmr.movement_category = 'ISSUE' THEN 'SALES_DELIVERY'
        WHEN etr.transaction_category = 'PURCHASE' AND mmr.movement_category = 'RECEIPT' THEN 'PURCHASE_RECEIPT'
        WHEN etr.transaction_category = 'PRODUCTION' AND mmr.movement_category = 'ISSUE' THEN 'PRODUCTION_CONSUMPTION'
        WHEN etr.transaction_category = 'PRODUCTION' AND mmr.movement_category = 'RECEIPT' THEN 'PRODUCTION_OUTPUT'
        ELSE 'OTHER_PROCESS'
    END as integrated_process_type,
    
    -- Integration Quality
    CASE 
        WHEN ABS(etr.net_amount) = ABS(mmr.total_valuation) THEN 'PERFECT_MATCH'
        WHEN ABS(etr.net_amount - mmr.total_valuation) < 1000 THEN 'CLOSE_MATCH'
        WHEN etr.reference_document = mmr.originating_document THEN 'DOCUMENT_LINKED'
        ELSE 'VARIANCE_REVIEW'
    END as integration_quality,
    
    -- Timing Analysis
    etr.business_date as financial_date,
    mmr.execution_date as material_date,
    
    -- Risk Assessment
    CASE 
        WHEN ABS(etr.net_amount - mmr.total_valuation) > 10000 THEN 'HIGH_VARIANCE'
        WHEN etr.processing_status != 'ACTIVE' OR mmr.processing_status != 'COMPLETED' THEN 'STATUS_MISMATCH'
        ELSE 'LOW_RISK'
    END as risk_level,
    
    -- Performance Metrics
    etr.created_timestamp as financial_created,
    mmr.created_timestamp as material_created
    
FROM enterprise_transaction_registry etr
FULL OUTER JOIN material_movement_registry mmr 
    ON etr.reference_document = mmr.originating_document
WHERE (etr.processing_status = 'ACTIVE' OR etr.processing_status IS NULL)
  AND (mmr.processing_status = 'COMPLETED' OR mmr.processing_status IS NULL);