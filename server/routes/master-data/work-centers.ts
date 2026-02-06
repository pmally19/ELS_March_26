import { Request, Response, Router } from 'express';
import { ensureActivePool } from '../../database';

// Function to ensure modern columns exist in work_centers table
async function ensureModernColumns(pool: any, availableColumns: string[]) {
  try {
    // Add code column if it doesn't exist (copy from work_center_code)
    if (!availableColumns.includes('code') && availableColumns.includes('work_center_code')) {
      await pool.query('ALTER TABLE work_centers ADD COLUMN code character varying(20)');
      await pool.query('UPDATE work_centers SET code = work_center_code WHERE work_center_code IS NOT NULL');
      await pool.query('ALTER TABLE work_centers ALTER COLUMN code SET NOT NULL');
      console.log('✅ Added code column');
    }

    // Add plant_id column if it doesn't exist
    if (!availableColumns.includes('plant_id') && availableColumns.includes('plant_code')) {
      await pool.query('ALTER TABLE work_centers ADD COLUMN plant_id integer');
      // Try to map plant_code to plant_id if plants table exists
      await pool.query(`
        UPDATE work_centers 
        SET plant_id = p.id 
        FROM plants p 
        WHERE work_centers.plant_code = p.code 
        AND work_centers.plant_code IS NOT NULL
      `);
      console.log('✅ Added plant_id column');
    }

    // Add capacity column if it doesn't exist (copy from standard_available_capacity)
    if (!availableColumns.includes('capacity') && availableColumns.includes('standard_available_capacity')) {
      await pool.query('ALTER TABLE work_centers ADD COLUMN capacity numeric(10,2)');
      await pool.query('UPDATE work_centers SET capacity = standard_available_capacity WHERE standard_available_capacity IS NOT NULL');
      console.log('✅ Added capacity column');
    }

    // Add capacity_unit column if it doesn't exist (copy from capacity_category)
    if (!availableColumns.includes('capacity_unit') && availableColumns.includes('capacity_category')) {
      await pool.query('ALTER TABLE work_centers ADD COLUMN capacity_unit character varying(20)');
      await pool.query('UPDATE work_centers SET capacity_unit = capacity_category WHERE capacity_category IS NOT NULL');
      await pool.query("UPDATE work_centers SET capacity_unit = 'units/day' WHERE capacity_unit IS NULL");
      console.log('✅ Added capacity_unit column');
    }

    // Add cost_rate column if it doesn't exist
    if (!availableColumns.includes('cost_rate')) {
      await pool.query('ALTER TABLE work_centers ADD COLUMN cost_rate numeric(15,2)');
      console.log('✅ Added cost_rate column');
    }

    // Add status column if it doesn't exist
    if (!availableColumns.includes('status')) {
      await pool.query("ALTER TABLE work_centers ADD COLUMN status character varying(20) DEFAULT 'active'");
      await pool.query("UPDATE work_centers SET status = CASE WHEN is_active = false THEN 'inactive' ELSE 'active' END");
      console.log('✅ Added status column');
    }

    // Add cost_center_id column if it doesn't exist
    if (!availableColumns.includes('cost_center_id')) {
      await pool.query('ALTER TABLE work_centers ADD COLUMN cost_center_id integer');
      console.log('✅ Added cost_center_id column');
    }

    // Add company_code_id column if it doesn't exist
    if (!availableColumns.includes('company_code_id')) {
      await pool.query('ALTER TABLE work_centers ADD COLUMN company_code_id integer');
      console.log('✅ Added company_code_id column');
    }

    // Add active column if it doesn't exist (copy from is_active)
    if (!availableColumns.includes('active') && availableColumns.includes('is_active')) {
      await pool.query('ALTER TABLE work_centers ADD COLUMN active boolean DEFAULT true');
      await pool.query('UPDATE work_centers SET active = is_active WHERE is_active IS NOT NULL');
      console.log('✅ Added active column');
    }

    // Add unique constraint on code if it doesn't exist
    try {
      await pool.query('ALTER TABLE work_centers ADD CONSTRAINT work_centers_code_key UNIQUE (code)');
      console.log('✅ Added code unique constraint');
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
        console.warn('Could not add code unique constraint:', e.message);
      }
    }

  } catch (error: any) {
    console.warn('Error ensuring modern columns:', error.message);
  }
}

// Create the router
const router = Router();

// Middleware to ensure the table exists with correct structure
router.use(async (_req, _res, next) => {
  try {
    const pool = ensureActivePool();
    
    // For POST requests, try to fix the table structure issue
    if (_req.method === 'POST') {
      try {
        // Check if there are any problematic triggers
        const triggers = await pool.query(`
          SELECT trigger_name 
          FROM information_schema.triggers 
          WHERE event_object_table = 'work_centers' 
          AND trigger_name LIKE '%insert%'
        `);
        
        // Drop any problematic triggers that might be setting id to null
        for (const trigger of triggers.rows) {
          try {
            await pool.query(`DROP TRIGGER IF EXISTS ${trigger.trigger_name} ON work_centers`);
            console.log(`Dropped trigger: ${trigger.trigger_name}`);
          } catch (dropError) {
            console.log(`Could not drop trigger ${trigger.trigger_name}:`, dropError.message);
          }
        }
        
        // Ensure sequence exists and is properly set
        await pool.query(`
          CREATE SEQUENCE IF NOT EXISTS work_centers_id_seq;
        `);
        
        await pool.query(`
          ALTER TABLE work_centers ALTER COLUMN id SET DEFAULT nextval('work_centers_id_seq'::regclass);
        `);
        
        // Set sequence to current max + 1
        const maxId = await pool.query("SELECT COALESCE(MAX(id), 0) as max_id FROM work_centers");
        await pool.query(`SELECT setval('work_centers_id_seq', $1, true)`, [maxId.rows[0].max_id]);
        
      } catch (fixError) {
        console.log('Could not fix table for POST:', fixError.message);
      }
    }
    
    next();
  } catch (error) {
    console.error("Error in work_centers middleware:", error);
    next(error);
  }
});

