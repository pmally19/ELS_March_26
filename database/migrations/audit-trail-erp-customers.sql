-- Migration to add audit trail columns to erp_customers table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'erp_customers' AND column_name = '_tenantId') THEN
        ALTER TABLE erp_customers ADD COLUMN "_tenantId" varchar(3) DEFAULT '001';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'erp_customers' AND column_name = '_deletedAt') THEN
        ALTER TABLE erp_customers ADD COLUMN "_deletedAt" timestamp with time zone;
    END IF;
END $$;
