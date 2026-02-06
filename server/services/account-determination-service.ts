import { db, pool } from "../db";
import { eq, and, or, sql } from "drizzle-orm";
import { materials, materialGroups } from "@shared/schema";
import { accountDetermination } from "@shared/sales-finance-integration-schema";

export interface AccountDeterminationResult {
  glAccount: string;
  accountKey: string;
  success: boolean;
  ruleMatched?: string;
  error?: string;
}

export interface AccountDeterminationParams {
  chartOfAccounts: string;
  salesOrganization: string;
  customerAccountGroup: string;
  materialAccountGroup: string;
  accountKey: string; // REVENUE, REVENUE_FINAL, REVENUE_STATISTICAL
  division?: string;
}

export class AccountDeterminationService {
  /**
   * Determine GL account for billing based on account determination rules
   * 
   * Priority:
   * 1. Exact match: sales org + customer group + material group + account key
   * 2. Material group wildcard: sales org + customer group + * + account key
   * 3. Customer group wildcard: sales org + * + material group + account key
   * 4. Sales org wildcard: * + customer group + material group + account key
   * 5. Default GL account from system configuration
   */
  async determineGLAccount(params: AccountDeterminationParams): Promise<AccountDeterminationResult> {
    try {
      // Normalize account key to standard format
      // Map legacy codes to standard account types
      const accountKeyMap: Record<string, string> = {
        'ERL': 'REVENUE',
        'ERF': 'REVENUE_FINAL',
        'ERS': 'REVENUE_STATISTICAL'
      };
      const normalizedAccountKey = accountKeyMap[params.accountKey] || params.accountKey;

      // Get account group IDs for customer and material groups
      const customerGroupResult = await pool.query(`
        SELECT id FROM account_groups 
        WHERE code = $1 AND is_active = true
        LIMIT 1
      `, [params.customerAccountGroup]);

      const materialGroupResult = await pool.query(`
        SELECT id FROM account_groups 
        WHERE code = $1 AND is_active = true
        LIMIT 1
      `, [params.materialAccountGroup]);

      const customerGroupId = customerGroupResult.rows[0]?.id;
      const materialGroupId = materialGroupResult.rows[0]?.id;

      // Priority 1: Exact match using account_group_id references
      if (customerGroupId && materialGroupId) {
        const exactMatch = await pool.query(`
          SELECT gl_account, account_key
          FROM account_determination
          WHERE customer_account_group_id = $1
            AND material_account_group_id = $2
            AND account_key = $3
            AND is_active = true
          LIMIT 1
        `, [customerGroupId, materialGroupId, normalizedAccountKey]);

        if (exactMatch.rows.length > 0 && exactMatch.rows[0]) {
          const glAccount = exactMatch.rows[0].gl_account;
          const accountKey = exactMatch.rows[0].account_key;
          if (!glAccount || !accountKey) {
            throw new Error('Account determination rule found but gl_account or account_key is missing.');
          }
          return {
            glAccount: String(glAccount),
            accountKey: String(accountKey),
            success: true,
            ruleMatched: 'EXACT_MATCH'
          };
        }
      }

      // Priority 2: Material group wildcard (using customer_group_id, material_group = '*')
      if (customerGroupId) {
        const defaultMaterialGroup = await pool.query(`
          SELECT id FROM account_groups WHERE code = 'DEFAULT' AND is_active = true LIMIT 1
        `);
        const defaultMaterialId = defaultMaterialGroup.rows[0]?.id;

        const materialWildcard = await pool.query(`
          SELECT gl_account, account_key
          FROM account_determination
          WHERE customer_account_group_id = $1
            AND (material_account_group_id = $2 OR material_group = '*')
            AND account_key = $3
            AND is_active = true
          LIMIT 1
        `, [customerGroupId, defaultMaterialId, normalizedAccountKey]);

        if (materialWildcard.rows.length > 0 && materialWildcard.rows[0]) {
          const glAccount = materialWildcard.rows[0].gl_account;
          const accountKey = materialWildcard.rows[0].account_key;
          if (!glAccount || !accountKey) {
            throw new Error('Account determination rule found but gl_account or account_key is missing.');
          }
          return {
            glAccount: String(glAccount),
            accountKey: String(accountKey),
            success: true,
            ruleMatched: 'MATERIAL_WILDCARD'
          };
        }
      }

      // Priority 3: Customer group wildcard (customer_group = '*', using material_group_id)
      if (materialGroupId) {
        const defaultCustomerGroup = await pool.query(`
          SELECT id FROM account_groups WHERE code = 'DEFAULT' AND is_active = true LIMIT 1
        `);
        const defaultCustomerId = defaultCustomerGroup.rows[0]?.id;

        const customerWildcard = await pool.query(`
          SELECT gl_account, account_key
          FROM account_determination
          WHERE (customer_account_group_id = $1 OR customer_group = '*')
            AND material_account_group_id = $2
            AND account_key = $3
            AND is_active = true
          LIMIT 1
        `, [defaultCustomerId, materialGroupId, normalizedAccountKey]);

        if (customerWildcard.rows.length > 0 && customerWildcard.rows[0]) {
          const glAccount = customerWildcard.rows[0].gl_account;
          const accountKey = customerWildcard.rows[0].account_key;
          if (!glAccount || !accountKey) {
            throw new Error('Account determination rule found but gl_account or account_key is missing.');
          }
          return {
            glAccount: String(glAccount),
            accountKey: String(accountKey),
            success: true,
            ruleMatched: 'CUSTOMER_WILDCARD'
          };
        }
      }

      // Priority 4: System-wide default (all wildcards)
      const systemDefault = await pool.query(`
        SELECT gl_account, account_key
        FROM account_determination
        WHERE (customer_group = '*' OR customer_account_group_id IS NULL)
          AND (material_group = '*' OR material_account_group_id IS NULL)
          AND account_key = $1
          AND is_active = true
        LIMIT 1
      `, [normalizedAccountKey]);

      if (systemDefault.rows.length > 0 && systemDefault.rows[0]) {
        const glAccount = systemDefault.rows[0].gl_account;
        const accountKey = systemDefault.rows[0].account_key;
        if (!glAccount || !accountKey) {
          throw new Error('Account determination rule found but gl_account or account_key is missing.');
        }
        return {
          glAccount: String(glAccount),
          accountKey: String(accountKey),
          success: true,
          ruleMatched: 'SYSTEM_DEFAULT'
        };
      }

      // No match found - try to get default GL account from configuration
      const defaultAccount = await this.getDefaultGLAccountForAccountKey(normalizedAccountKey);
      if (defaultAccount) {
        return {
          glAccount: defaultAccount,
          accountKey: normalizedAccountKey,
          success: true,
          ruleMatched: 'CONFIGURATION_DEFAULT'
        };
      }

      // No match found
      return {
        glAccount: '',
        accountKey: normalizedAccountKey,
        success: false,
        error: `No account determination rule found for Chart=${params.chartOfAccounts}, SalesOrg=${params.salesOrganization}, CustGroup=${params.customerAccountGroup}, MatGroup=${params.materialAccountGroup}, AcctKey=${normalizedAccountKey}`
      };

    } catch (error: any) {
      console.error('Error in account determination:', error);
      return {
        glAccount: '',
        accountKey: params.accountKey,
        success: false,
        error: error.message || 'Account determination failed'
      };
    }
  }

