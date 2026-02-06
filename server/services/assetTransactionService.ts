import { pool } from '../db.js';

interface AcquisitionParams {
    assetId: number;
    acquisitionDate: string;
    acquisitionCost: number;
    vendorId?: number;
    invoiceNumber?: string;
    glAccountIds?: {
        assetAccountId: number;
        offsetAccountId: number;
    };
}

interface TransferParams {
    assetId: number;
    fromCostCenterId?: number;
    toCostCenterId: number;
    fromCompanyCodeId?: number;
    toCompanyCodeId?: number;
    transferDate: string;
    reason: string;
}

interface RetirementParams {
    assetId: number;
    retirementDate: string;
    disposalAmount?: number;
    retirementReason: string;
    scrap: boolean;
}

export class AssetTransactionService {

    /**
     * Record asset acquisition
     */
    async acquireAsset(params: AcquisitionParams): Promise<{ transactionId: number; glDocumentId?: number }> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Get asset details
            const assetResult = await client.query(
                'SELECT id, asset_number, name, is_active FROM asset_master WHERE id = $1',
                [params.assetId]
            );

            if (assetResult.rows.length === 0) {
                throw new Error(`Asset ${params.assetId} not found`);
            }

            const asset = assetResult.rows[0];

            if (!asset.is_active) {
                throw new Error(`Asset ${asset.asset_number} is inactive`);
            }

            // Update asset with acquisition details
            await client.query(
                `UPDATE asset_master
        SET acquisition_cost = $1,
            acquisition_date = $2,
            capitalization_date = $2,
            net_book_value = $1,
            updated_at = NOW()
        WHERE id = $3`,
                [params.acquisitionCost, params.acquisitionDate, params.assetId]
            );

            // Create transaction record
            const transactionResult = await client.query(
                `INSERT INTO asset_transactions (
          asset_id, transaction_type, transaction_date, amount,
          vendor_id, invoice_number, description, created_at
        ) VALUES ($1, 'ACQUISITION', $2, $3, $4, $5, $6, NOW())
        RETURNING id`,
                [
                    params.assetId,
                    params.acquisitionDate,
                    params.acquisitionCost,
                    params.vendorId,
                    params.invoiceNumber,
                    `Asset acquisition for ${asset.name}`
                ]
            );

            const transactionId = transactionResult.rows[0].id;
            let glDocumentId;

            // Create GL posting if accounts provided
            if (params.glAccountIds) {
                // This would integrate with your GL posting service
                // For now, we'll create a placeholder
                const glResult = await client.query(
                    `INSERT INTO accounting_documents (
            document_type, document_date, posting_date,
            description, total_debit, total_credit,
            status, created_at
          ) VALUES ('AA', $1, $1, $2, $3, $3, 'POSTED', NOW())
          RETURNING id`,
                    [
                        params.acquisitionDate,
                        `Asset acquisition - ${asset.asset_number}`,
                        params.acquisitionCost
                    ]
                );

                glDocumentId = glResult.rows[0].id;

                // Create GL line items
                // Debit: Asset Account
                await client.query(
                    `INSERT INTO accounting_document_items (
            document_id, line_number, account_id, debit_amount, credit_amount,
            description, created_at
          ) VALUES ($1, 1, $2, $3, 0, $4, NOW())`,
                    [
                        glDocumentId,
                        params.glAccountIds.assetAccountId,
                        params.acquisitionCost,
                        `Asset: ${asset.asset_number}`
                    ]
                );

                // Credit: Offset Account (typically AP or Cash)
                await client.query(
                    `INSERT INTO accounting_document_items (
            document_id, line_number, account_id, debit_amount, credit_amount,
            description, created_at
          ) VALUES ($1, 2, $2, 0, $3, $4, NOW())`,
                    [
                        glDocumentId,
                        params.glAccountIds.offsetAccountId,
                        params.acquisitionCost,
                        `Asset acquisition`
                    ]
                );

                // Link transaction to GL document
                await client.query(
                    `UPDATE asset_transactions
          SET gl_document_id = $1
          WHERE id = $2`,
                    [glDocumentId, transactionId]
                );
            }

            await client.query('COMMIT');

