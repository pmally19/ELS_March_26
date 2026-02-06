-- Migration: Create vendor_payments table
-- Description: Creates vendor_payments table for tracking vendor payments from purchase orders
-- Date: 2025-11-01

-- Create vendor_payments table
CREATE TABLE IF NOT EXISTS vendor_payments (
  id SERIAL PRIMARY KEY,
  payment_number VARCHAR(50) NOT NULL UNIQUE,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id),
  purchase_order_id INTEGER REFERENCES purchase_orders(id),
  invoice_id INTEGER REFERENCES accounts_payable(id),
  payment_amount DECIMAL(15,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL, -- CHECK, BANK_TRANSFER, ONLINE_TRANSFER, WIRE_TRANSFER
  payment_date DATE NOT NULL,
  value_date DATE,
  bank_account_id INTEGER REFERENCES bank_accounts(id),
  reference VARCHAR(255), -- Check number, transfer reference, transaction ID, etc.
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PROCESSED, POSTED, CANCELLED
  accounting_document_number VARCHAR(50),
  company_code_id INTEGER NOT NULL REFERENCES company_codes(id),
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  CONSTRAINT vendor_payments_amount_check CHECK (payment_amount > 0),
  CONSTRAINT vendor_payments_status_check CHECK (status IN ('PENDING', 'PROCESSED', 'POSTED', 'CANCELLED'))
);

-- Create index on vendor_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor_id ON vendor_payments(vendor_id);

-- Create index on purchase_order_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_vendor_payments_purchase_order_id ON vendor_payments(purchase_order_id);

-- Create index on invoice_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_vendor_payments_invoice_id ON vendor_payments(invoice_id);

-- Create index on bank_account_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_vendor_payments_bank_account_id ON vendor_payments(bank_account_id);

-- Create index on payment_date for reporting
CREATE INDEX IF NOT EXISTS idx_vendor_payments_payment_date ON vendor_payments(payment_date);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_vendor_payments_status ON vendor_payments(status);

-- Create index on payment_number for unique lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_payments_payment_number ON vendor_payments(payment_number);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vendor_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vendor_payments_updated_at
  BEFORE UPDATE ON vendor_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_vendor_payments_updated_at();

-- Add comments for documentation
COMMENT ON TABLE vendor_payments IS 'Vendor payments table for tracking payments made to vendors for purchase orders';
COMMENT ON COLUMN vendor_payments.payment_number IS 'Unique payment number (e.g., PAY-20251101-001)';
COMMENT ON COLUMN vendor_payments.vendor_id IS 'Reference to vendor master data';
COMMENT ON COLUMN vendor_payments.purchase_order_id IS 'Reference to purchase order (optional, can pay multiple POs)';
COMMENT ON COLUMN vendor_payments.invoice_id IS 'Reference to accounts payable invoice';
COMMENT ON COLUMN vendor_payments.payment_amount IS 'Payment amount (must be > 0)';
COMMENT ON COLUMN vendor_payments.payment_method IS 'Payment method: CHECK, BANK_TRANSFER, ONLINE_TRANSFER, WIRE_TRANSFER';
COMMENT ON COLUMN vendor_payments.payment_date IS 'Payment date (when payment is made)';
COMMENT ON COLUMN vendor_payments.value_date IS 'Value date (when payment clears/executes)';
COMMENT ON COLUMN vendor_payments.bank_account_id IS 'Reference to bank account used for payment';
COMMENT ON COLUMN vendor_payments.reference IS 'Payment reference (check number, transfer reference, transaction ID)';
COMMENT ON COLUMN vendor_payments.currency IS 'Payment currency (ISO 3-letter code)';
COMMENT ON COLUMN vendor_payments.status IS 'Payment status: PENDING, PROCESSED, POSTED, CANCELLED';
COMMENT ON COLUMN vendor_payments.accounting_document_number IS 'Reference to accounting document (GL document number)';
COMMENT ON COLUMN vendor_payments.company_code_id IS 'Reference to company code';
COMMENT ON COLUMN vendor_payments.notes IS 'Additional notes or remarks';

-- Grant permissions (adjust as needed for your database setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON vendor_payments TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE vendor_payments_id_seq TO your_app_user;

