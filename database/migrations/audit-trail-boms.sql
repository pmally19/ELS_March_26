-- Migration script to add audit trail columns to bill_of_materials table

-- Add columns
ALTER TABLE bill_of_materials
ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS "_tenantId" varchar(3) DEFAULT '001',
ADD COLUMN IF NOT EXISTS "_deletedAt" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "created_by" integer,
ADD COLUMN IF NOT EXISTS "updated_by" integer;
