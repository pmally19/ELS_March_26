-- Migration: Create Document Number Sequences Table
-- Purpose: Replace hardcoded document number generation with proper sequential numbering
-- Created: 2026-01-19

CREATE TABLE IF NOT EXISTS document_number_sequences (
  id SERIAL PRIMARY KEY,
  document_type VARCHAR(20) NOT NULL UNIQUE,
  prefix VARCHAR(10) NOT NULL,
  current_number INTEGER NOT NULL DEFAULT 0,
  reset_frequency VARCHAR(20) DEFAULT 'NEVER',
  last_reset_date DATE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_document_number_sequences_type ON document_number_sequences(document_type);

-- Insert initial sequences for quotations
INSERT INTO document_number_sequences (document_type, prefix, current_number, reset_frequency)
VALUES 
  ('QUOTATION', 'QUOT', 0, 'NEVER'),
  ('SALES_ORDER', 'SO', 0, 'NEVER')
ON CONFLICT (document_type) DO NOTHING;

-- Add comment to table
COMMENT ON TABLE document_number_sequences IS 'Manages sequential document number generation for various business documents';
COMMENT ON COLUMN document_number_sequences.document_type IS 'Unique identifier for the document type (e.g., QUOTATION, SALES_ORDER)';
COMMENT ON COLUMN document_number_sequences.prefix IS 'Prefix to use in generated document numbers';
COMMENT ON COLUMN document_number_sequences.current_number IS 'Current sequence number, atomically incremented';
COMMENT ON COLUMN document_number_sequences.reset_frequency IS 'How often to reset the counter (DAILY, MONTHLY, YEARLY, NEVER)';
