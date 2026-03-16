import express, { Request, Response } from 'express';
import { accrualCalculationService } from '../../services/accrual-calculation-service';
import { dbPool } from '../../database';

const router = express.Router();

// ==================== ACCRUAL RULES CRUD ====================

/**
 * Get all accrual rules
 * GET /api/finance/accruals/rules
 */
router.get('/rules', async (req: Request, res: Response) => {
    try {
        const { company_code_id, is_active } = req.query;

        let query = `
            SELECT ar.*,
                   ea.account_number as expense_account_number,
                   ea.account_name as expense_account_name,
                   aa.account_number as accrual_account_number,
                   aa.account_name as accrual_account_name,
                   cc.code as company_code,
                   cc.name as company_name
            FROM accrual_rules ar
            LEFT JOIN gl_accounts ea ON ar.gl_expense_account_id = ea.id
            LEFT JOIN gl_accounts aa ON ar.gl_accrual_account_id = aa.id
            LEFT JOIN company_codes cc ON ar.company_code_id = cc.id
            WHERE 1=1
        `;

        const params: any[] = [];
        let paramIndex = 1;

        if (company_code_id) {
            query += ` AND ar.company_code_id = $${paramIndex}`;
            params.push(parseInt(company_code_id as string));
            paramIndex++;
        }

        if (is_active !== undefined) {
            query += ` AND ar.is_active = $${paramIndex}`;
            params.push(is_active === 'true');
            paramIndex++;
        }

        query += ` ORDER BY ar.created_at DESC`;

        const result = await dbPool.query(query, params);

        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
    } catch (error: any) {
        console.error('Error fetching accrual rules:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch accrual rules'
        });
    }
});

/**
 * Get single accrual rule by ID
 * GET /api/finance/accruals/rules/:id
 */
router.get('/rules/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await dbPool.query(`
            SELECT ar.*,
                   ea.account_number as expense_account_number,
                   ea.account_name as expense_account_name,
                   aa.account_number as accrual_account_number,
                   aa.account_name as accrual_account_name,
                   cc.code as company_code,
                   cc.name as company_name
            FROM accrual_rules ar
            LEFT JOIN gl_accounts ea ON ar.gl_expense_account_id = ea.id
            LEFT JOIN gl_accounts aa ON ar.gl_accrual_account_id = aa.id
            LEFT JOIN company_codes cc ON ar.company_code_id = cc.id
            WHERE ar.id = $1
        `, [parseInt(id)]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Accrual rule not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error: any) {
        console.error('Error fetching accrual rule:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch accrual rule'
        });
    }
});

/**
 * Create new accrual rule
 * POST /api/finance/accruals/rules
 */
router.post('/rules', async (req: Request, res: Response) => {
    try {
        const {
            rule_name,
            rule_description,
            accrual_type,
            calculation_method,
            gl_expense_account_id,
            gl_accrual_account_id,
            company_code_id,
            is_active,
            requires_reversal,
            provision_type
        } = req.body;

        // Validation
        if (!rule_name || !accrual_type || !calculation_method) {
            return res.status(400).json({
                success: false,
                error: 'rule_name, accrual_type, and calculation_method are required'
            });
        }

        // Check for duplicate rule name
        const duplicateCheck = await dbPool.query(
            'SELECT id FROM accrual_rules WHERE rule_name = $1',
            [rule_name]
        );

        if (duplicateCheck.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Accrual rule with this name already exists'
            });
        }

        // Insert new rule
        const result = await dbPool.query(`
            INSERT INTO accrual_rules (
                rule_name, rule_description, accrual_type, calculation_method,
                gl_expense_account_id, gl_accrual_account_id, company_code_id, is_active,
                requires_reversal, provision_type
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [
            rule_name,
            rule_description || null,
            accrual_type,
            calculation_method,
            gl_expense_account_id || null,
            gl_accrual_account_id || null,
            company_code_id || null,
            is_active !== undefined ? is_active : true,
            requires_reversal || false,
            provision_type || 'accrual'
        ]);

        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Accrual rule created successfully'
        });
    } catch (error: any) {
        console.error('Error creating accrual rule:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create accrual rule'
        });
    }
});

/**
 * Update accrual rule
 * PUT /api/finance/accruals/rules/:id
 */
