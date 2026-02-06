-- Purchase Requisition Approval Workflow Schema
-- Migration: 1022-pr-approval-workflow.sql

BEGIN;

-- ============================================
-- 1. CREATE pr_approvals TABLE
-- ============================================
-- Track approval workflow for each PR
CREATE TABLE IF NOT EXISTS pr_approvals (
  id SERIAL PRIMARY KEY,
  pr_id INTEGER NOT NULL REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
  approval_level INTEGER NOT NULL DEFAULT 1,
  approver_id INTEGER,
  approver_name VARCHAR(100),
  required_role VARCHAR(50),  -- 'MANAGER', 'FINANCE', 'DIRECTOR'
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING, APPROVED, REJECTED
  comments TEXT,
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pr_approvals_pr_id ON pr_approvals(pr_id);
CREATE INDEX IF NOT EXISTS idx_pr_approvals_status ON pr_approvals(status);

COMMENT ON TABLE pr_approvals IS 'Tracks approval workflow for purchase requisitions';
COMMENT ON COLUMN pr_approvals.status IS 'Approval status: PENDING, APPROVED, REJECTED';

-- ============================================
-- 2. CREATE pr_history TABLE
-- ============================================
-- Audit trail for all PR changes
CREATE TABLE IF NOT EXISTS pr_history (
  id SERIAL PRIMARY KEY,
  pr_id INTEGER NOT NULL REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,  -- CREATED, SUBMITTED, APPROVED, REJECTED, CONVERTED
  performed_by VARCHAR(100),
  old_status VARCHAR(30),
  new_status VARCHAR(30),
  comments TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pr_history_pr_id ON pr_history(pr_id);
CREATE INDEX IF NOT EXISTS idx_pr_history_action ON pr_history(action);

COMMENT ON TABLE pr_history IS 'Audit trail for all purchase requisition changes';
COMMENT ON COLUMN pr_history.action IS 'Action type: CREATED, SUBMITTED, APPROVED, REJECTED, CONVERTED, MODIFIED';

-- ============================================
-- 3. UPDATE purchase_requisitions TABLE
-- ============================================
-- Add approval-related fields (only if they don't exist)
DO $$ 
BEGIN
  -- Add approval_status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_requisitions' AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE purchase_requisitions ADD COLUMN approval_status VARCHAR(30) DEFAULT 'PENDING';
  END IF;

  -- Add current_approver_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_requisitions' AND column_name = 'current_approver_id'
  ) THEN
    ALTER TABLE purchase_requisitions ADD COLUMN current_approver_id INTEGER;
  END IF;

  -- Add current_approver_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_requisitions' AND column_name = 'current_approver_name'
  ) THEN
    ALTER TABLE purchase_requisitions ADD COLUMN current_approver_name VARCHAR(100);
  END IF;

  -- Add approved_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_requisitions' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE purchase_requisitions ADD COLUMN approved_at TIMESTAMP;
  END IF;

  -- Add rejected_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_requisitions' AND column_name = 'rejected_at'
  ) THEN
    ALTER TABLE purchase_requisitions ADD COLUMN rejected_at TIMESTAMP;
  END IF;

  -- Add converted_to_po_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_requisitions' AND column_name = 'converted_to_po_id'
  ) THEN
    ALTER TABLE purchase_requisitions ADD COLUMN converted_to_po_id INTEGER;
  END IF;

  -- Add rejection_reason
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_requisitions' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE purchase_requisitions ADD COLUMN rejection_reason TEXT;
  END IF;

  -- Add priority if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_requisitions' AND column_name = 'priority'
  ) THEN
    ALTER TABLE purchase_requisitions ADD COLUMN priority VARCHAR(20);
  END IF;

  -- Add department if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_requisitions' AND column_name = 'department'
  ) THEN
    ALTER TABLE purchase_requisitions ADD COLUMN department VARCHAR(100);
  END IF;

  -- Add justification if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_requisitions' AND column_name = 'justification'
  ) THEN
    ALTER TABLE purchase_requisitions ADD COLUMN justification TEXT;
  END IF;

  -- Add project_code if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_requisitions' AND column_name = 'project_code'
  ) THEN
    ALTER TABLE purchase_requisitions ADD COLUMN project_code VARCHAR(50);
  END IF;

  -- Add notes if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_requisitions' AND column_name = 'notes'
  ) THEN
    ALTER TABLE purchase_requisitions ADD COLUMN notes TEXT;
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN purchase_requisitions.approval_status IS 'Overall approval status: PENDING, APPROVED, REJECTED, PARTIALLY_APPROVED';
COMMENT ON COLUMN purchase_requisitions.converted_to_po_id IS 'Link to purchase order if converted';

-- ============================================
-- 4. CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_pr_approval_status ON purchase_requisitions(approval_status);
CREATE INDEX IF NOT EXISTS idx_pr_converted_to_po ON purchase_requisitions(converted_to_po_id);

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ PR Approval Workflow schema created successfully';
  RAISE NOTICE '   - pr_approvals table ready';
  RAISE NOTICE '   - pr_history table ready';
  RAISE NOTICE '   - purchase_requisitions updated with approval fields';
END $$;
