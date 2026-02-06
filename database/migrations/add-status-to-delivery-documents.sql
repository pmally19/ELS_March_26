-- Migration: Add status column to delivery_documents table
-- Date: 2025-11-23
-- Purpose: Add status column to track delivery document status (PENDING, CONFIRMED, COMPLETED, etc.)

DO $$
BEGIN
  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_documents' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE delivery_documents 
    ADD COLUMN status VARCHAR(20) DEFAULT 'PENDING';
    
    -- Update existing records based on pgi_status or other indicators
    -- If pgi_status is 'OPEN', set status to 'PENDING'
    -- If pgi_status is 'POSTED', set status to 'COMPLETED'
    UPDATE delivery_documents 
    SET status = CASE 
      WHEN pgi_status = 'POSTED' THEN 'COMPLETED'
      WHEN pgi_status = 'OPEN' THEN 'PENDING'
      ELSE 'PENDING'
    END
    WHERE status IS NULL;
    
    RAISE NOTICE 'Added status column to delivery_documents table';
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_delivery_documents_status 
ON delivery_documents(status);

-- Add comment
COMMENT ON COLUMN delivery_documents.status IS 'Delivery status: PENDING, CONFIRMED, COMPLETED, CANCELLED';

