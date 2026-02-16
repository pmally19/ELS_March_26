-- Transaction Keys (Posting Keys) for Automatic Account Determination
-- These are universal selectors used to determine which GL accounts to post to

CREATE TABLE IF NOT EXISTS transaction_keys (
  id SERIAL PRIMARY KEY,
  code VARCHAR(3) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  business_context VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for fast lookups
CREATE INDEX idx_transaction_keys_code ON transaction_keys(code);
CREATE INDEX idx_transaction_keys_active ON transaction_keys(is_active);
CREATE INDEX idx_transaction_keys_context ON transaction_keys(business_context);

-- Comments
COMMENT ON TABLE transaction_keys IS 'Universal posting keys for automatic account determination';
COMMENT ON COLUMN transaction_keys.code IS 'Unique 3-character code identifier';
COMMENT ON COLUMN transaction_keys.general_modifier IS 'Optional modifier for variants (e.g., 01, 02 for different business scenarios)';
COMMENT ON COLUMN transaction_keys.business_context IS 'Business area or process (e.g., Procurement, Sales, Production)';
