-- ============================================================
-- Migration 029: Standardize GL Posting to journal_entry_line_items
-- Adds missing columns to journal_entry_line_items so all modules
-- can write to one unified table instead of splitting between
-- gl_entries and journal_entry_line_items.
-- Non-breaking: only ADD COLUMN IF NOT EXISTS (no drops)
-- ============================================================

-- Step 1: Add missing columns to journal_entry_line_items
ALTER TABLE journal_entry_line_items
  ADD COLUMN IF NOT EXISTS posting_key          VARCHAR(5),
  ADD COLUMN IF NOT EXISTS source_module         VARCHAR(20),
  ADD COLUMN IF NOT EXISTS source_document_id    INTEGER,
  ADD COLUMN IF NOT EXISTS source_document_type  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS bank_transaction_id   INTEGER,
  ADD COLUMN IF NOT EXISTS gl_account_id         INTEGER REFERENCES gl_accounts(id);

-- Step 2: Add helpful indices on new columns
CREATE INDEX IF NOT EXISTS idx_jeli_source_module  ON journal_entry_line_items(source_module);
CREATE INDEX IF NOT EXISTS idx_jeli_source_doc_type ON journal_entry_line_items(source_document_type);
CREATE INDEX IF NOT EXISTS idx_jeli_posting_key     ON journal_entry_line_items(posting_key);
CREATE INDEX IF NOT EXISTS idx_jeli_gl_account_id   ON journal_entry_line_items(gl_account_id);

-- Step 3: Backfill gl_account_id from gl_accounts where gl_account (text) is set
UPDATE journal_entry_line_items jeli
SET gl_account_id = ga.id
FROM gl_accounts ga
WHERE jeli.gl_account = ga.account_number
  AND jeli.gl_account_id IS NULL
  AND jeli.gl_account IS NOT NULL;

-- Step 4: Add document_type to journal_entries if not there (for FI doc type: WE, KR, RV, AC, PR etc.)
-- (already exists as document_type column, just ensuring)

-- Step 5: Add fiscal_year and fiscal_period as integer to journal_entries
-- fiscal_period is VARCHAR, casting is handled in code
-- No schema change needed here.

-- Step 6: Add gl_document_type and reversal columns to journal_entries
ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS reversal_of_id       INTEGER REFERENCES journal_entries(id),
  ADD COLUMN IF NOT EXISTS reversal_reason_code  VARCHAR(2),
  ADD COLUMN IF NOT EXISTS is_reversal           BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_module         VARCHAR(20),
  ADD COLUMN IF NOT EXISTS source_document_id    INTEGER,
  ADD COLUMN IF NOT EXISTS source_document_type  VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_je_source_module    ON journal_entries(source_module);
CREATE INDEX IF NOT EXISTS idx_je_source_doc_type  ON journal_entries(source_document_type);
CREATE INDEX IF NOT EXISTS idx_je_document_type    ON journal_entries(document_type);
