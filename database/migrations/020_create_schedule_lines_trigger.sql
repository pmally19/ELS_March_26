-- Migration: Create trigger to automatically generate schedule lines from sales order items
-- This ensures every sales order item gets at least one schedule line

-- Step 1: Create function to generate schedule lines
CREATE OR REPLACE FUNCTION create_default_schedule_line()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a default schedule line for the new sales order item
  INSERT INTO sales_order_schedule_lines (
    sales_order_id,
    sales_order_item_id,
    line_number,
    schedule_quantity,
    confirmed_quantity,
    delivered_quantity,
    unit,
    requested_delivery_date,
    confirmed_delivery_date,
    confirmation_status,
    availability_status
  ) VALUES (
    NEW.order_id,
    NEW.id,
    1, -- First schedule line for this item
    NEW.quantity,
    NEW.quantity, -- Auto-confirm the quantity
    0, -- No delivery yet
    'EA', -- Default unit (since sales_order_items doesn't have unit column)
    CURRENT_DATE + INTERVAL '7 days', -- Default to 7 days from now
    CURRENT_DATE + INTERVAL '7 days',
    'CONFIRMED',
    'UNCHECKED'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create trigger on sales_order_items
DROP TRIGGER IF EXISTS create_schedule_line_on_item_insert ON sales_order_items;

CREATE TRIGGER create_schedule_line_on_item_insert
  AFTER INSERT ON sales_order_items
  FOR EACH ROW
  EXECUTE FUNCTION create_default_schedule_line();

-- Step 3: Backfill schedule lines for existing sales order items that don't have them
INSERT INTO sales_order_schedule_lines (
  sales_order_id,
  sales_order_item_id,
  line_number,
  schedule_quantity,
  confirmed_quantity,
  delivered_quantity,
  unit,
  requested_delivery_date,
  confirmed_delivery_date,
  confirmation_status,
  availability_status
)
SELECT 
  soi.order_id,
  soi.id,
  1, -- First schedule line
  soi.quantity,
  soi.quantity,
  0,
  'EA', -- Default unit (sales_order_items doesn't have unit column)
  CURRENT_DATE + INTERVAL '7 days',
  CURRENT_DATE + INTERVAL '7 days',
  'CONFIRMED',
  'UNCHECKED'
FROM sales_order_items soi
LEFT JOIN sales_order_schedule_lines sl ON soi.id = sl.sales_order_item_id
WHERE sl.id IS NULL -- Only items without schedule lines
  AND soi.quantity > 0; -- Only items with quantity

-- Completion message
DO $$
DECLARE
  backfilled_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO backfilled_count FROM sales_order_schedule_lines;
  RAISE NOTICE '✅ Schedule Lines Trigger Created!';
  RAISE NOTICE '📋 Total Schedule Lines: %', backfilled_count;
  RAISE NOTICE '🔧 Trigger will automatically create schedule lines for new order items';
END $$;

