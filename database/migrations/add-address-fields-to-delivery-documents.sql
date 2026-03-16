-- Migration: Add Address Fields to Delivery Documents
-- Date: 2024-10-15
-- Description: Add delivery address fields to delivery_documents table to properly store delivery addresses from sales orders

-- Add address fields to delivery_documents table
ALTER TABLE delivery_documents ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE delivery_documents ADD COLUMN IF NOT EXISTS delivery_contact_person VARCHAR(100);
ALTER TABLE delivery_documents ADD COLUMN IF NOT EXISTS delivery_phone VARCHAR(30);
ALTER TABLE delivery_documents ADD COLUMN IF NOT EXISTS delivery_email VARCHAR(100);
ALTER TABLE delivery_documents ADD COLUMN IF NOT EXISTS delivery_city VARCHAR(100);
ALTER TABLE delivery_documents ADD COLUMN IF NOT EXISTS delivery_state VARCHAR(50);
ALTER TABLE delivery_documents ADD COLUMN IF NOT EXISTS delivery_country VARCHAR(50);
ALTER TABLE delivery_documents ADD COLUMN IF NOT EXISTS delivery_postal_code VARCHAR(20);

-- Add address ID references for proper address management
ALTER TABLE delivery_documents ADD COLUMN IF NOT EXISTS ship_to_address_id INTEGER;
ALTER TABLE delivery_documents ADD COLUMN IF NOT EXISTS bill_to_address_id INTEGER;

-- Add foreign key constraints for address references
ALTER TABLE delivery_documents 
ADD CONSTRAINT fk_delivery_documents_ship_to_address 
FOREIGN KEY (ship_to_address_id) REFERENCES customer_addresses(id) ON DELETE SET NULL;

ALTER TABLE delivery_documents 
ADD CONSTRAINT fk_delivery_documents_bill_to_address 
FOREIGN KEY (bill_to_address_id) REFERENCES customer_addresses(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_delivery_documents_ship_to_address_id ON delivery_documents(ship_to_address_id);
CREATE INDEX IF NOT EXISTS idx_delivery_documents_bill_to_address_id ON delivery_documents(bill_to_address_id);
CREATE INDEX IF NOT EXISTS idx_delivery_documents_delivery_city ON delivery_documents(delivery_city);
CREATE INDEX IF NOT EXISTS idx_delivery_documents_delivery_country ON delivery_documents(delivery_country);

-- Add comments for documentation
COMMENT ON COLUMN delivery_documents.delivery_address IS 'Full delivery address text from sales order';
COMMENT ON COLUMN delivery_documents.delivery_contact_person IS 'Contact person for delivery';
COMMENT ON COLUMN delivery_documents.delivery_phone IS 'Phone number for delivery contact';
COMMENT ON COLUMN delivery_documents.delivery_email IS 'Email for delivery contact';
COMMENT ON COLUMN delivery_documents.delivery_city IS 'Delivery address city';
COMMENT ON COLUMN delivery_documents.delivery_state IS 'Delivery address state/province';
COMMENT ON COLUMN delivery_documents.delivery_country IS 'Delivery address country';
COMMENT ON COLUMN delivery_documents.delivery_postal_code IS 'Delivery address postal code';
COMMENT ON COLUMN delivery_documents.ship_to_address_id IS 'Reference to ship-to address in customer_addresses';
COMMENT ON COLUMN delivery_documents.bill_to_address_id IS 'Reference to bill-to address in customer_addresses';
