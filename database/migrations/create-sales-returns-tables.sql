-- Order-to-Cash Gap Fixes: Returns and Credit Memos
-- Date: 2025-12-28
-- Purpose: Add missing returns/credit memo functionality to O2C

-- ========================================
-- SALES RETURNS TABLES
-- ========================================

-- Sales Returns Header
CREATE TABLE IF NOT EXISTS sales_returns (
  id SERIAL PRIMARY KEY,
  return_number VARCHAR(50) UNIQUE NOT NULL,
  sales_order_id INTEGER REFERENCES sales_orders(id),
  billing_document_id INTEGER REFERENCES billing_documents(id),
  customer_id INTEGER NOT NULL REFERENCES erp_customers(id),
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  return_reason VARCHAR(200),
  total_amount NUMERIC(15,2) DEFAULT 0,
  tax_amount NUMERIC(15,2) DEFAULT 0,
  net_amount NUMERIC(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, SUBMITTED, APPROVED, REJECTED, COMPLETED
  approval_status VARCHAR(20), -- PENDING, APPROVED, REJECTED
  approved_by INTEGER,
  approved_at TIMESTAMP,
  notes TEXT,
  company_code_id INTEGER REFERENCES company_codes(id),
  currency VARCHAR(3),
  created_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by INTEGER,
  active BOOLEAN DEFAULT true
);

-- Sales Return Items
CREATE TABLE IF NOT EXISTS sales_return_items (
  id SERIAL PRIMARY KEY,
  return_id INTEGER NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
  sales_order_item_id INTEGER REFERENCES sales_order_items(id),
  billing_item_id INTEGER REFERENCES billing_items(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity NUMERIC(15,3) NOT NULL,
  unit_price NUMERIC(15,2),
 total_amount NUMERIC(15,2),
  tax_amount NUMERIC(15,2),
  return_reason VARCHAR(200),
  condition VARCHAR(50), -- DAMAGED, DEFECTIVE, NORMAL, EXPIRED
  disposition VARCHAR(50), -- RESTOCK, SCRAP, REWORK, RMA, CREDIT_ONLY
  plant_id INTEGER REFERENCES plants(id),
  storage_location_id INTEGER REFERENCES storage_locations(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Credit Memos
CREATE TABLE IF NOT EXISTS credit_memos (
  id SERIAL PRIMARY KEY,
  credit_memo_number VARCHAR(50) UNIQUE NOT NULL,
  return_id INTEGER REFERENCES sales_returns(id),
  billing_document_id INTEGER NOT NULL REFERENCES billing_documents(id),
  customer_id INTEGER NOT NULL REFERENCES erp_customers(id),
  credit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  total_amount NUMERIC(15,2) NOT NULL,
  tax_amount NUMERIC(15,2) DEFAULT 0,
  net_amount NUMERIC(15,2),
  currency VARCHAR(3),
  posting_status VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, POSTED, CANCELLED
  accounting_document_number VARCHAR(50),
  reference VARCHAR(100),
  notes TEXT,
  company_code_id INTEGER REFERENCES company_codes(id),
  payment_terms VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by INTEGER,
  active BOOLEAN DEFAULT true
);

-- Credit Memo Items
CREATE TABLE IF NOT EXISTS credit_memo_items (
  id SERIAL PRIMARY KEY,
  credit_memo_id INTEGER NOT NULL REFERENCES credit_memos(id) ON DELETE CASCADE,
  return_item_id INTEGER REFERENCES sales_return_items(id),
  billing_item_id INTEGER REFERENCES billing_items(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity NUMERIC(15,3) NOT NULL,
  unit_price NUMERIC(15,2),
  total_amount NUMERIC(15,2),
  tax_amount NUMERIC(15,2),
  gl_account_id INTEGER REFERENCES account_id_master(id),
  cost_center_id INTEGER REFERENCES cost_centers(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Return Deliveries (Goods Receipt for Returns)
CREATE TABLE IF NOT EXISTS return_deliveries (
  id SERIAL PRIMARY KEY,
  return_delivery_number VARCHAR(50) UNIQUE NOT NULL,
  return_id INTEGER NOT NULL REFERENCES sales_returns(id),
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  plant_id INTEGER REFERENCES plants(id),
  storage_location_id INTEGER REFERENCES storage_locations(id),
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, CANCELLED
  inventory_posting_status VARCHAR(20), -- NOT_POSTED, POSTED, REVERSED
  inventory_document_number VARCHAR(50),
  receiver_name VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Return Delivery Items
CREATE TABLE IF NOT EXISTS return_delivery_items (
  id SERIAL PRIMARY KEY,
  return_delivery_id INTEGER NOT NULL REFERENCES return_deliveries(id) ON DELETE CASCADE,
  return_item_id INTEGER NOT NULL REFERENCES sales_return_items(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity_received NUMERIC(15,3) NOT NULL,
  quantity_accepted NUMERIC(15,3),
  quantity_rejected NUMERIC(15,3),
  condition VARCHAR(50),
  disposition VARCHAR(50),
  batch_number VARCHAR(50),
  serial_number VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_sales_returns_customer_id ON sales_returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_order_id ON sales_returns(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_billing_id ON sales_returns(billing_document_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_status ON sales_returns(status);
CREATE INDEX IF NOT EXISTS idx_sales_returns_return_date ON sales_returns(return_date);

CREATE INDEX IF NOT EXISTS idx_return_items_return_id ON sales_return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_product_id ON sales_return_items(product_id);

CREATE INDEX IF NOT EXISTS idx_credit_memos_customer_id ON credit_memos(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_memos_billing_id ON credit_memos(billing_document_id);
CREATE INDEX IF NOT EXISTS idx_credit_memos_posting_status ON credit_memos(posting_status);
CREATE INDEX IF NOT EXISTS idx_credit_memos_credit_date ON credit_memos(credit_date);

CREATE INDEX IF NOT EXISTS idx_credit_memo_items_credit_memo_id ON credit_memo_items(credit_memo_id);

CREATE INDEX IF NOT EXISTS idx_return_deliveries_return_id ON return_deliveries(return_id);
CREATE INDEX IF NOT EXISTS idx_return_deliveries_status ON return_deliveries(status);

CREATE INDEX IF NOT EXISTS idx_return_delivery_items_delivery_id ON return_delivery_items(return_delivery_id);

-- ========================================
-- COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON TABLE sales_returns IS 'Tracks customer return requests for products';
COMMENT ON TABLE sales_return_items IS 'Line items for sales returns';
COMMENT ON TABLE credit_memos IS 'Credit notes issued to customers for returns or adjustments';
COMMENT ON TABLE credit_memo_items IS 'Line items for credit memos';
COMMENT ON TABLE return_deliveries IS 'Physical receipt of returned goods';
COMMENT ON TABLE return_delivery_items IS 'Items received in return deliveries';

-- ========================================
-- VERIFICATION
-- ========================================

-- Verify tables created
DO $$
BEGIN
  RAISE NOTICE 'Sales Returns Tables Created Successfully:';
  RAISE NOTICE '  - sales_returns';
  RAISE NOTICE '  - sales_return_items';
  RAISE NOTICE '  - credit_memos';
  RAISE NOTICE '  - credit_memo_items';
  RAISE NOTICE '  - return_deliveries';
  RAISE NOTICE '  - return_delivery_items';
END $$;
