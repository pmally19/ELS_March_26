-- Migration: Create Document Splitting Configuration Tables
-- Purpose: Create all configuration tables needed for document splitting functionality
-- Database: mallyerp
-- Date: 2025-01-28

-- 1. Item Categories Table - Classify GL accounts for document splitting
CREATE TABLE IF NOT EXISTS document_splitting_item_categories (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category_type VARCHAR(50) NOT NULL, -- BALANCE_SHEET, CUSTOMER, VENDOR, EXPENSE, REVENUE, TAX, etc.
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by INTEGER,
    updated_by INTEGER
);

COMMENT ON TABLE document_splitting_item_categories IS 'Item categories for classifying GL accounts in document splitting';
COMMENT ON COLUMN document_splitting_item_categories.code IS 'Unique item category code';
COMMENT ON COLUMN document_splitting_item_categories.category_type IS 'Type of account category (BALANCE_SHEET, CUSTOMER, VENDOR, EXPENSE, REVENUE, TAX)';

-- 2. GL Account Item Category Assignments
CREATE TABLE IF NOT EXISTS document_splitting_gl_account_categories (
    id SERIAL PRIMARY KEY,
    gl_account_id INTEGER REFERENCES gl_accounts(id) ON DELETE CASCADE,
    gl_account_number VARCHAR(20),
    item_category_id INTEGER NOT NULL REFERENCES document_splitting_item_categories(id) ON DELETE CASCADE,
    chart_of_accounts_id INTEGER REFERENCES chart_of_accounts(id),
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to DATE,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(gl_account_id, item_category_id, valid_from)
);

COMMENT ON TABLE document_splitting_gl_account_categories IS 'Assigns item categories to GL accounts for document splitting';

-- 3. Business Transactions Table
CREATE TABLE IF NOT EXISTS document_splitting_business_transactions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    transaction_type VARCHAR(50) NOT NULL, -- VENDOR_INVOICE, CUSTOMER_INVOICE, PAYMENT, GL_POSTING, etc.
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by INTEGER,
    updated_by INTEGER
);

COMMENT ON TABLE document_splitting_business_transactions IS 'Business transaction types for document splitting';
COMMENT ON COLUMN document_splitting_business_transactions.transaction_type IS 'Type of business transaction (VENDOR_INVOICE, CUSTOMER_INVOICE, PAYMENT, GL_POSTING)';

