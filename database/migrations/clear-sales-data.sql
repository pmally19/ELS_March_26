-- CLEAR SALES ORDER RELATED DATA
-- This script clears all sales order, delivery, and billing data in the correct order

BEGIN;

-- 1. Clear financial postings related to sales
DELETE FROM payment_applications WHERE billing_id IN (SELECT id FROM billing_documents);
DELETE FROM ar_open_items WHERE billing_document_id IN (SELECT id FROM billing_documents);
DELETE FROM accounting_documents WHERE source_document_type = 'BILLING_DOCUMENT';

-- 2. Clear billing data
DELETE FROM billing_items;
DELETE FROM billing_documents;

-- 3. Clear material movements related to deliveries
DELETE FROM material_movements WHERE delivery_order_id IS NOT NULL OR sales_order_id IS NOT NULL;

-- 4. Clear transfer orders (references delivery_documents)
DELETE FROM transfer_order_items;
DELETE FROM transfer_orders WHERE delivery_id IS NOT NULL;

-- 5. Clear delivery data
DELETE FROM delivery_items;
DELETE FROM delivery_documents;

-- 5. Clear sales order data
DELETE FROM sales_order_schedule_lines;
DELETE FROM sales_order_items;
DELETE FROM sales_orders;

-- 6. Reset sequences (optional - starts numbering from 1 again)
-- Uncomment if you want to reset numbering
-- ALTER SEQUENCE sales_order_seq RESTART WITH 1;
-- ALTER SEQUENCE delivery_number_seq RESTART WITH 1;
-- ALTER SEQUENCE billing_number_seq RESTART WITH 1;

COMMIT;

-- Show what was cleared
SELECT 
    'Sales Orders' as table_name, COUNT(*) as remaining FROM sales_orders
UNION ALL
SELECT 'Delivery Documents', COUNT(*) FROM delivery_documents
UNION ALL
SELECT 'Delivery Items', COUNT(*) FROM delivery_items
UNION ALL
SELECT 'Billing Documents', COUNT(*) FROM billing_documents
UNION ALL
SELECT 'Material Movements (Sales)', COUNT(*) FROM material_movements WHERE delivery_order_id IS NOT NULL OR sales_order_id IS NOT NULL
UNION ALL
SELECT 'All Material Movements', COUNT(*) FROM material_movements;
