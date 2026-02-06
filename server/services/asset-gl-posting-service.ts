import { getPool } from '../database';

export interface AssetGLPostingParams {
  assetId: number;
  transactionType: 'CAPITALIZATION' | 'DEPRECIATION' | 'RETIREMENT' | 'SALE';
  amount: number;
  documentNumber: string;
  postingDate: Date;
  fiscalYear: number;
  fiscalPeriod: number;
  description?: string;
  costCenterId?: number;
  depreciationAreaId?: number; // For area-specific GL account determination
}

export class AssetGLPostingService {
  private pool = getPool();

  /**
   * Post asset capitalization to GL
   */
  async postCapitalization(params: AssetGLPostingParams): Promise<string> {
    const { assetId, amount, documentNumber, postingDate, fiscalYear, fiscalPeriod, description, costCenterId } = params;

    // Get asset details with account determination
    // Priority: 1. Company-specific account determination rules, 2. General account determination rules
    // Query by account_category = 'ASSET_ACCOUNT' for capitalization
    const assetResult = await this.pool.query(`
      SELECT 
        am.*,
        am.company_code_id,
        COALESCE(
          company_ad.gl_account_id,
          general_ad.gl_account_id
        ) as determined_asset_account_id,
        company_ad.gl_account_id as company_asset_account_id,
        general_ad.gl_account_id as general_asset_account_id
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
        AND company_ad.id IS NULL
      WHERE am.id = $1
    `, [assetId]);

    if (assetResult.rows.length === 0) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    const asset = assetResult.rows[0];

    const assetAccountId = asset.determined_asset_account_id;

    if (!assetAccountId) {
      const assetClassInfo = await this.pool.query(`
        SELECT ac.code as asset_class_code, ac.name as asset_class_name,
               cc.code as company_code, cc.name as company_name
        FROM asset_master am
        LEFT JOIN asset_classes ac ON am.asset_class_id = ac.id
        LEFT JOIN company_codes cc ON am.company_code_id = cc.id
        WHERE am.id = $1
      `, [assetId]);

      const assetInfo = assetClassInfo.rows[0] || {};
      throw new Error(
        `Account determination not configured for capitalization. ` +
        `Asset ID: ${assetId}, Asset Class: ${assetInfo.asset_class_code || asset.asset_class_id} (${assetInfo.asset_class_name || 'N/A'}), ` +
        `Company Code: ${assetInfo.company_code || asset.company_code_id || 'N/A'} (${assetInfo.company_name || 'N/A'}). ` +
        `Missing: Asset Account. ` +
        `Please configure account determination rules in Master Data > Asset Account Determination for transaction type 'CAPITALIZATION'.`
      );
    }

    // Validate asset account exists and is active
    const assetAccountCheck = await this.pool.query(`
      SELECT id, account_number, account_name, is_active
      FROM gl_accounts
      WHERE id = $1
    `, [assetAccountId]);

    if (assetAccountCheck.rows.length === 0) {
      throw new Error(
        `Asset Account (ID: ${assetAccountId}) specified in account determination does not exist in gl_accounts table. ` +
        `Please verify the account determination configuration for Asset ID: ${assetId}.`
      );
    }

    const assetAccount = assetAccountCheck.rows[0];
    if (!assetAccount.is_active) {
      throw new Error(
        `Asset Account ${assetAccount.account_number} (${assetAccount.account_name}) is inactive. ` +
        `Please activate the account or update account determination configuration for Asset ID: ${assetId}.`
      );
    }

    // For capitalization, clearing account is required but not stored in asset_transactions
    // Since account determination doesn't include clearing account, it must be provided
    // through the transaction or asset context.
    // NOTE: Capitalization GL posting requires clearing_account_id to be added to asset_transactions
    // or account_determination schema. For now, this method is not fully implemented without defaults.
    throw new Error(
      `Clearing account not configured for capitalization. ` +
      `Asset ID: ${assetId}. ` +
      `Capitalization requires a clearing account (typically Accounts Payable) for the credit entry. ` +
      `Please add clearing_account_id to asset_transactions table or account_determination rules, ` +
      `or pass it as a parameter to enable capitalization GL posting.`
    );
  }

