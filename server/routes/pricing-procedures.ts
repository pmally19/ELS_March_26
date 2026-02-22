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
      WHERE procedure_code = $1
    `, [procedure_code]);

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Procedure code already exists' });
    }

    // Create the procedure
    const result = await pool.query(`
      INSERT INTO pricing_procedures (
        procedure_code, procedure_name, description, is_active
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [procedure_code, procedure_name, description, is_active]);

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
      SET procedure_name = $1, description = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [procedure_name, description, is_active, id]);

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

    // Delete steps first
    await pool.query(`DELETE FROM pricing_procedure_steps WHERE procedure_id = $1`, [id]);

    // Delete procedure
    const result = await pool.query(`DELETE FROM pricing_procedures WHERE id = $1 RETURNING *`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pricing procedure not found' });
    }

    res.json({ message: 'Pricing procedure deleted successfully' });
  } catch (error) {
    console.error('Error deleting pricing procedure:', error);
    res.status(500).json({ error: 'Failed to delete pricing procedure' });
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
    const { items = [], salesOrgId, distributionChannelId, divisionId, customerId } = req.body;



    // Calculate for the first item (or aggregated) — gives the per-step breakdown
    const firstItem = items[0];
    if (!firstItem) {
      return res.json({ conditions: [], subtotal: 0, taxTotal: 0, grandTotal: 0 });
    }

    const baseValue = parseFloat(firstItem.unit_price || 0) * parseFloat(firstItem.quantity || 1);

    const result = await pricingCalculationService.calculatePricing(
      procedureCode,
      baseValue,
      {
        materialId: firstItem.material_id ? parseInt(firstItem.material_id) : undefined,
        customerId: customerId ? parseInt(customerId) : undefined,
        salesOrgId: salesOrgId ? parseInt(salesOrgId) : undefined,
        distributionChannelId: distributionChannelId ? parseInt(distributionChannelId) : undefined,
        divisionId: divisionId ? parseInt(divisionId) : undefined,
        quantity: parseFloat(firstItem.quantity || 1),
      }
    );

    // Aggregate for all items if more than one
    let aggregatedConditions = result.conditions;
    let totalSubtotal = result.subtotal;
    let totalTax = result.taxTotal;
    let totalGrand = result.grandTotal;

    if (items.length > 1) {
      // Re-run for each additional item and sum up
      for (let i = 1; i < items.length; i++) {
        const item = items[i];
        const itemBase = parseFloat(item.unit_price || 0) * parseFloat(item.quantity || 1);
        if (itemBase <= 0) continue;

        const itemResult = await pricingCalculationService.calculatePricing(
          procedureCode,
          itemBase,
          {
            materialId: item.material_id ? parseInt(item.material_id) : undefined,
            customerId: customerId ? parseInt(customerId) : undefined,
            salesOrgId: salesOrgId ? parseInt(salesOrgId) : undefined,
            distributionChannelId: distributionChannelId ? parseInt(distributionChannelId) : undefined,
            divisionId: divisionId ? parseInt(divisionId) : undefined,
            quantity: parseFloat(item.quantity || 1),
          }
        );

        totalSubtotal += itemResult.subtotal;
        totalTax += itemResult.taxTotal;
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

    res.json({
      conditions: aggregatedConditions,
      subtotal: totalSubtotal,
      taxTotal: totalTax,
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
