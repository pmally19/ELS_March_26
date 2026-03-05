const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'mallyerp', user: 'postgres', password: 'Mokshith@21' });

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // ── 1. ALTER movement_types: add missing SAP T156 context fields ──────────
        console.log('Adding context fields to movement_types...');
        await client.query(`
      ALTER TABLE movement_types
        ADD COLUMN IF NOT EXISTS movement_indicator         VARCHAR(1),    -- KZBEW: 'B'=PO, 'F'=Order, 'L'=Delivery, ' '=Other
        ADD COLUMN IF NOT EXISTS reversal_movement_type     VARCHAR(10),   -- e.g. 101→102
        ADD COLUMN IF NOT EXISTS account_modifier           VARCHAR(10),   -- e.g. VBR, VAX (for GBB differentiation)
        ADD COLUMN IF NOT EXISTS reference_document_required VARCHAR(30)  DEFAULT 'NONE',  -- 'PO','PROD_ORDER','NONE','COST_CENTER'
        ADD COLUMN IF NOT EXISTS account_assignment_mandatory VARCHAR(20) DEFAULT 'NONE',  -- 'COST_CENTER','ORDER','NONE'
        ADD COLUMN IF NOT EXISTS print_control              VARCHAR(1)    DEFAULT 'N',     -- 'N'=No slip, 'P'=Print slip
        ADD COLUMN IF NOT EXISTS reason_code_required       BOOLEAN       DEFAULT false,   -- Force reason (scrap/adjustment)
        ADD COLUMN IF NOT EXISTS screen_layout_variant      VARCHAR(20),                   -- Field selection variant
        ADD COLUMN IF NOT EXISTS create_fi_document         BOOLEAN       DEFAULT true,    -- Posting String
        ADD COLUMN IF NOT EXISTS create_material_document   BOOLEAN       DEFAULT true     -- Posting String
    `);
        console.log('✅ movement_types context fields added');

        // ── 2. CREATE movement_posting_rules (SAP T156S equivalent) ───────────────
        // Dynamic determination: Mvt Type + Special Stock + Mvt Indicator → Value String
        console.log('Creating movement_posting_rules table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS movement_posting_rules (
        id                   SERIAL PRIMARY KEY,
        movement_type_id     INTEGER NOT NULL REFERENCES movement_types(id) ON DELETE CASCADE,
        special_stock_ind    VARCHAR(1)  DEFAULT '',   -- '' = standard, 'K'=consignment, 'O'=project, 'E'=SO stock
        movement_ind         VARCHAR(1)  DEFAULT '',   -- '' = any, 'B'=PO, 'F'=Order
        value_string         VARCHAR(10) NOT NULL,     -- e.g. WE01, WA01, WA08
        quantity_update      BOOLEAN     DEFAULT true,
        value_update         BOOLEAN     DEFAULT true,
        consumption_posting  VARCHAR(1)  DEFAULT '',   -- 'V'=consumption, 'A'=asset, ''=stock
        is_active            BOOLEAN     DEFAULT true,
        created_at           TIMESTAMP   DEFAULT NOW(),
        updated_at           TIMESTAMP   DEFAULT NOW(),
        UNIQUE(movement_type_id, special_stock_ind, movement_ind)
      )
    `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_mpr_movement_type ON movement_posting_rules(movement_type_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_mpr_special_stock ON movement_posting_rules(special_stock_ind)`);
        console.log('✅ movement_posting_rules table created');

        // ── 3. CREATE movement_type_value_strings (Value String → Transaction Keys) ──
        console.log('Creating movement_type_value_strings table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS movement_type_value_strings (
        id                SERIAL PRIMARY KEY,
        value_string      VARCHAR(10) NOT NULL,   -- e.g. WE01, WA01, WA08
        transaction_key   VARCHAR(10) NOT NULL,   -- BSX, WRX, PRD, GBB, AUM, etc.
        debit_credit      VARCHAR(1)  NOT NULL,   -- 'D' or 'C'
        account_modifier  VARCHAR(10) DEFAULT '',  -- e.g. VBR (only for GBB)
        description       TEXT,
        sort_order        INTEGER     DEFAULT 0,
        is_active         BOOLEAN     DEFAULT true,
        UNIQUE(value_string, transaction_key, debit_credit, account_modifier)
      )
    `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_mtvs_value_string ON movement_type_value_strings(value_string)`);
        console.log('✅ movement_type_value_strings table created');

        // ── 4. CREATE movement_type_allowed_transactions ───────────────────────────
        console.log('Creating movement_type_allowed_transactions table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS movement_type_allowed_transactions (
        id                SERIAL PRIMARY KEY,
        movement_type_id  INTEGER NOT NULL REFERENCES movement_types(id) ON DELETE CASCADE,
        transaction_code  VARCHAR(20) NOT NULL,   -- MIGO, MB01, MIRO, MFBF
        description       TEXT,
        is_active         BOOLEAN     DEFAULT true,
        UNIQUE(movement_type_id, transaction_code)
      )
    `);
        console.log('✅ movement_type_allowed_transactions table created');

        // ── 5. SEED: Value String → Transaction Key mappings ──────────────────────
        console.log('Seeding value string → transaction key mappings...');
        await client.query(`
      INSERT INTO movement_type_value_strings (value_string, transaction_key, debit_credit, account_modifier, description, sort_order)
      VALUES
        -- WE01: GR from PO (standard stock) → BSX(Dr) + WRX(Cr) + PRD(Dr/Cr)
        ('WE01', 'BSX', 'D', '',    'Inventory or stock account (GR from PO)',  1),
        ('WE01', 'WRX', 'C', '',    'GR/IR clearing account',                  2),
        ('WE01', 'PRD', 'D', '',    'Price difference (if invoice <> PO)',      3),
        -- WA01: GR for consignment / special stock
        ('WA01', 'BSX', 'D', '',    'Inventory (consignment GR)',               1),
        ('WA01', 'GBB', 'C', '',    'Offset entry - consignment',               2),
        -- WA08: Goods Issue to cost center (201)
        ('WA08', 'BSX', 'C', '',    'Inventory credit (GI)',                    1),
        ('WA08', 'GBB', 'D', 'VBR', 'Cost center consumption',                  2),
        -- WA09: Goods Issue for production order (261)
        ('WA09', 'BSX', 'C', '',    'Inventory credit (GI to production)',      1),
        ('WA09', 'GBB', 'D', 'VAX', 'Production order consumption',             2),
        -- WA10: Goods Issue scrapping (551)
        ('WA10', 'BSX', 'C', '',    'Inventory credit (scrapping)',             1),
        ('WA10', 'GBB', 'D', 'VNG', 'Scrapping loss',                           2),
        -- WE04: GR reversal (102) - reverse of WE01
        ('WE04', 'BSX', 'C', '',    'Inventory reversal',                       1),
        ('WE04', 'WRX', 'D', '',    'GR/IR clearing reversal',                  2),
        -- WA11: Transfer between plants (301)
        ('WA11', 'BSX', 'D', '',    'Inventory receiving plant',                1),
        ('WA11', 'BSX', 'C', '',    'Inventory issuing plant',                  2)
      ON CONFLICT DO NOTHING
    `);
        console.log('✅ Value strings seeded');

        // ── 6. SEED: movement_posting_rules for standard movement types ───────────
        // First fetch movement_type IDs
        const mtRows = await client.query(`SELECT id, movement_type_code FROM movement_types`);
        const mtMap: Record<string, number> = {};
        mtRows.rows.forEach((r: any) => { mtMap[r.movement_type_code] = r.id; });
        console.log('Movement Types found:', Object.keys(mtMap).join(', '));

        const rules: [string, string, string, string, boolean, boolean, string][] = [
            // [code, special_stock_ind, movement_ind, value_string, qty_update, value_update, consumption_posting]
            ['101', '', 'B', 'WE01', true, true, ''],   // GR from PO - standard
            ['101', 'K', 'B', 'WA01', true, true, ''],   // GR from PO - consignment
            ['102', '', 'B', 'WE04', true, true, ''],   // GR reversal
            ['201', '', '', 'WA08', true, true, 'V'],   // GI to cost center
            ['261', '', 'F', 'WA09', true, true, 'V'],   // GI to production order
            ['301', '', '', 'WA11', true, false, ''],    // Plant-to-plant transfer (qty only on sending)
            ['302', '', '', 'WA11', true, false, ''],    // Reversal of 301
            ['501', '', '', 'WA08', true, true, ''],    // Positive adjustment (no reference)
            ['502', '', '', 'WA08', true, true, ''],    // Negative adjustment
            ['551', '', '', 'WA10', true, true, 'V'],   // Scrapping
            ['601', '', 'L', 'WA08', true, true, ''],    // GI for delivery
            ['602', '', 'L', 'WE01', true, true, ''],    // Customer return
            ['702', '', '', 'WA10', true, true, 'V'],   // Material scrapping
        ];

        for (const [code, ssi, mi, vs, qu, vu, cp] of rules) {
            const mtId = mtMap[code];
            if (!mtId) { console.log(`  ⚠ No ID found for movement type ${code}, skipping`); continue; }
            await client.query(`
        INSERT INTO movement_posting_rules (movement_type_id, special_stock_ind, movement_ind, value_string, quantity_update, value_update, consumption_posting)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (movement_type_id, special_stock_ind, movement_ind) DO UPDATE
          SET value_string = EXCLUDED.value_string,
              quantity_update = EXCLUDED.quantity_update,
              value_update = EXCLUDED.value_update,
              consumption_posting = EXCLUDED.consumption_posting,
              updated_at = NOW()
      `, [mtId, ssi, mi, vs, qu, vu, cp]);
        }
        console.log('✅ Posting rules seeded');

        // ── 7. SEED: Update movement_types context fields ─────────────────────────
        const contextUpdates: [string, string, string, string, string, string, string, boolean, string][] = [
            // [code, movement_indicator, reversal_mvt_type, account_modifier, ref_doc_required, acct_assign, print_ctrl, reason_required, screen_variant]
            ['101', 'B', '102', '', 'PO', 'NONE', 'P', false, 'WE'],
            ['102', 'B', '101', '', 'PO', 'NONE', 'P', false, 'WE'],
            ['201', '', '202', '', 'COST_CENTER', 'COST_CENTER', 'N', false, 'GI'],
            ['261', 'F', '262', '', 'PROD_ORDER', 'ORDER', 'N', false, 'GI'],
            ['301', '', '302', '', 'NONE', 'NONE', 'N', false, 'TR'],
            ['302', '', '301', '', 'NONE', 'NONE', 'N', false, 'TR'],
            ['501', '', '502', '', 'NONE', 'NONE', 'N', false, 'AD'],
            ['502', '', '501', '', 'NONE', 'NONE', 'N', false, 'AD'],
            ['551', '', '', '', 'NONE', 'COST_CENTER', 'N', true, 'SC'],
            ['601', 'L', '602', '', 'DELIVERY', 'NONE', 'N', false, 'GI'],
            ['602', 'L', '601', '', 'DELIVERY', 'NONE', 'P', false, 'GR'],
            ['702', '', '', '', 'NONE', 'NONE', 'N', true, 'SC'],
        ];

        for (const [code, mi, rev, am, ref, aa, pc, rr, sv] of contextUpdates) {
            const mtId = mtMap[code];
            if (!mtId) continue;
            await client.query(`
        UPDATE movement_types SET
          movement_indicator          = $1,
          reversal_movement_type      = $2,
          account_modifier            = $3,
          reference_document_required = $4,
          account_assignment_mandatory= $5,
          print_control               = $6,
          reason_code_required        = $7,
          screen_layout_variant       = $8,
          create_fi_document          = true,
          create_material_document    = true,
          updated_at                  = NOW()
        WHERE id = $9
      `, [mi, rev, am, ref, aa, pc, rr, sv, mtId]);
        }
        console.log('✅ movement_types context fields seeded');

        // ── 8. SEED: Allowed Transactions ─────────────────────────────────────────
        const allowedTxns: [string, string[]][] = [
            ['101', ['MIGO', 'MB01']],
            ['102', ['MIGO', 'MB01']],
            ['201', ['MIGO', 'MB1A']],
            ['261', ['MIGO', 'MB1A']],
            ['301', ['MIGO', 'MB1B']],
            ['302', ['MIGO', 'MB1B']],
            ['501', ['MIGO', 'MI07']],
            ['502', ['MIGO', 'MI07']],
            ['551', ['MIGO']],
            ['601', ['VL02N']],
            ['602', ['VL01N']],
            ['702', ['MIGO']],
        ];

        for (const [code, txns] of allowedTxns) {
            const mtId = mtMap[code];
            if (!mtId) continue;
            for (const txn of txns) {
                await client.query(`
          INSERT INTO movement_type_allowed_transactions (movement_type_id, transaction_code)
          VALUES ($1, $2) ON CONFLICT DO NOTHING
        `, [mtId, txn]);
            }
        }
        console.log('✅ Allowed transactions seeded');

        await client.query('COMMIT');
        console.log('\n🎉 Migration complete!');
    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch(e => { console.error(e.message); process.exit(1); });
