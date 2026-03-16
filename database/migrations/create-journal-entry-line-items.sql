-- Migration: Create journal_entry_line_items table for financial postings
-- Date: 2025-11-18
-- Purpose: Support line-item level journal entries for inventory finance postings

-- Create journal_entry_line_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS journal_entry_line_items (
  id SERIAL PRIMARY KEY,
  journal_entry_id INTEGER NOT NULL,
  line_item_number INTEGER NOT NULL,
  
  -- Accounting
  gl_account VARCHAR(20) NOT NULL,
  account_type VARCHAR(10) NOT NULL DEFAULT 'S', -- D=Debit, C=Credit, S=GL Account
  partner_id INTEGER, -- Customer or Vendor ID
  
  debit_amount DECIMAL(15,2) DEFAULT 0 NOT NULL,
  credit_amount DECIMAL(15,2) DEFAULT 0 NOT NULL,
  
  -- Segmentation
  profit_center VARCHAR(20),
  cost_center VARCHAR(20),
  profit_center_id INTEGER,
  cost_center_id INTEGER,
  business_area VARCHAR(10),
  segment VARCHAR(20),
  
  -- Tax
  tax_code VARCHAR(10),
  tax_amount DECIMAL(15,2) DEFAULT 0,
  
  -- Payment Terms
  payment_terms VARCHAR(10),
  due_date DATE,
  baseline_date DATE,
  
  -- References
  assignment VARCHAR(50),
  reference_key1 VARCHAR(50),
  reference_key2 VARCHAR(50),
  reference_key3 VARCHAR(50),
  item_text TEXT,
  description TEXT,
  reference VARCHAR(50),
  
  -- Status
  clearing_status VARCHAR(20),
  payment_status VARCHAR(20),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key to journal_entries (if it references accounting_documents, we'll use document_number)
  -- For now, we'll link via document_number since journal_entries uses document_number
  CONSTRAINT fk_journal_entry_line_items_document 
    FOREIGN KEY (journal_entry_id) 
    REFERENCES journal_entries(id) 
    ON DELETE CASCADE,
  
  UNIQUE(journal_entry_id, line_item_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_journal_entry_line_items_journal_entry_id 
ON journal_entry_line_items(journal_entry_id);

CREATE INDEX IF NOT EXISTS idx_journal_entry_line_items_gl_account 
ON journal_entry_line_items(gl_account);

CREATE INDEX IF NOT EXISTS idx_journal_entry_line_items_cost_center_id 
ON journal_entry_line_items(cost_center_id);

CREATE INDEX IF NOT EXISTS idx_journal_entry_line_items_profit_center_id 
ON journal_entry_line_items(profit_center_id);

-- Add comments
COMMENT ON TABLE journal_entry_line_items IS 'Line items for journal entries - supports multiple GL accounts per document';
COMMENT ON COLUMN journal_entry_line_items.journal_entry_id IS 'Reference to journal_entries table';
COMMENT ON COLUMN journal_entry_line_items.gl_account IS 'GL account code';
COMMENT ON COLUMN journal_entry_line_items.debit_amount IS 'Debit amount for this line';
COMMENT ON COLUMN journal_entry_line_items.credit_amount IS 'Credit amount for this line';

