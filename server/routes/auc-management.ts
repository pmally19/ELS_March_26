import { Router } from 'express';
import { pool } from '../db.js';
import { z } from 'zod';
import { AUCCapitalizationService } from '../services/auc-capitalization-service.js';
import { AUCGLPostingService } from '../services/auc-gl-posting-service.js';

const router = Router();
const capitalizationService = new AUCCapitalizationService();
const glPostingService = new AUCGLPostingService();

// Validation schemas
const createAUCSchema = z.object({
    asset_number: z.string().optional(),
    asset_description: z.string().min(1),
    asset_class_id: z.number().int().positive(),
    company_code_id: z.number().int().positive(),
    cost_center_id: z.number().int().positive().optional(),
    plant_id: z.number().int().positive().optional(),
    construction_start_date: z.string().transform(str => new Date(str)),
    planned_capitalization_date: z.string().transform(str => new Date(str)).optional(),
    wip_account_code: z.string().min(1),
    settlement_profile: z.string().optional(),
    project_code: z.string().optional(),
    user_id: z.number().int().positive()
});

const addCostSchema = z.object({
    auc_id: z.number().int().positive(),
    cost_type: z.enum(['material', 'labor', 'overhead', 'external_service', 'other']),
    cost_element_code: z.string().min(1),
    cost_amount: z.number().positive(),
    posting_date: z.string().transform(str => new Date(str)),
    vendor_id: z.number().int().positive().optional(),
    purchase_order_id: z.number().int().positive().optional(),
    goods_receipt_id: z.number().int().positive().optional(),
    document_number: z.string().optional(),
    description: z.string().optional(),
    cost_center_id: z.number().int().positive().optional(),
    user_id: z.number().int().positive()
});

const capitalizeAUCSchema = z.object({
    auc_id: z.number().int().positive(),
    asset_number: z.string().optional(),
    asset_description: z.string().optional(),
    capitalization_date: z.string().transform(str => new Date(str)),
    depreciation_start_date: z.string().transform(str => new Date(str)).optional(),
    asset_class_id: z.number().int().positive().optional(),
    depreciation_method_id: z.number().int().positive().optional(),
    user_id: z.number().int().positive()
});

const settleAUCSchema = z.object({
    auc_id: z.number().int().positive(),
    amount: z.number().positive(),
    receiver_cost_center: z.string().min(1),
    posting_date: z.string().transform(str => new Date(str)),
    description: z.string().optional(),
    user_id: z.number().int().positive()
});

/**
 * GET /api/auc-management
 * Get all AUCs with filtering and search
 */
