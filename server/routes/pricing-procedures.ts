import express from 'express';
import { pool } from '../db';
import { pricingCalculationService } from '../services/pricing-calculation';

const router = express.Router();

// Get all pricing procedures (Global - No Company Code)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pp.*,
             COALESCE(
               JSON_AGG(
                 JSON_BUILD_OBJECT(
                   'id', pps.id,
                   'step_number', pps.step_number,
                   'condition_type_code', pps.condition_type_code,
                   'condition_name', ct.condition_name,
                   'is_mandatory', pps.is_mandatory,
                   'account_key', pps.account_key
                 ) ORDER BY pps.step_number
               ) FILTER (WHERE pps.id IS NOT NULL), '[]'::json
             ) as steps
      FROM pricing_procedures pp
      LEFT JOIN pricing_procedure_steps pps ON pp.id = pps.procedure_id
      LEFT JOIN condition_types ct ON pps.condition_type_code = ct.condition_code 
      -- Note: removed ct.company_code_id join as condition types might also be global or we pick one.
      -- Ideally condition_types should also be global or we accept duplicates in join for now.
      WHERE pp."_deletedAt" IS NULL
      GROUP BY pp.id
      ORDER BY pp.procedure_code
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pricing procedures:', error);
    res.status(500).json({ error: 'Failed to fetch pricing procedures' });
  }
});

// Get specific procedure steps by ID
router.get('/:id/steps', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[PRICING-PROCEDURES] Fetching steps for procedure ID: ${id}`);

    const result = await pool.query(`
      SELECT 
        pps.id,
        pps.procedure_id,
        pps.counter,
        pps.step_number,
        pps.condition_type_code,
        pps.description,
        pps.from_step,
        pps.to_step,
        pps.manual_entry,
        pps.comments,
        pps.is_mandatory,
        pps.account_key,
        pps.created_at,
        -- Fetch condition name using subquery to handle company-specific types
        (SELECT condition_name FROM condition_types ct WHERE ct.condition_code = pps.condition_type_code LIMIT 1) as condition_name
      FROM pricing_procedure_steps pps
      WHERE pps.procedure_id = $1
      ORDER BY pps.counter ASC
    `, [id]);

    console.log(`[PRICING-PROCEDURES] Found ${result.rows.length} steps for ID ${id}`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching procedure steps:', error);
    res.status(500).json({ error: 'Failed to fetch procedure steps' });
  }
});

// Create pricing procedure
router.post('/', async (req, res) => {
  try {
    const { procedure_code, procedure_name, description, is_active = true } = req.body;

    // Check if procedure code already exists
    const existingResult = await pool.query(`
      SELECT id FROM pricing_procedures 
      WHERE procedure_code = $1 AND "_deletedAt" IS NULL
    `, [procedure_code]);

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Procedure code already exists' });
    }

    // Create the procedure
    const result = await pool.query(`
      INSERT INTO pricing_procedures (
        procedure_code, procedure_name, description, is_active,
        created_by, updated_by, "_tenantId"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      procedure_code,
      procedure_name,
      description,
      is_active,
      (req as any).user?.id || 1,
      (req as any).user?.id || 1,
      (req as any).user?.tenantId || '001'
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating pricing procedure:', error);
    res.status(500).json({ error: 'Failed to create pricing procedure' });
  }
});

// Update pricing procedure
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { procedure_name, description, is_active } = req.body;

    const result = await pool.query(`
      UPDATE pricing_procedures 
      SET procedure_name = $1, description = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP, updated_by = $4
      WHERE id = $5 AND "_deletedAt" IS NULL
      RETURNING *
    `, [procedure_name, description, is_active, (req as any).user?.id || 1, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pricing procedure not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating pricing procedure:', error);
    res.status(500).json({ error: 'Failed to update pricing procedure' });
  }
});

