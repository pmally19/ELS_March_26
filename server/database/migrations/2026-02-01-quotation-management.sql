-- ============================================
-- QUOTATION MANAGEMENT - DATABASE MIGRATION
-- ============================================
-- Creates all missing tables and seeds configuration data
-- Run this script to set up the complete quotation management system

-- ============================================
-- PHASE 1: CREATE MISSING TABLES
-- ============================================

-- 1.1 Create quotation_items table (CRITICAL - Referenced by code but doesn't exist!)
CREATE TABLE IF NOT EXISTS quotation_items (
  id SERIAL PRIMARY KEY,
  quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  material_id INTEGER NOT NULL,
  description TEXT,
  quantity NUMERIC(15,3) NOT NULL,
  unit VARCHAR(10) NOT NULL,
  unit_price NUMERIC(15,4) NOT NULL,
  discount_percent NUMERIC(5,2) DEFAULT 0.00,
  net_price NUMERIC(15,4) NOT NULL,
  line_total NUMERIC(15,2) NOT NULL,
  item_category_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_material_id ON quotation_items(material_id);

-- 1.2 Create Text Types Configuration Table
CREATE TABLE IF NOT EXISTS sd_text_types (
  id SERIAL PRIMARY KEY,
  text_type_code VARCHAR(10) UNIQUE NOT NULL,
  description VARCHAR(100) NOT NULL,
  text_level VARCHAR(10) NOT NULL CHECK (text_level IN ('HEADER', 'ITEM')),
  applicable_doc_types JSONB,
  applicable_item_categories JSONB,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 1.3 Create Document Texts Storage Table
CREATE TABLE IF NOT EXISTS sd_document_texts (
  id SERIAL PRIMARY KEY,
  document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('QUOTATION', 'SALES_ORDER')),
  document_id INTEGER NOT NULL,
  item_id INTEGER,
  text_type_id INTEGER NOT NULL REFERENCES sd_text_types(id),
  text_content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sd_document_texts_lookup ON sd_document_texts(document_type, document_id);
CREATE INDEX IF NOT EXISTS idx_sd_document_texts_item ON sd_document_texts(item_id);

-- 1.4 Create Sales Email Templates Table
CREATE TABLE IF NOT EXISTS sd_email_templates (
  id SERIAL PRIMARY KEY,
  template_code VARCHAR(50) UNIQUE NOT NULL,
  template_name VARCHAR(100) NOT NULL,
  from_address VARCHAR(100) NOT NULL,
  subject_template VARCHAR(200) NOT NULL,
  body_template TEXT NOT NULL,
  placeholders JSONB,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 1.5 Create Output Types Table
CREATE TABLE IF NOT EXISTS sd_output_types (
  id SERIAL PRIMARY KEY,
  output_code VARCHAR(10) UNIQUE NOT NULL,
  description VARCHAR(100) NOT NULL,
  document_type_code VARCHAR(50) NOT NULL,
  medium VARCHAR(20) NOT NULL CHECK (medium IN ('EMAIL', 'PRINT', 'BOTH')),
  email_template_id INTEGER REFERENCES sd_email_templates(id),
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================
-- PHASE 2: SEED CONFIGURATION DATA
-- ============================================

-- 2.1 Seed Document Types
INSERT INTO sd_document_types (code, name, category, number_range, is_active)
VALUES
  ('ZQT', 'Sales Quotation', 'SELL', 'QUOTATION', TRUE),
  ('ZOR', 'Sales Order', 'SELL', 'SALES_ORDER', TRUE)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  number_range = EXCLUDED.number_range;

-- 2.2 Seed Item Categories
INSERT INTO sd_item_categories (code, name, item_type, delivery_relevant, billing_relevant, pricing_relevant, is_active)
VALUES
  ('ZAG1', 'Quotation Standard Item', 'STANDARD', FALSE, FALSE, TRUE, TRUE),
  ('ZAG2', 'Quotation Service Item', 'SERVICE', FALSE, FALSE, TRUE, TRUE),
  ('ZTAN', 'Standard Sales Item', 'STANDARD', TRUE, TRUE, TRUE, TRUE),
  ('ZTAS', 'Service Sales Item', 'SERVICE', FALSE, TRUE, TRUE, TRUE)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  item_type = EXCLUDED.item_type,
  delivery_relevant = EXCLUDED.delivery_relevant,
  billing_relevant = EXCLUDED.billing_relevant,
  pricing_relevant = EXCLUDED.pricing_relevant;

-- 2.3 Seed Text Types
INSERT INTO sd_text_types (text_type_code, description, text_level, applicable_doc_types, applicable_item_categories, is_active)
VALUES
  ('ZAB1', 'Customer Additional Information', 'HEADER', '["ZQT", "ZOR"]'::jsonb, NULL, TRUE),
  ('ZIA1', 'Item Additional Information', 'ITEM', '["ZQT", "ZOR"]'::jsonb, '["ZAG1", "ZAG2", "ZTAN", "ZTAS"]'::jsonb, TRUE)
ON CONFLICT (text_type_code) DO UPDATE SET
  description = EXCLUDED.description,
  applicable_doc_types = EXCLUDED.applicable_doc_types,
  applicable_item_categories = EXCLUDED.applicable_item_categories;

-- 2.4 Seed Email Templates
INSERT INTO sd_email_templates (template_code, template_name, from_address, subject_template, body_template, placeholders, is_active)
VALUES
  ('QUOTATION_EMAIL', 'Quotation Email', 'salesrmf@mrf.com', 'Quotation {quotationNumber}',
   'Dear Sir,

Thank you for your interest. As requested, please find attached our quotation printout for requested goods. Our quotation includes a breakdown of costs, including all applicable taxes and fees.

Please let us know if you have any questions or require further information. We look forward to the opportunity to work with you.

Regards,
MRF Sales Department
Cell: 040 1113789',
   '{"quotationNumber": "Quotation number", "customerName": "Customer name", "totalAmount": "Total amount", "validUntil": "Valid until date"}'::jsonb,
   TRUE),
   
  ('ORDER_CONFIRMATION_EMAIL', 'Order Confirmation Email', 'salesrmf@mrf.com', 'Order confirmation {orderNumber}',
   'Hi Sir,

Thank you for your order. This email confirms that we have received your order {orderNumber} dated {orderDate}.

Total Amount: {totalAmount}
Expected Delivery: {deliveryDate}

If you have any questions, feel free to contact us. Thank you for choosing MRF.

Best regards,
MRF Sales Department
Cell: 040 1113789',
   '{"orderNumber": "Order number", "orderDate": "Order date", "totalAmount": "Total amount", "deliveryDate": "Expected delivery date"}'::jsonb,
   TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  template_name = EXCLUDED.template_name,
  subject_template = EXCLUDED.subject_template,
  body_template = EXCLUDED.body_template,
  placeholders = EXCLUDED.placeholders;

-- 2.5 Seed Output Types
INSERT INTO sd_output_types (output_code, description, document_type_code, medium, email_template_id, is_active)
SELECT 'ZAG1', 'Quotation Print/Email', 'ZQT', 'BOTH', t.id, TRUE
FROM sd_email_templates t WHERE t.template_code = 'QUOTATION_EMAIL'
ON CONFLICT (output_code) DO UPDATE SET
  description = EXCLUDED.description,
  email_template_id = EXCLUDED.email_template_id;

INSERT INTO sd_output_types (output_code, description, document_type_code, medium, email_template_id, is_active)
SELECT 'ZAB1', 'Sales Order Confirmation', 'ZOR', 'BOTH', t.id, TRUE
FROM sd_email_templates t WHERE t.template_code = 'ORDER_CONFIRMATION_EMAIL'
ON CONFLICT (output_code) DO UPDATE SET
  description = EXCLUDED.description,
  email_template_id = EXCLUDED.email_template_id;

-- 2.6 Seed Copy Control Rules (if tables have proper structure)
-- Note: Checking if columns exist before inserting
DO $$
BEGIN
  -- Check if sd_copy_control_headers has required columns
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sd_copy_control_headers'
    AND column_name = 'from_doc_type'
  ) THEN
    INSERT INTO sd_copy_control_headers (from_doc_type, to_doc_type, copy_header_text, is_active)
    VALUES ('ZQT', 'ZOR', TRUE, TRUE)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Check if sd_copy_control_items has required columns
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sd_copy_control_items'
    AND column_name = 'from_doc_type'
  ) THEN
    INSERT INTO sd_copy_control_items (from_doc_type, to_doc_type, from_item_category, to_item_category, copy_quantity, copy_price, copy_item_text, is_active)
    VALUES
      ('ZQT', 'ZOR', 'ZAG1', 'ZTAN', TRUE, TRUE, TRUE, TRUE),
      ('ZQT', 'ZOR', 'ZAG2', 'ZTAS', TRUE, TRUE, TRUE, TRUE)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================
-- PHASE 3: VERIFICATION QUERIES
-- ============================================

-- Verify tables created
SELECT 'Tables Created:' AS status;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('quotation_items', 'sd_text_types', 'sd_document_texts', 'sd_email_templates', 'sd_output_types')
ORDER BY table_name;

-- Verify data seeded
SELECT 'Document Types Seeded:' AS status;
SELECT code, name, category FROM sd_document_types WHERE code IN ('ZQT', 'ZOR');

SELECT 'Item Categories Seeded:' AS status;
SELECT code, name, item_type FROM sd_item_categories WHERE code IN ('ZAG1', 'ZAG2', 'ZTAN', 'ZTAS');

SELECT 'Text Types Seeded:' AS status;
SELECT text_type_code, description, text_level FROM sd_text_types;

SELECT 'Email Templates Seeded:' AS status;
SELECT template_code, template_name, from_address FROM sd_email_templates;

SELECT 'Output Types Seeded:' AS status;
SELECT output_code, description, document_type_code, medium FROM sd_output_types;

-- Migration Complete
SELECT '✅ QUOTATION MANAGEMENT MIGRATION COMPLETE!' AS status;
