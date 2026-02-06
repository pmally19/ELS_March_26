
import { pool } from "../db";

async function migrate() {
    try {
        console.log("Starting migration...");

        // Add customer_assignment_group_id column
        await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'account_determination_mapping' 
          AND column_name = 'customer_assignment_group_id'
        ) THEN 
          ALTER TABLE account_determination_mapping ADD COLUMN customer_assignment_group_id INTEGER;
          CREATE INDEX idx_account_det_mapping_cust_grp ON account_determination_mapping(customer_assignment_group_id);
          RAISE NOTICE 'Added customer_assignment_group_id column';
        ELSE
            RAISE NOTICE 'customer_assignment_group_id column already exists';
        END IF;
      END $$;
    `);

        // Add material_assignment_group_id column
        await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'account_determination_mapping' 
          AND column_name = 'material_assignment_group_id'
        ) THEN 
          ALTER TABLE account_determination_mapping ADD COLUMN material_assignment_group_id INTEGER;
          CREATE INDEX idx_account_det_mapping_mat_grp ON account_determination_mapping(material_assignment_group_id);
          RAISE NOTICE 'Added material_assignment_group_id column';
        ELSE
            RAISE NOTICE 'material_assignment_group_id column already exists';
        END IF;
      END $$;
    `);

        // Update unique constraint
        await pool.query(`
      DO $$
      BEGIN
        ALTER TABLE account_determination_mapping DROP CONSTRAINT IF EXISTS uq_account_determination;
        ALTER TABLE account_determination_mapping 
        ADD CONSTRAINT uq_account_determination 
        UNIQUE (account_key_code, business_scenario, sales_area_id, customer_assignment_group_id, material_assignment_group_id);
        RAISE NOTICE 'Updated unique constraint';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not update unique constraint: %', SQLERRM;
      END $$;
    `);

        console.log("Migration completed successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

migrate();
