-- =====================================================
-- Payment Authorization System Migration
-- Creates tables for authorization levels, user limits,
-- authorization tracking, and daily limit monitoring
-- =====================================================

-- 1. Payment Authorization Levels Table
-- Defines the authorization hierarchy and thresholds
CREATE TABLE IF NOT EXISTS payment_authorization_levels (
  id SERIAL PRIMARY KEY,
  level_name VARCHAR(50) NOT NULL,
  level_order INTEGER NOT NULL,
  min_amount DECIMAL(15,2) DEFAULT 0,
  max_amount DECIMAL(15,2),
  requires_dual_approval BOOLEAN DEFAULT FALSE,
  company_code_id INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_auth_levels_amount ON payment_authorization_levels(min_amount, max_amount);

-- Seed default authorization levels
INSERT INTO payment_authorization_levels (level_name, level_order, min_amount, max_amount, requires_dual_approval)
VALUES 
  ('AP Clerk', 1, 0, 5000, FALSE),
  ('Manager', 2, 5001, 25000, FALSE),
  ('Finance Manager', 3, 25001, 100000, TRUE),
  ('CFO', 4, 100001, NULL, TRUE)
ON CONFLICT DO NOTHING;

-- 2. User Authorization Limits Table
-- Stores authorization limits per user/role
CREATE TABLE IF NOT EXISTS user_authorization_limits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  role VARCHAR(50) NOT NULL,
  daily_limit DECIMAL(15,2) NOT NULL DEFAULT 50000,
  single_payment_limit DECIMAL(15,2) NOT NULL DEFAULT 10000,
  dual_approval_threshold DECIMAL(15,2) NOT NULL DEFAULT 25000,
  can_authorize BOOLEAN DEFAULT TRUE,
  authorization_level_id INTEGER REFERENCES payment_authorization_levels(id),
  company_code_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, company_code_id)
);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_auth_limits_user ON user_authorization_limits(user_id);

-- Seed default user (admin/system user)
INSERT INTO user_authorization_limits (user_id, role, daily_limit, single_payment_limit, dual_approval_threshold, authorization_level_id)
VALUES 
  (1, 'CFO', 1000000, 500000, 100000, 4)
ON CONFLICT (user_id, company_code_id) DO NOTHING;

-- 3. Payment Authorizations Tracking Table
-- Audit trail for all payment authorizations
CREATE TABLE IF NOT EXISTS payment_authorizations (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER REFERENCES vendor_payments(id) ON DELETE CASCADE,
  authorized_by INTEGER NOT NULL,
  authorization_level VARCHAR(50),
  authorization_date TIMESTAMP DEFAULT NOW(),
  authorization_status VARCHAR(20) CHECK (authorization_status IN ('APPROVED', 'REJECTED', 'PENDING')),
  authorization_notes TEXT,
  ip_address VARCHAR(50),
  approval_order INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_payment_auth_payment ON payment_authorizations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_auth_user ON payment_authorizations(authorized_by);
CREATE INDEX IF NOT EXISTS idx_payment_auth_status ON payment_authorizations(authorization_status);
CREATE INDEX IF NOT EXISTS idx_payment_auth_date ON payment_authorizations(authorization_date);

-- 4. Daily Authorization Tracking Table
-- Tracks daily authorization usage for limit enforcement
CREATE TABLE IF NOT EXISTS daily_authorization_tracking (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  authorization_date DATE NOT NULL,
  total_authorized DECIMAL(15,2) DEFAULT 0,
  payment_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, authorization_date)
);

-- Create index for date-based queries
CREATE INDEX IF NOT EXISTS idx_daily_auth_user_date ON daily_authorization_tracking(user_id, authorization_date);

-- 5. Update vendor_payments Table
-- Add authorization tracking fields
DO $$ 
BEGIN
  -- Add authorization_status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vendor_payments' AND column_name = 'authorization_status'
  ) THEN
    ALTER TABLE vendor_payments ADD COLUMN authorization_status VARCHAR(20) DEFAULT 'PENDING';
  END IF;

  -- Add risk_level column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vendor_payments' AND column_name = 'risk_level'
  ) THEN
    ALTER TABLE vendor_payments ADD COLUMN risk_level VARCHAR(20);
  END IF;

  -- Add requires_dual_approval column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vendor_payments' AND column_name = 'requires_dual_approval'
  ) THEN
    ALTER TABLE vendor_payments ADD COLUMN requires_dual_approval BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add approval_count column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vendor_payments' AND column_name = 'approval_count'
  ) THEN
    ALTER TABLE vendor_payments ADD COLUMN approval_count INTEGER DEFAULT 0;
  END IF;

  -- Add first_authorized_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vendor_payments' AND column_name = 'first_authorized_by'
  ) THEN
    ALTER TABLE vendor_payments ADD COLUMN first_authorized_by INTEGER;
  END IF;

  -- Add first_authorized_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vendor_payments' AND column_name = 'first_authorized_date'
  ) THEN
    ALTER TABLE vendor_payments ADD COLUMN first_authorized_date TIMESTAMP;
  END IF;

  -- Add second_authorized_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vendor_payments' AND column_name = 'second_authorized_by'
  ) THEN
    ALTER TABLE vendor_payments ADD COLUMN second_authorized_by INTEGER;
  END IF;

  -- Add second_authorized_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vendor_payments' AND column_name = 'second_authorized_date'
  ) THEN
    ALTER TABLE vendor_payments ADD COLUMN second_authorized_date TIMESTAMP;
  END IF;
END $$;

-- Create indexes on vendor_payments for authorization queries
CREATE INDEX IF NOT EXISTS idx_vendor_payments_auth_status ON vendor_payments(authorization_status);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_risk ON vendor_payments(risk_level);

-- Add comments for documentation
COMMENT ON TABLE payment_authorization_levels IS 'Defines authorization hierarchy with amount thresholds';
COMMENT ON TABLE user_authorization_limits IS 'Stores per-user authorization limits and daily caps';
COMMENT ON TABLE payment_authorizations IS 'Audit trail of all payment authorization actions';
COMMENT ON TABLE daily_authorization_tracking IS 'Tracks daily authorization usage for limit enforcement';

COMMENT ON COLUMN vendor_payments.authorization_status IS 'Current authorization status: PENDING, AUTHORIZED, REJECTED, PENDING_DUAL_APPROVAL';
COMMENT ON COLUMN vendor_payments.risk_level IS 'Calculated risk level: HIGH, MEDIUM, LOW';
COMMENT ON COLUMN vendor_payments.requires_dual_approval IS 'Whether this payment needs two approvers';
COMMENT ON COLUMN vendor_payments.approval_count IS 'Number of approvals received';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON payment_authorization_levels TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE ON user_authorization_limits TO your_app_user;
-- GRANT SELECT, INSERT ON payment_authorizations TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE ON daily_authorization_tracking TO your_app_user;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Payment Authorization System migration completed successfully';
  RAISE NOTICE '   - Created 4 new tables';
  RAISE NOTICE '   - Updated vendor_payments with 8 new columns';
  RAISE NOTICE '   - Created 8 indexes for performance';
  RAISE NOTICE '   - Seeded default authorization levels';
END $$;
