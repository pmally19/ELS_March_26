-- Migration: Add Number Sequences for Credit/Debit Memos
-- Version: 1013
-- Description: Adds number sequence tracking for new memo types

-- ============================================================================
-- Ensure Number Sequences Table Exists
-- ============================================================================
CREATE TABLE IF NOT EXISTS number_sequences (
    id SERIAL PRIMARY KEY,
    sequence_name VARCHAR(50) NOT NULL UNIQUE,
    prefix VARCHAR(10),
    current_number INTEGER DEFAULT 0 NOT NULL,
    year INTEGER,
    last_reset_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_number_seq_current CHECK (current_number >= 0)
);

-- ============================================================================
-- Insert Sequences for New Memo Types
-- ============================================================================
INSERT INTO number_sequences (sequence_name, prefix, current_number, year, last_reset_date)
VALUES 
    ('debit_memo', 'DM', 0, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, CURRENT_DATE),
    ('ap_credit_memo', 'APCM', 0, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, CURRENT_DATE),
    ('ap_debit_memo', 'APDM', 0, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, CURRENT_DATE)
ON CONFLICT (sequence_name) DO NOTHING;

-- ============================================================================
-- Index for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_number_sequences_name 
    ON number_sequences(sequence_name);

-- ============================================================================
-- Comments for Documentation
-- ============================================================================
COMMENT ON TABLE number_sequences IS 
    'Centralized number sequence management for document numbering';

COMMENT ON COLUMN number_sequences.sequence_name IS 
    'Unique identifier for the sequence type (e.g., debit_memo, ap_credit_memo)';

COMMENT ON COLUMN number_sequences.prefix IS 
    'Prefix for generated numbers (e.g., DM, APCM, APDM)';

COMMENT ON COLUMN number_sequences.year IS 
    'Current year for sequence - resets at year change';