router.get('/', async (req, res) => {
    try {
        const {
            status,
            company_code_id,
            asset_class_id,
            search,
            from_date,
            to_date,
            limit = '100',
            offset = '0'
        } = req.query;

        let query = `
      SELECT 
        am.*,
        ac.name as asset_class_name,
        cc.code as company_code,
        cc.name as company_name,
        cost_summary.total_accumulated_costs as total_cost,
        cost_summary.settled_costs as settled_cost,
        cost_summary.unsettled_costs as unsettled_cost,
        cost_summary.total_cost_entries as cost_count
      FROM auc_master am
      JOIN asset_classes ac ON am.asset_class_id = ac.id
      JOIN company_codes cc ON am.company_code_id = cc.id
      LEFT JOIN v_auc_summary cost_summary ON am.id = cost_summary.id
      WHERE 1=1
    `;

        const params: any[] = [];
        let paramIndex = 1;

        if (status) {
            query += ` AND am.auc_status = $${paramIndex++}`;
            params.push(status);
        }

        if (company_code_id) {
            query += ` AND am.company_code_id = $${paramIndex++}`;
            params.push(company_code_id);
        }

        if (asset_class_id) {
            query += ` AND am.asset_class_id = $${paramIndex++}`;
            params.push(asset_class_id);
        }

        if (search) {
            query += ` AND (
        am.asset_number ILIKE $${paramIndex} OR 
        am.name ILIKE $${paramIndex}
      )`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (from_date) {
            query += ` AND am.construction_start_date >= $${paramIndex++}`;
            params.push(from_date);
        }

        if (to_date) {
            query += ` AND am.construction_start_date <= $${paramIndex++}`;
            params.push(to_date);
        }

        query += ` ORDER BY am.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(parseInt(limit as string), parseInt(offset as string));

        const result = await pool.query(query, params);

        // Get total count
        let countQuery = `
      SELECT COUNT(*) as total
      FROM auc_master am
      WHERE 1=1
    `;
        const countParams: any[] = [];
        let countIndex = 1;

        if (status) {
            countQuery += ` AND am.auc_status = $${countIndex++}`;
            countParams.push(status);
        }
        if (company_code_id) {
            countQuery += ` AND am.company_code_id = $${countIndex++}`;
            countParams.push(company_code_id);
        }
        if (asset_class_id) {
            countQuery += ` AND am.asset_class_id = $${countIndex++}`;
            countParams.push(asset_class_id);
        }
        if (search) {
            countQuery += ` AND (am.asset_number ILIKE $${countIndex} OR am.name ILIKE $${countIndex})`;
            countParams.push(`%${search}%`);
        }

        const countResult = await pool.query(countQuery, countParams);

        res.json({
            success: true,
            data: result.rows,
            total: parseInt(countResult.rows[0].total),
            limit: parseInt(limit as string),
            offset: parseInt(offset as string)
        });

    } catch (error: any) {
        console.error('Error fetching AUCs:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/auc-management/:id
 * Get AUC details by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      SELECT 
        am.*,
        ac.name as asset_class_name,
        ac.code as asset_class_code,
        cc.code as company_code,
        cc.name as company_name,
        cost_summary.total_accumulated_costs as total_cost,
        cost_summary.settled_costs as settled_cost,
        cost_summary.unsettled_costs as unsettled_cost,
        cost_summary.total_cost_entries as cost_count,
        parent.asset_number as parent_asset_number,
        parent.name as parent_asset_description
      FROM auc_master am
      JOIN asset_classes ac ON am.asset_class_id = ac.id
      JOIN company_codes cc ON am.company_code_id = cc.id
      LEFT JOIN v_auc_summary cost_summary ON am.id = cost_summary.id
      LEFT JOIN asset_master parent ON am.parent_asset_id = parent.id
      WHERE am.id = $1
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'AUC not found' });
        }

        res.json({ success: true, data: result.rows[0] });

    } catch (error: any) {
        console.error('Error fetching AUC:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/auc-management
 * Create a new AUC
 */
router.post('/', async (req, res) => {
    try {
        const validated = createAUCSchema.parse(req.body);

        // Generate asset number if not provided
        let assetNumber = validated.asset_number;
        if (!assetNumber) {
            const companyResult = await pool.query(
                'SELECT code FROM company_codes WHERE id = $1',
                [validated.company_code_id]
            );
            const classResult = await pool.query(
                'SELECT code FROM asset_classes WHERE id = $1',
                [validated.asset_class_id]
            );

            const seqResult = await pool.query(
                'SELECT COUNT(*) + 1 as next_num FROM asset_master WHERE company_code_id = $1',
                [validated.company_code_id]
            );

            assetNumber = `AUC-${companyResult.rows[0].code}-${classResult.rows[0].code}-${String(seqResult.rows[0].next_num).padStart(6, '0')}`;
        }

        const result = await pool.query(`
      INSERT INTO auc_master (
        asset_number,
        name,
        asset_class_id,
        company_code_id,
        cost_center_id,
        plant_id,
        auc_status,
        construction_start_date,
        planned_capitalization_date,
        wip_account_code,
        settlement_profile,
        created_by,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'in_progress', $7, $8, $9, $10, $11, NOW())
      RETURNING *
    `, [
            assetNumber,
            validated.asset_description,
            validated.asset_class_id,
            validated.company_code_id,
            validated.cost_center_id || null,
            validated.plant_id || null,
            validated.construction_start_date,
            validated.planned_capitalization_date || null,
            validated.wip_account_code,
            validated.settlement_profile || null,
            validated.user_id
        ]);

        res.status(201).json({
            success: true,
            message: 'AUC created successfully',
            data: result.rows[0]
        });

    } catch (error: any) {
        console.error('Error creating AUC:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/auc-management/costs
 * Add cost to AUC
 */
router.post('/costs', async (req, res) => {
    try {
        const validated = addCostSchema.parse(req.body);

        const result = await pool.query(`
      INSERT INTO auc_cost_tracking (
        auc_asset_id,
        posting_date,
        cost_element,
        gl_account_code,
        amount,
        document_number,
        description,
        cost_center_id,
        purchase_order_id,
        goods_receipt_id,
        is_settled,
        created_by,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, $11, NOW())
      RETURNING *
    `, [
            validated.auc_id,
            validated.posting_date,
            validated.cost_type,           // Map cost_type to cost_element column (e.g. 'Material')
            validated.cost_element_code,   // Map code to gl_account_code column
            validated.cost_amount,
            validated.document_number || null,
            validated.description || null,
            validated.cost_center_id || null,
            validated.purchase_order_id || null,
            validated.goods_receipt_id || null,
            validated.user_id
        ]);

        // Post GL entry for cost accumulation
        const aucResult = await pool.query(
            'SELECT wip_account_code FROM auc_master WHERE id = $1',
            [validated.auc_id]
        );

        if (aucResult.rows.length > 0) {
            await glPostingService.postCostAccumulation({
                aucId: validated.auc_id,
                amount: validated.cost_amount,
                wipAccountCode: aucResult.rows[0].wip_account_code,
                clearingAccountCode: '200000', // Default AP clearing account
                postingDate: validated.posting_date,
                fiscalYear: validated.posting_date.getFullYear(),
                fiscalPeriod: validated.posting_date.getMonth() + 1,
                description: validated.description,
                documentNumber: validated.document_number
            });
        }

        res.status(201).json({
            success: true,
            message: 'Cost added to AUC successfully',
            data: result.rows[0]
        });

    } catch (error: any) {
        console.error('Error adding cost:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/auc-management/:id/costs
 * Get all costs for an AUC
 */
router.get('/:id/costs', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      SELECT 
        act.*,
        act.amount as cost_amount,
        act.gl_account_code as cost_element_code,
        act.cost_element as cost_type,
        po.order_number as po_number,
        gr.receipt_number as gr_number
      FROM auc_cost_tracking act
      LEFT JOIN purchase_orders po ON act.purchase_order_id = po.id
      LEFT JOIN goods_receipts gr ON act.goods_receipt_id = gr.id
      WHERE act.auc_asset_id = $1
      ORDER BY act.posting_date DESC, act.created_at DESC
    `, [id]);

        res.json({ success: true, data: result.rows });

    } catch (error: any) {
        console.error('Error fetching costs:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/auc-management/capitalize
 * Capitalize AUC to Fixed Asset
 */
router.post('/capitalize', async (req, res) => {
    try {
        const validated = capitalizeAUCSchema.parse(req.body);

        const result = await capitalizationService.capitalizeAUC({
            aucId: validated.auc_id,
            assetNumber: validated.asset_number,
            assetDescription: validated.asset_description,
            capitalizationDate: validated.capitalization_date,
            depreciationStartDate: validated.depreciation_start_date,
            assetClassId: validated.asset_class_id,
            depreciationMethodId: validated.depreciation_method_id,
            userId: validated.user_id
        });

        res.json({
            success: true,
            message: result.message,
            data: result
        });

    } catch (error: any) {
        console.error('Error capitalizing AUC:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/auc-management/settle
 * Partial settlement of AUC costs
 */
router.post('/settle', async (req, res) => {
    try {
        const validated = settleAUCSchema.parse(req.body);

        const documentNumber = await capitalizationService.settleAUCCosts(
            validated.auc_id,
            validated.amount,
            validated.receiver_cost_center,
            validated.posting_date,
            validated.user_id,
            validated.description
        );

        res.json({
            success: true,
            message: 'AUC costs settled successfully',
            document_number: documentNumber
        });

    } catch (error: any) {
        console.error('Error settling AUC:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/auc-management/:id/abandon
 * Abandon an AUC
 */
router.post('/:id/abandon', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, user_id } = req.body;

        if (!reason) {
            return res.status(400).json({ success: false, message: 'Reason is required' });
        }

        await capitalizationService.abandonAUC(parseInt(id), reason, user_id);

        res.json({
            success: true,
            message: 'AUC abandoned successfully'
        });

    } catch (error: any) {
        console.error('Error abandoning AUC:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/auc-management/settlement-rules
 * Get all settlement rules
 */
router.get('/settlement-rules/all', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT *
      FROM auc_settlement_rules
      WHERE is_active = true
      ORDER BY code
    `);

        res.json({ success: true, data: result.rows });

    } catch (error: any) {
        console.error('Error fetching settlement rules:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
