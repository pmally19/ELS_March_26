-- Migration: Add missing sales order fields for complete compliance
-- Date: 2025-01-28
-- Purpose: Add all missing fields identified in gap analysis without defaults

-- Critical Missing Fields
DO $$
BEGIN
  -- Distribution Channel
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='distribution_channel_id') THEN
    ALTER TABLE sales_orders ADD COLUMN distribution_channel_id INTEGER;
    COMMENT ON COLUMN sales_orders.distribution_channel_id IS 'Distribution channel reference';
  END IF;

  -- Division
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='division_id') THEN
    ALTER TABLE sales_orders ADD COLUMN division_id INTEGER;
    COMMENT ON COLUMN sales_orders.division_id IS 'Division reference for product line segmentation';
  END IF;

  -- Pricing Procedure
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='pricing_procedure') THEN
    ALTER TABLE sales_orders ADD COLUMN pricing_procedure VARCHAR(10);
    COMMENT ON COLUMN sales_orders.pricing_procedure IS 'Pricing procedure code for automatic pricing calculation';
  END IF;

  -- Tax Code
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='tax_code') THEN
    ALTER TABLE sales_orders ADD COLUMN tax_code VARCHAR(5);
    COMMENT ON COLUMN sales_orders.tax_code IS 'Tax code for tax determination';
  END IF;

  -- High Priority Fields
  -- Sales Office
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='sales_office_id') THEN
    ALTER TABLE sales_orders ADD COLUMN sales_office_id INTEGER;
    COMMENT ON COLUMN sales_orders.sales_office_id IS 'Sales office reference for commission calculation';
  END IF;

  -- Sales Group
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='sales_group_id') THEN
    ALTER TABLE sales_orders ADD COLUMN sales_group_id INTEGER;
    COMMENT ON COLUMN sales_orders.sales_group_id IS 'Sales group reference for sales team assignment';
  END IF;

  -- Sales Person ID (keep sales_rep for display)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='sales_person_id') THEN
    ALTER TABLE sales_orders ADD COLUMN sales_person_id INTEGER;
    COMMENT ON COLUMN sales_orders.sales_person_id IS 'Sales person ID reference to users/employees table';
  END IF;

  -- Shipping Point ID (keep shipping_point_code for compatibility)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='shipping_point_id') THEN
    ALTER TABLE sales_orders ADD COLUMN shipping_point_id INTEGER;
    COMMENT ON COLUMN sales_orders.shipping_point_id IS 'Shipping point ID reference to shipping point master';
  END IF;

  -- Route ID (keep route_code for compatibility)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='route_id') THEN
    ALTER TABLE sales_orders ADD COLUMN route_id INTEGER;
    COMMENT ON COLUMN sales_orders.route_id IS 'Route ID reference to route master';
  END IF;

  -- Low Priority Fields
  -- Customer PO Number (check if exists elsewhere first)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='customer_po_number') THEN
    ALTER TABLE sales_orders ADD COLUMN customer_po_number VARCHAR(50);
    COMMENT ON COLUMN sales_orders.customer_po_number IS 'Customer purchase order number';
  END IF;

  -- Customer PO Date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='customer_po_date') THEN
    ALTER TABLE sales_orders ADD COLUMN customer_po_date DATE;
    COMMENT ON COLUMN sales_orders.customer_po_date IS 'Customer purchase order date';
  END IF;

  -- Order Reason
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='order_reason') THEN
    ALTER TABLE sales_orders ADD COLUMN order_reason VARCHAR(3);
    COMMENT ON COLUMN sales_orders.order_reason IS 'Order reason code for reporting';
  END IF;

  -- Sales District
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='sales_district') THEN
    ALTER TABLE sales_orders ADD COLUMN sales_district VARCHAR(6);
    COMMENT ON COLUMN sales_orders.sales_district IS 'Sales district code for territory management';
  END IF;
END $$;

-- Add Foreign Key Constraints (if master tables exist)
DO $$
BEGIN
  -- Distribution Channel FK
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='distribution_channels') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name='fk_sales_orders_distribution_channel'
    ) THEN
      ALTER TABLE sales_orders 
      ADD CONSTRAINT fk_sales_orders_distribution_channel 
      FOREIGN KEY (distribution_channel_id) 
      REFERENCES distribution_channels(id) 
      ON DELETE SET NULL;
    END IF;
  END IF;

  -- Division FK
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='divisions') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name='fk_sales_orders_division'
    ) THEN
      ALTER TABLE sales_orders 
      ADD CONSTRAINT fk_sales_orders_division 
      FOREIGN KEY (division_id) 
      REFERENCES divisions(id) 
      ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_sales_orders_distribution_channel_id ON sales_orders(distribution_channel_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_division_id ON sales_orders(division_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_pricing_procedure ON sales_orders(pricing_procedure);
CREATE INDEX IF NOT EXISTS idx_sales_orders_tax_code ON sales_orders(tax_code);
CREATE INDEX IF NOT EXISTS idx_sales_orders_sales_office_id ON sales_orders(sales_office_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_sales_group_id ON sales_orders(sales_group_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_sales_person_id ON sales_orders(sales_person_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_shipping_point_id ON sales_orders(shipping_point_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_route_id ON sales_orders(route_id);

