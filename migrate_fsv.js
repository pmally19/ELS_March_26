import { Client } from 'pg';

const connectionString = 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp';

async function runMigration() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to database successfully. Running FSV migrations...');

    // 1. Create financial_statement_versions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS financial_statement_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        chart_of_accounts_id UUID,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
      );
    `);
    console.log('✅ Created financial_statement_versions table');

    // 2. Create fsv_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS fsv_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fsv_id UUID NOT NULL REFERENCES financial_statement_versions(id) ON DELETE CASCADE,
        parent_item_id UUID REFERENCES fsv_items(id) ON DELETE CASCADE,
        item_name TEXT NOT NULL,
        item_type TEXT NOT NULL,
        start_of_group_text TEXT,
        end_of_group_text TEXT,
        display_total_flag BOOLEAN NOT NULL DEFAULT true,
        graduated_total_text TEXT,
        display_graduated_total_flag BOOLEAN NOT NULL DEFAULT false,
        sign_change_indicator BOOLEAN NOT NULL DEFAULT false,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
      );
    `);
    console.log('✅ Created fsv_items table');

    // 3. Create fsv_account_assignments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS fsv_account_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fsv_item_id UUID NOT NULL REFERENCES fsv_items(id) ON DELETE CASCADE,
        from_account TEXT NOT NULL,
        to_account TEXT NOT NULL,
        debit_indicator BOOLEAN NOT NULL DEFAULT true,
        credit_indicator BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
      );
    `);
    console.log('✅ Created fsv_account_assignments table');

    console.log('🎉 All FSV tables created successfully!');

  } catch (err) {
    console.error('❌ Error running migrations:', err);
  } finally {
    await client.end();
  }
}

runMigration();
