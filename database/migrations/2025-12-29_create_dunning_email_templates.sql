-- Migration: Create Dunning Email Templates Table
-- Description: Creates table for storing dunning email templates
-- Date: 2025-12-29

-- Create email templates table
CREATE TABLE IF NOT EXISTS dunning_email_templates (
  id SERIAL PRIMARY KEY,
  template_code VARCHAR(20) UNIQUE NOT NULL,
  dunning_level INTEGER NOT NULL,
  language_code VARCHAR(5) NOT NULL DEFAULT 'en',
  subject VARCHAR(200) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_template_level_lang UNIQUE (dunning_level, language_code)
);

-- Create run log table
CREATE TABLE IF NOT EXISTS dunning_run_log (
  id SERIAL PRIMARY KEY,
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  run_type VARCHAR(20) NOT NULL, -- 'manual' or 'scheduled'
  procedure_id INTEGER REFERENCES dunning_procedures(id),
  notices_generated INTEGER DEFAULT 0,
  total_amount NUMERIC(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'running',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT
);

-- Add updated_at to dunning_history
ALTER TABLE dunning_history 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(50),
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS letter_sent_at TIMESTAMP;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_dunning_history_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_dunning_history_timestamp ON dunning_history;
CREATE TRIGGER trigger_update_dunning_history_timestamp
  BEFORE UPDATE ON dunning_history
  FOR EACH ROW
  EXECUTE FUNCTION update_dunning_history_timestamp();

-- Insert default email templates
INSERT INTO dunning_email_templates (template_code, dunning_level, subject, body_html, body_text)
VALUES 
  ('LEVEL1', 1, 'Payment Reminder - Invoice Overdue', 
   '<p>Dear [CustomerName],</p><p>This is a friendly reminder that your payment of <strong>[Amount]</strong> is now overdue by [DaysOverdue] days.</p><p>Please arrange payment at your earliest convenience.</p><p>Best regards,<br>Accounts Team</p>',
   'Dear [CustomerName], This is a friendly reminder that your payment of [Amount] is now overdue by [DaysOverdue] days. Please arrange payment at your earliest convenience. Best regards, Accounts Team'),
  
  ('LEVEL2', 2, 'Second Payment Reminder - Immediate Action Required',
   '<p>Dear [CustomerName],</p><p>This is your <strong>second reminder</strong> regarding the overdue payment of <strong>[Amount]</strong>.</p><p>Your account is now [DaysOverdue] days overdue. Please remit payment immediately to avoid further action.</p><p>Regards,<br>Accounts Team</p>',
   'Dear [CustomerName], This is your second reminder regarding the overdue payment of [Amount]. Your account is now [DaysOverdue] days overdue. Please remit payment immediately. Regards, Accounts Team'),
  
  ('LEVEL3', 3, 'FINAL NOTICE - Payment Required',
   '<p>Dear [CustomerName],</p><p><strong>FINAL NOTICE</strong></p><p>Your account balance of <strong>[Amount]</strong> is now [DaysOverdue] days overdue.</p><p>If payment is not received within 5 business days, your account will be placed on credit hold and you will not be able to place new orders.</p><p>Please contact us immediately if you have any questions.</p><p>Accounts Department</p>',
   'Dear [CustomerName], FINAL NOTICE: Your account balance of [Amount] is now [DaysOverdue] days overdue. If payment is not received within 5 business days, your account will be credit blocked. Accounts Department'),
  
  ('LEVEL4', 4, 'Account Blocked - Legal Action Pending',
   '<p>Dear [CustomerName],</p><p><strong>ACCOUNT BLOCKED - LEGAL ACTION PENDING</strong></p><p>Your account with an outstanding balance of <strong>[Amount]</strong> has been blocked due to non-payment ([DaysOverdue] days overdue).</p><p>Unless payment is received immediately, this matter will be referred to our legal department for collection proceedings.</p><p>Please contact us urgently.</p><p>Collections Department</p>',
   'Dear [CustomerName], ACCOUNT BLOCKED - LEGAL ACTION PENDING. Outstanding balance: [Amount], [DaysOverdue] days overdue. Immediate payment required to avoid legal action. Collections Department')
ON CONFLICT (dunning_level, language_code) DO NOTHING;

-- Add comments
COMMENT ON TABLE dunning_email_templates IS 'Email templates for dunning notices at different levels';
COMMENT ON TABLE dunning_run_log IS 'Log of automated and manual dunning runs';
COMMENT ON COLUMN dunning_email_templates.template_code IS 'Unique identifier for the template';
COMMENT ON COLUMN dunning_email_templates.dunning_level IS 'Dunning level (1-4) this template applies to';
COMMENT ON COLUMN dunning_run_log.run_type IS 'Type of run: manual or scheduled';