            return { transactionId, glDocumentId };

        } catch (error: any) {
            await client.query('ROLLBACK');
            throw new Error(`Asset acquisition failed: ${error.message}`);
        } finally {
            client.release();
        }
    }

    /**
     * Transfer asset between cost centers or companies
     */
    async transferAsset(params: TransferParams): Promise<{ transactionId: number }> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Get asset details
            const assetResult = await client.query(
                `SELECT id, asset_number, name, is_active, cost_center_id, company_code_id
        FROM asset_master WHERE id = $1`,
                [params.assetId]
            );

            if (assetResult.rows.length === 0) {
                throw new Error(`Asset ${params.assetId} not found`);
            }

            const asset = assetResult.rows[0];

            if (!asset.is_active) {
                throw new Error(`Asset ${asset.asset_number} is inactive`);
            }

            // Update asset location
            const updates: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            if (params.toCostCenterId) {
                updates.push(`cost_center_id = $${paramIndex}`);
                values.push(params.toCostCenterId);
                paramIndex++;
            }

            if (params.toCompanyCodeId) {
                updates.push(`company_code_id = $${paramIndex}`);
                values.push(params.toCompanyCodeId);
                paramIndex++;
            }

            updates.push(`updated_at = NOW()`);
            values.push(params.assetId);

            await client.query(
                `UPDATE asset_master SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
                values
            );

            // Create transaction record
            const transactionResult = await client.query(
                `INSERT INTO asset_transactions (
          asset_id, transaction_type, transaction_date,
          from_cost_center_id, to_cost_center_id,
          from_company_code_id, to_company_code_id,
          description, created_at
        ) VALUES ($1, 'TRANSFER', $2, $3, $4, $5, $6, $7, NOW())
        RETURNING id`,
                [
                    params.assetId,
                    params.transferDate,
                    params.fromCostCenterId || asset.cost_center_id,
                    params.toCostCenterId,
                    params.fromCompanyCodeId || asset.company_code_id,
                    params.toCompanyCodeId,
                    params.reason
                ]
            );

            await client.query('COMMIT');

            return { transactionId: transactionResult.rows[0].id };

        } catch (error: any) {
            await client.query('ROLLBACK');
            throw new Error(`Asset transfer failed: ${error.message}`);
        } finally {
            client.release();
        }
    }

    /**
     * Retire/dispose asset
     */
    async retireAsset(params: RetirementParams): Promise<{
        transactionId: number;
        gainLoss: number;
        glDocumentNumber?: string;
    }> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Get asset details
            const assetResult = await client.query(
                `SELECT id, asset_number, name, is_active, acquisition_cost,
                accumulated_depreciation, net_book_value, cost_center_id
        FROM asset_master WHERE id = $1`,
                [params.assetId]
            );

            if (assetResult.rows.length === 0) {
                throw new Error(`Asset ${params.assetId} not found`);
            }

            const asset = assetResult.rows[0];

            if (!asset.is_active) {
                throw new Error(`Asset ${asset.asset_number} is already inactive/retired`);
            }

            // Calculate gain or loss
            const disposalAmount = params.disposalAmount || 0;
            const netBookValue = parseFloat(asset.net_book_value) || 0;
            const gainLoss = disposalAmount - netBookValue;
            const acquisitionCost = parseFloat(asset.acquisition_cost) || 0;
            const accumulatedDepreciation = parseFloat(asset.accumulated_depreciation) || 0;

            // Update asset as retired
            await client.query(
                `UPDATE asset_master
        SET retirement_date = $1,
            retirement_method = $2,
            retirement_revenue = $3,
            is_active = false,
            updated_at = NOW()
        WHERE id = $4`,
                [
                    params.retirementDate,
                    params.scrap ? 'SCRAP' : 'SALE',
                    disposalAmount,
                    params.assetId
                ]
            );

            // Create transaction record
            const transactionResult = await client.query(
                `INSERT INTO asset_transactions (
          asset_id, transaction_type, transaction_date, amount,
          description, created_at
        ) VALUES ($1, 'RETIREMENT', $2, $3, $4, NOW())
        RETURNING id`,
                [
                    params.assetId,
                    params.retirementDate,
                    disposalAmount,
                    `${params.retirementReason} - Gain/Loss: $${gainLoss.toFixed(2)}`
                ]
            );

            const transactionId = transactionResult.rows[0].id;

            await client.query('COMMIT');

            // Post to GL (outside of transaction so main retirement is not blocked)
            let glDocumentNumber: string | undefined;
            try {
                const { AssetGLPostingService } = await import('./asset-gl-posting-service.js');
                const glPostingService = new AssetGLPostingService();

                // Get fiscal year and period from retirement date
                const retirementDate = new Date(params.retirementDate);
                const fiscalYear = retirementDate.getFullYear();
                const fiscalPeriod = retirementDate.getMonth() + 1;

                // Generate document number
                const docNumber = `AST-RET-${fiscalYear}-${fiscalPeriod.toString().padStart(2, '0')}-${transactionId}`;

                glDocumentNumber = await glPostingService.postRetirement({
                    assetId: params.assetId,
                    transactionType: 'RETIREMENT',
                    amount: disposalAmount,
                    documentNumber: docNumber,
                    postingDate: retirementDate,
                    fiscalYear,
                    fiscalPeriod,
                    description: `Asset retirement: ${asset.name} - ${params.retirementReason}`,
                    costCenterId: asset.cost_center_id,
                    accumulatedDepreciation,
                    acquisitionCost,
                    disposalAmount,
                    gainLoss
                });

                // Update transaction with GL document number
                await pool.query(
                    `UPDATE asset_transactions SET gl_document_number = $1 WHERE id = $2`,
                    [glDocumentNumber, transactionId]
                );

            } catch (glError: any) {
                // Log GL posting error but don't fail the retirement
                console.error('GL posting for retirement failed:', glError.message);
                // The retirement is still successful, just without GL posting
            }

            return {
                transactionId,
                gainLoss,
                glDocumentNumber
            };

        } catch (error: any) {
            await client.query('ROLLBACK');
            throw new Error(`Asset retirement failed: ${error.message}`);
        } finally {
            client.release();
        }
    }


    /**
     * Get transaction history for an asset
     */
    async getAssetTransactions(assetId: number): Promise<any[]> {
        const result = await pool.query(
            `SELECT 
        at.id,
        at.transaction_type,
        at.transaction_date,
        at.amount,
        at.description,
        at.from_cost_center_id,
        at.to_cost_center_id,
        fcc.cost_center as from_cost_center,
        tcc.cost_center as to_cost_center,
        at.gl_document_number,
        at.vendor_id,
        at.invoice_number,
        at.created_at
      FROM asset_transactions at
      LEFT JOIN cost_centers fcc ON at.from_cost_center_id = fcc.id
      LEFT JOIN cost_centers tcc ON at.to_cost_center_id = tcc.id
      WHERE at.asset_id = $1
      ORDER BY at.transaction_date DESC, at.created_at DESC`,
            [assetId]
        );

        return result.rows;
    }
}

export const assetTransactionService = new AssetTransactionService();
