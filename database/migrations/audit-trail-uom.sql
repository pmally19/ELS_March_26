-- Migration to add audit trail columns to uom table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'uom' AND column_name = '_tenantId') THEN
        ALTER TABLE uom ADD COLUMN "_tenantId" varchar(3) DEFAULT '001';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'uom' AND column_name = '_deletedAt') THEN
        ALTER TABLE uom ADD COLUMN "_deletedAt" timestamp with time zone;
    END IF;
END $$;