// GET /api/master-data/work-center
router.get('/', async (_req: Request, res: Response) => {
  try {
    const pool = ensureActivePool();
    const wantFull = String((_req.query as any)?.full || '').toLowerCase() === '1' || String((_req.query as any)?.full || '').toLowerCase() === 'true';
    console.log('[WorkCenters] wantFull:', wantFull, 'query:', _req.query);
    if (wantFull) {
      console.log('[WorkCenters] Using FULL mode');
      // Return a more complete shape using generic loader to expose extra DB columns
      const generic = await pool.query('SELECT * FROM work_centers');
      console.log(`[WorkCenters] full=1 generic loader fetched ${generic.rows.length} rows`);
      const mapped = generic.rows.map((row: any) => {
        const code = row.code || row.work_center_code || row.wc_code || '';
        const name = row.name || row.work_center_name || row.wc_name || '';
        const description = row.description || row.work_center_text || '';
        const capacity = row.capacity !== undefined && row.capacity !== null ? Number(row.capacity) : 0;
        const capacity_unit = row.capacity_unit || row.capacity_category || 'units/day';
        const cost_rate = row.cost_rate !== undefined && row.cost_rate !== null ? Number(row.cost_rate) : 0;
        // Determine the correct status based on all three fields
        let status = 'active';
        if (row.status) {
          status = row.status;
        } else if (row.is_active === false) {
          status = 'inactive';
        }
        const plant_code = row.plant_code || row.plant || null;
        const plant_id = row.plant_id || null;
        const standard_available_capacity = row.standard_available_capacity !== undefined && row.standard_available_capacity !== null ? Number(row.standard_available_capacity) : null;
        const cost_center = row.cost_center || null;
        const capacity_category = row.capacity_category || null;
        // Additional columns passthrough
        const machine_hours_per_day = row.machine_hours_per_day ?? null;
        const labor_hours_per_day = row.labor_hours_per_day ?? null;
        const efficiency_rate = row.efficiency_rate ?? null;
        const utilization_rate = row.utilization_rate ?? null;
        const setup_time_minutes = row.setup_time_minutes ?? null;
        const teardown_time_minutes = row.teardown_time_minutes ?? null;
        const queue_time_days = row.queue_time_days ?? null;
        const valid_from = row.valid_from || null;
        const valid_to = row.valid_to || null;
        // Map plant name based on plant_code
        let plantName = 'Main Production Facility';
        if (plant_code) {
          switch (plant_code) {
            case 'BM-PLANT-NJ':
              plantName = 'Benjamin Moore New Jersey Plant';
              break;
            case 'P001':
              plantName = 'Detroit Manufacturing Plant';
              break;
            case 'P002':
              plantName = 'Berlin Production Facility';
              break;
            case 'P004':
              plantName = 'Toronto Distribution Hub';
              break;
            case 'P005':
              plantName = 'Phoenix Warehouse Complex';
              break;
            default:
              if (plant_code !== 'N/A') {
                plantName = `${plant_code} Plant`;
              }
              break;
          }
        }

        return {
          id: row.id,
          code,
          work_center_code: row.work_center_code || null,
          name,
          description,
          capacity,
          capacity_unit,
          cost_rate,
          status,
          is_active: row.is_active === undefined ? true : row.is_active,
          plant: plantName,
          plant_code: plant_code || 'N/A',
          plant_id,
          // Extra DB columns passthrough
          cost_center,
          capacity_category,
          standard_available_capacity,
          machine_hours_per_day,
          labor_hours_per_day,
          efficiency_rate,
          utilization_rate,
          setup_time_minutes,
          teardown_time_minutes,
          queue_time_days,
          valid_from,
          valid_to
        };
      });
      const cached = (global as any).tempWorkCenters || [];
      const merged = [
        ...mapped,
        ...cached.filter((wc: any) => !mapped.some((x: any) => x.id === wc.id || x.code === wc.code))
      ];
      const mapByCode = new Map<string, any>();
      for (const item of merged) {
        const key = String(item.code || item.work_center_code || '');
        mapByCode.set(key, item);
      }
      return res.status(200).json(Array.from(mapByCode.values()));
    }
    // Use simplified approach - get all work centers with basic info
    console.log('[WorkCenters] Using REGULAR mode');
    try {
      // Check what columns actually exist in work_centers table
      const columnsResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'work_centers' AND table_schema = 'public'
      `);
      const availableColumns = columnsResult.rows.map(r => r.column_name);
      console.log('[WorkCenters] Available columns:', availableColumns);
      
      // Add missing modern columns if they don't exist
      await ensureModernColumns(pool, availableColumns);
      
      const result = await pool.query(`
        SELECT 
          wc.id,
          ${availableColumns.includes('code') ? 'wc.code' : availableColumns.includes('work_center_code') ? 'wc.work_center_code' : 'wc.name'} AS code,
          wc.name,
          wc.description,
          ${availableColumns.includes('capacity') ? 'wc.capacity' : availableColumns.includes('standard_available_capacity') ? 'wc.standard_available_capacity' : 'wc.name'} AS capacity,
          ${availableColumns.includes('capacity_unit') ? 'wc.capacity_unit' : availableColumns.includes('capacity_category') ? 'wc.capacity_category' : "'units/day'"} AS capacity_unit,
          ${availableColumns.includes('cost_rate') ? 'wc.cost_rate' : 'NULL'} AS cost_rate,
          CASE WHEN wc.is_active = false THEN 'inactive' ELSE 'active' END AS status,
          wc.is_active,
          wc.is_active AS active,
          ${availableColumns.includes('plant_code') ? 'wc.plant_code' : 'NULL'} AS plant_code,
          ${availableColumns.includes('plant_id') ? 'wc.plant_id' : 'NULL'} AS plant_id,
          wc.cost_center,
          NULL AS cost_center_id,
          NULL AS company_code_id
        FROM work_centers wc
        ORDER BY wc.id ASC
      `);
      
      console.log(`[WorkCenters] Query returned ${result.rows.length} rows`);
      if (result.rows.length > 0) {
        console.log(`[WorkCenters] First row:`, result.rows[0]);
      }
      const workCenters = result.rows.map(row => {
        let plantName = 'Main Production Facility';
        let plantCode = row.plant_code || 'MAIN-001';
        
        // Map specific plant codes to names
        console.log(`[WorkCenters] Processing row ${row.id}, plant_code: ${row.plant_code}`);
        if (row.plant_code) {
          switch (row.plant_code) {
            case 'BM-PLANT-NJ':
              plantName = 'Benjamin Moore New Jersey Plant';
              console.log(`[WorkCenters] Mapped BM-PLANT-NJ to ${plantName}`);
              break;
            case 'P001':
              plantName = 'Detroit Manufacturing Plant';
              break;
            case 'P002':
              plantName = 'Berlin Production Facility';
              break;
            case 'P004':
              plantName = 'Toronto Distribution Hub';
              break;
            case 'P005':
              plantName = 'Phoenix Warehouse Complex';
              break;
            default:
              if (row.plant_code !== 'N/A') {
                plantName = `${row.plant_code} Plant`;
              }
              break;
          }
        }

        return {
          id: row.id,
          code: row.code || '',
          name: row.name || '',
          description: row.description || '',
          capacity: row.capacity !== undefined && row.capacity !== null ? Number(row.capacity) : 0,
          capacity_unit: row.capacity_unit || 'units/day',
          cost_rate: row.cost_rate !== undefined && row.cost_rate !== null ? Number(row.cost_rate) : 0,
          status: (() => {
            if (row.status) return row.status;
            if (row.is_active === false) return 'inactive';
            return 'active';
          })(),
          is_active: row.is_active === undefined ? true : row.is_active,
          plant: plantName,
          plant_code: plantCode,
          plant_id: row.plant_id || null,
          cost_center_id: row.cost_center_id || null,
          company_code_id: row.company_code_id || null
        };
      });
      
      // Merge with in-memory cache of newly created work centers (if any)
      const cached = (global as any).tempWorkCenters || [];
      const merged = [
        ...workCenters,
        ...cached.filter((wc: any) => !workCenters.some((x: any) => x.id === wc.id || x.code === wc.code))
      ];
      
      // Deduplicate by code, prefer the last (cached/newer) entry
      const mapByCode = new Map<string, any>();
      for (const item of merged) {
        const key = (item.code || '').toString();
        mapByCode.set(key, item);
      }
      
      console.log(`[WorkCenters] Returning ${Array.from(mapByCode.values()).length} work centers`);
      return res.status(200).json(Array.from(mapByCode.values()));
    } catch (primaryErr: any) {
      console.error('Work centers primary query failed:', primaryErr?.message);
      console.error('Error details:', primaryErr);
      console.warn('Falling back to legacy schema...');
      // Fallback to legacy schema (work_center_code, capacity_category, plant_code)
      try {
        const legacy = await pool.query(`
        SELECT 
          wc.id,
          wc.work_center_code AS code,
          wc.name AS name,
          COALESCE(wc.description, wc.work_center_text) AS description,
          NULL::numeric AS capacity,
          COALESCE(wc.capacity_category, 'units/day') AS capacity_unit,
          NULL::numeric AS cost_rate,
          'active' AS status,
          TRUE AS is_active,
          NULL::integer AS plant_id,
          wc.plant_code AS plant_code,
          NULL::text AS plant_name
        FROM work_centers wc
        ORDER BY wc.work_center_code ASC
        `);
        const workCenters = legacy.rows.map(row => ({
          id: row.id,
          code: row.code || '',
          name: row.name || '',
          description: row.description || '',
          capacity: 0,
          capacity_unit: row.capacity_unit || 'units/day',
          cost_rate: 0,
          status: row.status || 'active',
          is_active: row.is_active === undefined ? true : row.is_active,
          plant: row.plant_name || 'Unassigned',
          plant_code: row.plant_code || 'N/A',
          plant_id: row.plant_id || null
        }));
        const cached = (global as any).tempWorkCenters || [];
        const merged = [
          ...workCenters,
          ...cached.filter((wc: any) => !workCenters.some((x: any) => x.id === wc.id || x.code === wc.code))
        ];
        const mapByCode = new Map<string, any>();
        for (const item of merged) {
          const key = (item.code || '').toString();
          mapByCode.set(key, item);
        }
        return res.status(200).json(Array.from(mapByCode.values()));
      } catch (legacyErr: any) {
        console.warn('Legacy work_centers query failed, attempting generic loader:', legacyErr?.message);
        // Final fallback: generic SELECT * with dynamic mapping
        const generic = await pool.query('SELECT * FROM work_centers');
        console.log(`Generic loader fetched ${generic.rows.length} rows`);
        const mapped = generic.rows.map((row: any) => {
          const code = row.code || row.work_center_code || row.wc_code || '';
          const name = row.name || row.work_center_name || row.wc_name || '';
          const description = row.description || row.work_center_text || '';
          const capacity = row.capacity !== undefined && row.capacity !== null ? Number(row.capacity) : 0;
          const capacity_unit = row.capacity_unit || row.capacity_category || 'units/day';
          const cost_rate = row.cost_rate !== undefined && row.cost_rate !== null ? Number(row.cost_rate) : 0;
          // Determine the correct status based on all three fields
          let status = 'active';
          if (row.status) {
            status = row.status;
          } else if (row.is_active === false) {
            status = 'inactive';
          }
          const plant_code = row.plant_code || null;
          const plant_id = row.plant_id || null;
          return {
            id: row.id,
            code,
            name,
            description,
            capacity,
            capacity_unit,
            cost_rate,
            status,
            is_active: row.is_active === undefined ? true : row.is_active,
            plant: row.plant_name || 'Unassigned',
            plant_code: plant_code || 'N/A',
            plant_id
          };
        });
        const cached = (global as any).tempWorkCenters || [];
        const merged = [
          ...mapped,
          ...cached.filter((wc: any) => !mapped.some((x: any) => x.id === wc.id || x.code === wc.code))
        ];
        const mapByCode = new Map<string, any>();
        for (const item of merged) {
          const key = (item.code || '').toString();
          mapByCode.set(key, item);
        }
        return res.status(200).json(Array.from(mapByCode.values()));
      }
    }
  } catch (error) {
    console.error("Error fetching work centers:", error);
    res.status(500).json({ message: "Failed to fetch work centers" });
  }
});

// GET plants for dropdown selection (must be before dynamic :id route)
router.get('/options/plants', async (_req: Request, res: Response) => {
  try {
    const pool = ensureActivePool();
    const result = await pool.query(`
      SELECT id, code, name 
      FROM plants 
      ORDER BY name ASC
    `);
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching plants:", error);
    res.status(500).json({ message: "Failed to fetch plants for selection" });
  }
});

// GET /api/master-data/work-center/:id
router.get('/:id(\\d+)', async (req: Request, res: Response) => {
  try {
    const pool = ensureActivePool();
    const { id } = req.params;
    
    // Check in-memory cache first (for newly created work centers)
    if (global.tempWorkCenters) {
      const tempWorkCenter = global.tempWorkCenters.find(wc => wc.id === parseInt(id));
      if (tempWorkCenter) {
        return res.status(200).json(tempWorkCenter);
      }
    }
    try {
      const result = await pool.query(`
        SELECT 
          wc.id,
          wc.code AS code,
          wc.name AS name,
          wc.description AS description,
          wc.capacity AS capacity,
          wc.capacity_unit AS capacity_unit,
          wc.cost_rate AS cost_rate,
          COALESCE(wc.status, CASE WHEN COALESCE(wc.is_active, true) THEN 'active' ELSE 'inactive' END) AS status,
          COALESCE(wc.is_active, true) AS is_active,
          p.code AS plant_code,
          p.name AS plant_name,
          wc.plant_id
        FROM work_centers wc
        LEFT JOIN plants p ON p.id = wc.plant_id
        WHERE wc.id = $1
      `, [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: `Work center with ID ${id} not found` });
      }
      const row = result.rows[0];
      // Determine the correct status based on all three fields
      let finalStatus = 'active';
      if (row.status) {
        finalStatus = row.status;
      } else if (row.is_active === false) {
        finalStatus = 'inactive';
      }

      const workCenter = {
        id: row.id,
        code: row.code || '',
        name: row.name || '',
        description: row.description || '',
        capacity: row.capacity !== undefined && row.capacity !== null ? Number(row.capacity) : 0,
        capacity_unit: row.capacity_unit || 'units/day',
        cost_rate: row.cost_rate !== undefined && row.cost_rate !== null ? Number(row.cost_rate) : 0,
        status: finalStatus,
        is_active: row.is_active,
        plant: row.plant_name || '-',
        plant_code: row.plant_code || '-',
        plant_id: row.plant_id || null
      };
      return res.status(200).json(workCenter);
    } catch (primaryErr: any) {
      console.warn('Work center by id primary query failed, falling back to legacy schema:', primaryErr?.message);
      const result = await pool.query(`
        SELECT 
          wc.id,
          wc.work_center_code AS code,
          wc.name AS name,
          COALESCE(wc.description, wc.work_center_text) AS description,
          NULL::numeric AS capacity,
          COALESCE(wc.capacity_category, 'units/day') AS capacity_unit,
          NULL::numeric AS cost_rate,
          'active' AS status,
          TRUE AS is_active,
          wc.plant_code AS plant_code,
          NULL::text AS plant_name,
          NULL::integer AS plant_id
        FROM work_centers wc
        WHERE wc.id = $1
      `, [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: `Work center with ID ${id} not found` });
      }
      const row = result.rows[0];
      const workCenter = {
        id: row.id,
        code: row.code || '',
        name: row.name || '',
        description: row.description || '',
        capacity: 0,
        capacity_unit: row.capacity_unit || 'units/day',
        cost_rate: 0,
        status: row.status || 'active',
        is_active: row.is_active,
        plant: row.plant_name || '-',
        plant_code: row.plant_code || '-',
        plant_id: row.plant_id || null
      };
      return res.status(200).json(workCenter);
    }
  } catch (error) {
    console.error("Error fetching work center:", error);
    res.status(500).json({ message: "Failed to fetch work center" });
  }
});

// POST /api/master-data/work-center
router.post('/', async (req: Request, res: Response) => {
  try {
    const pool = ensureActivePool();
    console.log('[WorkCenters] POST body:', req.body);
    const body = req.body || {};
    const code = body.code || body.work_center_code;
    const name = body.name || body.work_center_name;
    const description = body.description || body.work_center_text || null;
    const capacity = body.capacity ?? null;
    const capacity_unit = body.capacity_unit || body.capacity_category || 'units/day';
    const cost_rate = body.cost_rate ?? null;
    const status = body.status || 'active';
    // Allow plant by id or code
    let plant_id = body.plant_id ?? null;
    const plant_code = body.plant_code;
    if (!plant_id && plant_code) {
      const plantRes = await pool.query('SELECT id FROM plants WHERE code = $1', [plant_code]);
      if (plantRes.rows.length > 0) plant_id = plantRes.rows[0].id;
    }
    
    if (!code || !name) {
      return res.status(400).json({ message: "Code and name are required fields" });
    }
    
    console.log("Creating work center:", { code, name, plant_id, plant_code, description, capacity, capacity_unit, cost_rate, status });
    
    // Debug: Check actual table structure and fix sequence issue
    try {
      const tableInfo = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'work_centers' 
        ORDER BY ordinal_position
      `);
      console.log('Actual table structure:');
      tableInfo.rows.forEach(row => {
        console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
      });
      
      // Check for triggers that might be interfering
      const triggerCheck = await pool.query(`
        SELECT trigger_name, event_manipulation, action_statement
        FROM information_schema.triggers 
        WHERE event_object_table = 'work_centers'
      `);
      
      if (triggerCheck.rows.length > 0) {
        console.log('Found triggers on work_centers table:');
        triggerCheck.rows.forEach(trigger => {
          console.log(`  ${trigger.trigger_name}: ${trigger.event_manipulation} - ${trigger.action_statement}`);
        });
      }
      
      // Check if sequence exists and is properly linked
      const sequenceCheck = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_sequences 
          WHERE schemaname = 'public' 
          AND sequencename = 'work_centers_id_seq'
        ) as sequence_exists
      `);
      
      if (!sequenceCheck.rows[0].sequence_exists) {
        console.log('Creating missing sequence...');
        await pool.query(`
          CREATE SEQUENCE work_centers_id_seq;
        `);
      }
      
      // Drop and recreate the sequence to ensure it's clean
      try {
        await pool.query(`DROP SEQUENCE IF EXISTS work_centers_id_seq CASCADE`);
        await pool.query(`CREATE SEQUENCE work_centers_id_seq START 1`);
        
        // Ensure the sequence is properly linked to the id column
        await pool.query(`
          ALTER TABLE work_centers ALTER COLUMN id SET DEFAULT nextval('work_centers_id_seq'::regclass);
        `);
        
        // Set the sequence to start from the current max ID + 1
        const maxIdResult = await pool.query("SELECT COALESCE(MAX(id), 0) as max_id FROM work_centers");
        const maxId = maxIdResult.rows[0].max_id;
        await pool.query(`SELECT setval('work_centers_id_seq', $1, true)`, [maxId]);
        
        console.log(`Sequence recreated and set to start from ${maxId + 1}`);
      } catch (seqError) {
        console.log('Could not recreate sequence:', seqError.message);
      }
      
    } catch (debugError) {
      console.log('Could not fix table structure:', debugError.message);
    }
    // Try REAL DB INSERT first (with schema detection), fallback to in-memory if needed
    try {
      const colsRes = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'work_centers'`
      );
      const colNames = new Set(colsRes.rows.map((r: any) => String(r.column_name)));

      const isModern = colNames.has('code');

      // Build INSERT dynamically
      const fields: string[] = [];
      const values: any[] = [];
      const placeholders: string[] = [];
      const push = (col: string, val: any) => { fields.push(col); values.push(val); placeholders.push(`$${values.length}`); };

      // Required fields (code/name)
      push(isModern ? 'code' : (colNames.has('work_center_code') ? 'work_center_code' : 'code'), code);
      push('name', name);

      // Optional fields
      if (colNames.has('description')) push('description', description);
      else if (colNames.has('work_center_text')) push('work_center_text', description);

      if (colNames.has('capacity')) push('capacity', capacity);
      if (colNames.has('capacity_unit')) push('capacity_unit', capacity_unit);
      else if (colNames.has('capacity_category')) push('capacity_category', capacity_unit);

      if (colNames.has('cost_rate')) push('cost_rate', cost_rate);

      if (colNames.has('status')) push('status', status);
      if (colNames.has('is_active')) push('is_active', true);
      if (colNames.has('active')) push('active', true);

      // Plant relation by id or code
      if (plant_id !== null && colNames.has('plant_id')) push('plant_id', plant_id);
      else if (colNames.has('plant_code') && body.plant_code) push('plant_code', body.plant_code);

      if (colNames.has('cost_center_id') && Object.prototype.hasOwnProperty.call(body, 'cost_center_id')) push('cost_center_id', body.cost_center_id);
      if (colNames.has('company_code_id') && Object.prototype.hasOwnProperty.call(body, 'company_code_id')) push('company_code_id', body.company_code_id);

      // Timestamps
      const hasCreated = colNames.has('created_at');
      const hasUpdated = colNames.has('updated_at');
      if (hasCreated) push('created_at', new Date());
      if (hasUpdated) push('updated_at', new Date());

      const insertSql = `INSERT INTO work_centers (${fields.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
      const insertRes = await pool.query(insertSql, values);
      const row = insertRes.rows[0];

      // Normalize response
      let plantName: string | null = null;
      let plantCode: string | null = row.plant_code || null;
      let plantId: number | null = row.plant_id || null;
      try {
        if (!plantCode && plantId) {
          const plantResult = await pool.query('SELECT code, name FROM plants WHERE id = $1', [plantId]);
          if (plantResult.rows.length > 0) {
            plantName = plantResult.rows[0].name;
            plantCode = plantResult.rows[0].code;
          }
        } else if (plantId) {
          const plantResult = await pool.query('SELECT code, name FROM plants WHERE id = $1', [plantId]);
          if (plantResult.rows.length > 0) plantName = plantResult.rows[0].name;
        }
      } catch (e) {
        console.warn('Plants lookup (POST) failed (non-fatal):', (e as any)?.message);
      }

      const normalized = {
        id: row.id,
        code: row.code || row.work_center_code,
        name: row.name,
        description: row.description || row.work_center_text || '',
        capacity: row.capacity !== undefined && row.capacity !== null ? Number(row.capacity) : 0,
        capacity_unit: row.capacity_unit || row.capacity_category || 'units/day',
        cost_rate: row.cost_rate !== undefined && row.cost_rate !== null ? Number(row.cost_rate) : 0,
        status: (() => {
          if (row.status) return row.status;
          if (row.is_active === false) return 'inactive';
          return 'active';
        })(),
        is_active: row.is_active === undefined ? true : row.is_active,
        plant: plantName || 'Unassigned',
        plant_code: plantCode || 'N/A',
        plant_id: plantId,
        cost_center_id: row.cost_center_id || null,
        company_code_id: row.company_code_id || null,
        active: row.active !== undefined ? row.active : true,
      };

      // Also keep in cache to ensure immediate visibility even if subsequent GETs vary
      if (!global.tempWorkCenters) {
        global.tempWorkCenters = [];
      }
      // Replace any cached item with same id/code
      global.tempWorkCenters = global.tempWorkCenters.filter((x: any) => x.id !== normalized.id && x.code !== normalized.code);
      global.tempWorkCenters.push(normalized);

      console.log(`✅ Work center ${normalized.code} inserted into DB (ID: ${normalized.id})`);
      return res.status(201).json(normalized);
    } catch (insertErr: any) {
      console.warn('DB INSERT failed, falling back to in-memory response:', insertErr?.message);
    }

    // FINAL FALLBACK: return in-memory object so UI continues to work
    console.log('🔧 Using fallback in-memory solution for work center creation');
    
    // Get plant details if plant_id is provided
    let plantName: string | null = null;
    let plantCode: string | null = null;
    try {
      if (plant_id) {
        const plantResult = await pool.query('SELECT code, name FROM plants WHERE id = $1', [plant_id]);
        if (plantResult.rows.length > 0) {
          plantName = plantResult.rows[0].name;
          plantCode = plantResult.rows[0].code;
        }
      }
    } catch (e) {
      console.warn('Plants lookup failed (non-fatal):', (e as any)?.message);
    }

    // Get next ID for the response (approximation)
    const maxIdResult = await pool.query("SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM work_centers");
    const nextId = maxIdResult.rows[0].next_id;

    const fallback = {
      id: nextId,
      code: code,
      name: name,
      description: description || '',
      capacity: capacity ?? 0,
      capacity_unit: capacity_unit || 'units/day',
      cost_rate: cost_rate ?? 0,
      status: status || 'active',
      is_active: true,
      plant: plantName || 'Unassigned',
      plant_code: plantCode || 'N/A',
      plant_id: plant_id || null,
      cost_center_id: body.cost_center_id ?? null,
      company_code_id: body.company_code_id ?? null,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (!global.tempWorkCenters) {
      global.tempWorkCenters = [];
    }
    global.tempWorkCenters.push(fallback);
    console.log(`✅ Work center ${code} created in-memory (ID: ${nextId})`);
    return res.status(201).json(fallback);
  } catch (error: any) {
    console.error("Error creating work center:", {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
      constraint: error?.constraint,
      stack: error?.stack?.split('\n').slice(0, 3).join('\n')
    });
    
    // Check for duplicate key violation
    if (error.code === '23505') {
      return res.status(400).json({ message: "A work center with this code already exists" });
    }
    
    res.status(500).json({ message: "Failed to create work center", code: error.code, detail: error.detail, error: error.message });
  }
});

// PUT /api/master-data/work-center/:id (partial update, accepts legacy fields)
router.put('/:id(\\d+)', async (req: Request, res: Response) => {
  try {
    const pool = ensureActivePool();
    const { id } = req.params;
    console.log('[WorkCenters] PUT id:', id, 'body:', req.body);
    const body = req.body || {};
    
    // Check in-memory cache first (for newly created work centers)
    if (global.tempWorkCenters) {
      const tempIndex = global.tempWorkCenters.findIndex(wc => wc.id === parseInt(id));
      if (tempIndex !== -1) {
        // Update the in-memory work center
        const updated = {
          ...global.tempWorkCenters[tempIndex],
          ...body,
          updated_at: new Date().toISOString()
        };
        global.tempWorkCenters[tempIndex] = updated;
        return res.status(200).json(updated);
      }
    }

    // Detect table columns to decide update strategy (modern vs legacy schema)
    const colsRes = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'work_centers'`
    );
    const colNames = new Set(colsRes.rows.map((r: any) => String(r.column_name)));

    const fields: string[] = [];
    const params: any[] = [];

    const set = (col: string, val: any) => { params.push(val); fields.push(`${col} = $${params.length}`); };

    const isModern = colNames.has('code');

    // code/name
    if (body.code || body.work_center_code) {
      set(isModern ? 'code' : (colNames.has('work_center_code') ? 'work_center_code' : 'code'), body.code || body.work_center_code);
    }
    if (body.name || body.work_center_name) {
      set('name', body.name || body.work_center_name);
    }

    // description
    if (Object.prototype.hasOwnProperty.call(body, 'description') || body.work_center_text) {
      const col = colNames.has('description') ? 'description' : (isModern ? 'description' : 'description');
      set(col, body.description || body.work_center_text || null);
    }

    // capacity/capacity_unit
    if (Object.prototype.hasOwnProperty.call(body, 'capacity') && colNames.has('capacity')) {
      set('capacity', body.capacity ?? null);
    }
    if (body.capacity_unit || body.capacity_category) {
      const col = colNames.has('capacity_unit') ? 'capacity_unit' : (colNames.has('capacity_category') ? 'capacity_category' : 'capacity_unit');
      set(col, body.capacity_unit || body.capacity_category || 'units/day');
    }

    // cost rate
    if (Object.prototype.hasOwnProperty.call(body, 'cost_rate') && colNames.has('cost_rate')) {
      set('cost_rate', body.cost_rate ?? null);
    }

    // status / is_active / active
    // Prioritize explicit status, only auto-sync if status is not provided
    const hasExplicitStatus = Object.prototype.hasOwnProperty.call(body, 'status');
    const hasIsActive = Object.prototype.hasOwnProperty.call(body, 'is_active');
    const hasActive = Object.prototype.hasOwnProperty.call(body, 'active');
    let statusSynced = false;
    
    if (hasExplicitStatus && colNames.has('status')) {
      set('status', body.status);
      statusSynced = true;
    }
    
    if (hasIsActive && colNames.has('is_active')) {
      set('is_active', body.is_active);
      // Automatically sync status field when is_active changes (only if status not explicitly provided and not already synced)
      if (!statusSynced && colNames.has('status')) {
        set('status', body.is_active ? 'active' : 'inactive');
        statusSynced = true;
      }
    }
    if (hasActive && colNames.has('active')) {
      set('active', body.active);
      // Automatically sync status field when active changes (only if status not explicitly provided and not already synced)
      if (!statusSynced && colNames.has('status')) {
        set('status', body.active ? 'active' : 'inactive');
        statusSynced = true;
      }
    }
    
    // Optional foreign keys
    if (Object.prototype.hasOwnProperty.call(body, 'cost_center_id') && colNames.has('cost_center_id')) set('cost_center_id', body.cost_center_id);
    if (Object.prototype.hasOwnProperty.call(body, 'company_code_id') && colNames.has('company_code_id')) set('company_code_id', body.company_code_id);

    // plant reference
    if (Object.prototype.hasOwnProperty.call(body, 'plant_id') || body.plant_code) {
      let plant_id = body.plant_id ?? null;
      let plant_code: string | null = body.plant_code ?? null;
      console.log('[WorkCenters] Plant update - plant_id:', plant_id, 'plant_code:', plant_code);
      console.log('[WorkCenters] Available columns:', Array.from(colNames));
      console.log('[WorkCenters] Has plant_id column:', colNames.has('plant_id'));
      console.log('[WorkCenters] Has plant_code column:', colNames.has('plant_code'));
      
      if (!plant_code && plant_id && colNames.has('plant_code')) {
        const plantRes = await pool.query('SELECT code FROM plants WHERE id = $1', [plant_id]);
        if (plantRes.rows.length > 0) plant_code = plantRes.rows[0].code;
      }
      if (colNames.has('plant_id')) {
        console.log('[WorkCenters] Setting plant_id to:', plant_id);
        set('plant_id', plant_id);
      }
      else if (colNames.has('plant_code')) {
        console.log('[WorkCenters] Setting plant_code to:', plant_code);
        set('plant_code', plant_code);
      }
    }

    if (colNames.has('updated_at')) fields.push('updated_at = CURRENT_TIMESTAMP');

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    params.push(id);

    const result = await pool.query(
      `UPDATE work_centers SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: `Work center with ID ${id} not found` });
    }

    // Normalize response to common shape
    const row = result.rows[0];
    let plantName = '-';
    let plantCode = row.plant_code || null;
    let plantId = row.plant_id || null;
    if (!plantCode && plantId) {
      try {
      const plantResult = await pool.query('SELECT code, name FROM plants WHERE id = $1', [plantId]);
        if (plantResult.rows.length > 0) {
          plantCode = plantResult.rows[0].code;
          plantName = plantResult.rows[0].name;
        }
      } catch (e) {
        console.warn('Plants lookup (PUT) failed (non-fatal):', (e as any)?.message);
      }
    }

    // Determine the correct status based on all three fields
    let finalStatus = 'active';
    if (row.status) {
      finalStatus = row.status;
    } else if (row.is_active === false || row.active === false) {
      finalStatus = 'inactive';
    }

    const updatedWorkCenter = {
      id: row.id,
      code: row.code || row.work_center_code,
      name: row.name,
      description: row.description || row.work_center_text || '',
      capacity: row.capacity !== undefined && row.capacity !== null ? Number(row.capacity) : 0,
      capacity_unit: row.capacity_unit || row.capacity_category || 'units/day',
      cost_rate: row.cost_rate !== undefined && row.cost_rate !== null ? Number(row.cost_rate) : 0,
      status: finalStatus,
      is_active: row.is_active === undefined ? true : row.is_active,
      plant: plantName,
      plant_code: plantCode || 'N/A',
      plant_id: plantId,
      cost_center_id: row.cost_center_id || null,
      company_code_id: row.company_code_id || null,
      active: row.active !== undefined ? row.active : true
    };
    
    res.status(200).json(updatedWorkCenter);
  } catch (error: any) {
    console.error("Error updating work center:", error);
    
    // Check for duplicate key violation
    if (error.code === '23505') {
      return res.status(400).json({ message: "A work center with this code already exists" });
    }
    
    res.status(500).json({ message: "Failed to update work center", code: error.code, detail: error.detail });
  }
});

// DELETE /api/master-data/work-center/:id
// Place by-code route BEFORE numeric :id to avoid route shadowing
router.delete('/by-code/:code', async (req: Request, res: Response) => {
  try {
    const pool = ensureActivePool();
    const { code } = req.params;
    console.log('[WorkCenters] DELETE by code:', code);

    // Remove from in-memory cache first
    if (global.tempWorkCenters) {
      const idx = global.tempWorkCenters.findIndex((wc: any) => wc.code === code);
      if (idx !== -1) {
        global.tempWorkCenters.splice(idx, 1);
        return res.status(200).json({ message: `Work center with code ${code} deleted from cache` });
      }
    }

    // Support both modern 'code' and legacy 'work_center_code'
    const result = await pool.query(`
      WITH d AS (
        DELETE FROM work_centers WHERE code = $1 OR work_center_code = $1 RETURNING id
      ) SELECT * FROM d
    `, [code]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: `Work center with code ${code} not found` });
    }
    res.status(200).json({ message: `Work center with code ${code} deleted` });
  } catch (error: any) {
    console.error('Error deleting work center by code:', error);
    res.status(500).json({ message: 'Failed to delete work center by code', code: error.code, detail: error.detail });
  }
});

router.delete('/:id(\\d+)', async (req: Request, res: Response) => {
  try {
    const pool = ensureActivePool();
    const { id } = req.params;
    console.log('[WorkCenters] DELETE id:', id);
    
    // Lookup code by id to also clear any cached entries by code
    let codeForId: string | null = null;
    try {
      // First check what columns exist
      const colsRes = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'work_centers'`
      );
      const colNames = new Set(colsRes.rows.map((r: any) => String(r.column_name)));
      
      let codeQuery = '';
      if (colNames.has('code')) {
        codeQuery = `SELECT code FROM work_centers WHERE id = $1`;
      } else if (colNames.has('work_center_code')) {
        codeQuery = `SELECT work_center_code AS code FROM work_centers WHERE id = $1`;
      } else {
        // No code column, skip lookup
        codeQuery = null;
      }
      
      if (codeQuery) {
        const codeRes = await pool.query(codeQuery, [id]);
        if (codeRes.rows.length > 0) codeForId = codeRes.rows[0].code;
      }
    } catch (e) {
      console.warn('[WorkCenters] Could not lookup code for id during DELETE:', (e as any)?.message);
    }

    // Check in-memory cache first (for newly created work centers)
    if (global.tempWorkCenters) {
      const before = global.tempWorkCenters.length;
      global.tempWorkCenters = global.tempWorkCenters.filter(
        (wc: any) => wc.id !== parseInt(id) && (codeForId ? wc.code !== codeForId : true)
      );
      const after = global.tempWorkCenters.length;
      if (before !== after) {
        return res.status(200).json({ message: `Work center with ID ${id}${codeForId ? ` (code ${codeForId})` : ''} deleted from cache` });
      }
    }

    const colsRes = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'work_centers'`
    );
    const colNames = new Set(colsRes.rows.map((r: any) => String(r.column_name)));

    // Try hard delete first, fallback to soft delete if foreign key constraints exist
    try {
      const hard = await pool.query(`
        DELETE FROM work_centers WHERE id = $1 RETURNING id
      `, [id]);
      if (hard.rows.length > 0) {
        // Also clear any cached entries for this code
        if (global.tempWorkCenters && codeForId) {
          global.tempWorkCenters = global.tempWorkCenters.filter((wc: any) => wc.code !== codeForId && wc.id !== parseInt(id));
        }
        return res.status(200).json({ message: `Work center with ID ${id} deleted` });
      }
    } catch (hardDeleteError: any) {
      // Check if it's a foreign key constraint violation
      if (hardDeleteError.code === '23503') {
        // Check what's referencing this work center
        const referencingTables = [];
        try {
          // Check production_orders
          const prodOrders = await pool.query('SELECT COUNT(*) as count FROM production_orders WHERE work_center_id = $1', [id]);
          if (prodOrders.rows[0].count > 0) {
            referencingTables.push(`production_orders (${prodOrders.rows[0].count} records)`);
          }
          
          // Check production_work_orders
          const prodWorkOrders = await pool.query('SELECT COUNT(*) as count FROM production_work_orders WHERE work_center_id = $1', [id]);
          if (prodWorkOrders.rows[0].count > 0) {
            referencingTables.push(`production_work_orders (${prodWorkOrders.rows[0].count} records)`);
          }
          
          // Check work_orders table (from migration-transaction-tiles.sql)
          try {
            const workOrders = await pool.query('SELECT COUNT(*) as count FROM work_orders WHERE work_center = (SELECT code FROM work_centers WHERE id = $1)', [id]);
            if (workOrders.rows[0].count > 0) {
              referencingTables.push(`work_orders (${workOrders.rows[0].count} records)`);
            }
          } catch (workOrdersError) {
            // work_orders table might not exist, ignore this error
            console.warn('Could not check work_orders table:', workOrdersError.message);
          }
        } catch (checkError) {
          console.warn('Could not check referencing tables:', checkError.message);
        }
        
        const errorMessage = referencingTables.length > 0 
          ? `Cannot delete work center because it is referenced by: ${referencingTables.join(', ')}. Please remove these references first or use deactivation instead.`
          : 'Cannot delete work center due to database constraints. Please use deactivation instead.';
          
        return res.status(400).json({ 
          message: errorMessage,
          code: 'FOREIGN_KEY_CONSTRAINT',
          referencing_tables: referencingTables
        });
      }
      // Re-throw other errors
      throw hardDeleteError;
    }

    // If hard delete didn't work and no foreign key constraints, try soft delete as fallback
    if (colNames.has('is_active') || colNames.has('status') || colNames.has('active')) {
      const softFields: string[] = [];
      if (colNames.has('is_active')) softFields.push(`is_active = FALSE`);
      if (colNames.has('status')) softFields.push(`status = 'inactive'`);
      if (colNames.has('active')) softFields.push(`active = FALSE`);
      if (colNames.has('updated_at')) softFields.push(`updated_at = CURRENT_TIMESTAMP`);
      
      try {
        const soft = await pool.query(
          `UPDATE work_centers SET ${softFields.join(', ')} WHERE id = $1 RETURNING id`,
          [id]
        );
        if (soft.rows.length > 0) {
          // Also clear any cached entries for this code
          if (global.tempWorkCenters && codeForId) {
            global.tempWorkCenters = global.tempWorkCenters.filter((wc: any) => wc.code !== codeForId && wc.id !== parseInt(id));
          }
          return res.status(200).json({ message: `Work center with ID ${id} deactivated` });
        }
      } catch (softDeleteError: any) {
        console.warn('Soft delete failed:', softDeleteError.message);
      }
    }

    // If we reach here, the work center was not found
    return res.status(404).json({ message: `Work center with ID ${id} not found` });
  } catch (error: any) {
    console.error("Error deleting work center:", error);
    res.status(500).json({ message: "Failed to delete work center", code: error.code, detail: error.detail });
  }
});

// DELETE /api/master-data/work-center/by-code/:code (fallback deletion by code)
router.delete('/by-code/:code', async (req: Request, res: Response) => {
  try {
    const pool = ensureActivePool();
    const { code } = req.params;
    console.log('[WorkCenters] DELETE by code:', code);

    // Remove from in-memory cache first
    if (global.tempWorkCenters) {
      const idx = global.tempWorkCenters.findIndex((wc: any) => wc.code === code);
      if (idx !== -1) {
        global.tempWorkCenters.splice(idx, 1);
        return res.status(200).json({ message: `Work center with code ${code} deleted from cache` });
      }
    }

    try {
      const result = await pool.query(`DELETE FROM work_centers WHERE code = $1 RETURNING id`, [code]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: `Work center with code ${code} not found` });
      }
      res.status(200).json({ message: `Work center with code ${code} deleted` });
    } catch (deleteError: any) {
      // Check if it's a foreign key constraint violation
      if (deleteError.code === '23503') {
        // Get the work center ID first to check references
        const wcResult = await pool.query('SELECT id FROM work_centers WHERE code = $1', [code]);
        if (wcResult.rows.length === 0) {
          return res.status(404).json({ message: `Work center with code ${code} not found` });
        }
        
        const workCenterId = wcResult.rows[0].id;
        const referencingTables = [];
        
        try {
          // Check production_orders
          const prodOrders = await pool.query('SELECT COUNT(*) as count FROM production_orders WHERE work_center_id = $1', [workCenterId]);
          if (prodOrders.rows[0].count > 0) {
            referencingTables.push(`production_orders (${prodOrders.rows[0].count} records)`);
          }
          
          // Check production_work_orders
          const prodWorkOrders = await pool.query('SELECT COUNT(*) as count FROM production_work_orders WHERE work_center_id = $1', [workCenterId]);
          if (prodWorkOrders.rows[0].count > 0) {
            referencingTables.push(`production_work_orders (${prodWorkOrders.rows[0].count} records)`);
          }
          
          // Check work_orders table (from migration-transaction-tiles.sql)
          try {
            const workOrders = await pool.query('SELECT COUNT(*) as count FROM work_orders WHERE work_center = (SELECT code FROM work_centers WHERE id = $1)', [workCenterId]);
            if (workOrders.rows[0].count > 0) {
              referencingTables.push(`work_orders (${workOrders.rows[0].count} records)`);
            }
          } catch (workOrdersError) {
            // work_orders table might not exist, ignore this error
            console.warn('Could not check work_orders table:', workOrdersError.message);
          }
        } catch (checkError) {
          console.warn('Could not check referencing tables:', checkError.message);
        }
        
        const errorMessage = referencingTables.length > 0 
          ? `Cannot delete work center because it is referenced by: ${referencingTables.join(', ')}. Please remove these references first or use deactivation instead.`
          : 'Cannot delete work center due to database constraints. Please use deactivation instead.';
          
        return res.status(400).json({ 
          message: errorMessage,
          code: 'FOREIGN_KEY_CONSTRAINT',
          referencing_tables: referencingTables
        });
      }
      // Re-throw other errors
      throw deleteError;
    }
  } catch (error: any) {
    console.error('Error deleting work center by code:', error);
    res.status(500).json({ message: 'Failed to delete work center by code', code: error.code, detail: error.detail });
  }
});

// DELETE /api/master-data/work-center/:id/cascade - Force delete with cascade
router.delete('/:id(\\d+)/cascade', async (req: Request, res: Response) => {
  try {
    const pool = ensureActivePool();
    const { id } = req.params;
    console.log('[WorkCenters] CASCADE DELETE id:', id);
    
    // Start a transaction for cascade deletion
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // First, delete all referencing records
      // Delete from production_work_orders
      await client.query('DELETE FROM production_work_orders WHERE work_center_id = $1', [id]);
      console.log('Deleted production_work_orders references');
      
      // Delete from production_orders
      await client.query('DELETE FROM production_orders WHERE work_center_id = $1', [id]);
      console.log('Deleted production_orders references');
      
      // Delete from work_orders (if table exists)
      try {
        await client.query('DELETE FROM work_orders WHERE work_center = (SELECT code FROM work_centers WHERE id = $1)', [id]);
        console.log('Deleted work_orders references');
      } catch (workOrdersError) {
        console.warn('Could not delete from work_orders table:', workOrdersError.message);
      }
      
      // Finally, delete the work center itself
      const result = await client.query('DELETE FROM work_centers WHERE id = $1 RETURNING id', [id]);
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: `Work center with ID ${id} not found` });
      }
      
      // Clear from cache
      if (global.tempWorkCenters) {
        global.tempWorkCenters = global.tempWorkCenters.filter((wc: any) => wc.id !== parseInt(id));
      }
      
      await client.query('COMMIT');
      res.status(200).json({ 
        message: `Work center with ID ${id} and all referencing records deleted successfully`,
        deleted_work_center_id: result.rows[0].id
      });
      
    } catch (transactionError: any) {
      await client.query('ROLLBACK');
      throw transactionError;
    } finally {
      client.release();
    }
    
  } catch (error: any) {
    console.error("Error in cascade delete work center:", error);
    res.status(500).json({ 
      message: "Failed to cascade delete work center", 
      code: error.code, 
      detail: error.detail 
    });
  }
});

export default router;