  /**
   * Get default GL account for an account key from system configuration
   */
  private async getDefaultGLAccountForAccountKey(accountKey: string): Promise<string | null> {
    try {
      const result = await pool.query(`
        SELECT account_number
        FROM gl_accounts
        WHERE account_type = CASE 
          WHEN $1 LIKE 'REVENUE%' THEN 'REVENUE'
          WHEN $1 LIKE 'EXPENSE%' THEN 'EXPENSES'
          ELSE 'REVENUE'
        END
        AND is_active = true
        ORDER BY account_number
        LIMIT 1
      `, [accountKey]);

      return result.rows.length > 0 ? String(result.rows[0].account_number) : null;
    } catch (error) {
      console.error('Error getting default GL account:', error);
      return null;
    }
  }

  /**
   * Get material account group from material master
   */
  async getMaterialAccountGroup(materialId: number): Promise<string> {
    try {
      // First try to get from account_group_id reference
      const material = await pool.query(`
        SELECT 
          ag.code as account_group_code,
          m.material_group as material_group_legacy
        FROM materials m
        LEFT JOIN account_groups ag ON m.material_account_group_id = ag.id
        WHERE m.id = $1 AND m.is_active = true
        LIMIT 1
      `, [materialId]);

      if (material.rows.length > 0) {
        const row = material.rows[0];
        // Prefer account_group_id reference, fallback to legacy material_group
        if (row.account_group_code) {
          return String(row.account_group_code);
        }
        if (row.material_group_legacy) {
          return String(row.material_group_legacy);
        }
      }

      // Get default material account group from database
      const defaultGroup = await pool.query(`
        SELECT code FROM account_groups
        WHERE account_type = 'MATERIAL' AND is_active = true
        ORDER BY code
        LIMIT 1
      `);

      if (defaultGroup.rows.length > 0) {
        return String(defaultGroup.rows[0].code);
      }

      throw new Error('No material account group found in database');
    } catch (error) {
      console.error('Error getting material account group:', error);
      throw new Error(`Failed to determine material account group: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get customer account group from customer master
   * Uses account_group_id to reference account_groups table
   */
  async getCustomerAccountGroup(customerId: number): Promise<string> {
    try {
      // Get account group from account_group_id reference
      const customer = await pool.query(`
        SELECT 
          ag.code as account_group_code
        FROM erp_customers ec
        LEFT JOIN account_groups ag ON ec.account_group_id = ag.id
        WHERE ec.id = $1
        LIMIT 1
      `, [customerId]);

      if (customer.rows.length > 0) {
        const row = customer.rows[0];
        // If customer has account_group_id set, use it
        if (row.account_group_code) {
          return String(row.account_group_code);
        }
      }

      // If customer doesn't have account_group_id set, get default from database
      const defaultGroup = await pool.query(`
        SELECT code FROM account_groups
        WHERE account_type = 'CUSTOMER' AND is_active = true
        ORDER BY code
        LIMIT 1
      `);

      if (defaultGroup.rows.length > 0) {
        return String(defaultGroup.rows[0].code);
      }

      throw new Error('No customer account group found in database. Please configure account groups.');
    } catch (error) {
      console.error('Error getting customer account group:', error);
      throw new Error(`Failed to determine customer account group: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Determine GL accounts for billing invoice
   * Returns: AR account, Revenue account(s), Tax account
   */
  async determineBillingAccounts(params: {
    customerId: number;
    materialIds: number[];
    salesOrganization: string;
    chartOfAccounts?: string;
  }): Promise<{
    arAccount: string;
    revenueAccounts: { accountKey: string; glAccount: string }[];
    taxAccount: string;
    success: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    const revenueAccounts: { accountKey: string; glAccount: string }[] = [];

    const chartOfAccounts = params.chartOfAccounts || 'INT';
    const customerGroup = await this.getCustomerAccountGroup(params.customerId);

    // Get AR Account (Accounts Receivable - same for all invoices)
    const arAccountResult = await pool.query(`
      SELECT account_number
      FROM gl_accounts
      WHERE account_type = 'ASSETS'
        AND (account_name ILIKE '%receivable%' OR account_name ILIKE '%AR%')
        AND reconciliation_account = true
        AND is_active = true
      ORDER BY account_number
      LIMIT 1
    `);

    if (arAccountResult.rows.length === 0) {
      throw new Error('No accounts receivable account found in database. Please configure GL accounts.');
    }

    const arAccount = String(arAccountResult.rows[0].account_number);

    // Determine revenue accounts for each material
    for (const materialId of params.materialIds) {
      const materialGroup = await this.getMaterialAccountGroup(materialId);
      
      const revenueResult = await this.determineGLAccount({
        chartOfAccounts,
        salesOrganization: params.salesOrganization,
        customerAccountGroup: customerGroup,
        materialAccountGroup: materialGroup,
        accountKey: 'REVENUE' // Revenue account key
      });

      if (revenueResult.success) {
        revenueAccounts.push({
          accountKey: revenueResult.accountKey || 'REVENUE',
          glAccount: revenueResult.glAccount
        });
      } else {
        errors.push(`Material ${materialId}: ${revenueResult.error}`);
      }
    }

    // Get Tax Account
    const taxAccountResult = await pool.query(`
      SELECT account_number
      FROM gl_accounts
      WHERE account_type = 'LIABILITIES'
        AND (account_name ILIKE '%tax%payable%' OR account_name ILIKE '%tax%liability%')
        AND is_active = true
      ORDER BY account_number
      LIMIT 1
    `);

    const taxAccount = taxAccountResult.rows.length > 0 
      ? String(taxAccountResult.rows[0].account_number) 
      : ''; // Optional tax account

    return {
      arAccount,
      revenueAccounts,
      taxAccount,
      success: errors.length === 0,
      errors
    };
  }

  /**
   * Get system default GL accounts (fallback when account determination fails)
   * All values come from database - no hardcoded defaults
   */
  async getDefaultAccounts(): Promise<{
    arAccount: string;
    revenueAccount: string;
    taxAccount: string;
  }> {
    try {
      const [arResult, revenueResult, taxResult] = await Promise.all([
        pool.query(`SELECT account_number FROM gl_accounts WHERE account_type = 'ASSETS' AND reconciliation_account = true AND is_active = true ORDER BY account_number LIMIT 1`),
        pool.query(`SELECT account_number FROM gl_accounts WHERE account_type = 'REVENUE' AND is_active = true ORDER BY account_number LIMIT 1`),
        pool.query(`SELECT account_number FROM gl_accounts WHERE account_type = 'LIABILITIES' AND account_name ILIKE '%tax%' AND is_active = true ORDER BY account_number LIMIT 1`)
      ]);

      const arAccount = arResult.rows.length > 0 ? String(arResult.rows[0].account_number) : '';
      const revenueAccount = revenueResult.rows.length > 0 ? String(revenueResult.rows[0].account_number) : '';
      const taxAccount = taxResult.rows.length > 0 ? String(taxResult.rows[0].account_number) : '';

      if (!arAccount || !revenueAccount) {
        throw new Error('Required GL accounts not configured. Please set up accounts receivable and revenue accounts.');
      }

      return {
        arAccount,
        revenueAccount,
        taxAccount
      };
    } catch (error) {
      console.error('Error getting default accounts:', error);
      throw new Error(`Failed to retrieve default accounts from database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const accountDeterminationService = new AccountDeterminationService();
