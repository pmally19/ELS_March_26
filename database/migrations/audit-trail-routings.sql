-- Migration script to add audit trail columns to routing_master table

-- Add columns
ALTER TABLE routing_master
ADD COLUMN IF NOT EXISTS "_tenantId" varchar(3) DEFAULT '001',
ADD COLUMN IF NOT EXISTS "_deletedAt" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "updated_by" integer;
