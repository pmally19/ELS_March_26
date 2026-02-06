-- Sample Document Categories Data
-- This migration adds standard document categories

INSERT INTO document_categories (
    code, 
    name, 
    description, 
    is_active, 
    created_at, 
    updated_at
) VALUES
    -- Sales & Distribution
    ('SALES', 'Sales', 'Sales and distribution documents', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('ORDER', 'Order', 'Sales order documents', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('DELIVERY', 'Delivery', 'Delivery documents', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('BILLING', 'Billing', 'Billing and invoicing documents', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- Purchase
    ('PURCHASE', 'Purchase', 'Purchase documents', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('PURCHASE_ORDER', 'Purchase Order', 'Purchase order documents', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('GOODS_RECEIPT', 'Goods Receipt', 'Goods receipt documents', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- Finance & Accounting
    ('FINANCE', 'Finance', 'Financial documents', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('FINANCIAL', 'Financial', 'General financial documents', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('ACCOUNTING', 'Accounting', 'Accounting documents', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('PAYMENT', 'Payment', 'Payment documents', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- Inventory
    ('INVENTORY', 'Inventory', 'Inventory management documents', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('MATERIAL', 'Material', 'Material documents', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('STOCK_TRANSFER', 'Stock Transfer', 'Stock transfer documents', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- Production
    ('PRODUCTION', 'Production', 'Production documents', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- General
    ('GENERAL', 'General', 'General purpose documents', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('SYSTEM', 'System', 'System generated documents', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

