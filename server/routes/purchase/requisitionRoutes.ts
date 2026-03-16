/**
 * Purchase Requisition Routes
 * Handles PR creation, retrieval, and management
 */

import express, { Request, Response } from 'express';
import { pool } from '../../db';
import { generatePRNumber } from '../../services/number-generation-service';

const router = express.Router();

/**
 * POST /api/purchase/requisitions
 * Create a new purchase requisition with automatic number generation
 */
router.post('/requisitions', async (req: Request, res: Response) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const {
            document_type_id,
            company_code_id,
            purchasing_org,
            purchasing_group,
            pr_type,
            currency,
            required_date,
            priority,
            justification,
            department,
            project_code,
            notes,
            status,
            items = []
        } = req.body;

        console.log('📝 Creating PR - Body:', JSON.stringify(req.body, null, 2));
        console.log('🔍 Department:', department);

        // Validate required fields
        if (!document_type_id) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'Document type is required'
            });
        }

        if (!items || items.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'At least one item is required'
            });
        }

        // Generate PR number based on document type's number range
        let prNumber: string;
        try {
            prNumber = await generatePRNumber(document_type_id);
            console.log(`✅ Generated PR Number: ${prNumber}`);
        } catch (error: any) {
            await client.query('ROLLBACK');
            console.error('Error generating PR number:', error);
            return res.status(500).json({
                error: 'Failed to generate PR number',
                details: error.message
            });
        }

        // Insert PR header
        const prInsertQuery = `
      INSERT INTO purchase_requisitions (
        requisition_number,
        company_code_id,
        purchasing_org,
        purchasing_group,
        pr_type,
        currency_code,
        requisition_date,
        priority,
        justification,
        department,
        project_code,
        notes,
        status,
        requested_by,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      RETURNING id, requisition_number, created_at
    `;

        const prResult = await client.query(prInsertQuery, [
            prNumber,
            company_code_id || null,
            purchasing_org || null,
            purchasing_group || null,
            pr_type || 'NB',
            currency || 'INR',
            required_date || new Date(), // Use required_date as requisition_date
            priority || 'MEDIUM',
            justification || null,
            department || null,
            project_code || null,
            notes || null,
            status || 'DRAFT',
            'System User' // Default requested_by
        ]);

        const prId = prResult.rows[0].id;
        const createdPrNumber = prResult.rows[0].requisition_number;

        // Insert PR items
        const itemInsertQuery = `
      INSERT INTO purchase_requisition_items (
        requisition_id,
        line_number,
        material_id,
        material_code,
        material_name,
        description,
        quantity,
        unit_of_measure,
        estimated_unit_price,
        estimated_total_price,
        required_date,
        material_group,
        storage_location,
        purchasing_group,
        purchasing_org,
        cost_center,
        plant_code,
        item_category_id,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
      RETURNING id
    `;

        const insertedItems = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const lineNumber = (i + 1) * 10; // SAP-style item numbering

            const itemResult = await client.query(itemInsertQuery, [
                prId,
                lineNumber,
                item.material_id || null,
                item.material_code || null,
                item.material_name || null,
                item.description || null,
                item.quantity || 1,
                item.unit_of_measure || 'EA',
                item.estimated_unit_price || 0,
                item.estimated_total_price || 0,
                item.required_date || required_date,
                item.material_group || null,
                item.storage_location || null,
                item.purchasing_group || purchasing_group || null,
                item.purchasing_org || purchasing_org || null,
                item.cost_center || null,
                item.plant_code || null,
                item.item_category_id || null
            ]);

            insertedItems.push({
                id: itemResult.rows[0].id,
                line_number: lineNumber,
                material_code: item.material_code
            });
        }

        await client.query('COMMIT');

        console.log(`✅ Created PR ${createdPrNumber} with ${insertedItems.length} items`);

        res.status(201).json({
            success: true,
            message: 'Purchase Requisition created successfully',
            pr_number: createdPrNumber,
            pr_id: prId,
            items: insertedItems
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('❌ Error creating purchase requisition:', error);
        res.status(500).json({
            error: 'Failed to create purchase requisition',
            details: error.message
        });
    } finally {
        client.release();
    }
});

/**
 * GET /api/purchase/requisitions
 * Get all purchase requisitions
 */
router.get('/requisitions', async (req: Request, res: Response) => {
    try {
        const prResult = await pool.query(`
      SELECT 
        pr.id,
        pr.requisition_number as req_number,
        pr.requested_by as requester,
        pr.department,
        pr.requisition_date as req_date,
        pr.status,
        pr.priority,
        pr.approval_status,
        pr.currency_code as currency,
        pr.created_at,
        COALESCE(dt.name, pr.pr_type) as document_type_name,
        COALESCE(dt.code, pr.pr_type) as document_type_code,
        cc.name as company_code_name,
        COUNT(pri.id) as item_count,
        COALESCE(SUM(pri.estimated_total_price), 0)::float as total_estimated_value
      FROM purchase_requisitions pr
      LEFT JOIN pr_document_types dt ON dt.code = pr.pr_type
      LEFT JOIN company_codes cc ON pr.company_code_id = cc.id
      LEFT JOIN purchase_requisition_items pri ON pr.id = pri.requisition_id
      GROUP BY pr.id, dt.name, dt.code, cc.name
      ORDER BY pr.created_at DESC
    `);

        res.json(prResult.rows);
    } catch (error: any) {
        console.error('Error fetching purchase requisitions:', error);
        res.status(500).json({
            error: 'Failed to fetch purchase requisitions',
            details: error.message
        });
    }
});

/**
 * GET /api/purchase/requisitions/:id
 * Get a single purchase requisition with items
 */
router.get('/requisitions/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const prResult = await pool.query(`
      SELECT 
        pr.*,
        pr.requisition_number as pr_number,
        COALESCE(dt.name, pr.pr_type) as document_type_name,
        COALESCE(dt.code, pr.pr_type) as document_type_code,
        cc.name as company_code_name,
        cc.code as company_code,
        (SELECT COALESCE(SUM(estimated_total_price), 0) FROM purchase_requisition_items WHERE requisition_id = pr.id) as total_value
      FROM purchase_requisitions pr
      LEFT JOIN pr_document_types dt ON dt.code = pr.pr_type
      LEFT JOIN company_codes cc ON pr.company_code_id = cc.id
      WHERE pr.id = $1
    `, [id]);

        if (prResult.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase requisition not found' });
        }

        const itemsResult = await pool.query(`
      SELECT pri.*, pic.code as item_category_code, pic.name as item_category_name 
      FROM purchase_requisition_items pri
      LEFT JOIN purchasing_item_categories pic ON pri.item_category_id = pic.id
      WHERE pri.requisition_id = $1
      ORDER BY pri.line_number
    `, [id]);

        res.json({
            ...prResult.rows[0],
            items: itemsResult.rows
        });
    } catch (error: any) {
        console.error('Error fetching purchase requisition:', error);
        res.status(500).json({
            error: 'Failed to fetch purchase requisition',
            details: error.message
        });
    }
});

export default router;
