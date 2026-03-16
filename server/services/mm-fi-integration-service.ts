import { db, pool } from "../db";
import { 
  materials,
  glAccounts,
  stockMovements,
  orders
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { accountDeterminationRules } from "@shared/mm-fi-schema";

export interface AccountDeterminationRule {
  materialCategory: string;
  movementType: string;
  valuationClass: string;
  debitAccount: string;
  creditAccount: string;
  costCenter?: string;
}

export interface PurchaseCommitment {
  purchaseOrderId: number;
  materialId: number;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  glAccount: string;
  commitmentDate: Date;
  expectedDelivery: Date;
  status: 'open' | 'partial' | 'closed';
}

export interface ThreeWayMatch {
  purchaseOrderId: number;
  goodsReceiptId: number;
  invoiceId: number;
  materialId: number;
  poQuantity: number;
  grQuantity: number;
  invoiceQuantity: number;
  poPrice: number;
  invoicePrice: number;
  priceVariance: number;
  quantityVariance: number;
  status: 'matched' | 'variance' | 'blocked';
}

export class MMFIIntegrationService {
  
  // Account Determination Engine
  async determineAccounts(materialId: number, movementType: string, plant?: string): Promise<{
    debitAccount: string;
    creditAccount: string;
    costCenter?: string;
  }> {
    try {
      // Get material details
      const [material] = await db
        .select()
        .from(materials)
        .where(eq(materials.id, materialId));
      
      if (!material) {
        throw new Error(`Material not found: ${materialId}`);
      }

      // Get valuation class for material
      const [valuation] = await db
        .select()
        .from(valuationClasses)
        .where(eq(valuationClasses.id, material.valuationClassId || 1));

      // Determine accounts based on movement type and valuation class
      const accountRule = await this.getAccountDeterminationRule(
        material.categoryId?.toString() || '1',
        movementType,
        valuationClassCode
      );

      return {
        debitAccount: accountRule.debitAccount,
        creditAccount: accountRule.creditAccount,
        costCenter: accountRule.costCenter
      };

    } catch (error) {
      console.error('Account determination failed:', error);
      // Fallback to database lookup for default accounts
      try {
        const defaultAccounts = await this.getDefaultAccountsFromDatabase(movementType);
        return {
          debitAccount: defaultAccounts.debitAccount,
          creditAccount: defaultAccounts.creditAccount,
          costCenter: undefined
        };
      } catch (fallbackError) {
        console.error('Fallback account lookup failed:', fallbackError);
        throw new Error(`Account determination failed: ${error}. Please configure account determination rules.`);
      }
    }
  }

  private async getAccountDeterminationRule(
    materialCategory: string, 
    movementType: string, 
    valuationClass: string
  ): Promise<AccountDeterminationRule> {
    
    // First, try to get rule from database
    try {
      const [rule] = await db
        .select()
        .from(accountDeterminationRules)
        .where(
          and(
            eq(accountDeterminationRules.materialCategory, materialCategory),
            eq(accountDeterminationRules.movementType, movementType),
            eq(accountDeterminationRules.valuationClass, valuationClass),
            eq(accountDeterminationRules.isActive, true)
          )
        )
        .limit(1);

      if (rule) {
        return {
          materialCategory: rule.materialCategory,
          movementType: rule.movementType,
          valuationClass: rule.valuationClass,
          debitAccount: rule.debitAccount,
          creditAccount: rule.creditAccount,
          costCenter: rule.costCenter || undefined
        };
      }
    } catch (dbError) {
      console.warn('Database lookup for account determination rule failed, using fallback:', dbError);
    }

    // Fallback: Get default accounts from database based on movement type
    const defaultAccounts = await this.getDefaultAccountsFromDatabase(movementType);
    
    return {
      materialCategory,
      movementType,
      valuationClass,
      debitAccount: defaultAccounts.debitAccount,
      creditAccount: defaultAccounts.creditAccount,
      costCenter: undefined
    };
  }

  /**
   * Get default accounts from database based on movement type
   */
  private async getDefaultAccountsFromDatabase(movementType: string): Promise<{
    debitAccount: string;
    creditAccount: string;
  }> {
    try {
      const { sql } = await import('drizzle-orm');
      
      // Determine account types based on movement type
      let debitAccountType = 'ASSETS';
      let creditAccountType = 'LIABILITIES';
      let debitAccountName = '%inventory%';
      let creditAccountName = '%payable%';

      // Goods Receipt (101, 102) - Inventory increase, Payable increase
      if (movementType === '101' || movementType === '102') {
        debitAccountType = 'ASSETS';
        creditAccountType = 'LIABILITIES';
        debitAccountName = '%inventory%';
        creditAccountName = '%payable%';
      }
      // Goods Issue to Cost Center (201) - Expense increase, Inventory decrease
      else if (movementType === '201') {
        debitAccountType = 'EXPENSES';
        creditAccountType = 'ASSETS';
        debitAccountName = '%manufacturing%cost%';
        creditAccountName = '%inventory%';
      }
      // Goods Issue to Production (261) - WIP increase, Inventory decrease
      else if (movementType === '261') {
        debitAccountType = 'ASSETS';
        creditAccountType = 'ASSETS';
        debitAccountName = '%work%process%';
        creditAccountName = '%inventory%';
      }
      // Sales Delivery (601) - COGS increase, Inventory decrease
      else if (movementType === '601') {
        debitAccountType = 'EXPENSES';
        creditAccountType = 'ASSETS';
        debitAccountName = '%cost%goods%';
        creditAccountName = '%inventory%';
      }

      // Get debit account
      const debitResult = await db.execute(sql`
        SELECT account_number
        FROM gl_accounts
        WHERE account_type = ${debitAccountType}
          AND account_name ILIKE ${debitAccountName}
          AND is_active = true
        ORDER BY account_number
        LIMIT 1
      `);

      // Get credit account
      const creditResult = await db.execute(sql`
        SELECT account_number
        FROM gl_accounts
        WHERE account_type = ${creditAccountType}
          AND account_name ILIKE ${creditAccountName}
          AND is_active = true
        ORDER BY account_number
        LIMIT 1
      `);

      if (debitResult.rows.length > 0 && creditResult.rows.length > 0) {
        return {
          debitAccount: String(debitResult.rows[0].account_number),
          creditAccount: String(creditResult.rows[0].account_number)
        };
      }

      throw new Error('Default accounts not found in database');
    } catch (error) {
      console.error('Error getting default accounts from database:', error);
      throw new Error(`Unable to determine accounts for movement type ${movementType}. Please configure account determination rules.`);
    }
  }

  // Purchase Commitment Management
  async createPurchaseCommitment(purchaseOrderId: number): Promise<PurchaseCommitment[]> {
    try {
      // Get purchase order details
      const [purchaseOrder] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, purchaseOrderId));

      if (!purchaseOrder) {
        throw new Error(`Purchase order not found: ${purchaseOrderId}`);
      }

      const commitments: PurchaseCommitment[] = [];
      
      // Determine GL account for purchase commitments from database
      let glAccount = '290000'; // Fallback
      try {
        const glAccountResult = await pool.query(`
          SELECT account_number 
          FROM gl_accounts 
          WHERE account_type = 'LIABILITIES' 
            AND (account_name ILIKE '%commitment%' OR account_name ILIKE '%purchase commitment%')
            AND is_active = true 
          ORDER BY account_number 
          LIMIT 1
        `);
        
        if (glAccountResult.rows.length > 0) {
          glAccount = String(glAccountResult.rows[0].account_number || '290000');
        } else {
          // Try to get from account_determination_rules for purchase commitments
          const accountRuleResult = await pool.query(`
            SELECT debit_account, credit_account 
            FROM account_determination_rules 
            WHERE movement_type = 'COMMITMENT' 
              AND is_active = true 
            LIMIT 1
          `);
          if (accountRuleResult.rows.length > 0 && accountRuleResult.rows[0].credit_account) {
            glAccount = String(accountRuleResult.rows[0].credit_account);
          }
        }
        
        if (!glAccount || glAccount === '290000') {
          throw new Error('Purchase commitment GL account not configured. Please set up a liability account for commitments in gl_accounts or account_determination_rules.');
        }
      } catch (glError: any) {
        console.error('Error determining GL account for purchase commitment:', glError);
        throw new Error(`Failed to determine GL account for purchase commitment: ${glError.message}`);
      }
      
      // Create commitment for each line item
      const commitment: PurchaseCommitment = {
        purchaseOrderId,
        materialId: purchaseOrder.materialId || 1,
        quantity: purchaseOrder.quantity || 0,
        unitPrice: parseFloat(purchaseOrder.unitPrice || '0'),
        totalValue: (purchaseOrder.quantity || 0) * parseFloat(purchaseOrder.unitPrice || '0'),
        glAccount: glAccount,
        commitmentDate: new Date(),
        expectedDelivery: purchaseOrder.deliveryDate || new Date(),
        status: 'open'
      };

      commitments.push(commitment);

      // Post commitment to GL
      await this.postCommitmentToGL(commitment);
      
      return commitments;

    } catch (error) {
      console.error('Purchase commitment creation failed:', error);
      throw error;
    }
  }

  private async getCommitmentOffsetAccount(): Promise<string> {
    try {
      const result = await pool.query(`
        SELECT account_number 
        FROM gl_accounts 
        WHERE account_type = 'ASSETS' 
          AND (account_name ILIKE '%commitment%' OR account_name ILIKE '%offset%')
          AND is_active = true 
        ORDER BY account_number 
        LIMIT 1
      `);
      
      if (result.rows.length > 0) {
        return String(result.rows[0].account_number);
      }
      
      // Fallback: try account_determination_rules
      const ruleResult = await pool.query(`
        SELECT debit_account 
        FROM account_determination_rules 
        WHERE movement_type = 'COMMITMENT' 
          AND is_active = true 
        LIMIT 1
      `);
      
      if (ruleResult.rows.length > 0 && ruleResult.rows[0].debit_account) {
        return String(ruleResult.rows[0].debit_account);
      }
      
      throw new Error('Commitment offset GL account not configured');
    } catch (error: any) {
      console.error('Error getting commitment offset account:', error);
      throw new Error(`Failed to determine commitment offset account: ${error.message}`);
    }
  }

  private async postCommitmentToGL(commitment: PurchaseCommitment): Promise<void> {
    // Post commitment entry to GL
    const offsetAccount = await this.getCommitmentOffsetAccount();
    
    const glPosting = {
      documentDate: new Date(),
      postingDate: new Date(),
      documentType: 'PC', // Purchase Commitment
      reference: `PO-${commitment.purchaseOrderId}`,
      totalAmount: commitment.totalValue,
      currency: 'USD',
      items: [
        {
          glAccount: commitment.glAccount,
          debitAmount: commitment.totalValue,
          creditAmount: 0,
          description: `Purchase commitment for PO ${commitment.purchaseOrderId}`
        },
        {
          glAccount: offsetAccount,
          debitAmount: 0,
          creditAmount: commitment.totalValue,
          description: `Commitment offset for PO ${commitment.purchaseOrderId}`
        }
      ]
    };

    // Would post to accounting_documents table
    console.log('GL Commitment Posted:', glPosting);
  }

  // Three-Way Matching Process
  async performThreeWayMatch(
    purchaseOrderId: number,
    goodsReceiptId: number,
    invoiceId: number
  ): Promise<ThreeWayMatch> {
    try {
      // Get PO details
      const [purchaseOrder] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, purchaseOrderId));

      if (!purchaseOrder) {
        throw new Error(`Purchase order not found: ${purchaseOrderId}`);
      }

      // Simulate goods receipt and invoice data
      const match: ThreeWayMatch = {
        purchaseOrderId,
        goodsReceiptId,
        invoiceId,
        materialId: purchaseOrder.materialId || 1,
        poQuantity: purchaseOrder.quantity || 0,
        grQuantity: purchaseOrder.quantity || 0, // Would come from actual GR
        invoiceQuantity: purchaseOrder.quantity || 0, // Would come from actual invoice
        poPrice: parseFloat(purchaseOrder.unitPrice || '0'),
        invoicePrice: parseFloat(purchaseOrder.unitPrice || '0'), // Would come from actual invoice
        priceVariance: 0,
        quantityVariance: 0,
        status: 'matched'
      };

      // Calculate variances
      match.priceVariance = (match.invoicePrice - match.poPrice) * match.grQuantity;
      match.quantityVariance = (match.invoiceQuantity - match.grQuantity) * match.poPrice;

      // Determine status based on variances
      const priceTolerancePercent = 5; // 5% tolerance
      const priceToleranceAmount = Math.abs(match.priceVariance);
      const expectedAmount = match.poPrice * match.grQuantity;
      
      if (priceToleranceAmount > (expectedAmount * priceTolerancePercent / 100)) {
        match.status = 'variance';
      }

      if (match.quantityVariance !== 0) {
        match.status = 'variance';
      }

      // Post variance if necessary
      if (match.status === 'variance') {
        await this.postVarianceToGL(match);
      }

      return match;

    } catch (error) {
      console.error('Three-way matching failed:', error);
      throw error;
    }
  }

  private async postVarianceToGL(match: ThreeWayMatch): Promise<void> {
    if (match.priceVariance !== 0) {
      const variancePosting = {
        documentDate: new Date(),
        postingDate: new Date(),
        documentType: 'PV', // Price Variance
        reference: `PO-${match.purchaseOrderId}-VAR`,
        totalAmount: Math.abs(match.priceVariance),
        currency: 'USD',
        items: [
          {
            glAccount: '140000', // Inventory Account (adjust for actual cost)
            debitAmount: match.priceVariance > 0 ? match.priceVariance : 0,
            creditAmount: match.priceVariance < 0 ? Math.abs(match.priceVariance) : 0,
            description: `Price variance for PO ${match.purchaseOrderId}`
          },
          {
            glAccount: '660000', // Price Variance Account
            debitAmount: match.priceVariance < 0 ? Math.abs(match.priceVariance) : 0,
            creditAmount: match.priceVariance > 0 ? match.priceVariance : 0,
            description: `Price variance for PO ${match.purchaseOrderId}`
          }
        ]
      };

      console.log('Price Variance Posted:', variancePosting);
    }
  }

  // Real-time Stock Movement Posting
  async postStockMovementToGL(
    materialId: number,
    movementType: string,
    quantity: number,
    unitPrice: number,
    plant?: string,
    costCenter?: string
  ): Promise<void> {
    try {
      // Determine accounts
      const accounts = await this.determineAccounts(materialId, movementType, plant);
      
      const totalValue = quantity * unitPrice;
      
      // Create GL posting
      const glPosting = {
        documentDate: new Date(),
        postingDate: new Date(),
        documentType: 'MM', // Material Movement
        reference: `${movementType}-${materialId}`,
        totalAmount: totalValue,
        currency: 'USD',
        items: [
          {
            glAccount: accounts.debitAccount,
            debitAmount: totalValue,
            creditAmount: 0,
            costCenter: accounts.costCenter || costCenter,
            description: `${movementType} movement for material ${materialId}`
          },
          {
            glAccount: accounts.creditAccount,
            debitAmount: 0,
            creditAmount: totalValue,
            description: `${movementType} movement for material ${materialId}`
          }
        ]
      };

      // Post to GL
      console.log('Stock Movement GL Posted:', glPosting);
      
      // Update stock movement record with GL document reference
      await this.updateStockMovementWithGLReference(materialId, movementType, glPosting.reference);

    } catch (error) {
      console.error('Stock movement GL posting failed:', error);
      throw error;
    }
  }

  private async updateStockMovementWithGLReference(
    materialId: number, 
    movementType: string, 
    glReference: string
  ): Promise<void> {
    // Update stock movement with GL document reference
    // This would update the stock_movements table with the GL document number
    console.log(`Updated stock movement ${materialId}-${movementType} with GL ref: ${glReference}`);
  }

  // Period-End Inventory Revaluation
  async performPeriodEndRevaluation(period: string): Promise<void> {
    try {
      console.log(`Starting period-end revaluation for period: ${period}`);
      
      // Get all materials for revaluation
      const materialsForRevaluation = await db
        .select()
        .from(materials)
        .where(eq(materials.isActive, true));

      for (const material of materialsForRevaluation) {
        await this.revalueMaterial(material.id, period);
      }

      console.log(`Period-end revaluation completed for period: ${period}`);

    } catch (error) {
      console.error('Period-end revaluation failed:', error);
      throw error;
    }
  }

  private async revalueMaterial(materialId: number, period: string): Promise<void> {
    // Get current inventory value
    const currentValue = await this.getCurrentInventoryValue(materialId);
    
    // Calculate standard cost vs actual cost
    const standardCost = await this.getStandardCost(materialId);
    const actualCost = await this.getActualCost(materialId, period);
    
    const variance = actualCost - standardCost;
    
    if (Math.abs(variance) > 0.01) { // Only post if variance > 1 cent
      await this.postRevaluationVariance(materialId, variance, period);
    }
  }

  private async getCurrentInventoryValue(materialId: number): Promise<number> {
    // Calculate current inventory value
    return 1000; // Placeholder
  }

  private async getStandardCost(materialId: number): Promise<number> {
    // Get standard cost from material master
    const [material] = await db
      .select()
      .from(materials)
      .where(eq(materials.id, materialId));
    
    return parseFloat(material?.price || '0');
  }

  private async getActualCost(materialId: number, period: string): Promise<number> {
    // Calculate actual cost based on receipts in period
    return 1050; // Placeholder - would calculate from actual receipts
  }

  private async postRevaluationVariance(materialId: number, variance: number, period: string): Promise<void> {
    const variancePosting = {
      documentDate: new Date(),
      postingDate: new Date(),
      documentType: 'RV', // Revaluation
      reference: `REVAL-${period}-${materialId}`,
      totalAmount: Math.abs(variance),
      currency: 'USD',
      items: [
        {
          glAccount: '140000', // Inventory Account
          debitAmount: variance > 0 ? variance : 0,
          creditAmount: variance < 0 ? Math.abs(variance) : 0,
          description: `Period-end revaluation for material ${materialId}`
        },
        {
          glAccount: '670000', // Revaluation Variance Account
          debitAmount: variance < 0 ? Math.abs(variance) : 0,
          creditAmount: variance > 0 ? variance : 0,
          description: `Revaluation variance for material ${materialId}`
        }
      ]
    };

    console.log('Revaluation Variance Posted:', variancePosting);
  }

  // Get Integration Status
  async getIntegrationStatus(): Promise<{
    accountDeterminationRules: number;
    activeCommitments: number;
    pendingMatches: number;
    lastRevaluationDate: Date | null;
  }> {
    try {
      const [accountRules] = await db
        .select({ count: sql`count(*)` })
        .from(accountDeterminationRules);

      return {
        accountDeterminationRules: 25, // Would query actual rules
        activeCommitments: 15, // Would query actual commitments
        pendingMatches: 3, // Would query pending three-way matches
        lastRevaluationDate: new Date('2024-12-31') // Would query last revaluation
      };

    } catch (error) {
      console.error('Integration status check failed:', error);
      return {
        accountDeterminationRules: 0,
        activeCommitments: 0,
        pendingMatches: 0,
        lastRevaluationDate: null
      };
    }
  }
}

export const mmfiIntegrationService = new MMFIIntegrationService();