// Get procedure steps
router.get('/:id/steps', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[API] Fetching steps for procedure ID: ${id}`);
    const result = await pool.query(`
      SELECT 
        pps.id,
        pps.procedure_id,
        pps.counter,
        pps.step_number,
        pps.condition_type_code,
        pps.description,
        pps.from_step,
        pps.to_step,
        pps.manual_entry,
        pps.comments,
        pps.is_mandatory,
        pps.account_key,
        pps.created_at,
        -- Fetch the first available condition name for this code to avoid 
        -- duplicates from multiple company definitions
        (SELECT condition_name FROM condition_types ct WHERE ct.condition_code = pps.condition_type_code LIMIT 1) as condition_name
      FROM pricing_procedure_steps pps
      WHERE pps.procedure_id = $1
      ORDER BY pps.counter ASC
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching procedure steps:', error);
    res.status(500).json({ error: 'Failed to fetch procedure steps' });
  }
});

// Create procedure step
router.post('/:id/steps', async (req, res) => {
  try {
    const { id } = req.params;
    let {
      counter,
      condition_type_code,
      description,
      step_number,
      is_mandatory = false,
      account_key,
      // New SAP-compatible fields
      from_step,
      to_step,
      requirement,
      is_statistical = false,
      is_printable = true,
      is_subtotal = false,
      manual_entry = false,
      comments,
      accrual_key
    } = req.body;

    // Auto-generate counter if not provided
    if (!counter) {
      const maxCounterResult = await pool.query(
        'SELECT COALESCE(MAX(counter), 0) as max_counter FROM pricing_procedure_steps WHERE procedure_id = $1',
        [id]
      );
      counter = (maxCounterResult.rows[0]?.max_counter || 0) + 1;
    }

    const result = await pool.query(`
      INSERT INTO pricing_procedure_steps (
        procedure_id, counter, condition_type_code, description, step_number, is_mandatory, account_key,
        from_step, to_step, requirement, is_statistical, is_printable, is_subtotal, manual_entry, accrual_key, comments
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [id, counter, condition_type_code, description, step_number, is_mandatory, account_key,
      from_step, to_step, requirement, is_statistical, is_printable, is_subtotal, manual_entry, accrual_key, comments]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating procedure step:', error);
    res.status(500).json({ error: 'Failed to create procedure step' });
  }
});

// Update procedure step
router.put('/steps/:stepId', async (req, res) => {
  try {
    const { stepId } = req.params;
    const {
      counter,
      step_number,
      condition_type_code,
      description,
      is_mandatory,
      account_key,
      // New SAP-compatible fields
      from_step,
      to_step,
      requirement,
      is_statistical,
      is_printable,
      is_subtotal,
      manual_entry,
      accrual_key,
      comments
    } = req.body;

    const result = await pool.query(`
      UPDATE pricing_procedure_steps
      SET 
        counter = COALESCE($1, counter),
        step_number = COALESCE($2, step_number),
        condition_type_code = $3, -- Allow setting to null
        description = COALESCE($4, description),
        is_mandatory = COALESCE($5, is_mandatory),
        account_key = $6,
        from_step = $7,
        to_step = $8,
        requirement = $9,
        is_statistical = COALESCE($10, is_statistical),
        is_printable = COALESCE($11, is_printable),
        is_subtotal = COALESCE($12, is_subtotal),
        manual_entry = COALESCE($13, manual_entry),
        accrual_key = $14,
        comments = COALESCE($15, comments),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $16
      RETURNING *
    `, [counter, step_number, condition_type_code, description, is_mandatory, account_key,
      from_step, to_step, requirement, is_statistical, is_printable, is_subtotal, manual_entry, accrual_key, comments, stepId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Step not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating step:', error);
    res.status(500).json({ error: 'Failed to update step' });
  }
});

// Delete procedure step
router.delete('/steps/:stepId', async (req, res) => {
  try {
    const { stepId } = req.params;
    const result = await pool.query('DELETE FROM pricing_procedure_steps WHERE id = $1 RETURNING *', [stepId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Step not found' });
    }

    res.json({ message: 'Step deleted successfully' });
  } catch (error) {
    console.error('Error deleting step:', error);
    res.status(500).json({ error: 'Failed to delete step' });
  }
});

// Apply standard template
router.post('/templates/:templateType', async (req, res) => {
  try {
    const { templateType } = req.params;

    let procedures = [];

    if (templateType === 'standard') {
      procedures = [
        {
          code: 'MALLSTD01',
          name: 'Standard Sales Pricing',
          description: 'Standard pricing for normal sales orders',
          steps: [
            { step: 10, code: 'STD1', mandatory: true, base: 'gross', account: '4000' },
            { step: 20, code: 'CDIS01', mandatory: false, base: 'net', account: '4100' },
            { step: 30, code: 'CDIS02', mandatory: false, base: 'net', account: '4100' },
            { step: 40, code: 'FEE01', mandatory: false, base: 'net', account: '4200' },
            { step: 90, code: 'TAX01', mandatory: true, base: 'net', account: '2200' }
          ]
        },
        {
          code: 'MALLRET01',
          name: 'Retail Pricing',
          description: 'Pricing for retail customers with loyalty discounts',
          steps: [
            { step: 10, code: 'STD1', mandatory: true, base: 'gross', account: '4000' },
            { step: 20, code: 'CDIS04', mandatory: false, base: 'net', account: '4100' },
            { step: 30, code: 'MDIS02', mandatory: false, base: 'net', account: '4100' },
            { step: 50, code: 'FEE02', mandatory: false, base: 'net', account: '4200' },
            { step: 90, code: 'TAX01', mandatory: true, base: 'net', account: '2200' }
          ]
        }
      ];
    }

    // Create procedures and steps
    for (const procedure of procedures) {
      // Create procedure
      const procResult = await pool.query(`
        INSERT INTO pricing_procedures (
          procedure_code, procedure_name, description, is_active
        ) VALUES ($1, $2, $3, true)
        ON CONFLICT (procedure_code) DO NOTHING
        RETURNING id
      `, [procedure.code, procedure.name, procedure.description]);

      let procedureId;
      if (procResult.rows.length > 0) {
        procedureId = procResult.rows[0].id;
      } else {
        // Fetch existing ID if conflict
        const existing = await pool.query('SELECT id FROM pricing_procedures WHERE procedure_code = $1', [procedure.code]);
        if (existing.rows.length > 0) procedureId = existing.rows[0].id;
      }

      if (procedureId) {
        // Create steps
        for (const step of procedure.steps) {
          await pool.query(`
            INSERT INTO pricing_procedure_steps (
              procedure_id, condition_type_code, step_number, is_mandatory, 
              calculation_base, account_key
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (procedure_id, step_number) DO NOTHING
          `, [procedureId, step.code, step.step, step.mandatory, step.base, step.account]);
        }
      }
    }

    res.json({
      message: `${templateType} template applied successfully`,
      procedures_created: procedures.length
    });
  } catch (error) {
    console.error('Error applying template:', error);
    res.status(500).json({ error: 'Failed to apply template' });
  }
});

// Delete pricing procedure
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingResult = await pool.query('SELECT id FROM pricing_procedures WHERE id = $1 AND "_deletedAt" IS NULL', [id]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pricing procedure not found' });
    }

    // Since it's a soft delete, we do NOT drop steps anymore.
    // Instead we just mutate the master record to visually drop references without cascading deletes.
    const result = await pool.query(`
      UPDATE pricing_procedures 
      SET is_active = false, "_deletedAt" = CURRENT_TIMESTAMP, updated_by = $2 
      WHERE id = $1 
      RETURNING *
    `, [id, (req as any).user?.id || 1]);

    // 
    // Delete procedure -- REMOVED BY SOFT DELETE OVERRIDE 
    // const result = await pool.query(`DELETE FROM pricing_procedures WHERE id = $1 RETURNING *`, [id]);

    // if (result.rows.length === 0) {
    //   return res.status(404).json({ error: 'Pricing procedure not found' });
    // }

    res.json({ message: 'Pricing procedure deleted successfully' });
  } catch (error) {
    console.error('Error deleting pricing procedure:', error);
    res.status(500).json({ error: 'Failed to delete pricing procedure' });
  }
});

/**
 * GET /api/pricing-procedures/price-lookup
 * Fetches the condition record price for a specific material + customer combination.
 * Used to auto-fill unit_price from PR00 condition record when a material is selected.
 * Query params: conditionType, materialId, customerId, salesOrgId, distributionChannelId, divisionId
 */
router.get('/price-lookup', async (req, res) => {
  try {
    const {
      conditionType = 'PR00',
      materialId,
      customerId,
      salesOrgId,
    } = req.query as Record<string, string>;

    // Resolve material_group for the material
    let materialGroup: string | null = null;
    if (materialId) {
      try {
        const mgRes = await pool.query(
          `SELECT material_group FROM materials WHERE id = $1 LIMIT 1`,
          [parseInt(materialId)]
        );
        materialGroup = mgRes.rows[0]?.material_group || null;
      } catch { /* ignore */ }
    }

    // Check if material_group column exists in condition_records
    const colCheck = await pool.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'condition_records' AND column_name = 'material_group' LIMIT 1
    `);
    const hasMG = colCheck.rows.length > 0;

    let result;
    if (hasMG) {
      result = await pool.query(`
        SELECT
          amount,
          currency,
          CASE
            WHEN customer_id IS NOT NULL AND material_id IS NOT NULL THEN 'Customer + Material'
            WHEN customer_id IS NOT NULL AND material_group IS NOT NULL THEN 'Customer + Material Group'
            WHEN customer_id IS NOT NULL THEN 'Customer'
            WHEN material_id IS NOT NULL THEN 'Material'
            WHEN material_group IS NOT NULL THEN 'Material Group'
            ELSE 'General'
          END as access_level
        FROM condition_records
        WHERE condition_type = $1
          AND is_active = true
          AND valid_from <= CURRENT_DATE
          AND valid_to   >= CURRENT_DATE
          AND (
            (customer_id = $2 AND material_id = $3) OR
            (customer_id = $2 AND material_group = $4 AND material_id IS NULL) OR
            (customer_id = $2 AND material_id IS NULL AND material_group IS NULL) OR
            (customer_id IS NULL AND material_id = $3) OR
            (customer_id IS NULL AND material_group = $4 AND material_id IS NULL) OR
            (customer_id IS NULL AND material_id IS NULL AND material_group IS NULL)
          )
        ORDER BY
          CASE
            WHEN customer_id IS NOT NULL AND material_id IS NOT NULL THEN 1
            WHEN customer_id IS NOT NULL AND material_group IS NOT NULL THEN 2
            WHEN customer_id IS NOT NULL THEN 3
            WHEN material_id IS NOT NULL THEN 4
            WHEN material_group IS NOT NULL THEN 5
            ELSE 6
          END
        LIMIT 1
      `, [
        conditionType,
        customerId ? parseInt(customerId) : null,
        materialId ? parseInt(materialId) : null,
        materialGroup,
      ]);
    } else {
      result = await pool.query(`
        SELECT amount, currency,
          CASE
            WHEN customer_id IS NOT NULL AND material_id IS NOT NULL THEN 'Customer + Material'
            WHEN customer_id IS NOT NULL THEN 'Customer'
            WHEN material_id IS NOT NULL THEN 'Material'
            ELSE 'General'
          END as access_level
        FROM condition_records
        WHERE condition_type = $1
          AND is_active = true
          AND valid_from <= CURRENT_DATE
          AND valid_to   >= CURRENT_DATE
          AND (
            (customer_id = $2 AND material_id = $3) OR
            (customer_id = $2 AND material_id IS NULL) OR
            (customer_id IS NULL AND material_id = $3) OR
            (customer_id IS NULL AND material_id IS NULL)
          )
        ORDER BY
          CASE
            WHEN customer_id IS NOT NULL AND material_id IS NOT NULL THEN 1
            WHEN customer_id IS NOT NULL THEN 2
            WHEN material_id IS NOT NULL THEN 3
            ELSE 4
          END
        LIMIT 1
      `, [
        conditionType,
        customerId ? parseInt(customerId) : null,
        materialId ? parseInt(materialId) : null,
      ]);
    }

    if (result.rows.length === 0) {
      return res.json({ found: false, price: null, currency: null, accessLevel: null });
    }

    const row = result.rows[0];
    return res.json({
      found: true,
      price: parseFloat(row.amount) || 0,
      currency: row.currency || 'INR',
      accessLevel: row.access_level,
      conditionType,
    });
  } catch (error: any) {
    console.error('[Price Lookup] Error:', error);
    res.status(500).json({ error: 'Failed to lookup price', message: error.message });
  }
});

/**
 * POST /api/pricing-procedures/:procedureCode/preview
 * Runs the pricing engine in preview mode for given items + context.
 * Returns per-step condition values so the frontend can display them live.
 */
router.post('/:procedureCode/preview', async (req, res) => {
  try {
    const { procedureCode } = req.params;
    const { items = [], salesOrgId, distributionChannelId, divisionId, customerId, manualOverrides = {} } = req.body;

    // Calculate for the first item (or aggregated) — gives the per-step breakdown
    const firstItem = items[0];
    if (!firstItem) {
      return res.json({ conditions: [], subtotal: 0, taxTotal: 0, grandTotal: 0 });
    }

    // ── Helper: resolve material_group for a given material_id ──────────────
    const getMaterialGroup = async (materialId: number | undefined): Promise<string | undefined> => {
      if (!materialId) return undefined;
      try {
        const r = await pool.query(
          `SELECT material_group FROM materials WHERE id = $1 LIMIT 1`,
          [materialId]
        );
        return r.rows[0]?.material_group || undefined;
      } catch { return undefined; }
    };

    // ── Helper: resolve destination location for a given customer_id ─────────────────
    let destinationCountry: string | undefined = undefined;
    let destinationState: string | undefined = undefined;
    if (customerId) {
      try {
        const queryStr = `
          SELECT ca.state, 
                 COALESCE((SELECT code FROM states s WHERE s.name ILIKE ca.state OR s.code ILIKE ca.state LIMIT 1), ca.state) as state_code,
                 COALESCE(c.code, ca.country) as country_code 
          FROM customer_addresses ca
          LEFT JOIN countries c ON c.name ILIKE ca.country OR c.code = ca.country
          WHERE ca.customer_id = $1 
          ORDER BY CASE WHEN ca.address_type = 'ship_to' THEN 1 ELSE 2 END ASC, ca.is_primary DESC, ca.id DESC 
          LIMIT 1
        `;
        const cRes = await pool.query(queryStr, [parseInt(String(customerId))]);
        if (cRes.rows.length > 0) {
          destinationCountry = cRes.rows[0].country_code;
          destinationState = cRes.rows[0].state_code || cRes.rows[0].state;
        }
      } catch (err) { console.error('Preview Dest Error', err); }
    }

    // ── Helper: resolve departure location from a plant_id ─────────────────
    const getDepartureLocation = async (plantId: number | string | undefined | null): Promise<{ country?: string, state?: string }> => {
      if (!plantId) return {};
      try {
        const queryStr = `
          SELECT p.country as country_code, 
                 COALESCE((SELECT code FROM states s WHERE s.name ILIKE p.state OR s.code ILIKE p.state LIMIT 1), p.state) as state_code,
                 p.state
          FROM plants p
          WHERE p.id = $1 LIMIT 1
        `;
        const pRes = await pool.query(queryStr, [parseInt(String(plantId))]);
        if (pRes.rows.length > 0) {
          return {
            country: pRes.rows[0].country_code || undefined,
            state: pRes.rows[0].state_code || pRes.rows[0].state || undefined
          };
        }
        return {};
      } catch (err) { console.error('Preview Dept Error', err); return {}; }
    };

    const firstMaterialGroup = await getMaterialGroup(
      firstItem.material_id ? parseInt(firstItem.material_id) : undefined
    );
    const firstDepartureLoc = await getDepartureLocation(firstItem.plant_id);

    const baseValue = parseFloat(firstItem.unit_price || 0) * parseFloat(firstItem.quantity || 1);

    const context = {
      materialId: firstItem.material_id ? parseInt(firstItem.material_id) : undefined,
      materialGroup: firstMaterialGroup,
      customerId: customerId ? parseInt(customerId) : undefined,
      salesOrgId: salesOrgId ? parseInt(salesOrgId) : undefined,
      distributionChannelId: distributionChannelId ? parseInt(distributionChannelId) : undefined,
      divisionId: divisionId ? parseInt(divisionId) : undefined,
      quantity: parseFloat(firstItem.quantity || 1),
      manualOverrides: manualOverrides as Record<string, string>,
      departureCountry: firstDepartureLoc.country,
      departureState: firstDepartureLoc.state,
      destinationCountry,
      destinationState,
    };

    const result = await pricingCalculationService.calculatePricing(
      procedureCode,
      baseValue,
      context
    );


    // Aggregate for all items if more than one
    let aggregatedConditions = result.conditions;
    let totalSubtotal = result.subtotal;
    let totalDiscount = result.discountTotal;
    let totalTax = result.taxTotal;
    let totalNet = result.netTotal;
    let totalGrand = result.grandTotal;

    if (items.length > 1) {
      // Re-run for each additional item and sum up
      for (let i = 1; i < items.length; i++) {
        const item = items[i];
        const itemBase = parseFloat(item.unit_price || 0) * parseFloat(item.quantity || 1);
        if (itemBase <= 0) continue;

        const itemMaterialGroup = await getMaterialGroup(
          item.material_id ? parseInt(item.material_id) : undefined
        );

        const itemDepartureLoc = await getDepartureLocation(item.plant_id);

        const itemResult = await pricingCalculationService.calculatePricing(
          procedureCode,
          itemBase,
          {
            materialId: item.material_id ? parseInt(item.material_id) : undefined,
            materialGroup: itemMaterialGroup,
            customerId: customerId ? parseInt(customerId) : undefined,
            salesOrgId: salesOrgId ? parseInt(salesOrgId) : undefined,
            distributionChannelId: distributionChannelId ? parseInt(distributionChannelId) : undefined,
            divisionId: divisionId ? parseInt(divisionId) : undefined,
            quantity: parseFloat(item.quantity || 1),
            manualOverrides: manualOverrides as Record<string, string>,
            departureCountry: itemDepartureLoc.country,
            departureState: itemDepartureLoc.state,
            destinationCountry,
            destinationState,
          }
        );

        totalSubtotal += itemResult.subtotal;
        totalDiscount += itemResult.discountTotal;
        totalTax += itemResult.taxTotal;
        totalNet += itemResult.netTotal;
        totalGrand += itemResult.grandTotal;

        // Merge condition values by step
        for (const cond of itemResult.conditions) {
          const existing = aggregatedConditions.find(c => c.step === cond.step);
          if (existing) {
            existing.calculatedValue += cond.calculatedValue;
            existing.baseValue += cond.baseValue;
          }
        }
      }
    }

    // Filter out unconfigured or irrelevant conditions (0.00 value and 0.00 rate) unless they are subtotals
    const filteredConditions = aggregatedConditions.filter(c => {
      if (c.isSubtotal) return true; // Always keep subtotals
      if (!c.conditionType) return true; // Keep structural steps without specific conditions

      // If a condition (like IGST or VPRS) evaluates to exactly 0 rate and 0 value,
      // it means no record was found or it mathematically zeroed out.
      // The user wants these hidden from the UI cleanly.
      if (c.rate === 0 && c.calculatedValue === 0) return false;

      return true;
    });

    res.json({
      conditions: filteredConditions,
      subtotal: totalSubtotal,
      discountTotal: totalDiscount,
      taxTotal: totalTax,
      netTotal: totalNet,
      grandTotal: totalGrand,
      procedureCode,
      itemCount: items.length,
    });
  } catch (error: any) {
    console.error('[Pricing Preview] Error:', error);
    res.status(500).json({ error: 'Failed to generate pricing preview', message: error.message });
  }
});

export default router;
