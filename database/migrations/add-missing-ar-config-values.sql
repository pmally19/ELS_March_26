-- Add Missing AR Configuration Values
-- This ensures all required configuration values are present

-- AR Status Values
INSERT INTO system_configuration (config_key, config_value, description, active, created_at, updated_at)
VALUES 
  ('ar_status_open', 'Open', 'Status for newly created AR open items', true, NOW(), NOW()),
  ('ar_status_partial', 'Partial', 'Status for AR open items that have been partially paid', true, NOW(), NOW()),
  ('ar_status_cleared', 'Cleared', 'Status for AR open items that have been fully paid', true, NOW(), NOW()),
  ('ar_open_item_initial_status', 'Open', 'Initial status for newly created AR open items when billing is posted', true, NOW(), NOW()),
  ('ar_open_item_default_active', 'true', 'Default active flag for AR open items', true, NOW(), NOW())
ON CONFLICT (config_key) 
DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  active = true,
  updated_at = NOW();

-- Payment Configuration
INSERT INTO system_configuration (config_key, config_value, description, active, created_at, updated_at)
VALUES 
  ('payment_document_type', 'DZ', 'Document type for customer payment accounting documents', true, NOW(), NOW()),
  ('clearing_document_type', 'CL', 'Document type for AR clearing accounting documents', true, NOW(), NOW()),
  ('default_payment_method', 'BANK_TRANSFER', 'Default payment method if not specified', true, NOW(), NOW()),
  ('payment_posting_status', 'POSTED', 'Default posting status for customer payments', true, NOW(), NOW()),
  ('auto_create_clearing_documents', 'true', 'Automatically create clearing documents when items are cleared', true, NOW(), NOW())
ON CONFLICT (config_key) 
DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  active = true,
  updated_at = NOW();

-- Currency and User
INSERT INTO system_configuration (config_key, config_value, description, active, created_at, updated_at)
VALUES 
  ('default_currency', 'USD', 'Default currency code if not specified', true, NOW(), NOW()),
  ('system_user_id', '1', 'System user ID for automated transactions', true, NOW(), NOW())
ON CONFLICT (config_key) 
DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  active = true,
  updated_at = NOW();

-- Aging Buckets
INSERT INTO system_configuration (config_key, config_value, description, active, created_at, updated_at)
VALUES 
  ('aging_bucket_current', 'Current', 'Aging bucket for invoices not yet due', true, NOW(), NOW()),
  ('aging_bucket_30_days', '30Days', 'Aging bucket for invoices 1-30 days overdue', true, NOW(), NOW()),
  ('aging_bucket_60_days', '60Days', 'Aging bucket for invoices 31-60 days overdue', true, NOW(), NOW()),
  ('aging_bucket_90_days', '90Days', 'Aging bucket for invoices 61-90 days overdue', true, NOW(), NOW()),
  ('aging_bucket_over_90', 'Over90', 'Aging bucket for invoices over 90 days overdue', true, NOW(), NOW())
ON CONFLICT (config_key) 
DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  active = true,
  updated_at = NOW();

-- Verify
SELECT config_key, config_value, active 
FROM system_configuration 
WHERE config_key LIKE 'ar_%' OR config_key LIKE 'payment_%' OR config_key LIKE 'clearing_%' 
   OR config_key LIKE 'aging_%' OR config_key IN ('default_currency', 'system_user_id', 'auto_create_clearing_documents')
ORDER BY config_key;

