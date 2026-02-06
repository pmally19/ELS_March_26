-- Migration: Add purchase_organization_id to vendors table
-- Date: 2025-11-09
-- Description: Adds purchase_organization_id column to vendors table to link vendors to purchase organizations

-- Add purchase_organization_id column to vendors table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'vendors' 
        AND column_name = 'purchase_organization_id'
    ) THEN
        ALTER TABLE public.vendors 
        ADD COLUMN purchase_organization_id INTEGER;
        
        -- Add foreign key constraint if purchase_organizations table exists
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'purchase_organizations'
        ) THEN
            ALTER TABLE public.vendors 
            ADD CONSTRAINT fk_vendors_purchase_organization 
                FOREIGN KEY (purchase_organization_id) 
                REFERENCES public.purchase_organizations(id) 
                ON DELETE SET NULL;
        END IF;
        
        RAISE NOTICE 'Added purchase_organization_id column to vendors table';
    ELSE
        RAISE NOTICE 'Column purchase_organization_id already exists in vendors table';
    END IF;
END $$;

