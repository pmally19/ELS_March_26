import { Router } from 'express';
import { dbPool as pool } from '../../database.js';
import { taxProvisionService } from '../../services/tax-provision-service.js';

const router = Router();

// Get tax provision configuration
router.get('/config', async (req, res) => {
    try {
        const { companyCodeId } = req.query;

        let query = 'SELECT * FROM tax_provision_config WHERE active = true';
        const params: any[] = [];

        if (companyCodeId) {
            query += ' AND company_code_id = $1';
            params.push(companyCodeId);
        }

        query += ' ORDER BY provision_type';

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error: any) {
        console.error('Error fetching tax config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tax configuration',
            message: error.message
        });
    }
});

// Create or update tax provision configuration
router.post('/config', async (req, res) => {
    try {
        const {
            id,
            companyCodeId,
            provisionType,
            taxRate,
            expenseAccountId,
            liabilityAccountId,
            active,
            userId
        } = req.body;

        if (id) {
            // Update existing
            const result = await pool.query(`
                UPDATE tax_provision_config
                SET provision_type = $1,
                    tax_rate = $2,
                    expense_account_id = $3,
                    liability_account_id = $4,
                    active = $5,
                    updated_at = NOW(),
                    updated_by = $6
                WHERE id = $7
                RETURNING *
            `, [provisionType, taxRate, expenseAccountId, liabilityAccountId, active, userId, id]);

            res.json({
                success: true,
                message: 'Tax configuration updated',
                data: result.rows[0]
            });
        } else {
            // Create new
            const result = await pool.query(`
                INSERT INTO tax_provision_config (
                    company_code_id, provision_type, tax_rate,
                    expense_account_id, liability_account_id,
                    active, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `, [companyCodeId, provisionType, taxRate, expenseAccountId, liabilityAccountId, active, userId]);

            res.json({
                success: true,
                message: 'Tax configuration created',
                data: result.rows[0]
            });
        }
    } catch (error: any) {
        console.error('Error saving tax config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save tax configuration',
            message: error.message
        });
    }
});

// Calculate income tax provision
router.post('/calculate', async (req, res) => {
    try {
        const { fiscalPeriodId, userId } = req.body;

        if (!fiscalPeriodId) {
            return res.status(400).json({
                success: false,
                error: 'fiscalPeriodId is required'
            });
        }

        const result = await taxProvisionService.calculateIncomeTaxProvision(
            fiscalPeriodId,
            userId || 'system'
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error('Error calculating tax provision:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to calculate tax provision',
            message: error.message
        });
    }
});

// Post tax provision
router.post('/post', async (req, res) => {
    try {
        const {
            fiscalPeriodId,
            provisionType,
            taxableAmount,
            taxRate,
            provisionAmount,
            expenseAccountId,
            liabilityAccountId,
            userId
        } = req.body;

        if (!fiscalPeriodId || !provisionType || !provisionAmount) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        const result = await taxProvisionService.postTaxProvision({
            fiscalPeriodId,
            provisionType,
            taxableAmount,
            taxRate,
            provisionAmount,
            expenseAccountId,
            liabilityAccountId,
            userId: userId || 'system'
        });

        res.json({
            success: true,
            message: 'Tax provision posted successfully',
            data: result
        });
    } catch (error: any) {
        console.error('Error posting tax provision:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to post tax provision',
            message: error.message
        });
    }
});

// Get tax provisions for a period
router.get('/provisions', async (req, res) => {
    try {
        const { fiscalPeriodId } = req.query;

        if (!fiscalPeriodId) {
            return res.status(400).json({
                success: false,
                error: 'fiscalPeriodId is required'
            });
        }

        const provisions = await taxProvisionService.getTaxProvisions(parseInt(fiscalPeriodId as string));

        res.json({
            success: true,
            data: provisions
        });
    } catch (error: any) {
        console.error('Error fetching tax provisions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tax provisions',
            message: error.message
        });
    }
});

// Get all tax provisions (with optional filters)
router.get('/all', async (req, res) => {
    try {
        const { companyCodeId, year, period, provisionType } = req.query;

        let query = `
            SELECT 
                tp.*,
                fp.name as period_name,
                ga_exp.account_number as expense_account_number,
                ga_exp.account_name as expense_account_name,
                ga_lib.account_number as liability_account_number,
                ga_lib.account_name as liability_account_name
            FROM tax_provisions tp
            LEFT JOIN fiscal_periods fp ON tp.fiscal_period_id = fp.id
            LEFT JOIN gl_accounts ga_exp ON tp.expense_gl_account_id = ga_exp.id
            LEFT JOIN gl_accounts ga_lib ON tp.liability_gl_account_id = ga_lib.id
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramCount = 1;

        if (companyCodeId) {
            query += ` AND tp.company_code_id = $${paramCount++}`;
            params.push(companyCodeId);
        }

        if (year) {
            query += ` AND tp.year = $${paramCount++}`;
            params.push(year);
        }

        if (period) {
            query += ` AND tp.period = $${paramCount++}`;
            params.push(period);
        }

        if (provisionType) {
            query += ` AND tp.provision_type = $${paramCount++}`;
            params.push(provisionType);
        }

        query += ' ORDER BY tp.year DESC, tp.period DESC, tp.created_at DESC';

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error: any) {
        console.error('Error fetching all tax provisions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tax provisions',
            message: error.message
        });
    }
});

export default router;