-- 4. Business Transaction Variants Table
CREATE TABLE IF NOT EXISTS document_splitting_business_transaction_variants (
    id SERIAL PRIMARY KEY,
    business_transaction_id INTEGER NOT NULL REFERENCES document_splitting_business_transactions(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(business_transaction_id, code)
);

COMMENT ON TABLE document_splitting_business_transaction_variants IS 'Variants of business transactions for document splitting';

-- 5. Document Type to Business Transaction Mapping
CREATE TABLE IF NOT EXISTS document_splitting_document_type_mapping (
    id SERIAL PRIMARY KEY,
    document_type VARCHAR(10) NOT NULL,
    business_transaction_id INTEGER NOT NULL REFERENCES document_splitting_business_transactions(id) ON DELETE CASCADE,
    business_transaction_variant_id INTEGER REFERENCES document_splitting_business_transaction_variants(id) ON DELETE SET NULL,
    company_code_id INTEGER REFERENCES company_codes(id),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(document_type, company_code_id)
);

COMMENT ON TABLE document_splitting_document_type_mapping IS 'Maps document types to business transactions for splitting';

-- 6. Document Splitting Methods Table
CREATE TABLE IF NOT EXISTS document_splitting_methods (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    method_type VARCHAR(50) NOT NULL, -- ACTIVE, PASSIVE, ZERO_BALANCE
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

COMMENT ON TABLE document_splitting_methods IS 'Document splitting methods (ACTIVE, PASSIVE, ZERO_BALANCE)';

-- 7. Document Splitting Rules Table
CREATE TABLE IF NOT EXISTS document_splitting_rules (
    id SERIAL PRIMARY KEY,
    business_transaction_id INTEGER NOT NULL REFERENCES document_splitting_business_transactions(id) ON DELETE CASCADE,
    business_transaction_variant_id INTEGER REFERENCES document_splitting_business_transaction_variants(id) ON DELETE SET NULL,
    splitting_method_id INTEGER NOT NULL REFERENCES document_splitting_methods(id) ON DELETE CASCADE,
    rule_name VARCHAR(100) NOT NULL,
    description TEXT,
    source_item_category_id INTEGER NOT NULL REFERENCES document_splitting_item_categories(id) ON DELETE CASCADE,
    target_item_category_id INTEGER REFERENCES document_splitting_item_categories(id) ON DELETE SET NULL,
    priority INTEGER DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

COMMENT ON TABLE document_splitting_rules IS 'Rules that determine how documents are split';
COMMENT ON COLUMN document_splitting_rules.source_item_category_id IS 'Item category that will be split';
COMMENT ON COLUMN document_splitting_rules.target_item_category_id IS 'Item category from which to derive account assignment (if null, derives from all assigned items)';

-- 8. Zero Balance Clearing Accounts Table
CREATE TABLE IF NOT EXISTS document_splitting_zero_balance_accounts (
    id SERIAL PRIMARY KEY,
    ledger_id INTEGER NOT NULL REFERENCES ledgers(id) ON DELETE CASCADE,
    company_code_id INTEGER REFERENCES company_codes(id),
    gl_account_id INTEGER NOT NULL REFERENCES gl_accounts(id) ON DELETE CASCADE,
    gl_account_number VARCHAR(20) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(ledger_id, company_code_id)
);

COMMENT ON TABLE document_splitting_zero_balance_accounts IS 'Zero balance clearing accounts for document splitting';

-- 9. Document Splitting Characteristics Table
CREATE TABLE IF NOT EXISTS document_splitting_characteristics (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    characteristic_type VARCHAR(50) NOT NULL, -- PROFIT_CENTER, BUSINESS_AREA, SEGMENT, COST_CENTER
    field_name VARCHAR(50) NOT NULL, -- profit_center, business_area, segment, cost_center
    requires_zero_balance BOOLEAN DEFAULT FALSE NOT NULL,
    is_mandatory BOOLEAN DEFAULT FALSE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

COMMENT ON TABLE document_splitting_characteristics IS 'Characteristics used for document splitting (Profit Center, Business Area, Segment, etc.)';

-- 10. Document Splitting Constants Table
CREATE TABLE IF NOT EXISTS document_splitting_constants (
    id SERIAL PRIMARY KEY,
    ledger_id INTEGER NOT NULL REFERENCES ledgers(id) ON DELETE CASCADE,
    company_code_id INTEGER REFERENCES company_codes(id),
    characteristic_id INTEGER NOT NULL REFERENCES document_splitting_characteristics(id) ON DELETE CASCADE,
    constant_value VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(ledger_id, company_code_id, characteristic_id)
);

COMMENT ON TABLE document_splitting_constants IS 'Default values for non-assigned processes in document splitting';

-- 11. Document Splitting Activation Table
CREATE TABLE IF NOT EXISTS document_splitting_activation (
    id SERIAL PRIMARY KEY,
    ledger_id INTEGER NOT NULL REFERENCES ledgers(id) ON DELETE CASCADE,
    company_code_id INTEGER REFERENCES company_codes(id),
    is_active BOOLEAN DEFAULT FALSE NOT NULL,
    enable_inheritance BOOLEAN DEFAULT TRUE NOT NULL,
    enable_standard_assignment BOOLEAN DEFAULT TRUE NOT NULL,
    splitting_method_id INTEGER REFERENCES document_splitting_methods(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(ledger_id, company_code_id)
);

COMMENT ON TABLE document_splitting_activation IS 'Activation settings for document splitting per ledger and company code';
COMMENT ON COLUMN document_splitting_activation.enable_inheritance IS 'Enable inheritance of account assignments from other line items';
COMMENT ON COLUMN document_splitting_activation.enable_standard_assignment IS 'Enable standard account assignment using constants';

-- 12. Split Documents Tracking Table
CREATE TABLE IF NOT EXISTS document_splitting_split_documents (
    id SERIAL PRIMARY KEY,
    original_document_id INTEGER NOT NULL REFERENCES accounting_documents(id) ON DELETE CASCADE,
    split_document_id INTEGER NOT NULL REFERENCES accounting_documents(id) ON DELETE CASCADE,
    characteristic_id INTEGER REFERENCES document_splitting_characteristics(id),
    characteristic_value VARCHAR(100),
    split_ratio DECIMAL(10, 6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(original_document_id, split_document_id)
);

COMMENT ON TABLE document_splitting_split_documents IS 'Tracks relationship between original and split documents';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ds_gl_account_categories_account ON document_splitting_gl_account_categories(gl_account_id);
CREATE INDEX IF NOT EXISTS idx_ds_gl_account_categories_category ON document_splitting_gl_account_categories(item_category_id);
CREATE INDEX IF NOT EXISTS idx_ds_doc_type_mapping_type ON document_splitting_document_type_mapping(document_type);
CREATE INDEX IF NOT EXISTS idx_ds_doc_type_mapping_transaction ON document_splitting_document_type_mapping(business_transaction_id);
CREATE INDEX IF NOT EXISTS idx_ds_rules_transaction ON document_splitting_rules(business_transaction_id);
CREATE INDEX IF NOT EXISTS idx_ds_rules_method ON document_splitting_rules(splitting_method_id);
CREATE INDEX IF NOT EXISTS idx_ds_zero_balance_ledger ON document_splitting_zero_balance_accounts(ledger_id);
CREATE INDEX IF NOT EXISTS idx_ds_activation_ledger ON document_splitting_activation(ledger_id);
CREATE INDEX IF NOT EXISTS idx_ds_split_docs_original ON document_splitting_split_documents(original_document_id);
CREATE INDEX IF NOT EXISTS idx_ds_split_docs_split ON document_splitting_split_documents(split_document_id);

