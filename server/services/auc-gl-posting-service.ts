import { getPool } from '../database';

export interface CostAccumulationParams {
    aucId: number;
    amount: number;
    wipAccountCode: string;
    clearingAccountCode: string;
    postingDate: Date;
    fiscalYear: number;
    fiscalPeriod: number;
    description?: string;
    documentNumber?: string;
}

export interface CapitalizationGLParams {
    aucId: number;
    fixedAssetId: number;
    amount: number;
    wipAccountCode: string;
    postingDate: Date;
    documentNumber: string;
}

export interface SettlementGLParams {
    aucId: number;
    amount: number;
    wipAccountCode: string;
    receiverAccountCode: string;
    postingDate: Date;
    fiscalYear: number;
    fiscalPeriod: number;
    description?: string;
    documentNumber?: string;
}

/**
 * AUC GL Posting Service
 * Handles all GL postings related to Assets Under Construction
 */
export class AUCGLPostingService {
    private pool = getPool();

    /**
     * Post AUC cost accumulation
     * DR: AUC WIP Account
     * CR: AP/Clearing Account
     */
    async postCostAccumulation(params: CostAccumulationParams, client?: any): Promise<string> {
        const documentNumber = params.documentNumber || `AUC-COST-${params.aucId}-${Date.now()}`;
        const db = client || await this.pool.connect();
        const shouldCommit = !client;

        try {
            if (shouldCommit) await db.query('BEGIN');

            // Get GL account IDs from codes
            const wipAccount = await this.getGLAccountByCode(params.wipAccountCode, db);
            const clearingAccount = await this.getGLAccountByCode(params.clearingAccountCode, db);

            // DR: AUC WIP Account
            await db.query(`
        INSERT INTO gl_entries (
          document_number, gl_account_id, amount, debit_credit_indicator,
          posting_date, posting_status, fiscal_year, fiscal_period,
          description, source_module, source_document_type, source_document_id
        )
        VALUES ($1, $2, $3, 'D', $4, 'posted', $5, $6, $7, 'AUC', 'COST_ACCUMULATION', $8)
      `, [
                documentNumber,
                wipAccount.id,
                params.amount,
                params.postingDate,
                params.fiscalYear,
                params.fiscalPeriod,
                params.description || `AUC Cost Accumulation - AUC ID: ${params.aucId}`,
                params.aucId
            ]);

            // CR: Clearing Account (AP or other)
            await db.query(`
        INSERT INTO gl_entries (
          document_number, gl_account_id, amount, debit_credit_indicator,
          posting_date, posting_status, fiscal_year, fiscal_period,
          description, source_module, source_document_type, source_document_id
        )
        VALUES ($1, $2, $3, 'C', $4, 'posted', $5, $6, $7, 'AUC', 'COST_ACCUMULATION', $8)
      `, [
                documentNumber,
                clearingAccount.id,
                params.amount,
                params.postingDate,
                params.fiscalYear,
                params.fiscalPeriod,
                params.description || `AUC Cost Accumulation - AUC ID: ${params.aucId}`,
                params.aucId
            ]);

            if (shouldCommit) await db.query('COMMIT');
            return documentNumber;

        } catch (error) {
            if (shouldCommit) await db.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldCommit) db.release();
        }
    }

    /**
     * Post AUC capitalization
     * DR: Fixed Asset Account
     * CR: AUC WIP Account
     */
    async postCapitalization(params: CapitalizationGLParams, client?: any): Promise<string> {
        const documentNumber = params.documentNumber;
        const db = client || await this.pool.connect();
        const shouldCommit = !client;

        try {
            if (shouldCommit) await db.query('BEGIN');

            // Get asset account from account determination
            const assetAccount = await this.getAssetAccount(params.fixedAssetId, db);
            const wipAccount = await this.getGLAccountByCode(params.wipAccountCode, db);

            const fiscalYear = params.postingDate.getFullYear();
            const fiscalPeriod = params.postingDate.getMonth() + 1;

            // DR: Fixed Asset Account
            await db.query(`
        INSERT INTO gl_entries (
          document_number, gl_account_id, amount, debit_credit_indicator,
          posting_date, posting_status, fiscal_year, fiscal_period,
          description, source_module, source_document_type, source_document_id
        )
        VALUES ($1, $2, $3, 'D', $4, 'posted', $5, $6, $7, 'AUC', 'CAPITALIZATION', $8)
      `, [
                documentNumber,
                assetAccount.id,
                params.amount,
                params.postingDate,
                fiscalYear,
                fiscalPeriod,
                `AUC Capitalization to Fixed Asset`,
                params.fixedAssetId
            ]);

            // CR: AUC WIP Account
            await db.query(`
        INSERT INTO gl_entries (
          document_number, gl_account_id, amount, debit_credit_indicator,
          posting_date, posting_status, fiscal_year, fiscal_period,
          description, source_module, source_document_type, source_document_id
        )
        VALUES ($1, $2, $3, 'C', $4, 'posted', $5, $6, $7, 'AUC', 'CAPITALIZATION', $8)
      `, [
                documentNumber,
                wipAccount.id,
                params.amount,
                params.postingDate,
                fiscalYear,
                fiscalPeriod,
                `AUC Capitalization - Clear WIP`,
                params.aucId
            ]);

            if (shouldCommit) await db.query('COMMIT');
            return documentNumber;

        } catch (error) {
            if (shouldCommit) await db.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldCommit) db.release();
        }
    }

    /**
     * Post AUC settlement (partial or by percentage)
     * DR: Cost Center/Project Account
     * CR: AUC WIP Account
     */
    async postSettlement(params: SettlementGLParams, client?: any): Promise<string> {
        const documentNumber = params.documentNumber || `AUC-SETTLE-${params.aucId}-${Date.now()}`;
        const db = client || await this.pool.connect();
        const shouldCommit = !client;

        try {
            if (shouldCommit) await db.query('BEGIN');

            // Get GL account IDs
            const wipAccount = await this.getGLAccountByCode(params.wipAccountCode, db);
            const receiverAccount = await this.getGLAccountByCode(params.receiverAccountCode, db);

            // DR: Receiver Account (Cost Center/Project)
            await db.query(`
        INSERT INTO gl_entries (
          document_number, gl_account_id, amount, debit_credit_indicator,
          posting_date, posting_status, fiscal_year, fiscal_period,
          description, source_module, source_document_type, source_document_id
        )
        VALUES ($1, $2, $3, 'D', $4, 'posted', $5, $6, $7, 'AUC', 'SETTLEMENT', $8)
      `, [
                documentNumber,
                receiverAccount.id,
                params.amount,
                params.postingDate,
                params.fiscalYear,
                params.fiscalPeriod,
                params.description || `AUC Settlement - AUC ID: ${params.aucId}`,
                params.aucId
            ]);

            // CR: AUC WIP Account
            await db.query(`
        INSERT INTO gl_entries (
          document_number, gl_account_id, amount, debit_credit_indicator,
          posting_date, posting_status, fiscal_year, fiscal_period,
          description, source_module, source_document_type, source_document_id
        )
        VALUES ($1, $2, $3, 'C', $4, 'posted', $5, $6, $7, 'AUC', 'SETTLEMENT', $8)
      `, [
                documentNumber,
                wipAccount.id,
                params.amount,
                params.postingDate,
                params.fiscalYear,
                params.fiscalPeriod,
                params.description || `AUC Settlement - Clear WIP`,
                params.aucId
            ]);

            if (shouldCommit) await db.query('COMMIT');
            return documentNumber;

        } catch (error) {
            if (shouldCommit) await db.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldCommit) db.release();
        }
    }

    /**
     * Get GL account ID by account code
     */
    private async getGLAccountByCode(accountCode: string, client: any): Promise<{ id: number; account_number: string }> {
        const result = await client.query(`
      SELECT id, account_number, account_name, is_active
      FROM gl_accounts
      WHERE account_number = $1
    `, [accountCode]);

        if (result.rows.length === 0) {
            throw new Error(`GL Account not found: ${accountCode}`);
        }

        const account = result.rows[0];
        if (!account.is_active) {
            throw new Error(`GL Account ${accountCode} (${account.account_name}) is inactive`);
        }

        return account;
    }

    /**
     * Get asset account from account determination
     */
    private async getAssetAccount(assetId: number, client: any): Promise<{ id: number }> {
        const result = await client.query(`
      SELECT 
        COALESCE(
          company_ad.gl_account_id,
          general_ad.gl_account_id
        ) as account_id
      FROM asset_master am
      LEFT JOIN asset_account_determination company_ad 
        ON am.asset_class_id = company_ad.asset_class_id 
        AND company_ad.transaction_type = 'CAPITALIZATION'
        AND company_ad.account_category = 'ASSET_ACCOUNT'
        AND company_ad.company_code_id = am.company_code_id
        AND company_ad.is_active = true
      LEFT JOIN asset_account_determination general_ad 
        ON am.asset_class_id = general_ad.asset_class_id 
        AND general_ad.transaction_type = 'CAPITALIZATION'
        AND general_ad.account_category = 'ASSET_ACCOUNT'
        AND general_ad.company_code_id IS NULL
        AND general_ad.is_active = true
      WHERE am.id = $1
    `, [assetId]);

        if (result.rows.length === 0 || !result.rows[0].account_id) {
            throw new Error(`Asset account determination not configured for asset ID: ${assetId}`);
        }

        return { id: result.rows[0].account_id };
    }
}
