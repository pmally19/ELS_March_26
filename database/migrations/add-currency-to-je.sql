-- Add currency columns to Journal Entry Line Items to support multi-currency
-- Required for FX Revaluation

ALTER TABLE journal_entry_line_items 
ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3),
ADD COLUMN IF NOT EXISTS foreign_amount DECIMAL(15,2);

COMMENT ON COLUMN journal_entry_line_items.currency_code IS 'Original currency code (ISO 4217)';
COMMENT ON COLUMN journal_entry_line_items.foreign_amount IS 'Amount in original currency';

-- Also add to Journal Entries header if missing
ALTER TABLE journal_entries
ADD COLUMN IF NOT EXISTS currency VARCHAR(3);

-- Add index for foreign currency items
CREATE INDEX IF NOT EXISTS idx_jeli_currency ON journal_entry_line_items(currency_code);