router.put('/rules/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            rule_name,
            rule_description,
            accrual_type,
            calculation_method,
            gl_expense_account_id,
            gl_accrual_account_id,
            company_code_id,
            is_active
        } = req.body;

        // Check if rule exists
        const existingRule = await dbPool.query(
            'SELECT id FROM accrual_rules WHERE id = $1',
            [parseInt(id)]
        );

        if (existingRule.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Accrual rule not found'
            });
        }

        // Check for duplicate rule name (excluding current rule)
        if (rule_name) {
            const duplicateCheck = await dbPool.query(
                'SELECT id FROM accrual_rules WHERE rule_name = $1 AND id != $2',
                [rule_name, parseInt(id)]
            );

            if (duplicateCheck.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Accrual rule with this name already exists'
                });
            }
        }

        // Build dynamic update query
        const updates: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (rule_name !== undefined) {
            updates.push(`rule_name = $${paramIndex}`);
            params.push(rule_name);
            paramIndex++;
        }

        if (rule_description !== undefined) {
            updates.push(`rule_description = $${paramIndex}`);
            params.push(rule_description);
            paramIndex++;
        }

        if (accrual_type !== undefined) {
            updates.push(`accrual_type = $${paramIndex}`);
            params.push(accrual_type);
            paramIndex++;
        }

        if (calculation_method !== undefined) {
            updates.push(`calculation_method = $${paramIndex}`);
            params.push(calculation_method);
            paramIndex++;
        }

        if (gl_expense_account_id !== undefined) {
            updates.push(`gl_expense_account_id = $${paramIndex}`);
            params.push(gl_expense_account_id);
            paramIndex++;
        }

        if (gl_accrual_account_id !== undefined) {
            updates.push(`gl_accrual_account_id = $${paramIndex}`);
            params.push(gl_accrual_account_id);
            paramIndex++;
        }

        if (company_code_id !== undefined) {
            updates.push(`company_code_id = $${paramIndex}`);
            params.push(company_code_id);
            paramIndex++;
        }

        if (is_active !== undefined) {
            updates.push(`is_active = $${paramIndex}`);
            params.push(is_active);
            paramIndex++;
        }

        updates.push(`updated_at = NOW()`);

        if (updates.length === 1) { // Only updated_at
            return res.status(400).json({
                success: false,
                error: 'No fields to update'
            });
        }

        params.push(parseInt(id));

        const result = await dbPool.query(`
            UPDATE accrual_rules 
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `, params);

        res.json({
            success: true,
            data: result.rows[0],
            message: 'Accrual rule updated successfully'
        });
    } catch (error: any) {
        console.error('Error updating accrual rule:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update accrual rule'
        });
    }
});

/**
 * Delete/Deactivate accrual rule
 * DELETE /api/finance/accruals/rules/:id
 */
router.delete('/rules/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { hard_delete } = req.query;

        // Check if rule exists
        const existingRule = await dbPool.query(
            'SELECT id FROM accrual_rules WHERE id = $1',
            [parseInt(id)]
        );

        if (existingRule.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Accrual rule not found'
            });
        }

        // Check if rule has posted accruals
        const postedAccruals = await dbPool.query(
            'SELECT id FROM accrual_postings WHERE accrual_rule_id = $1 AND status = $2 LIMIT 1',
            [parseInt(id), 'posted']
        );

        if (postedAccruals.rows.length > 0 && hard_delete === 'true') {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete rule with posted accruals. Deactivate instead.'
            });
        }

        if (hard_delete === 'true') {
            // Hard delete
            await dbPool.query('DELETE FROM accrual_rules WHERE id = $1', [parseInt(id)]);
            res.json({
                success: true,
                message: 'Accrual rule deleted successfully'
            });
        } else {
            // Soft delete (deactivate)
            await dbPool.query(
                'UPDATE accrual_rules SET is_active = false, updated_at = NOW() WHERE id = $1',
                [parseInt(id)]
            );
            res.json({
                success: true,
                message: 'Accrual rule deactivated successfully'
            });
        }
    } catch (error: any) {
        console.error('Error deleting accrual rule:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to delete accrual rule'
        });
    }
});

// ==================== ACCRUAL CALCULATION & POSTING ====================

/**
 * Calculate accruals for a fiscal period
 * POST /api/finance/accruals/calculate
 */
router.post('/calculate', async (req: Request, res: Response) => {
    try {
        const { fiscal_year, fiscal_period, company_code_id } = req.body;

        if (!fiscal_year || !fiscal_period) {
            return res.status(400).json({
                success: false,
                error: 'fiscal_year and fiscal_period are required'
            });
        }

        const result = await accrualCalculationService.calculateAccrualsForPeriod(
            parseInt(fiscal_year),
            parseInt(fiscal_period),
            company_code_id ? parseInt(company_code_id) : undefined
        );

        res.json({
            success: true,
            data: result,
            message: `Calculated ${result.calculated} accrual entries totaling ${result.totalAmount.toFixed(2)}`
        });
    } catch (error: any) {
        console.error('Error calculating accruals:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to calculate accruals'
        });
    }
});

