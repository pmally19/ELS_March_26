-- Migration: Add missing fields to delivery_documents and sales_order_items
-- Includes total_amount, shipping_point_code, and route_code for deliveries
-- and shipping point fields for sales order items

BEGIN;

-- 1. Add missing columns to delivery_documents
ALTER TABLE delivery_documents 
  ADD COLUMN IF NOT EXISTS total_amount DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS shipping_point_code VARCHAR(4),
  ADD COLUMN IF NOT EXISTS route_code VARCHAR(6);

-- 2. Add missing columns to sales_order_items
ALTER TABLE sales_order_items
  ADD COLUMN IF NOT EXISTS shipping_point_id INTEGER,
  ADD COLUMN IF NOT EXISTS shipping_point_code VARCHAR(4);

COMMIT;
