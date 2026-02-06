-- Fix AUC Cost Tracking Foreign Key
-- This script updates the foreign key constraint to point to the new auc_master table

DO $$
DECLARE
    fk_name text;
BEGIN
    -- Find the existing foreign key constraint name for auc_asset_id
    SELECT constraint_name INTO fk_name
    FROM information_schema.key_column_usage
    WHERE table_name = 'auc_cost_tracking'
      AND column_name = 'auc_asset_id';

    -- Drop the existing constraint if found
    IF fk_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE auc_cost_tracking DROP CONSTRAINT ' || fk_name;
    END IF;

    -- Add the new constraint referencing auc_master
    ALTER TABLE auc_cost_tracking 
    ADD CONSTRAINT auc_cost_tracking_auc_asset_id_fkey 
    FOREIGN KEY (auc_asset_id) REFERENCES auc_master(id);
    
END $$;
