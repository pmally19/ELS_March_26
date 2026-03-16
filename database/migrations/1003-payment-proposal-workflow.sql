-- =====================================================
-- Payment Proposal Workflow System Migration
-- Adds proposal-based payment processing on top of existing authorization system
-- =====================================================

-- 1. Payment Proposals Table
-- Stores batch payment runs (collections of payments to process together)
CREATE TABLE IF NOT EXISTS payment_proposals (
  id SERIAL PRIMARY KEY,
  proposal_number VARCHAR(50) UNIQUE NOT NULL,
  company_code_id INTEGER,
  payment_date DATE NOT NULL,
  value_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  -- Status: DRAFT, SUBMITTED, APPROVED, REJECTED, POSTED, CANCELLED
  total_amount DECIMAL(15,2) DEFAULT 0,
  total_items INTEGER DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  created_by INTEGER,
  submitted_by INTEGER,
  submitted_at TIMESTAMP,
  approval_required BOOLEAN DEFAULT false,
  approval_pattern VARCHAR(20),
  -- Approval pattern: SINGLE, SEQUENTIAL, JOINT
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_proposals_status ON payment_proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_company ON payment_proposals(company_code_id);
CREATE INDEX IF NOT EXISTS idx_proposals_payment_date ON payment_proposals(payment_date);

-- 2. Payment Proposal Items Table
-- Individual payments within a proposal
CREATE TABLE IF NOT EXISTS payment_proposal_items (
  id SERIAL PRIMARY KEY,
  proposal_id INTEGER REFERENCES payment_proposals(id) ON DELETE CASCADE,
  invoice_id INTEGER,
  vendor_id INTEGER,
  vendor_name VARCHAR(255),
  invoice_number VARCHAR(100),
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(50),
  bank_account_id INTEGER,
  status VARCHAR(20) DEFAULT 'PENDING',
  -- Status: PENDING, APPROVED, BLOCKED, POSTED, ERROR
  exception_type VARCHAR(50),
  exception_message TEXT,
  line_number INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_proposal_items_proposal ON payment_proposal_items(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_items_status ON payment_proposal_items(status);
CREATE INDEX IF NOT EXISTS idx_proposal_items_vendor ON payment_proposal_items(vendor_id);

-- 3. Payment Approval Workflows Table
-- Defines approval requirements by amount range
CREATE TABLE IF NOT EXISTS payment_approval_workflows (
  id SERIAL PRIMARY KEY,
  company_code_id INTEGER,
  workflow_name VARCHAR(100) NOT NULL,
  approval_pattern VARCHAR(20) NOT NULL,
  -- SINGLE, SEQUENTIAL, JOINT
  min_amount DECIMAL(15,2),
  max_amount DECIMAL(15,2),
  required_signatures INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workflows_company ON payment_approval_workflows(company_code_id);
CREATE INDEX IF NOT EXISTS idx_workflows_amount ON payment_approval_workflows(min_amount, max_amount);

-- 4. Payment Approval Signatures Table
-- Tracks individual approvals
CREATE TABLE IF NOT EXISTS payment_approval_signatures (
  id SERIAL PRIMARY KEY,
  proposal_id INTEGER REFERENCES payment_proposals(id) ON DELETE CASCADE,
  approver_id INTEGER,
  approver_name VARCHAR(100),
  approver_email VARCHAR(255),
  sequence_number INTEGER,
  -- For sequential approvals
  action VARCHAR(20) NOT NULL,
  -- APPROVED, REJECTED
  comments TEXT,
  signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45)
);

CREATE INDEX IF NOT EXISTS idx_signatures_proposal ON payment_approval_signatures(proposal_id);
CREATE INDEX IF NOT EXISTS idx_signatures_approver ON payment_approval_signatures(approver_id);

-- 5. Payment Exceptions Table
-- Logs validation issues
CREATE TABLE IF NOT EXISTS payment_exceptions (
  id SERIAL PRIMARY KEY,
  proposal_id INTEGER REFERENCES payment_proposals(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES payment_proposal_items(id),
  severity VARCHAR(20) NOT NULL,
  -- CRITICAL, WARNING, INFO
  exception_code VARCHAR(50),
  exception_message TEXT,
  resolution_status VARCHAR(20) DEFAULT 'OPEN',
  -- OPEN, RESOLVED, IGNORED
  resolved_by INTEGER,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exceptions_proposal ON payment_exceptions(proposal_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_severity ON payment_exceptions(severity);
CREATE INDEX IF NOT EXISTS idx_exceptions_status ON payment_exceptions(resolution_status);

-- 6. Payment Audit Logs Table
-- Complete audit trail
CREATE TABLE IF NOT EXISTS payment_audit_logs (
  id SERIAL PRIMARY KEY,
  proposal_id INTEGER REFERENCES payment_proposals(id),
  user_id INTEGER,
  user_name VARCHAR(100),
  action VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_proposal ON payment_audit_logs(proposal_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON payment_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON payment_audit_logs(created_at);

-- Add comments for documentation
COMMENT ON TABLE payment_proposals IS 'Batch payment runs with approval workflow';
COMMENT ON TABLE payment_proposal_items IS 'Individual payments within proposals';
COMMENT ON TABLE payment_approval_workflows IS 'Approval rules by amount range';
COMMENT ON TABLE payment_approval_signatures IS 'Approval/rejection audit trail';
COMMENT ON TABLE payment_exceptions IS 'Validation issues requiring resolution';
COMMENT ON TABLE payment_audit_logs IS 'Complete change history';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Payment Proposal Workflow migration completed';
  RAISE NOTICE '   - Created 6 new tables';
  RAISE NOTICE '   - Created 14 indexes for performance';
END $$;