  /**
   * Post depreciation to GL
   * Now supports depreciation_area_id for area-specific account determination
   */
  async postDepreciation(params: AssetGLPostingParams): Promise<string> {
    const { assetId, amount, documentNumber, postingDate, fiscalYear, fiscalPeriod, description, costCenterId, depreciationAreaId } = params;

    // Get asset details with account determination
    // Priority: 
    // 1. Area-specific + Company-specific rules
    // 2. Area-specific + General rules
    // 3. Company-specific rules (no area)
    // 4. General rules (no area)
    const assetResult = await this.pool.query(`
      SELECT 
        am.*,
        am.company_code_id,
        am.depreciation_area_id,
        da.posting_indicator,
        da.ledger_group,
        COALESCE(
          area_company_expense_ad.gl_account_id,
          area_general_expense_ad.gl_account_id,
          company_expense_ad.gl_account_id,
          general_expense_ad.gl_account_id
        ) as determined_expense_account_id,
        COALESCE(
          area_company_accum_ad.gl_account_id,
          area_general_accum_ad.gl_account_id,
          company_accum_ad.gl_account_id,
          general_accum_ad.gl_account_id
        ) as determined_accumulated_account_id
      FROM asset_master am
      LEFT JOIN depreciation_areas da ON am.depreciation_area_id = da.id
      -- Area-specific + Company-specific Expense Account
      LEFT JOIN asset_account_determination area_company_expense_ad 
        ON am.asset_class_id = area_company_expense_ad.asset_class_id 
        AND area_company_expense_ad.transaction_type = 'DEPRECIATION'
        AND area_company_expense_ad.account_category = 'DEPRECIATION_EXPENSE_ACCOUNT'
        AND area_company_expense_ad.company_code_id = am.company_code_id
        AND area_company_expense_ad.depreciation_area_id = $2
        AND area_company_expense_ad.is_active = true
      -- Area-specific + General Expense Account
      LEFT JOIN asset_account_determination area_general_expense_ad 
        ON am.asset_class_id = area_general_expense_ad.asset_class_id 
        AND area_general_expense_ad.transaction_type = 'DEPRECIATION'
        AND area_general_expense_ad.account_category = 'DEPRECIATION_EXPENSE_ACCOUNT'
        AND area_general_expense_ad.company_code_id IS NULL
        AND area_general_expense_ad.depreciation_area_id = $2
        AND area_general_expense_ad.is_active = true
        AND area_company_expense_ad.id IS NULL
      -- Company-specific Expense Account (no area)
      LEFT JOIN asset_account_determination company_expense_ad 
        ON am.asset_class_id = company_expense_ad.asset_class_id 
        AND company_expense_ad.transaction_type = 'DEPRECIATION'
        AND company_expense_ad.account_category = 'DEPRECIATION_EXPENSE_ACCOUNT'
        AND company_expense_ad.company_code_id = am.company_code_id
        AND company_expense_ad.depreciation_area_id IS NULL
        AND company_expense_ad.is_active = true
        AND area_company_expense_ad.id IS NULL
        AND area_general_expense_ad.id IS NULL
      -- General Expense Account (no area)
      LEFT JOIN asset_account_determination general_expense_ad 
        ON am.asset_class_id = general_expense_ad.asset_class_id 
        AND general_expense_ad.transaction_type = 'DEPRECIATION'
        AND general_expense_ad.account_category = 'DEPRECIATION_EXPENSE_ACCOUNT'
        AND general_expense_ad.company_code_id IS NULL
        AND general_expense_ad.depreciation_area_id IS NULL
        AND general_expense_ad.is_active = true
        AND area_company_expense_ad.id IS NULL
        AND area_general_expense_ad.id IS NULL
        AND company_expense_ad.id IS NULL
      -- Area-specific + Company-specific Accumulated Account
      LEFT JOIN asset_account_determination area_company_accum_ad 
        ON am.asset_class_id = area_company_accum_ad.asset_class_id 
        AND area_company_accum_ad.transaction_type = 'DEPRECIATION'
        AND area_company_accum_ad.account_category = 'ACCUMULATED_DEPRECIATION_ACCOUNT'
        AND area_company_accum_ad.company_code_id = am.company_code_id
        AND area_company_accum_ad.depreciation_area_id = $2
        AND area_company_accum_ad.is_active = true
      -- Area-specific + General Accumulated Account
      LEFT JOIN asset_account_determination area_general_accum_ad 
        ON am.asset_class_id = area_general_accum_ad.asset_class_id 
        AND area_general_accum_ad.transaction_type = 'DEPRECIATION'
        AND area_general_accum_ad.account_category = 'ACCUMULATED_DEPRECIATION_ACCOUNT'
        AND area_general_accum_ad.company_code_id IS NULL
        AND area_general_accum_ad.depreciation_area_id = $2
        AND area_general_accum_ad.is_active = true
        AND area_company_accum_ad.id IS NULL
      -- Company-specific Accumulated Account (no area)
      LEFT JOIN asset_account_determination company_accum_ad 
        ON am.asset_class_id = company_accum_ad.asset_class_id 
        AND company_accum_ad.transaction_type = 'DEPRECIATION'
        AND company_accum_ad.account_category = 'ACCUMULATED_DEPRECIATION_ACCOUNT'
        AND company_accum_ad.company_code_id = am.company_code_id
        AND company_accum_ad.depreciation_area_id IS NULL
        AND company_accum_ad.is_active = true
        AND area_company_accum_ad.id IS NULL
        AND area_general_accum_ad.id IS NULL
      -- General Accumulated Account (no area)
      LEFT JOIN asset_account_determination general_accum_ad 
        ON am.asset_class_id = general_accum_ad.asset_class_id 
        AND general_accum_ad.transaction_type = 'DEPRECIATION'
        AND general_accum_ad.account_category = 'ACCUMULATED_DEPRECIATION_ACCOUNT'
        AND general_accum_ad.company_code_id IS NULL
        AND general_accum_ad.depreciation_area_id IS NULL
        AND general_accum_ad.is_active = true
        AND area_company_accum_ad.id IS NULL
        AND area_general_accum_ad.id IS NULL
        AND company_accum_ad.id IS NULL
      WHERE am.id = $1
    `, [assetId, depreciationAreaId || null]);

    if (assetResult.rows.length === 0) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    const asset = assetResult.rows[0];

    // Check posting_indicator - skip GL posting if area is configured as NONE
    if (asset.posting_indicator === 'NONE') {
      console.log(`Depreciation area ${asset.depreciation_area_id} has posting_indicator=NONE. Skipping GL posting.`);
      return `SKIP-${documentNumber}`; // Return special marker to indicate skipped posting
    }

    // Account determination is required - no fallback defaults
    const expenseAccountId = asset.determined_expense_account_id;
    const accumulatedAccountId = asset.determined_accumulated_account_id;

    // Validate account determination exists
    if (!expenseAccountId || !accumulatedAccountId) {
      const assetClassInfo = await this.pool.query(`
        SELECT ac.code as asset_class_code, ac.name as asset_class_name,
               cc.code as company_code, cc.name as company_name
        FROM asset_master am
        LEFT JOIN asset_classes ac ON am.asset_class_id = ac.id
        LEFT JOIN company_codes cc ON am.company_code_id = cc.id
        WHERE am.id = $1
      `, [assetId]);

      const assetInfo = assetClassInfo.rows[0] || {};
      const missingAccounts = [];
      if (!expenseAccountId) missingAccounts.push('Depreciation Expense Account (account_category: DEPRECIATION_EXPENSE_ACCOUNT)');
      if (!accumulatedAccountId) missingAccounts.push('Accumulated Depreciation Account (account_category: ACCUMULATED_DEPRECIATION_ACCOUNT)');

      // Check if any account determination rules exist at all
      const anyRulesCheck = await this.pool.query(`
        SELECT COUNT(*) as count
        FROM asset_account_determination
        WHERE transaction_type = 'DEPRECIATION' AND is_active = true
      `);

      const hasAnyRules = parseInt(anyRulesCheck.rows[0]?.count || '0') > 0;

      let errorMessage = `Account determination not configured for depreciation. ` +
        `Asset ID: ${assetId}, Asset Number: ${asset.asset_number || 'N/A'}, ` +
        `Asset Class: ${assetInfo.asset_class_code || asset.asset_class_id} (${assetInfo.asset_class_name || 'N/A'}), ` +
        `Company Code: ${assetInfo.company_code || asset.company_code_id || 'N/A'} (${assetInfo.company_name || 'N/A'}). ` +
        `Missing accounts: ${missingAccounts.join(', ')}.`;

      if (!hasAnyRules) {
        errorMessage += ` No account determination rules found for DEPRECIATION transaction type. ` +
          `Please configure account determination rules in Master Data > Asset Account Determination.`;
      } else {
        errorMessage += ` Please configure account determination rules for this asset class and company code ` +
          `in Master Data > Asset Account Determination for transaction type 'DEPRECIATION' with the required account categories.`;
      }

      throw new Error(errorMessage);
    }

    // Validate GL accounts exist and are active
    const expenseAccountCheck = await this.pool.query(`
      SELECT id, account_number, account_name, is_active
      FROM gl_accounts
      WHERE id = $1
    `, [expenseAccountId]);

    const accumAccountCheck = await this.pool.query(`
      SELECT id, account_number, account_name, is_active
      FROM gl_accounts
      WHERE id = $1
    `, [accumulatedAccountId]);

    if (expenseAccountCheck.rows.length === 0) {
      throw new Error(
        `Depreciation Expense Account (ID: ${expenseAccountId}) specified in account determination does not exist in gl_accounts table. ` +
        `Please verify the account determination configuration for Asset ID: ${assetId}.`
      );
    }

    if (accumAccountCheck.rows.length === 0) {
      throw new Error(
        `Accumulated Depreciation Account (ID: ${accumulatedAccountId}) specified in account determination does not exist in gl_accounts table. ` +
        `Please verify the account determination configuration for Asset ID: ${assetId}.`
      );
    }

    const expenseAccount = expenseAccountCheck.rows[0];
    const accumAccount = accumAccountCheck.rows[0];

    if (!expenseAccount.is_active) {
      throw new Error(
        `Depreciation Expense Account ${expenseAccount.account_number} (${expenseAccount.account_name}) is inactive. ` +
        `Please activate the account or update account determination configuration for Asset ID: ${assetId}.`
      );
    }

    if (!accumAccount.is_active) {
      throw new Error(
        `Accumulated Depreciation Account ${accumAccount.account_number} (${accumAccount.account_name}) is inactive. ` +
        `Please activate the account or update account determination configuration for Asset ID: ${assetId}.`
      );
    }

    // Create GL entries
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Debit: Depreciation Expense Account
      await client.query(`
        INSERT INTO gl_entries (
          document_number, gl_account_id, amount, debit_credit_indicator,
          posting_date, posting_status, fiscal_year, fiscal_period,
          cost_center_id, description, source_module, source_document_type, source_document_id
        )
        VALUES ($1, $2, $3, 'D', $4, 'posted', $5, $6, $7, $8, 'ASSET', 'DEPRECIATION', $9)
      `, [
        documentNumber,
        expenseAccountId,
        amount,
        postingDate,
        fiscalYear,
        fiscalPeriod,
        costCenterId || asset.cost_center_id,
        description || `Depreciation: ${asset.name}`,
        assetId
      ]);

      // Credit: Accumulated Depreciation Account
      await client.query(`
        INSERT INTO gl_entries (
          document_number, gl_account_id, amount, debit_credit_indicator,
          posting_date, posting_status, fiscal_year, fiscal_period,
          cost_center_id, description, source_module, source_document_type, source_document_id
        )
        VALUES ($1, $2, $3, 'C', $4, 'posted', $5, $6, $7, $8, 'ASSET', 'DEPRECIATION', $9)
      `, [
        documentNumber,
        accumulatedAccountId,
        amount,
        postingDate,
        fiscalYear,
        fiscalPeriod,
        costCenterId || asset.cost_center_id,
        description || `Depreciation: ${asset.name}`,
        assetId
      ]);

      await client.query('COMMIT');
      return documentNumber;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Post asset retirement to GL
   * Journal entries for retirement:
   * - Debit: Accumulated Depreciation (to clear)
   * - Debit: Cash/Receivable (if sold for amount > 0)
   * - Debit/Credit: Gain or Loss on Disposal
   * - Credit: Asset Account (to remove asset)
   */
  async postRetirement(params: AssetGLPostingParams & {
    accumulatedDepreciation: number;
    acquisitionCost: number;
    disposalAmount: number;
    gainLoss: number;
  }): Promise<string> {
    const {
      assetId, amount, documentNumber, postingDate, fiscalYear, fiscalPeriod,
      description, costCenterId, accumulatedDepreciation, acquisitionCost,
      disposalAmount, gainLoss
    } = params;

    // Get asset details with account determination
    const assetResult = await this.pool.query(`
      SELECT 
        am.*,
        am.company_code_id,
        -- Asset Account (for removal)
        COALESCE(company_asset_ad.gl_account_id, general_asset_ad.gl_account_id) as asset_account_id,
        -- Accumulated Depreciation Account
        COALESCE(company_accum_ad.gl_account_id, general_accum_ad.gl_account_id) as accum_depreciation_account_id,
        -- Gain/Loss on Disposal Account
        COALESCE(company_gainloss_ad.gl_account_id, general_gainloss_ad.gl_account_id) as gain_loss_account_id,
        -- Cash/Bank Account (for disposal proceeds)
        COALESCE(company_cash_ad.gl_account_id, general_cash_ad.gl_account_id) as cash_account_id
      FROM asset_master am
      -- Asset Account
      LEFT JOIN asset_account_determination company_asset_ad 
        ON am.asset_class_id = company_asset_ad.asset_class_id 
        AND company_asset_ad.transaction_type = 'RETIREMENT'
        AND company_asset_ad.account_category = 'ASSET_ACCOUNT'
        AND company_asset_ad.company_code_id = am.company_code_id
        AND company_asset_ad.is_active = true
      LEFT JOIN asset_account_determination general_asset_ad 
        ON am.asset_class_id = general_asset_ad.asset_class_id 
        AND general_asset_ad.transaction_type = 'RETIREMENT'
        AND general_asset_ad.account_category = 'ASSET_ACCOUNT'
        AND general_asset_ad.company_code_id IS NULL
        AND general_asset_ad.is_active = true
      -- Accumulated Depreciation
      LEFT JOIN asset_account_determination company_accum_ad 
        ON am.asset_class_id = company_accum_ad.asset_class_id 
        AND company_accum_ad.transaction_type = 'RETIREMENT'
        AND company_accum_ad.account_category = 'ACCUMULATED_DEPRECIATION_ACCOUNT'
        AND company_accum_ad.company_code_id = am.company_code_id
        AND company_accum_ad.is_active = true
      LEFT JOIN asset_account_determination general_accum_ad 
        ON am.asset_class_id = general_accum_ad.asset_class_id 
        AND general_accum_ad.transaction_type = 'RETIREMENT'
        AND general_accum_ad.account_category = 'ACCUMULATED_DEPRECIATION_ACCOUNT'
        AND general_accum_ad.company_code_id IS NULL
        AND general_accum_ad.is_active = true
      -- Gain/Loss Account
      LEFT JOIN asset_account_determination company_gainloss_ad 
        ON am.asset_class_id = company_gainloss_ad.asset_class_id 
        AND company_gainloss_ad.transaction_type = 'RETIREMENT'
        AND company_gainloss_ad.account_category = 'GAIN_LOSS_ACCOUNT'
        AND company_gainloss_ad.company_code_id = am.company_code_id
        AND company_gainloss_ad.is_active = true
      LEFT JOIN asset_account_determination general_gainloss_ad 
        ON am.asset_class_id = general_gainloss_ad.asset_class_id 
        AND general_gainloss_ad.transaction_type = 'RETIREMENT'
        AND general_gainloss_ad.account_category = 'GAIN_LOSS_ACCOUNT'
        AND general_gainloss_ad.company_code_id IS NULL
        AND general_gainloss_ad.is_active = true
      -- Cash Account
      LEFT JOIN asset_account_determination company_cash_ad 
        ON am.asset_class_id = company_cash_ad.asset_class_id 
        AND company_cash_ad.transaction_type = 'RETIREMENT'
        AND company_cash_ad.account_category = 'CASH_ACCOUNT'
        AND company_cash_ad.company_code_id = am.company_code_id
        AND company_cash_ad.is_active = true
      LEFT JOIN asset_account_determination general_cash_ad 
        ON am.asset_class_id = general_cash_ad.asset_class_id 
        AND general_cash_ad.transaction_type = 'RETIREMENT'
        AND general_cash_ad.account_category = 'CASH_ACCOUNT'
        AND general_cash_ad.company_code_id IS NULL
        AND general_cash_ad.is_active = true
      WHERE am.id = $1
    `, [assetId]);

    if (assetResult.rows.length === 0) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    const asset = assetResult.rows[0];

    // Check required accounts
    const assetAccountId = asset.asset_account_id;
    const accumAccountId = asset.accum_depreciation_account_id;
    const gainLossAccountId = asset.gain_loss_account_id;
    const cashAccountId = asset.cash_account_id;

    // For retirement, we need at minimum: Asset Account and Gain/Loss Account
    // If there was depreciation, we need Accumulated Depreciation Account
    // If there's disposal proceeds, we need Cash Account
    if (!assetAccountId) {
      throw new Error(
        `Account determination not configured for retirement. Asset ID: ${assetId}. ` +
        `Missing: Asset Account (ASSET_ACCOUNT). Please configure in Master Data > Asset Account Determination.`
      );
    }

    if (accumulatedDepreciation > 0 && !accumAccountId) {
      throw new Error(
        `Account determination not configured for retirement. Asset ID: ${assetId}. ` +
        `Missing: Accumulated Depreciation Account (ACCUMULATED_DEPRECIATION_ACCOUNT). ` +
        `Required because asset has accumulated depreciation of ${accumulatedDepreciation}.`
      );
    }

    if (gainLoss !== 0 && !gainLossAccountId) {
      throw new Error(
        `Account determination not configured for retirement. Asset ID: ${assetId}. ` +
        `Missing: Gain/Loss on Disposal Account (GAIN_LOSS_ACCOUNT). ` +
        `Required because retirement results in a ${gainLoss > 0 ? 'gain' : 'loss'} of ${Math.abs(gainLoss)}.`
      );
    }

    if (disposalAmount > 0 && !cashAccountId) {
      throw new Error(
        `Account determination not configured for retirement. Asset ID: ${assetId}. ` +
        `Missing: Cash/Bank Account (CASH_ACCOUNT). ` +
        `Required because asset is being sold for ${disposalAmount}.`
      );
    }

    // Create GL entries
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Debit: Accumulated Depreciation (to clear the accumulated depreciation)
      if (accumulatedDepreciation > 0 && accumAccountId) {
        await client.query(`
          INSERT INTO gl_entries (
            document_number, gl_account_id, amount, debit_credit_indicator,
            posting_date, posting_status, fiscal_year, fiscal_period,
            cost_center_id, description, source_module, source_document_type, source_document_id
          )
          VALUES ($1, $2, $3, 'D', $4, 'posted', $5, $6, $7, $8, 'ASSET', 'RETIREMENT', $9)
        `, [
          documentNumber,
          accumAccountId,
          accumulatedDepreciation,
          postingDate,
          fiscalYear,
          fiscalPeriod,
          costCenterId || asset.cost_center_id,
          `Retirement - Clear accumulated depreciation: ${asset.name}`,
          assetId
        ]);
      }

      // 2. Debit: Cash/Bank (if sold for proceeds)
      if (disposalAmount > 0 && cashAccountId) {
        await client.query(`
          INSERT INTO gl_entries (
            document_number, gl_account_id, amount, debit_credit_indicator,
            posting_date, posting_status, fiscal_year, fiscal_period,
            cost_center_id, description, source_module, source_document_type, source_document_id
          )
          VALUES ($1, $2, $3, 'D', $4, 'posted', $5, $6, $7, $8, 'ASSET', 'RETIREMENT', $9)
        `, [
          documentNumber,
          cashAccountId,
          disposalAmount,
          postingDate,
          fiscalYear,
          fiscalPeriod,
          costCenterId || asset.cost_center_id,
          `Retirement - Disposal proceeds: ${asset.name}`,
          assetId
        ]);
      }

      // 3. Debit or Credit: Gain/Loss on Disposal
      if (gainLoss !== 0 && gainLossAccountId) {
        // Loss = Debit (expense), Gain = Credit (income)
        const indicator = gainLoss < 0 ? 'D' : 'C';
        await client.query(`
          INSERT INTO gl_entries (
            document_number, gl_account_id, amount, debit_credit_indicator,
            posting_date, posting_status, fiscal_year, fiscal_period,
            cost_center_id, description, source_module, source_document_type, source_document_id
          )
          VALUES ($1, $2, $3, $4, $5, 'posted', $6, $7, $8, $9, 'ASSET', 'RETIREMENT', $10)
        `, [
          documentNumber,
          gainLossAccountId,
          Math.abs(gainLoss),
          indicator,
          postingDate,
          fiscalYear,
          fiscalPeriod,
          costCenterId || asset.cost_center_id,
          `Retirement - ${gainLoss > 0 ? 'Gain' : 'Loss'} on disposal: ${asset.name}`,
          assetId
        ]);
      }

      // 4. Credit: Asset Account (to remove the asset at acquisition cost)
      await client.query(`
        INSERT INTO gl_entries (
          document_number, gl_account_id, amount, debit_credit_indicator,
          posting_date, posting_status, fiscal_year, fiscal_period,
          cost_center_id, description, source_module, source_document_type, source_document_id
        )
        VALUES ($1, $2, $3, 'C', $4, 'posted', $5, $6, $7, $8, 'ASSET', 'RETIREMENT', $9)
      `, [
        documentNumber,
        assetAccountId,
        acquisitionCost,
        postingDate,
        fiscalYear,
        fiscalPeriod,
        costCenterId || asset.cost_center_id,
        description || `Retirement - Remove asset: ${asset.name}`,
        assetId
      ]);

      await client.query('COMMIT');
      return documentNumber;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

}