/**
 * Get calculated accruals for a period
 * GET /api/finance/accruals?fiscal_year=2026&fiscal_period=1&status=calculated
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const { fiscal_year, fiscal_period, status } = req.query;

        if (!fiscal_year || !fiscal_period) {
            return res.status(400).json({
                success: false,
                error: 'fiscal_year and fiscal_period query parameters are required'
            });
        }

        const accruals = await accrualCalculationService.getAccrualsForPeriod(
            parseInt(fiscal_year as string),
            parseInt(fiscal_period as string),
            status as string | undefined
        );

        res.json({
            success: true,
            data: accruals,
            count: accruals.length
        });
    } catch (error: any) {
        console.error('Error fetching accruals:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch accruals'
        });
    }
});

/**
 * Post accruals to GL
 * POST /api/finance/accruals/post
 */
router.post('/post', async (req: Request, res: Response) => {
    try {
        const { accrual_ids, posted_by, manual_amounts } = req.body;

        if (!accrual_ids || !Array.isArray(accrual_ids) || accrual_ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'accrual_ids array is required'
            });
        }

        if (!posted_by) {
            return res.status(400).json({
                success: false,
                error: 'posted_by is required'
            });
        }

        await accrualCalculationService.postAccruals(
            accrual_ids.map((id: any) => parseInt(id)),
            posted_by,
            manual_amounts
        );

        res.json({
            success: true,
            message: `Posted ${accrual_ids.length} accrual entries to GL`
        });
    } catch (error: any) {
        console.error('Error posting accruals:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to post accruals'
        });
    }
});

/**
 * Get pending reversals for a fiscal period
 * GET /api/finance/accruals/pending-reversals?fiscal_year=2026&fiscal_period=3
 */
router.get('/pending-reversals', async (req: Request, res: Response) => {
    try {
        const { fiscal_year, fiscal_period } = req.query;
        if (!fiscal_year || !fiscal_period) {
            return res.status(400).json({ success: false, error: 'fiscal_year and fiscal_period required' });
        }
        const data = await accrualCalculationService.getPendingReversals(
            parseInt(fiscal_year as string),
            parseInt(fiscal_period as string)
        );
        res.json({ success: true, data, count: data.length });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== ACCRUAL OBJECTS CRUD ====================

/**
 * Get all accrual objects
 * GET /api/finance/accruals/objects
 */
router.get('/objects', async (req: Request, res: Response) => {
    try {
        const { rule_id, status } = req.query;
        let query = `
            SELECT ao.*, ar.rule_name, cc.code as company_code
            FROM accrual_objects ao
            LEFT JOIN accrual_rules ar ON ao.accrual_rule_id = ar.id
            LEFT JOIN company_codes cc ON ao.company_code_id = cc.id
            WHERE 1=1
        `;
        const params: any[] = [];
        let idx = 1;
        if (rule_id) { query += ` AND ao.accrual_rule_id = $${idx++}`; params.push(parseInt(rule_id as string)); }
        if (status) { query += ` AND ao.status = $${idx++}`; params.push(status); }
        query += ` ORDER BY ao.created_at DESC`;
        const result = await dbPool.query(query, params);
        res.json({ success: true, data: result.rows, count: result.rows.length });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Create accrual object
 * POST /api/finance/accruals/objects
 */
router.post('/objects', async (req: Request, res: Response) => {
    try {
        const { object_name, description, accrual_rule_id, total_amount, start_date, end_date, company_code_id } = req.body;
        if (!object_name || !accrual_rule_id || !total_amount || !start_date || !end_date) {
            return res.status(400).json({ success: false, error: 'object_name, accrual_rule_id, total_amount, start_date, end_date are required' });
        }
        const result = await dbPool.query(`
            INSERT INTO accrual_objects (object_name, description, accrual_rule_id, total_amount, start_date, end_date, company_code_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
        `, [object_name, description || null, accrual_rule_id, total_amount, start_date, end_date, company_code_id || null]);
        res.status(201).json({ success: true, data: result.rows[0], message: 'Accrual object created successfully' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Update accrual object status
 * PATCH /api/finance/accruals/objects/:id
 */
router.patch('/objects/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const result = await dbPool.query(
            `UPDATE accrual_objects SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            [status, parseInt(id)]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Accrual object not found' });
        res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Health check
 * GET /api/finance/accruals/health
 */
router.get('/health', (req: Request, res: Response) => {
    res.json({
        success: true,
        message: 'Accrual routes are healthy',
        timestamp: new Date().toISOString()
    });
});

export default router;
