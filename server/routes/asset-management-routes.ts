import express, { Request, Response } from 'express';
import { assetDepreciationService } from '../services/assetDepreciationService.js';
import { assetTransactionService } from '../services/assetTransactionService.js';
import { pool } from '../db.js';
import { validatePeriodLock } from '../middleware/period-lock-check.js';

const router = express.Router();

// ============================================
// DEPRECIATION APIS
// ============================================

/**
 * Preview depreciation run
 * GET /api/asset-management/depreciation/preview
 */
router.get('/depreciation/preview', async (req: Request, res: Response) => {
    try {
        const { fiscal_year, fiscal_period, depreciation_area_id, company_code_id } = req.query;

        if (!fiscal_year || !fiscal_period) {
            return res.status(400).json({ error: 'fiscal_year and fiscal_period are required' });
        }

        const preview = await assetDepreciationService.previewDepreciationRun({
            fiscalYear: parseInt(String(fiscal_year)),
            fiscalPeriod: parseInt(String(fiscal_period)),
            depreciationAreaId: depreciation_area_id ? parseInt(String(depreciation_area_id)) : undefined,
            companyCodeId: company_code_id ? parseInt(String(company_code_id)) : undefined,
        });

        return res.json({
            fiscal_year: parseInt(String(fiscal_year)),
            fiscal_period: parseInt(String(fiscal_period)),
            assets_count: preview.length,
            total_depreciation: preview.reduce((sum, p) => sum + p.periodDepreciation, 0),
            assets: preview.map(p => ({
                asset_id: p.assetId,
                asset_number: p.assetNumber,
                period_depreciation: p.periodDepreciation,
                accumulated_depreciation: p.accumulatedDepreciation,
                new_book_value: p.newBookValue,
                method: p.method
            }))
        });

    } catch (error: any) {
        console.error('Depreciation preview error:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Execute depreciation run
 * POST /api/asset-management/depreciation/run
 */
router.post('/depreciation/run', validatePeriodLock({ module: 'ASSETS' }), async (req: Request, res: Response) => {
    try {
        const { fiscal_year, fiscal_period, depreciation_area_id, company_code_id, test_run } = req.body;

        if (!fiscal_year || !fiscal_period) {
            return res.status(400).json({ error: 'fiscal_year and fiscal_period are required' });
        }

        const result = await assetDepreciationService.executeDepreciationRun({
            fiscalYear: fiscal_year,
            fiscalPeriod: fiscal_period,
            depreciationAreaId: depreciation_area_id,
            companyCodeId: company_code_id,
            testRun: test_run || false
        });

        return res.json({
            run_id: result.runId,
            status: result.status,
            assets_processed: result.assetsProcessed,
            total_depreciation: result.totalDepreciation,
            errors: result.errors,
            test_run: test_run || false
        });

    } catch (error: any) {
        console.error('Depreciation run error:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Get all depreciation runs
 * GET /api/asset-management/depreciation/runs
 */
router.get('/depreciation/runs', async (req: Request, res: Response) => {
    try {
        const { fiscal_year, status, limit } = req.query;

        let query = `
      SELECT 
        id, fiscal_year, fiscal_period, run_date,
        status, total_assets_processed as assets_count, total_depreciation_amount as total_amount,
        depreciation_area_id, company_code_id,
        created_at, completed_at
      FROM asset_depreciation_runs
      WHERE 1=1
    `;
        const params: any[] = [];
        let paramIndex = 1;

        if (fiscal_year) {
            query += ` AND fiscal_year = $${paramIndex}`;
            params.push(parseInt(String(fiscal_year)));
            paramIndex++;
        }

        if (status) {
            query += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        query += ` ORDER BY run_date DESC, created_at DESC`;

        if (limit) {
            query += ` LIMIT $${paramIndex}`;
            params.push(parseInt(String(limit)));
        }

        const result = await pool.query(query, params);

        return res.json(result.rows.map(row => ({
            id: row.id,
            fiscal_year: row.fiscal_year,
            fiscal_period: row.fiscal_period,
            run_date: row.run_date,
            status: row.status,
            assets_count: row.assets_count,
            total_amount: row.total_amount,
            depreciation_area_id: row.depreciation_area_id,
            company_code_id: row.company_code_id,
            created_at: row.created_at,
            completed_at: row.completed_at
        })));

    } catch (error: any) {
        console.error('Get depreciation runs error:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Get depreciation history for an asset
 * GET /api/asset-management/depreciation/history/:assetId
 */
router.get('/depreciation/history/:assetId', async (req: Request, res: Response) => {
    try {
        const { assetId } = req.params;

        const result = await pool.query(
            `SELECT 
        adp.id,
        adp.fiscal_year,
        adp.fiscal_period,
        adp.posting_date,
        adp.depreciation_amount,
        adp.accumulated_depreciation,
        adp.book_value,
        adr.run_date,
        adp.created_at
      FROM asset_depreciation_postings adp
      LEFT JOIN asset_depreciation_runs adr ON adp.depreciation_run_id = adr.id
      WHERE adp.asset_id = $1
      ORDER BY adp.fiscal_year DESC, adp.fiscal_period DESC`,
            [assetId]
        );

        return res.json(result.rows.map(row => ({
            id: row.id,
            fiscal_year: row.fiscal_year,
            fiscal_period: row.fiscal_period,
            posting_date: row.posting_date,
            depreciation_amount: row.depreciation_amount,
            accumulated_depreciation: row.accumulated_depreciation,
            book_value: row.book_value,
            run_date: row.run_date,
            created_at: row.created_at
        })));

    } catch (error: any) {
        console.error('Get depreciation history error:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Post unplanned depreciation
 * POST /api/asset-management/depreciation/unplanned
 * 
 * Posts special depreciation outside the normal schedule
 * Validates all inputs from database tables (no hardcoded values)
 */
router.post('/depreciation/unplanned', validatePeriodLock({ module: 'ASSETS' }), async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const {
            document_date,
            posting_date,
            asset_value_date,
            company_code_id,
            fiscal_year,
            asset_id,
            depreciation_area_id,
            transaction_type_id,
            depreciation_amount,
            reason,
            reference
        } = req.body;

        // Validation
        if (!asset_id) {
            return res.status(400).json({ error: 'asset_id is required' });
        }
        if (!depreciation_area_id) {
            return res.status(400).json({ error: 'depreciation_area_id is required' });
        }
        if (!transaction_type_id) {
            return res.status(400).json({ error: 'transaction_type_id is required' });
        }
        if (!depreciation_amount || parseFloat(depreciation_amount) <= 0) {
            return res.status(400).json({ error: 'Valid depreciation_amount is required' });
        }
        if (!reason || reason.trim() === '') {
            return res.status(400).json({ error: 'reason is required for audit purposes' });
        }

        await client.query('BEGIN');

        // 1. Validate asset exists and get current values
        const assetResult = await client.query(`
            SELECT 
                am.id, am.asset_number, am.name, am.acquisition_cost, 
                am.accumulated_depreciation, am.net_book_value,
                am.company_code_id, cc.code as company_code, am.asset_class_id, am.status
            FROM asset_master am
            LEFT JOIN company_codes cc ON am.company_code_id = cc.id
            WHERE am.id = $1 AND am.is_active = true
        `, [asset_id]);

        if (assetResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Asset not found or inactive' });
        }

        const asset = assetResult.rows[0];
        const depAmount = parseFloat(depreciation_amount);

        // Check depreciation amount doesn't exceed book value
        if (depAmount > (asset.net_book_value || 0)) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: `Depreciation amount ($${depAmount}) cannot exceed current book value ($${asset.net_book_value})`
            });
        }

        // 2. Validate depreciation area exists
        const depAreaResult = await client.query(`
            SELECT id, code, name FROM depreciation_areas WHERE id = $1 AND is_active = true
        `, [depreciation_area_id]);

        if (depAreaResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Depreciation area not found or inactive' });
        }

        // 3. Validate transaction type exists
        const transTypeResult = await client.query(`
            SELECT id, code, name FROM transaction_types WHERE id = $1 AND is_active = true
        `, [transaction_type_id]);

        if (transTypeResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Transaction type not found or inactive' });
        }

        // 4. Validate company code if provided
        if (company_code_id) {
            const ccResult = await client.query(
                'SELECT id FROM company_codes WHERE id = $1 AND active = true',
                [company_code_id]
            );
            if (ccResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Company code not found or inactive' });
            }
        }

        // 5. Calculate new values
        const newAccumulatedDep = (asset.accumulated_depreciation || 0) + depAmount;
        const newBookValue = (asset.acquisition_cost || 0) - newAccumulatedDep;

        // Determine fiscal period from posting date
        const pDate = new Date(posting_date || new Date());
        const fiscalPeriod = pDate.getMonth() + 1;
        const effectiveFiscalYear = fiscal_year || pDate.getFullYear();

        // 6. Create depreciation posting record
        const postingResult = await client.query(`
            INSERT INTO asset_depreciation_postings (
                asset_id, depreciation_area_id, fiscal_year, fiscal_period,
                posting_date, depreciation_amount, accumulated_depreciation,
                book_value, posting_type, transaction_type_id,
                document_date, value_date, reference, description,
                created_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, 'UNPLANNED', $9,
                $10, $11, $12, $13, NOW()
            )
            RETURNING id
        `, [
            asset_id,
            depreciation_area_id,
            effectiveFiscalYear,
            fiscalPeriod,
            posting_date || new Date().toISOString().split('T')[0],
            depAmount,
            newAccumulatedDep,
            newBookValue,
            transaction_type_id,
            document_date || new Date().toISOString().split('T')[0],
            asset_value_date || posting_date || new Date().toISOString().split('T')[0],
            reference || null,
            reason
        ]);

        const postingId = postingResult.rows[0].id;

        // 7. Update asset_master with new values
        await client.query(`
            UPDATE asset_master
            SET 
                accumulated_depreciation = $1,
                net_book_value = $2,
                last_depreciation_date = $3,
                last_depreciation_period = $4,
                last_depreciation_year = $5,
                updated_at = NOW()
            WHERE id = $6
        `, [
            newAccumulatedDep,
            newBookValue,
            posting_date || new Date().toISOString().split('T')[0],
            fiscalPeriod,
            effectiveFiscalYear,
            asset_id
        ]);

        // 8. Get GL accounts for posting (from asset account determination)
        const glAccountsResult = await client.query(`
            SELECT 
                aad.account_category,
                gl.id as gl_account_id,
                gl.account_number,
                gl.account_name
            FROM asset_account_determination aad
            JOIN gl_accounts gl ON aad.gl_account_id = gl.id
            WHERE aad.asset_class_id = $1
              AND aad.is_active = true
              AND aad.account_category IN ('DEPRECIATION_EXPENSE_ACCOUNT', 'ACCUMULATED_DEPRECIATION_ACCOUNT')
        `, [asset.asset_class_id]);

        let glDocumentId = null;
        const glAccounts = glAccountsResult.rows;

        // 9. Create GL entries if accounts are configured
        if (glAccounts.length >= 2) {
            const depExpenseAccount = glAccounts.find((a: any) => a.account_category === 'DEPRECIATION_EXPENSE_ACCOUNT');
            const accumDepAccount = glAccounts.find((a: any) => a.account_category === 'ACCUMULATED_DEPRECIATION_ACCOUNT');

            if (depExpenseAccount && accumDepAccount) {
                // Create accounting document
                const docNumber = `UDEP-${asset.asset_number}-${Date.now()}`;

                const glDocResult = await client.query(`
                    INSERT INTO accounting_documents (
                        document_number, document_type, company_code,
                        document_date, posting_date, reference,
                        currency, total_amount, 
                        source_document_type, source_document_id,
                        created_at
                    ) VALUES (
                        $1, 'AA', $2, $3, $4, $5, 'USD', $6,
                        'UNPLANNED_DEPRECIATION', $7, NOW()
                    )
                    RETURNING id, document_number
                `, [
                    docNumber,
                    asset.company_code,
                    document_date || new Date().toISOString().split('T')[0],
                    posting_date || new Date().toISOString().split('T')[0],
                    `Unplanned depreciation: ${asset.asset_number}`,
                    depAmount,
                    postingId
                ]);

                glDocumentId = glDocResult.rows[0].id;

                // Create line items
                // Debit: Depreciation Expense
                await client.query(`
                    INSERT INTO accounting_document_items (
                        document_id, line_item, gl_account,
                        debit_amount, credit_amount, item_text, created_at
                    ) VALUES ($1, 1, $2, $3, 0, $4, NOW())
                `, [
                    glDocumentId,
                    depExpenseAccount.account_number,
                    depAmount,
                    `Unplanned depreciation - ${asset.asset_number}`
                ]);

                // Credit: Accumulated Depreciation
                await client.query(`
                    INSERT INTO accounting_document_items (
                        document_id, line_item, gl_account,
                        debit_amount, credit_amount, item_text, created_at
                    ) VALUES ($1, 2, $2, 0, $3, $4, NOW())
                `, [
                    glDocumentId,
                    accumDepAccount.account_number,
                    depAmount,
                    `Accumulated depreciation - ${asset.asset_number}`
                ]);

                // Also insert into gl_entries for UI visibility
                // Debit Entry
                await client.query(`
                    INSERT INTO gl_entries (
                        document_number, gl_account_id, amount, debit_credit_indicator,
                        posting_status, posting_date, fiscal_year, fiscal_period,
                        source_document_type, description, source_module,
                        source_document_id, created_at
                    ) VALUES (
                        $1, $2, $3, 'D', 'posted', $4, $5, $6,
                        'UNPLANNED_DEPRECIATION', $7, 'ASSET_MANAGEMENT', $8, NOW()
                    )
                `, [
                    docNumber,
                    depExpenseAccount.gl_account_id,
                    depAmount,
                    posting_date || new Date().toISOString().split('T')[0],
                    effectiveFiscalYear,
                    fiscalPeriod,
                    `Unplanned depreciation - ${asset.asset_number}`,
                    postingId
                ]);

                // Credit Entry
                await client.query(`
                    INSERT INTO gl_entries (
                        document_number, gl_account_id, amount, debit_credit_indicator,
                        posting_status, posting_date, fiscal_year, fiscal_period,
                        source_document_type, description, source_module,
                        source_document_id, created_at
                    ) VALUES (
                        $1, $2, $3, 'C', 'posted', $4, $5, $6,
                        'UNPLANNED_DEPRECIATION', $7, 'ASSET_MANAGEMENT', $8, NOW()
                    )
                `, [
                    docNumber,
                    accumDepAccount.gl_account_id,
                    depAmount,
                    posting_date || new Date().toISOString().split('T')[0],
                    effectiveFiscalYear,
                    fiscalPeriod,
                    `Accumulated depreciation - ${asset.asset_number}`,
                    postingId
                ]);
            }

        }

        await client.query('COMMIT');

        return res.json({
            success: true,
            posting_id: postingId,
            gl_document_id: glDocumentId,
            asset: {
                id: asset.id,
                asset_number: asset.asset_number,
                previous_book_value: asset.net_book_value,
                depreciation_amount: depAmount,
                new_book_value: newBookValue,
                new_accumulated_depreciation: newAccumulatedDep
            },
            message: `Unplanned depreciation of $${depAmount.toLocaleString()} posted successfully for asset ${asset.asset_number}`
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Unplanned depreciation error:', error);
        return res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

/**
 * Get unplanned depreciation history
 * GET /api/asset-management/depreciation/unplanned/history
 * 
 * Returns all unplanned depreciation postings with asset and calculation details
 */
router.get('/depreciation/unplanned/history', async (req: Request, res: Response) => {
    try {
        const { company_code_id, limit } = req.query;

        let query = `
            SELECT 
                adp.id,
                adp.asset_id,
                am.asset_number,
                am.name as asset_name,
                ac.name as asset_class_name,
                adp.fiscal_year,
                adp.fiscal_period,
                adp.posting_date,
                adp.document_date,
                adp.depreciation_amount,
                adp.accumulated_depreciation as accumulated_depreciation_after,
                adp.book_value as net_book_value_after,
                adp.description as reason,
                adp.reference,
                tt.code as transaction_type_code,
                tt.name as transaction_type_name,
                da.code as depreciation_area_code,
                da.name as depreciation_area_name,
                cc.code as company_code,
                cc.name as company_name,
                adp.created_at
            FROM asset_depreciation_postings adp
            INNER JOIN asset_master am ON adp.asset_id = am.id
            LEFT JOIN asset_classes ac ON am.asset_class_id = ac.id
            LEFT JOIN transaction_types tt ON adp.transaction_type_id = tt.id
            LEFT JOIN depreciation_areas da ON adp.depreciation_area_id = da.id
            LEFT JOIN company_codes cc ON am.company_code_id = cc.id
            WHERE adp.posting_type = 'UNPLANNED'
        `;

        const params: any[] = [];
        let paramIndex = 1;

        if (company_code_id) {
            query += ` AND am.company_code_id = $${paramIndex}`;
            params.push(parseInt(String(company_code_id)));
            paramIndex++;
        }

        query += ` ORDER BY adp.posting_date DESC, adp.created_at DESC`;

        if (limit) {
            query += ` LIMIT $${paramIndex}`;
            params.push(parseInt(String(limit)));
        }

        const result = await pool.query(query, params);

        return res.json(result.rows.map(row => ({
            id: row.id,
            asset_id: row.asset_id,
            asset_number: row.asset_number,
            asset_name: row.asset_name,
            asset_class_name: row.asset_class_name,
            fiscal_year: row.fiscal_year,
            fiscal_period: row.fiscal_period,
            posting_date: row.posting_date,
            document_date: row.document_date,
            depreciation_amount: row.depreciation_amount,
            accumulated_depreciation_after: row.accumulated_depreciation_after,
            net_book_value_after: row.net_book_value_after,
            reason: row.reason,
            reference: row.reference,
            transaction_type_code: row.transaction_type_code,
            transaction_type_name: row.transaction_type_name,
            depreciation_area_code: row.depreciation_area_code,
            depreciation_area_name: row.depreciation_area_name,
            company_code: row.company_code,
            company_name: row.company_name,
            created_at: row.created_at
        })));

    } catch (error: any) {
        console.error('Get unplanned depreciation history error:', error);
        return res.status(500).json({ error: error.message });
    }
});

// ============================================
// TRANSACTION APIS
// ============================================

/**
 * Record asset acquisition
 * POST /api/asset-management/acquisition
 */
router.post('/acquisition', validatePeriodLock({ module: 'ASSETS', postingDateField: 'acquisition_date' }), async (req: Request, res: Response) => {
    try {
        const {
            asset_id,
            acquisition_date,
            acquisition_cost,
            vendor_id,
            invoice_number,
            gl_accounts
        } = req.body;

        if (!asset_id || !acquisition_date || !acquisition_cost) {
            return res.status(400).json({
                error: 'asset_id, acquisition_date, and acquisition_cost are required'
            });
        }

        const result = await assetTransactionService.acquireAsset({
            assetId: asset_id,
            acquisitionDate: acquisition_date,
            acquisitionCost: parseFloat(acquisition_cost),
            vendorId: vendor_id,
            invoiceNumber: invoice_number,
            glAccountIds: gl_accounts
        });

        return res.json({
            transaction_id: result.transactionId,
            gl_document_id: result.glDocumentId,
            message: 'Asset acquisition recorded successfully'
        });

    } catch (error: any) {
        console.error('Asset acquisition error:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Transfer asset
 * POST /api/asset-management/transfer
 */
router.post('/transfer', validatePeriodLock({ module: 'ASSETS', postingDateField: 'transfer_date' }), async (req: Request, res: Response) => {
    try {
        const {
            asset_id,
            from_cost_center_id,
            to_cost_center_id,
            from_company_code_id,
            to_company_code_id,
            transfer_date,
            reason
        } = req.body;

        if (!asset_id || !transfer_date || !reason) {
            return res.status(400).json({
                error: 'asset_id, transfer_date, and reason are required'
            });
        }

        if (!to_cost_center_id && !to_company_code_id) {
            return res.status(400).json({
                error: 'Either to_cost_center_id or to_company_code_id is required'
            });
        }

        const result = await assetTransactionService.transferAsset({
            assetId: asset_id,
            fromCostCenterId: from_cost_center_id,
            toCostCenterId: to_cost_center_id,
            fromCompanyCodeId: from_company_code_id,
            toCompanyCodeId: to_company_code_id,
            transferDate: transfer_date,
            reason
        });

        return res.json({
            transaction_id: result.transactionId,
            message: 'Asset transfer recorded successfully'
        });

    } catch (error: any) {
        console.error('Asset transfer error:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Retire asset
 * POST /api/asset-management/retirement
 */
router.post('/retirement', validatePeriodLock({ module: 'ASSETS', postingDateField: 'retirement_date' }), async (req: Request, res: Response) => {
    try {
        const {
            asset_id,
            retirement_date,
            disposal_amount,
            retirement_reason,
            scrap
        } = req.body;

        if (!asset_id || !retirement_date || !retirement_reason) {
            return res.status(400).json({
                error: 'asset_id, retirement_date, and retirement_reason are required'
            });
        }

        const result = await assetTransactionService.retireAsset({
            assetId: asset_id,
            retirementDate: retirement_date,
            disposalAmount: disposal_amount ? parseFloat(disposal_amount) : undefined,
            retirementReason: retirement_reason,
            scrap: scrap || false
        });

        return res.json({
            transaction_id: result.transactionId,
            gain_loss: result.gainLoss,
            gl_document_id: result.glDocumentNumber,
            message: `Asset retired successfully. ${result.gainLoss >= 0 ? 'Gain' : 'Loss'}: $${Math.abs(result.gainLoss).toFixed(2)}`
        });

    } catch (error: any) {
        console.error('Asset retirement error:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Get transaction history for an asset
 * GET /api/asset-management/transactions/:assetId
 */
router.get('/transactions/:assetId', async (req: Request, res: Response) => {
    try {
        const { assetId } = req.params;
        const transactions = await assetTransactionService.getAssetTransactions(parseInt(assetId));

        return res.json(transactions);

    } catch (error: any) {
        console.error('Get transactions error:', error);
        return res.status(500).json({ error: error.message });
    }
});

// ============================================
// REPORTING APIS
// ============================================

/**
 * Get asset register report
 * GET /api/asset-management/reports/asset-register
 */
router.get('/reports/asset-register', async (req: Request, res: Response) => {
    try {
        const { company_code_id, asset_class_id, status, location, active_only } = req.query;

        let query = `
      SELECT 
        am.id,
        am.asset_number,
        am.name as asset_name,
        ac.name as asset_class,
        am.location,
        am.acquisition_date,
        am.capitalization_date,
        am.acquisition_cost,
        am.accumulated_depreciation,
        am.net_book_value,
        am.status,
        am.is_active,
        cc.code as company_code,
        co.cost_center as cost_center,
        am.retirement_date
      FROM asset_master am
      LEFT JOIN asset_classes ac ON am.asset_class_id = ac.id
      LEFT JOIN company_codes cc ON am.company_code_id = cc.id
      LEFT JOIN cost_centers co ON am.cost_center_id = co.id
      WHERE 1=1
    `;

        const params: any[] = [];
        let paramIndex = 1;

        if (company_code_id) {
            query += ` AND am.company_code_id = $${paramIndex}`;
            params.push(parseInt(String(company_code_id)));
            paramIndex++;
        }

        if (asset_class_id) {
            query += ` AND am.asset_class_id = $${paramIndex}`;
            params.push(parseInt(String(asset_class_id)));
            paramIndex++;
        }

        if (status) {
            query += ` AND am.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (location) {
            query += ` AND am.location ILIKE $${paramIndex}`;
            params.push(`%${location}%`);
            paramIndex++;
        }

        if (active_only === 'true') {
            query += ` AND am.is_active = true`;
        }

        query += ` ORDER BY am.asset_number`;

        const result = await pool.query(query, params);

        return res.json({
            total_count: result.rows.length,
            total_acquisition_cost: result.rows.reduce((sum, r) => sum + (r.acquisition_cost || 0), 0),
            total_accumulated_depreciation: result.rows.reduce((sum, r) => sum + (r.accumulated_depreciation || 0), 0),
            total_net_book_value: result.rows.reduce((sum, r) => sum + (r.net_book_value || 0), 0),
            assets: result.rows
        });

    } catch (error: any) {
        console.error('Asset register report error:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Get depreciation schedule (forecast)
 * GET /api/asset-management/reports/depreciation-schedule
 */
router.get('/reports/depreciation-schedule', async (req: Request, res: Response) => {
    try {
        const { year, company_code_id } = req.query;

        if (!year) {
            return res.status(400).json({ error: 'year parameter is required' });
        }

        // Get all active assets
        let query = `
      SELECT 
        id, asset_number, name, acquisition_cost,
        accumulated_depreciation, net_book_value,
        useful_life_years, residual_value
      FROM asset_master
      WHERE is_active = true
      AND retirement_date IS NULL
      AND capitalization_date IS NOT NULL
    `;

        const params: any[] = [];
        if (company_code_id) {
            query += ` AND company_code_id = $1`;
            params.push(parseInt(String(company_code_id)));
        }

        const assetsResult = await pool.query(query, params);

        // Calculate monthly depreciation for each asset (simplified straight-line)
        const schedule = [];
        for (let month = 1; month <= 12; month++) {
            const monthData = {
                period: `${year}-${String(month).padStart(2, '0')}`,
                fiscal_year: parseInt(String(year)),
                fiscal_period: month,
                total_depreciation: 0,
                assets_count: assetsResult.rows.length
            };

            for (const asset of assetsResult.rows) {
                const monthlyDep = (asset.acquisition_cost - (asset.residual_value || 0)) / (asset.useful_life_years * 12);
                monthData.total_depreciation += monthlyDep;
            }

            schedule.push(monthData);
        }

        return res.json({
            year: parseInt(String(year)),
            total_annual_depreciation: schedule.reduce((sum, m) => sum + m.total_depreciation, 0),
            monthly_schedule: schedule
        });

    } catch (error: any) {
        console.error('Depreciation schedule report error:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Get book values summary
 * GET /api/asset-management/reports/book-values
 */
router.get('/reports/book-values', async (req: Request, res: Response) => {
    try {
        const { as_of_date, company_code_id } = req.query;

        // Summary by asset class
        let query = `
      SELECT 
        ac.name as asset_class,
        COUNT(am.id) as assets_count,
        SUM(am.acquisition_cost) as total_acquisition_cost,
        SUM(am.accumulated_depreciation) as total_accumulated_depreciation,
        SUM(am.net_book_value) as total_net_book_value
      FROM asset_master am
      LEFT JOIN asset_classes ac ON am.asset_class_id = ac.id
      WHERE am.is_active = true
    `;

        const params: any[] = [];
        if (company_code_id) {
            query += ` AND am.company_code_id = $1`;
            params.push(parseInt(String(company_code_id)));
        }

        query += ` GROUP BY ac.name ORDER BY total_net_book_value DESC`;

        const byClassResult = await pool.query(query, params);

        // Summary by location - separate query
        let byLocationQuery = `
      SELECT 
        am.location as asset_class,
        COUNT(am.id) as assets_count,
        SUM(am.acquisition_cost) as total_acquisition_cost,
        SUM(am.accumulated_depreciation) as total_accumulated_depreciation,
        SUM(am.net_book_value) as total_net_book_value
      FROM asset_master am
      WHERE am.is_active = true
    `;

        if (company_code_id) {
            byLocationQuery += ` AND am.company_code_id = $1`;
        }

        byLocationQuery += ` GROUP BY am.location ORDER BY total_net_book_value DESC`;

        const byLocationResult = await pool.query(byLocationQuery, params);

        // Overall totals
        const totalsQuery = `
      SELECT 
        COUNT(id) as total_assets,
        SUM(acquisition_cost) as total_acquisition_cost,
        SUM(accumulated_depreciation) as total_accumulated_depreciation,
        SUM(net_book_value) as total_net_book_value
      FROM asset_master
      WHERE is_active = true
      ${company_code_id ? `AND company_code_id = $1` : ''}
    `;

        const totalsResult = await pool.query(totalsQuery, params);

        return res.json({
            as_of_date: as_of_date || new Date().toISOString().split('T')[0],
            totals: totalsResult.rows[0],
            by_class: byClassResult.rows,
            by_location: byLocationResult.rows
        });

    } catch (error: any) {
        console.error('Book values report error:', error);
        return res.status(500).json({ error: error.message });
    }
});

export default router;
