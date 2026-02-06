-- Migration to create purchase_order_documents table for storing documents related to purchase orders
-- Supports: Delivery Note, Billing Note (Invoice), Inspection Document

CREATE TABLE IF NOT EXISTS purchase_order_documents (
    id SERIAL PRIMARY KEY,
    purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('DELIVERY_NOTE', 'BILLING_NOTE', 'INSPECTION_DOCUMENT', 'OTHER')),
    document_name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100),
    description TEXT,
    uploaded_by INTEGER,
    uploaded_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true,
    CONSTRAINT purchase_order_documents_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_purchase_order_documents_po_id ON purchase_order_documents(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_documents_type ON purchase_order_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_purchase_order_documents_active ON purchase_order_documents(active);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_purchase_order_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_purchase_order_documents_updated_at
    BEFORE UPDATE ON purchase_order_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_order_documents_updated_at();

-- Add comments
COMMENT ON TABLE purchase_order_documents IS 'Stores documents related to purchase orders (delivery notes, billing notes, inspection documents)';
COMMENT ON COLUMN purchase_order_documents.document_type IS 'Type of document: DELIVERY_NOTE, BILLING_NOTE, INSPECTION_DOCUMENT, OTHER';
COMMENT ON COLUMN purchase_order_documents.file_path IS 'Path to the uploaded file on the server';
COMMENT ON COLUMN purchase_order_documents.file_size IS 'Size of the file in bytes';

