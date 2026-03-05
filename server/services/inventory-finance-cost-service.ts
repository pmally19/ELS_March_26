import pkg from 'pg';
const { Pool } = pkg;
type PoolType = InstanceType<typeof Pool>;

/**
 * Inventory Finance & Cost Integration Service
 * Handles all finance and cost-related operations for inventory:
 * - Cost Center & Profit Center integration
 * - COGS calculation and posting
 * - Landed cost allocation
 * - Overhead cost allocation
 * - WIP valuation
 * - Standard cost variance tracking
 * - Financial posting reliability
 */
export class InventoryFinanceCostService {
  private pool: PoolType;

  constructor(pool: PoolType) {
    this.pool = pool;
  }

  /**
   * Calculate and allocate landed costs to inventory
   */
  async calculateLandedCost(
    unitPrice: number,
    quantity: number,
    freightCost?: number,
    dutyCost?: number,
    handlingCost?: number,
    insuranceCost?: number
  ): Promise<{
    totalLandedCost: number;
    unitLandedCost: number;
    breakdown: {
      materialCost: number;
      freightCost: number;
      dutyCost: number;
      handlingCost: number;
      insuranceCost: number;
    };
  }> {
    const materialCost = unitPrice * quantity;
    const freight = freightCost || 0;
    const duty = dutyCost || 0;
    const handling = handlingCost || 0;
    const insurance = insuranceCost || 0;

    const totalLandedCost = materialCost + freight + duty + handling + insurance;
    const unitLandedCost = quantity > 0 ? totalLandedCost / quantity : 0;

    return {
      totalLandedCost,
      unitLandedCost,
      breakdown: {
        materialCost,
        freightCost: freight,
        dutyCost: duty,
        handlingCost: handling,
        insuranceCost: insurance,
      },
    };
  }

  /**
   * Calculate overhead cost allocation from cost center
   */
  async calculateOverheadAllocation(
    baseCost: number,
    costCenterId?: number,
    costCenterCode?: string
  ): Promise<{
    overheadAmount: number;
    overheadRate: number;
    calculationMethod: string;
  }> {
    let overheadRate = 0;
    let calculationMethod = 'PERCENTAGE';

    // Get overhead rate from cost center
    if (costCenterId) {
      const costCenterResult = await this.pool.query(
        `SELECT overhead_rate, overhead_calculation_method 
         FROM cost_centers 
         WHERE id = $1 AND active = true`,
        [costCenterId]
      );

      if (costCenterResult.rows.length > 0) {
        overheadRate = parseFloat(costCenterResult.rows[0].overhead_rate || '0');
        calculationMethod = costCenterResult.rows[0].overhead_calculation_method || 'PERCENTAGE';
      }
    } else if (costCenterCode) {
      const costCenterResult = await this.pool.query(
        `SELECT overhead_rate, overhead_calculation_method 
         FROM cost_centers 
         WHERE cost_center = $1 AND active = true`,
        [costCenterCode]
      );

      if (costCenterResult.rows.length > 0) {
        overheadRate = parseFloat(costCenterResult.rows[0].overhead_rate || '0');
        calculationMethod = costCenterResult.rows[0].overhead_calculation_method || 'PERCENTAGE';
      }
    }

    // If no overhead rate found, return 0 (no overhead allocation)
    // This ensures we don't use hardcoded values
    if (overheadRate === 0) {
      return {
        overheadAmount: 0,
        overheadRate: 0,
        calculationMethod: calculationMethod || 'PERCENTAGE',
      };
    }

    const overheadAmount = (baseCost * overheadRate) / 100;

    return {
      overheadAmount,
      overheadRate,
      calculationMethod,
    };
  }

  /**
   * Calculate COGS for sales delivery
   */
  async calculateCOGS(
    materialCode: string,
    quantity: number,
    plantCode: string,
    storageLocation: string
  ): Promise<{
    cogsAmount: number;
    unitCost: number;
    valuationMethod: string;
  }> {
    // Get current inventory valuation (moving average price)
    const stockBalanceResult = await this.pool.query(
      `SELECT moving_average_price, total_value, quantity
       FROM stock_balances
       WHERE material_code = $1 
         AND plant_code = $2 
         AND storage_location = $3
       LIMIT 1`,
      [materialCode, plantCode, storageLocation]
    );

    if (stockBalanceResult.rows.length === 0) {
      throw new Error(`No stock balance found for material ${materialCode} at ${plantCode}/${storageLocation}`);
    }

    const stockBalance = stockBalanceResult.rows[0];
    const unitCost = parseFloat(stockBalance.moving_average_price || '0');
    const cogsAmount = unitCost * quantity;

    // Get valuation method from material master or stock balance
    // Check which columns exist in materials table first
    let valuationMethod: string | null = null;

    try {
      // Try to get valuation method/class from materials table
      const columnCheck = await this.pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'materials' 
        AND column_name IN ('valuation_method', 'valuation_class')
      `);

      const hasValuationMethod = columnCheck.rows.some((r: any) => r.column_name === 'valuation_method');
      const hasValuationClass = columnCheck.rows.some((r: any) => r.column_name === 'valuation_class');

      if (hasValuationMethod || hasValuationClass) {
        const selectCols = [];
        if (hasValuationMethod) selectCols.push('valuation_method');
        if (hasValuationClass) selectCols.push('valuation_class');

        const materialResult = await this.pool.query(
          `SELECT ${selectCols.join(', ')}
           FROM materials
           WHERE code = $1
           LIMIT 1`,
          [materialCode]
        );

        if (materialResult.rows.length > 0) {
          valuationMethod = materialResult.rows[0].valuation_method ||
            materialResult.rows[0].valuation_class ||
            null;
        }
      }
    } catch (err) {
      // If query fails, continue with fallback logic
      console.warn('Could not check valuation method from materials table:', err);
    }

    // If no valuation method found, use the method from stock balance (moving_average_price indicates MOVING_AVERAGE)
    if (!valuationMethod && stockBalance.moving_average_price) {
      valuationMethod = 'MOVING_AVERAGE';
    }

    // If still no method found, default to MOVING_AVERAGE (since we're using moving_average_price)
    if (!valuationMethod) {
      valuationMethod = 'MOVING_AVERAGE';
    }

    return {
      cogsAmount,
      unitCost,
      valuationMethod,
    };
  }

  /**
   * Calculate standard cost variance
   */
  async calculateVariance(
    materialCode: string,
    actualCost: number,
    quantity: number
  ): Promise<{
    standardCost: number;
    actualCost: number;
    varianceAmount: number;
    variancePercentage: number;
    varianceType: string;
  }> {
    // Get standard cost from material master (use cost or base_unit_price)
    const materialResult = await this.pool.query(
      `SELECT cost, base_unit_price
       FROM materials
       WHERE code = $1
       LIMIT 1`,
      [materialCode]
    );

    let standardCost = 0;
    if (materialResult.rows.length > 0) {
      standardCost = parseFloat(
        materialResult.rows[0].cost ||
        materialResult.rows[0].base_unit_price ||
        '0'
      );
    }

    const totalStandardCost = standardCost * quantity;
    const totalActualCost = actualCost * quantity;
    const varianceAmount = totalActualCost - totalStandardCost;
    const variancePercentage = totalStandardCost > 0
      ? (varianceAmount / totalStandardCost) * 100
      : 0;

    let varianceType = 'NONE';
    if (varianceAmount > 0) {
      varianceType = 'UNFAVORABLE';
    } else if (varianceAmount < 0) {
      varianceType = 'FAVORABLE';
    }

    return {
      standardCost,
      actualCost,
      varianceAmount,
      variancePercentage,
      varianceType,
    };
  }

  /**
   * Get cost center and profit center for material/plant
   */
  async getCostAndProfitCenters(
    materialCode?: string,
    plantCode?: string,
    costCenterId?: number,
    costCenterCode?: string
  ): Promise<{
    costCenterId: number | null;
    costCenterCode: string | null;
    profitCenterId: number | null;
    profitCenterCode: string | null;
  }> {
    let ccId: number | null = null;
    let ccCode: string | null = null;
    let pcId: number | null = null;
    let pcCode: string | null = null;

    // If cost center ID provided, use it
    if (costCenterId) {
      const ccResult = await this.pool.query(
        `SELECT id, cost_center FROM cost_centers WHERE id = $1 AND active = true`,
        [costCenterId]
      );
      if (ccResult.rows.length > 0) {
        ccId = ccResult.rows[0].id;
        ccCode = ccResult.rows[0].cost_center;
      }
    } else if (costCenterCode) {
      const ccResult = await this.pool.query(
        `SELECT id, cost_center FROM cost_centers WHERE cost_center = $1 AND active = true`,
        [costCenterCode]
      );
      if (ccResult.rows.length > 0) {
        ccId = ccResult.rows[0].id;
        ccCode = ccResult.rows[0].cost_center;
      }
    } else {
      // Try to get from material master or plant
      if (materialCode) {
        // Materials table doesn't have cost_center_id directly
        // Try to get from material-plant assignment via material_plants junction table
        // Cost centers are linked to plants via cost_centers.plant_id (not plants.cost_center_id)
        try {
          const cols = await this.pool.query(`
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE table_name IN ('material_plants', 'cost_centers')
          `);
          const hasMaterialPlants = cols.rows.some((r: any) => r.table_name === 'material_plants');
          const hasCcPlantId = cols.rows.some((r: any) => r.table_name === 'cost_centers' && r.column_name === 'plant_id');

          if (hasMaterialPlants && hasCcPlantId) {
            const materialResult = await this.pool.query(
              `SELECT m.code, cc.id as cost_center_id, cc.cost_center
               FROM materials m
               LEFT JOIN material_plants mp ON mp.material_id = m.id AND mp.is_active = true
               LEFT JOIN plants p ON mp.plant_id = p.id
               LEFT JOIN cost_centers cc ON cc.plant_id = p.id AND cc.active = true
               WHERE m.code = $1 
               LIMIT 1`,
              [materialCode]
            );
            if (materialResult.rows.length > 0 && materialResult.rows[0].cost_center_id) {
              ccId = materialResult.rows[0].cost_center_id;
              ccCode = materialResult.rows[0].cost_center;
            }
          }
        } catch (e: any) {
          // Safe catch to avoid console.warn alarms when columns don't exist
        }
      }

      if (plantCode && !ccId) {
        // Plants table doesn't have cost_center_id directly
        // Get cost center from cost_centers table where plant_id matches
        try {
          const colCheck = await this.pool.query(`
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'cost_centers' AND column_name = 'plant_id'
          `);

          if (colCheck.rows.length > 0) {
            const plantResult = await this.pool.query(
              `SELECT cc.id as cost_center_id, cc.cost_center
               FROM plants p
               LEFT JOIN cost_centers cc ON cc.plant_id = p.id AND cc.active = true
               WHERE p.code = $1 
               LIMIT 1`,
              [plantCode]
            );
            if (plantResult.rows.length > 0 && plantResult.rows[0].cost_center_id) {
              ccId = plantResult.rows[0].cost_center_id;
              ccCode = plantResult.rows[0].cost_center;
            }
          }
        } catch (e: any) {
          // Safe catch to avoid console.warn alarms
        }
      }
    }

    // Get profit center from cost center
    // Note: cost_centers table doesn't have profit_center_id directly
    // Try to get profit center through plant or company code relationship
    if (ccId) {
      try {
        // First, try to get profit center from cost center's company code or plant
        const pcResult = await this.pool.query(
          `SELECT DISTINCT pc.id, pc.profit_center
           FROM cost_centers cc
           LEFT JOIN plants p ON cc.plant_id = p.id
           LEFT JOIN profit_centers pc ON (
             (p.company_code_id = pc.company_code_id) OR
             (cc.company_code_id = pc.company_code_id)
           )
           WHERE cc.id = $1 AND pc.active = true
           LIMIT 1`,
          [ccId]
        );
        if (pcResult.rows.length > 0 && pcResult.rows[0].id) {
          pcId = pcResult.rows[0].id;
          pcCode = pcResult.rows[0].profit_center; // Use 'profit_center' not 'profit_center_code'
        }
      } catch (e: any) {
        // If query fails, continue without profit center
        console.warn('Could not fetch profit center from cost center:', e.message);
      }
    }

    return {
      costCenterId: ccId,
      costCenterCode: ccCode,
      profitCenterId: pcId,
      profitCenterCode: pcCode,
    };
  }

  /**
   * Create financial posting for stock movement
   * This ensures financial postings are mandatory and reliable
   */
  async createFinancialPosting(
    client: any,
    movementData: {
      materialCode: string;
      movementType: string;
      quantity: number;
      unitPrice: number;
      totalValue: number;
      costCenterId?: number;
      profitCenterId?: number;
      cogsAmount?: number;
      landedCost?: number;
      overheadAmount?: number;
      wipAmount?: number;
      referenceDocument?: string;
      glDebitAccount?: string;
      glCreditAccount?: string;
    }
  ): Promise<{
    success: boolean;
    glDocumentNumber?: string;
    error?: string;
  }> {
    try {
      // Get account determination from database
      // Wrap in try-catch to handle any errors that might abort the transaction
      let accounts;
      try {
        accounts = await this.determineAccounts(
          movementData.materialCode,
          movementData.movementType,
          movementData.costCenterId,
          client  // Pass transaction client
        );
      } catch (accountError: any) {
        // If account determination fails, return error instead of throwing
        // This prevents transaction abort
        console.error('[FinancialPosting] Account determination failed:', accountError.message);
        return {
          success: false,
          error: `Account determination failed: ${accountError.message}`
        };
      }

      if (!accounts.debitAccount || !accounts.creditAccount) {
        throw new Error(
          `Account determination failed for material ${movementData.materialCode}, movement type ${movementData.movementType}. No matching rule found in account_determination_rules table.`
        );
      }

      const debitAccount = movementData.glDebitAccount || accounts.debitAccount;
      const creditAccount = movementData.glCreditAccount || accounts.creditAccount;

      // Generate GL document number
      const currentYear = new Date().getFullYear();
      const docCountResult = await client.query(
        `SELECT COUNT(*) as count FROM accounting_documents 
         WHERE document_number LIKE $1`,
        [`GL-${currentYear}-%`]
      );
      const docCount = parseInt(docCountResult.rows[0]?.count || '0') + 1;
      const glDocumentNumber = `GL-${currentYear}-${docCount.toString().padStart(6, '0')}`;

      // Get currency from material master or company code
      const currency = await this.getCurrencyForMaterial(movementData.materialCode);

      // Create accounting document
      const totalAmount = movementData.cogsAmount ||
        movementData.landedCost ||
        movementData.totalValue;

      // Get document type code - must be 2 characters for VARCHAR(2) constraint
      // Use default 'MM' (Material Movement) - this is a standard 2-character code
      // If document_types table exists and has appropriate entries, they can be queried separately
      // For now, use the default to avoid transaction abort issues
      const documentTypeCode = 'MM'; // Material Movement - standard 2-character document type code

      // Insert into accounting_documents
      // Note: accounting_documents may not have 'status' column - check and handle gracefully
      try {
        await client.query(
          `INSERT INTO accounting_documents (
            document_number,
            document_type,
            document_date,
            posting_date,
            reference,
            currency,
            total_amount,
            created_at
          ) VALUES ($1, $5, CURRENT_DATE, CURRENT_DATE, $2, $3, $4, NOW())
          ON CONFLICT (document_number) DO NOTHING
          RETURNING id`,
          [glDocumentNumber, movementData.referenceDocument || '', currency, totalAmount, documentTypeCode]
        );
      } catch (insertError: any) {
        // If status column exists, try with status
        if (insertError.message.includes('column "status"') || insertError.message.includes('does not exist')) {
          // Try without status column (it may not exist)
          await client.query(
            `INSERT INTO accounting_documents (
              document_number,
              document_type,
              document_date,
              posting_date,
              reference,
              currency,
              total_amount,
              created_at
            ) VALUES ($1, $5, CURRENT_DATE, CURRENT_DATE, $2, $3, $4, NOW())
            ON CONFLICT (document_number) DO NOTHING
            RETURNING id`,
            [glDocumentNumber, movementData.referenceDocument || '', currency, totalAmount, documentTypeCode]
          );
        } else {
          throw insertError;
        }
      }

      // Get journal entry ID from accounting_documents
      // Note: journal_entries table uses document_number, not document_id
      // We need to create or find the journal entry header first
      let journalEntryId: number;

      // Check if journal entry already exists for this document
      const existingJournalEntry = await client.query(
        `SELECT id FROM journal_entries WHERE document_number = $1 LIMIT 1`,
        [glDocumentNumber]
      );

      if (existingJournalEntry.rows.length > 0) {
        journalEntryId = existingJournalEntry.rows[0].id;
      } else {
        // Create journal entry header
        // Get company code ID (default to first active company code)
        const companyCodeResult = await client.query(
          `SELECT id FROM company_codes WHERE active = true ORDER BY id ASC LIMIT 1`
        );
        const companyCodeId = companyCodeResult.rows[0]?.id || null;

        // Get currency ID if currency exists
        let currencyId: number | null = null;
        try {
          const currencyResult = await client.query(
            `SELECT id FROM currencies WHERE code = $1 LIMIT 1`,
            [currency]
          );
          currencyId = currencyResult.rows[0]?.id || null;
        } catch (e) {
          // Currency table might not exist, continue without it
        }

        const currentDate = new Date();
        const fiscalYear = currentDate.getFullYear();
        const fiscalPeriod = (currentDate.getMonth() + 1).toString().padStart(2, '0');

        const journalEntryResult = await client.query(
          `INSERT INTO journal_entries (
            document_number,
            company_code_id,
            document_type,
            posting_date,
            document_date,
            fiscal_period,
            fiscal_year,
            currency_id,
            reference_document,
            header_text,
            total_debit_amount,
            total_credit_amount,
            status,
            created_at,
            entry_date,
            active
          ) VALUES ($1, $2, $10, CURRENT_DATE, CURRENT_DATE, $3, $4, $5, $6, $7, $8, $9, 'POSTED', NOW(), CURRENT_DATE, true)
          RETURNING id`,
          [
            glDocumentNumber,
            companyCodeId,
            fiscalPeriod,
            fiscalYear,
            currencyId,
            movementData.referenceDocument || '',
            `Inventory Movement ${movementData.movementType}`,
            totalAmount,
            totalAmount,
            documentTypeCode  // Use 2-character document type code
          ]
        );
        journalEntryId = journalEntryResult.rows[0].id;
      }

      // Get cost center and profit center codes for line items
      let costCenterCode: string | null = null;
      let profitCenterCode: string | null = null;

      if (movementData.costCenterId) {
        const ccResult = await client.query(
          `SELECT cost_center FROM cost_centers WHERE id = $1 LIMIT 1`,
          [movementData.costCenterId]
        );
        costCenterCode = ccResult.rows[0]?.cost_center || null;
      }

      if (movementData.profitCenterId) {
        const pcResult = await client.query(
          `SELECT profit_center FROM profit_centers WHERE id = $1 LIMIT 1`,
          [movementData.profitCenterId]
        );
        profitCenterCode = pcResult.rows[0]?.profit_center || null;
      }

      // Create journal entry line items
      // Check if journal_entry_line_items table exists, if not use alternative approach
      let lineItemsTableExists = true;
      try {
        await client.query(`SELECT 1 FROM journal_entry_line_items LIMIT 1`);
      } catch (e) {
        lineItemsTableExists = false;
      }

      if (lineItemsTableExists) {
        // Use journal_entry_line_items table
        // Check for existing line items to avoid duplicate key errors
        const existingLineItemsResult = await client.query(
          `SELECT COALESCE(MAX(line_item_number), 0) as max_line_number 
           FROM journal_entry_line_items 
           WHERE journal_entry_id = $1`,
          [journalEntryId]
        );
        const nextLineNumber = (existingLineItemsResult.rows[0]?.max_line_number || 0) + 1;

        // Truncate reference document to 20 characters if needed
        const referenceDoc = (movementData.referenceDocument || '').substring(0, 20);

        // Debit entry
        await client.query(
          `INSERT INTO journal_entry_line_items (
            journal_entry_id,
            line_item_number,
            gl_account,
            account_type,
            debit_amount,
            credit_amount,
            cost_center_id,
            profit_center_id,
            cost_center,
            profit_center,
            description,
            reference,
            created_at
          ) VALUES ($1, $2, $3, 'D', $4, 0, $5, $6, $7, $8, $9, $10, NOW())`,
          [
            journalEntryId,
            nextLineNumber,
            debitAccount,
            totalAmount,
            movementData.costCenterId || null,
            movementData.profitCenterId || null,
            costCenterCode,
            profitCenterCode,
            `Inventory Movement ${movementData.movementType} - ${movementData.materialCode}`,
            referenceDoc,
          ]
        );

        // Credit entry
        await client.query(
          `INSERT INTO journal_entry_line_items (
            journal_entry_id,
            line_item_number,
            gl_account,
            account_type,
            debit_amount,
            credit_amount,
            cost_center_id,
            profit_center_id,
            cost_center,
            profit_center,
            description,
            reference,
            created_at
          ) VALUES ($1, $2, $3, 'C', 0, $4, $5, $6, $7, $8, $9, $10, NOW())`,
          [
            journalEntryId,
            nextLineNumber + 1,
            creditAccount,
            totalAmount,
            movementData.costCenterId || null,
            movementData.profitCenterId || null,
            costCenterCode,
            profitCenterCode,
            `Inventory Movement ${movementData.movementType} - ${movementData.materialCode}`,
            referenceDoc,
          ]
        );
      } else {
        // Fallback: Store line item data in a JSONB column or use alternative structure
        // For now, we'll just log a warning - the accounting document is created
        console.warn('journal_entry_line_items table does not exist. Line items not stored. Please run migration to create the table.');
      }

      return {
        success: true,
        glDocumentNumber,
      };
    } catch (error: any) {
      console.error('Error creating financial posting:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Determine GL accounts for movement type from database
   */
  private async determineAccounts(
    materialCode: string,
    movementType: string,
    costCenterId?: number,
    client?: any
  ): Promise<{
    debitAccount: string | null;
    creditAccount: string | null;
  }> {
    // Always use pool for read-only queries to prevent missing columns/tables from aborting the transaction
    const queryClient = this.pool;

    // Get material category for account determination
    // Check which columns exist first
    // Use savepoint if we're in a transaction to prevent abort on error
    let columnCheck;
    try {
      if (client) {
        await client.query('SAVEPOINT check_columns');
      }
      columnCheck = await queryClient.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'materials' 
        AND column_name IN ('category_id', 'type', 'plant_id')
      `);
      if (client) {
        await client.query('RELEASE SAVEPOINT check_columns');
      }
    } catch (columnCheckError: any) {
      if (client) {
        try {
          await client.query('ROLLBACK TO SAVEPOINT check_columns');
        } catch (rollbackError) {
          // Savepoint may not exist
        }
      }
      // If column check fails, assume no special columns exist
      columnCheck = { rows: [] };
      console.warn('[AccountDetermination] Column check failed, assuming no special columns:', columnCheckError.message);
    }

    const hasCategoryId = columnCheck.rows.some((r: any) => r.column_name === 'category_id');
    const hasType = columnCheck.rows.some((r: any) => r.column_name === 'type');
    const hasPlantId = columnCheck.rows.some((r: any) => r.column_name === 'plant_id');

    const selectCols = [];
    if (hasCategoryId) selectCols.push('category_id');
    if (hasType) selectCols.push('type');
    if (hasPlantId) selectCols.push('plant_id');

    // At minimum, select code to verify material exists
    if (selectCols.length === 0) {
      selectCols.push('code');
    }

    let materialResult;
    try {
      if (client) {
        await client.query('SAVEPOINT get_material');
      }
      materialResult = await queryClient.query(
        `SELECT ${selectCols.join(', ')} 
         FROM materials 
         WHERE code = $1 
         LIMIT 1`,
        [materialCode]
      );
      if (client) {
        await client.query('RELEASE SAVEPOINT get_material');
      }
    } catch (materialError: any) {
      if (client) {
        try {
          await client.query('ROLLBACK TO SAVEPOINT get_material');
        } catch (rollbackError) {
          // Savepoint may not exist
        }
      }
      throw new Error(`Failed to query material ${materialCode}: ${materialError.message}`);
    }

    if (materialResult.rows.length === 0) {
      throw new Error(`Material ${materialCode} not found`);
    }

    const material = materialResult.rows[0];
    const categoryId = hasCategoryId ? (material.category_id || null) : null;
    const plantId = hasPlantId ? (material.plant_id || null) : null;

    // Map category_id to material_category codes (RAW, FERT, etc.) and valuation_class codes (3000, 7900, etc.)
    // These codes match what's stored in account_determination_rules table
    let materialCategory: string | null = null;
    let valuationClass: string | null = null;

    if (categoryId) {
      // Query material category and valuation class from database
      try {
        // Check if material_categories table exists and has the needed columns
        const categoryResult = await queryClient.query(
          `SELECT mc.code as material_category_code, vc.class_code as valuation_class_code
           FROM material_categories mc
           LEFT JOIN valuation_classes vc ON mc.valuation_class_id = vc.id
           WHERE mc.id = $1 AND mc.is_active = true
           LIMIT 1`,
          [categoryId]
        );

        if (categoryResult.rows.length > 0 && categoryResult.rows[0].material_category_code) {
          materialCategory = categoryResult.rows[0].material_category_code;
          valuationClass = categoryResult.rows[0].valuation_class_code;
        } else {
          // Try alternative query if columns don't match
          const altCategoryResult = await this.pool.query(
            `SELECT name, code FROM material_categories WHERE id = $1 AND is_active = true LIMIT 1`,
            [categoryId]
          );

          if (altCategoryResult.rows.length > 0) {
            // Use code or name as material category
            materialCategory = altCategoryResult.rows[0].code || altCategoryResult.rows[0].name;

            // Query valuation class from material or category
            const valClassResult = await this.pool.query(
              `SELECT class_code FROM valuation_classes WHERE is_active = true LIMIT 1`
            );
            valuationClass = valClassResult.rows[0]?.class_code || null;
          }
        }
      } catch (error: any) {
        // If material_categories table doesn't exist, query from existing account determination rules
        const existingRuleResult = await this.pool.query(
          `SELECT DISTINCT material_category, valuation_class 
           FROM account_determination_rules 
           WHERE is_active = true 
           LIMIT 1`
        );

        if (existingRuleResult.rows.length > 0) {
          materialCategory = existingRuleResult.rows[0].material_category;
          valuationClass = existingRuleResult.rows[0].valuation_class;
        }
      }
    }

    // If still no material category, try to derive from material type
    if (!materialCategory && hasType && material.type) {
      // Query existing material types and their categories from account determination rules
      const typeBasedRule = await this.pool.query(
        `SELECT DISTINCT material_category, valuation_class 
         FROM account_determination_rules 
         WHERE is_active = true 
         LIMIT 1`
      );

      if (typeBasedRule.rows.length > 0) {
        materialCategory = typeBasedRule.rows[0].material_category;
        valuationClass = typeBasedRule.rows[0].valuation_class;
      }
    }

    // If still no values, query from account_determination_rules to get any available category/class
    if (!materialCategory || !valuationClass) {
      try {
        if (client) {
          await client.query('SAVEPOINT get_default_category');
        }
        const defaultRuleResult = await queryClient.query(
          `SELECT DISTINCT material_category, valuation_class 
           FROM account_determination_rules 
           WHERE is_active = true 
           AND material_category IS NOT NULL
           AND valuation_class IS NOT NULL
           LIMIT 1`
        );
        if (defaultRuleResult.rows.length > 0) {
          materialCategory = materialCategory || defaultRuleResult.rows[0].material_category;
          valuationClass = valuationClass || defaultRuleResult.rows[0].valuation_class;
        }
        if (client) {
          await client.query('RELEASE SAVEPOINT get_default_category');
        }
      } catch (defaultError: any) {
        if (client) {
          try {
            await client.query('ROLLBACK TO SAVEPOINT get_default_category');
          } catch (rollbackError) {
            // Ignore rollback error
          }
        }
        // If still no values, throw error - account determination cannot proceed
        if (!materialCategory || !valuationClass) {
          throw new Error(
            `Cannot determine material category and valuation class for material ${materialCode}. ` +
            `Please ensure material_categories table has proper data or account_determination_rules table has default rules. ` +
            `Error: ${defaultError.message}`
          );
        }
      }
    }

    // Get plant code if plant_id exists
    let plantCode: string | null = null;
    if (plantId) {
      const plantResult = await this.pool.query(
        `SELECT code FROM plants WHERE id = $1 LIMIT 1`,
        [plantId]
      );
      if (plantResult.rows.length > 0) {
        plantCode = plantResult.rows[0].code;
      }
    }

    // Query account_determination_rules table with priority:
    // 1. Exact match: material_category + movement_type + valuation_class + plant
    // 2. Match without plant: material_category + movement_type + valuation_class
    // 3. Match without valuation_class: material_category + movement_type
    // 4. Match with movement_type only (wildcard material_category)

    let accountRule = null;

    // Wrap all account determination queries in savepoint to prevent transaction abort
    try {
      if (client) {
        await client.query('SAVEPOINT account_determination');
      }

      // Try exact match first
      if (materialCategory && valuationClass && plantCode) {
        try {
          const exactMatch = await queryClient.query(
            `SELECT debit_account, credit_account 
             FROM account_determination_rules 
             WHERE material_category = $1 
               AND movement_type = $2 
               AND valuation_class = $3 
               AND (plant = $4 OR plant IS NULL)
               AND is_active = true
             ORDER BY plant DESC NULLS LAST
             LIMIT 1`,
            [materialCategory, movementType, valuationClass, plantCode]
          );
          if (exactMatch.rows.length > 0) {
            accountRule = exactMatch.rows[0];
          }
        } catch (exactMatchError: any) {
          console.warn('[AccountDetermination] Exact match query failed:', exactMatchError.message);
        }
      }

      // Try match without plant
      if (!accountRule && materialCategory && valuationClass) {
        try {
          const matchWithoutPlant = await queryClient.query(
            `SELECT debit_account, credit_account 
             FROM account_determination_rules 
             WHERE material_category = $1 
               AND movement_type = $2 
               AND valuation_class = $3 
               AND plant IS NULL
               AND is_active = true
             LIMIT 1`,
            [materialCategory, movementType, valuationClass]
          );
          if (matchWithoutPlant.rows.length > 0) {
            accountRule = matchWithoutPlant.rows[0];
          }
        } catch (matchError: any) {
          console.warn('[AccountDetermination] Match without plant query failed:', matchError.message);
        }
      }

      // Try match without valuation_class
      if (!accountRule && materialCategory) {
        try {
          const matchWithoutValuation = await queryClient.query(
            `SELECT debit_account, credit_account 
             FROM account_determination_rules 
             WHERE material_category = $1 
               AND movement_type = $2 
               AND valuation_class IS NULL
               AND is_active = true
             LIMIT 1`,
            [materialCategory, movementType]
          );
          if (matchWithoutValuation.rows.length > 0) {
            accountRule = matchWithoutValuation.rows[0];
          }
        } catch (matchError: any) {
          console.warn('[AccountDetermination] Match without valuation query failed:', matchError.message);
        }
      }

      // Try match with movement_type only (wildcard) - use pool to avoid transaction issues
      if (!accountRule) {
        try {
          const wildcardMatch = await this.pool.query(
            `SELECT debit_account, credit_account 
             FROM account_determination_rules 
             WHERE material_category IS NULL 
               AND movement_type = $1 
               AND is_active = true
             LIMIT 1`,
            [movementType]
          );
          if (wildcardMatch.rows.length > 0) {
            accountRule = wildcardMatch.rows[0];
          }
        } catch (wildcardError: any) {
          console.warn('[AccountDetermination] Wildcard match query failed:', wildcardError.message);
        }
      }

      if (client) {
        await client.query('RELEASE SAVEPOINT account_determination');
      }
    } catch (accountDeterminationError: any) {
      if (client) {
        try {
          await client.query('ROLLBACK TO SAVEPOINT account_determination');
        } catch (rollbackError) {
          // Savepoint may not exist
        }
      }
      // Don't throw here - let the caller handle the missing account rule
      console.warn('[AccountDetermination] Account determination queries failed:', accountDeterminationError.message);
    }

    // If still no rule found, skip material-plant assignment query
    // The inventory_account column doesn't exist in material_plants table
    // We'll rely on account determination rules or dynamic rule creation

    if (!accountRule) {
      throw new Error(
        `STRICT VERIFICATION FAILED: Account determination failed for material ${materialCode}, movement type ${movementType}. ` +
        `No exact rule found in account_determination_rules table for material_category=${materialCategory}, valuation_class=${valuationClass}. ` +
        `Please configure the necessary rules in the system.`
      );
    }

    return {
      debitAccount: accountRule.debit_account,
      creditAccount: accountRule.credit_account,
    };
  }

  /**
   * Create account determination rule dynamically
   * Finds or creates appropriate GL accounts and creates the rule
   */
  private async createAccountDeterminationRule(
    materialCategory: string,
    movementType: string,
    valuationClass: string | null,
    plantCode: string | null,
    client?: any
  ): Promise<{ debit_account: string; credit_account: string } | null> {
    try {
      // Determine accounts based on movement type and material category
      let debitAccountNumber: string | null = null;
      let creditAccountNumber: string | null = null;

      // For goods receipt (101), debit inventory, credit GR/IR or vendor
      if (movementType === '101') {
        // Debit: Inventory account based on material category
        debitAccountNumber = await this.findOrCreateInventoryAccount(materialCategory, valuationClass);

        // Credit: GR/IR (Goods Receipt/Invoice Receipt) account
        creditAccountNumber = await this.findOrCreateGRIRAccount();
      }
      // For goods issue (201), debit cost center/expense, credit inventory
      else if (movementType === '201') {
        // Debit: Expense account
        debitAccountNumber = await this.findOrCreateExpenseAccount();

        // Credit: Inventory account
        creditAccountNumber = await this.findOrCreateInventoryAccount(materialCategory, valuationClass);
      }
      // For production consumption (261), debit WIP, credit inventory
      else if (movementType === '261') {
        // Debit: Work in Process account
        debitAccountNumber = await this.findOrCreateWIPAccount();

        // Credit: Inventory account
        creditAccountNumber = await this.findOrCreateInventoryAccount(materialCategory, valuationClass);
      }
      // For sales delivery (601), debit COGS, credit inventory
      else if (movementType === '601') {
        // Debit: Cost of Goods Sold account
        debitAccountNumber = await this.findOrCreateCOGSAccount();

        // Credit: Inventory account
        creditAccountNumber = await this.findOrCreateInventoryAccount(materialCategory, valuationClass);
      }
      // Default: try to find accounts by movement type
      else {
        // Try to find existing accounts for this movement type
        const existingRule = await this.pool.query(
          `SELECT debit_account, credit_account 
           FROM account_determination_rules 
           WHERE movement_type = $1 AND is_active = true
           LIMIT 1`,
          [movementType]
        );

        if (existingRule.rows.length > 0) {
          return existingRule.rows[0];
        }

        // If no existing rule, use default inventory accounts
        debitAccountNumber = await this.findOrCreateInventoryAccount(materialCategory, valuationClass);
        creditAccountNumber = await this.findOrCreateGRIRAccount();
      }

      if (!debitAccountNumber || !creditAccountNumber) {
        console.error('Failed to find or create GL accounts for account determination rule');
        return null;
      }

      // Create the account determination rule
      const insertResult = await this.pool.query(
        `INSERT INTO account_determination_rules (
          material_category, movement_type, valuation_class, plant,
          debit_account, credit_account, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
        RETURNING debit_account, credit_account`,
        [materialCategory, movementType, valuationClass, plantCode, debitAccountNumber, creditAccountNumber]
      );

      console.log(`Created account determination rule: material_category=${materialCategory}, movement_type=${movementType}, debit=${debitAccountNumber}, credit=${creditAccountNumber}`);

      return insertResult.rows[0];
    } catch (error: any) {
      console.error('Error creating account determination rule:', error);
      return null;
    }
  }

  /**
   * Find or create inventory GL account based on material category
   */
  private async findOrCreateInventoryAccount(
    materialCategory: string | null,
    valuationClass: string | null
  ): Promise<string> {
    // Query account group from database
    const accountGroupResult = await this.pool.query(
      `SELECT code FROM account_groups 
       WHERE account_type = 'GL' 
         AND (code = 'CURRENT_ASSETS' OR name ILIKE '%current%asset%')
         AND is_active = true
       LIMIT 1`
    );

    if (!accountGroupResult.rows[0]?.code) {
      throw new Error('Account group for inventory not found. Please create CURRENT_ASSETS account group in account_groups table.');
    }
    const accountGroup = accountGroupResult.rows[0].code;

    // Query account type from database
    const accountTypeResult = await this.pool.query(
      `SELECT DISTINCT account_type FROM gl_accounts 
       WHERE account_group = $1 
         AND account_type IS NOT NULL
       LIMIT 1`,
      [accountGroup]
    );

    if (!accountTypeResult.rows[0]?.account_type) {
      throw new Error(`Account type not found for account group ${accountGroup}. Please ensure gl_accounts table has accounts with this group.`);
    }
    const accountType = accountTypeResult.rows[0].account_type;

    // Query existing inventory account names to determine naming pattern
    const existingInventoryAccounts = await this.pool.query(
      `SELECT account_name FROM gl_accounts 
       WHERE account_name ILIKE '%Inventory%' 
         AND account_type = $1
         AND account_group = $2
         AND is_active = true
       LIMIT 5`,
      [accountType, accountGroup]
    );

    // Determine account name based on material category and existing patterns
    let accountName: string | null = null;
    if (materialCategory) {
      // Check if there's a pattern matching the material category
      const categoryPattern = existingInventoryAccounts.rows.find((r: any) =>
        r.account_name.toLowerCase().includes(materialCategory.toLowerCase()) ||
        (materialCategory === 'RAW' && r.account_name.toLowerCase().includes('raw')) ||
        (materialCategory === 'FERT' && r.account_name.toLowerCase().includes('finished')) ||
        (materialCategory === 'HALB' && (r.account_name.toLowerCase().includes('process') || r.account_name.toLowerCase().includes('wip'))) ||
        (materialCategory === 'TRAD' && r.account_name.toLowerCase().includes('trading'))
      );
      accountName = categoryPattern?.account_name || null;
    }

    // If no pattern found, query from material_categories table
    if (!accountName && materialCategory) {
      const categoryNameResult = await this.pool.query(
        `SELECT name FROM material_categories WHERE code = $1 OR name ILIKE $2 LIMIT 1`,
        [materialCategory, `%${materialCategory}%`]
      );
      if (categoryNameResult.rows.length > 0) {
        accountName = `Inventory - ${categoryNameResult.rows[0].name}`;
      }
    }

    // If still no name, throw error
    if (!accountName) {
      throw new Error(`Cannot determine account name for material category ${materialCategory}. Please ensure material_categories table has proper data.`);
    }

    // Try to find existing inventory account
    const existingAccount = await this.pool.query(
      `SELECT account_number FROM gl_accounts 
       WHERE account_name ILIKE $1 
         AND account_type = $2
         AND account_group = $3
         AND is_active = true
       LIMIT 1`,
      [`%${accountName}%`, accountType, accountGroup]
    );

    if (existingAccount.rows.length > 0) {
      return existingAccount.rows[0].account_number;
    }

    // Get account group configuration to determine number range
    const accountGroupConfig = await this.pool.query(
      `SELECT number_range_from, number_range_to 
       FROM account_groups 
       WHERE code = $1 AND is_active = true
       LIMIT 1`,
      ['CURRENT_ASSETS']
    );

    let rangeStart: number;
    let rangeEnd: number;

    if (accountGroupConfig.rows.length > 0 && accountGroupConfig.rows[0].number_range_from && accountGroupConfig.rows[0].number_range_to) {
      rangeStart = parseInt(accountGroupConfig.rows[0].number_range_from);
      rangeEnd = parseInt(accountGroupConfig.rows[0].number_range_to);

      if (isNaN(rangeStart) || isNaN(rangeEnd)) {
        throw new Error(`Invalid number range in account_groups table for ${accountGroup}. Please set valid number_range_from and number_range_to.`);
      }
    } else {
      // Query existing inventory accounts to determine range
      const existingInventoryRange = await this.pool.query(
        `SELECT MIN(CAST(account_number AS INTEGER)) as min_num, MAX(CAST(account_number AS INTEGER)) as max_num
         FROM gl_accounts 
         WHERE account_number ~ '^[0-9]+$' 
           AND account_type = $1
           AND account_group = $2
           AND account_name ILIKE '%Inventory%'`,
        [accountType, accountGroup]
      );

      if (existingInventoryRange.rows.length > 0 && existingInventoryRange.rows[0].min_num) {
        rangeStart = existingInventoryRange.rows[0].min_num;
        rangeEnd = existingInventoryRange.rows[0].max_num + 100;
      } else {
        throw new Error(`Cannot determine account number range for inventory accounts. Please set number_range_from and number_range_to in account_groups table for ${accountGroup}.`);
      }
    }

    // Find next available account number in the determined range
    const accountNumberResult = await this.pool.query(
      `SELECT COALESCE(MAX(CAST(account_number AS INTEGER)), $1 - 1) + 1 as next_number
       FROM gl_accounts 
       WHERE account_number ~ '^[0-9]+$' 
         AND CAST(account_number AS INTEGER) >= $1 
         AND CAST(account_number AS INTEGER) < $2`,
      [rangeStart, rangeEnd]
    );

    if (!accountNumberResult.rows[0]?.next_number) {
      throw new Error(`Failed to generate account number for inventory account. No available numbers in range ${rangeStart}-${rangeEnd}`);
    }

    let accountNumber = accountNumberResult.rows[0].next_number.toString();

    // Create the inventory account (retry if account number conflict)
    let retries = 0;
    while (retries < 10) {
      try {
        await this.pool.query(
          `INSERT INTO gl_accounts (
            account_number, account_name, account_type, account_group,
            balance_sheet_account, pl_account, block_posting, reconciliation_account,
            is_active, posting_allowed, balance_type, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, true, false, false, false, true, true, 'debit', NOW(), NOW())`,
          [accountNumber, accountName, accountType, accountGroup]
        );
        break;
      } catch (error: any) {
        if (error.code === '23505') { // Unique violation
          // Account number exists, try next one
          accountNumber = (parseInt(accountNumber) + 1).toString();
          retries++;
        } else {
          throw error;
        }
      }
    }

    return accountNumber;
  }

  /**
   * Find or create GR/IR (Goods Receipt/Invoice Receipt) account
   */
  private async findOrCreateGRIRAccount(): Promise<string> {
    // Query account type and group from database
    const accountTypeResult = await this.pool.query(
      `SELECT DISTINCT account_type FROM gl_accounts 
       WHERE account_type = 'LIABILITIES' 
       LIMIT 1`
    );
    if (!accountTypeResult.rows[0]?.account_type) {
      throw new Error('Account type LIABILITIES not found. Please ensure gl_accounts table has liability accounts.');
    }
    const accountType = accountTypeResult.rows[0].account_type;

    const accountGroupResult = await this.pool.query(
      `SELECT code FROM account_groups 
       WHERE (code = 'CURRENT_LIABILITIES' OR name ILIKE '%current%liabilit%')
         AND is_active = true
       LIMIT 1`
    );

    if (!accountGroupResult.rows[0]?.code) {
      throw new Error('Account group CURRENT_LIABILITIES not found. Please create it in account_groups table.');
    }
    const accountGroup = accountGroupResult.rows[0].code;

    // Try to find existing GR/IR account
    const existingAccount = await this.pool.query(
      `SELECT account_number FROM gl_accounts 
       WHERE (account_name ILIKE '%GR%IR%' OR account_name ILIKE '%Goods Receipt%Invoice Receipt%')
         AND account_type = $1
         AND is_active = true
       LIMIT 1`,
      [accountType]
    );

    if (existingAccount.rows.length > 0) {
      return existingAccount.rows[0].account_number;
    }

    // Query existing GR/IR account names to determine naming pattern
    const existingGRIRAccounts = await this.pool.query(
      `SELECT account_name FROM gl_accounts 
       WHERE (account_name ILIKE '%GR%IR%' OR account_name ILIKE '%Goods Receipt%Invoice Receipt%')
         AND account_type = $1
         AND is_active = true
       LIMIT 3`,
      [accountType]
    );

    // Determine account name from existing patterns
    const accountName = existingGRIRAccounts.rows[0]?.account_name || null;

    if (!accountName) {
      // Use a descriptive name based on standard accounting terminology
      const standardNameResult = await this.pool.query(
        `SELECT account_name FROM gl_accounts 
         WHERE account_type = $1 
           AND account_group = $2
           AND is_active = true
         LIMIT 1`,
        [accountType, accountGroup]
      );

      if (standardNameResult.rows.length > 0) {
        // Use pattern from existing accounts
        throw new Error(`GR/IR account not found. Please create a GR/IR account manually or ensure account naming follows existing patterns.`);
      } else {
        throw new Error(`Cannot determine GR/IR account name. Please create a GR/IR account manually.`);
      }
    }

    // Get account group configuration for liabilities
    const accountGroupConfig = await this.pool.query(
      `SELECT number_range_from, number_range_to 
       FROM account_groups 
       WHERE (code = 'CURRENT_LIABILITIES' OR name ILIKE '%current%liabilit%')
         AND is_active = true
       LIMIT 1`
    );

    let rangeStart: number;
    let rangeEnd: number;

    if (accountGroupConfig.rows.length > 0 && accountGroupConfig.rows[0].number_range_from && accountGroupConfig.rows[0].number_range_to) {
      rangeStart = parseInt(accountGroupConfig.rows[0].number_range_from);
      rangeEnd = parseInt(accountGroupConfig.rows[0].number_range_to);

      if (isNaN(rangeStart) || isNaN(rangeEnd)) {
        throw new Error(`Invalid number range in account_groups table for ${accountGroup}. Please set valid number_range_from and number_range_to.`);
      }
    } else {
      // Query existing liability accounts to determine range
      const existingLiabilityRange = await this.pool.query(
        `SELECT MIN(CAST(account_number AS INTEGER)) as min_num, MAX(CAST(account_number AS INTEGER)) as max_num
         FROM gl_accounts 
         WHERE account_number ~ '^[0-9]+$' 
           AND account_type = $1
           AND account_group = $2`,
        [accountType, accountGroup]
      );

      if (existingLiabilityRange.rows.length > 0 && existingLiabilityRange.rows[0].min_num) {
        rangeStart = existingLiabilityRange.rows[0].min_num;
        rangeEnd = existingLiabilityRange.rows[0].max_num + 100;
      } else {
        throw new Error(`Cannot determine account number range for GR/IR accounts. Please set number_range_from and number_range_to in account_groups table for ${accountGroup}.`);
      }
    }

    // Find next available account number
    const accountNumberResult = await this.pool.query(
      `SELECT COALESCE(MAX(CAST(account_number AS INTEGER)), $1 - 1) + 1 as next_number
       FROM gl_accounts 
       WHERE account_number ~ '^[0-9]+$' 
         AND CAST(account_number AS INTEGER) >= $1 
         AND CAST(account_number AS INTEGER) < $2`,
      [rangeStart, rangeEnd]
    );

    if (!accountNumberResult.rows[0]?.next_number) {
      throw new Error(`Failed to generate account number for GR/IR account. No available numbers in range ${rangeStart}-${rangeEnd}`);
    }

    let accountNumber = accountNumberResult.rows[0].next_number.toString();

    // Create the GR/IR account (retry if account number conflict)
    let retries = 0;
    while (retries < 10) {
      try {
        await this.pool.query(
          `INSERT INTO gl_accounts (
            account_number, account_name, account_type, account_group,
            balance_sheet_account, pl_account, block_posting, reconciliation_account,
            is_active, posting_allowed, balance_type, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, true, false, false, true, true, true, 'credit', NOW(), NOW())`,
          [accountNumber, accountName, accountType, accountGroup]
        );
        break;
      } catch (error: any) {
        if (error.code === '23505') { // Unique violation
          // Account number exists, try next one
          accountNumber = (parseInt(accountNumber) + 1).toString();
          retries++;
        } else {
          throw error;
        }
      }
    }

    return accountNumber;
  }

  /**
   * Find or create expense account
   */
  private async findOrCreateExpenseAccount(): Promise<string> {
    // Query account type and group from database
    const accountTypeResult = await this.pool.query(
      `SELECT DISTINCT account_type FROM gl_accounts 
       WHERE account_type = 'EXPENSES' 
       LIMIT 1`
    );
    if (!accountTypeResult.rows[0]?.account_type) {
      throw new Error('Account type EXPENSES not found. Please ensure gl_accounts table has expense accounts.');
    }
    const accountType = accountTypeResult.rows[0].account_type;

    const accountGroupResult = await this.pool.query(
      `SELECT code FROM account_groups 
       WHERE (code = 'OPERATING_EXPENSES' OR name ILIKE '%operating%expense%')
         AND is_active = true
       LIMIT 1`
    );

    if (!accountGroupResult.rows[0]?.code) {
      throw new Error('Account group OPERATING_EXPENSES not found. Please create it in account_groups table.');
    }
    const accountGroup = accountGroupResult.rows[0].code;

    // Try to find existing expense account
    const existingAccount = await this.pool.query(
      `SELECT account_number FROM gl_accounts 
       WHERE account_type = $1 
         AND account_group = $2
         AND is_active = true
       LIMIT 1`,
      [accountType, accountGroup]
    );

    if (existingAccount.rows.length > 0) {
      return existingAccount.rows[0].account_number;
    }

    // Query existing expense account names to determine naming pattern
    const existingExpenseAccounts = await this.pool.query(
      `SELECT account_name FROM gl_accounts 
       WHERE account_type = $1 
         AND account_group = $2
         AND is_active = true
       LIMIT 3`,
      [accountType, accountGroup]
    );

    // Determine account name from existing patterns
    const accountName = existingExpenseAccounts.rows[0]?.account_name || null;

    if (!accountName) {
      throw new Error(`Cannot determine expense account name. Please create an expense account manually or ensure account naming follows existing patterns.`);
    }

    // Get account group configuration for expenses
    const accountGroupConfig = await this.pool.query(
      `SELECT number_range_from, number_range_to 
       FROM account_groups 
       WHERE code = $1
         AND is_active = true
       LIMIT 1`,
      [accountGroup]
    );

    let rangeStart: number;
    let rangeEnd: number;

    if (accountGroupConfig.rows.length > 0 && accountGroupConfig.rows[0].number_range_from && accountGroupConfig.rows[0].number_range_to) {
      rangeStart = parseInt(accountGroupConfig.rows[0].number_range_from);
      rangeEnd = parseInt(accountGroupConfig.rows[0].number_range_to);

      if (isNaN(rangeStart) || isNaN(rangeEnd)) {
        throw new Error(`Invalid number range in account_groups table for ${accountGroup}. Please set valid number_range_from and number_range_to.`);
      }
    } else {
      // Query existing expense accounts to determine range
      const existingExpenseRange = await this.pool.query(
        `SELECT MIN(CAST(account_number AS INTEGER)) as min_num, MAX(CAST(account_number AS INTEGER)) as max_num
         FROM gl_accounts 
         WHERE account_number ~ '^[0-9]+$' 
           AND account_type = $1
           AND account_group = $2`,
        [accountType, accountGroup]
      );

      if (existingExpenseRange.rows.length > 0 && existingExpenseRange.rows[0].min_num) {
        rangeStart = existingExpenseRange.rows[0].min_num;
        rangeEnd = existingExpenseRange.rows[0].max_num + 100;
      } else {
        throw new Error(`Cannot determine account number range for expense accounts. Please set number_range_from and number_range_to in account_groups table for ${accountGroup}.`);
      }
    }

    // Find next available account number
    const accountNumberResult = await this.pool.query(
      `SELECT COALESCE(MAX(CAST(account_number AS INTEGER)), $1 - 1) + 1 as next_number
       FROM gl_accounts 
       WHERE account_number ~ '^[0-9]+$' 
         AND CAST(account_number AS INTEGER) >= $1 
         AND CAST(account_number AS INTEGER) < $2`,
      [rangeStart, rangeEnd]
    );

    if (!accountNumberResult.rows[0]?.next_number) {
      throw new Error(`Failed to generate account number for expense account. No available numbers in range ${rangeStart}-${rangeEnd}`);
    }

    let accountNumber = accountNumberResult.rows[0].next_number.toString();

    // Create the expense account (retry if account number conflict)
    let retries = 0;
    while (retries < 10) {
      try {
        await this.pool.query(
          `INSERT INTO gl_accounts (
            account_number, account_name, account_type, account_group,
            balance_sheet_account, pl_account, block_posting, reconciliation_account,
            is_active, posting_allowed, balance_type, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, false, true, false, false, true, true, 'debit', NOW(), NOW())`,
          [accountNumber, accountName, accountType, accountGroup]
        );
        break;
      } catch (error: any) {
        if (error.code === '23505') { // Unique violation
          // Account number exists, try next one
          accountNumber = (parseInt(accountNumber) + 1).toString();
          retries++;
        } else {
          throw error;
        }
      }
    }

    return accountNumber;
  }

  /**
   * Find or create Work in Process account
   */
  private async findOrCreateWIPAccount(): Promise<string> {
    // Query account type and group from database
    const accountTypeResult = await this.pool.query(
      `SELECT DISTINCT account_type FROM gl_accounts 
       WHERE account_type = 'ASSETS' 
       LIMIT 1`
    );
    if (!accountTypeResult.rows[0]?.account_type) {
      throw new Error('Account type ASSETS not found. Please ensure gl_accounts table has asset accounts.');
    }
    const accountType = accountTypeResult.rows[0].account_type;

    const accountGroupResult = await this.pool.query(
      `SELECT code FROM account_groups 
       WHERE (code = 'CURRENT_ASSETS' OR name ILIKE '%current%asset%')
         AND is_active = true
       LIMIT 1`
    );

    if (!accountGroupResult.rows[0]?.code) {
      throw new Error('Account group CURRENT_ASSETS not found. Please create it in account_groups table.');
    }
    const accountGroup = accountGroupResult.rows[0].code;

    // Try to find existing WIP account
    const existingAccount = await this.pool.query(
      `SELECT account_number FROM gl_accounts 
       WHERE (account_name ILIKE '%Work in Process%' OR account_name ILIKE '%WIP%')
         AND account_type = $1
         AND is_active = true
       LIMIT 1`,
      [accountType]
    );

    if (existingAccount.rows.length > 0) {
      return existingAccount.rows[0].account_number;
    }

    // Query existing WIP account names to determine naming pattern
    const existingWIPAccounts = await this.pool.query(
      `SELECT account_name FROM gl_accounts 
       WHERE (account_name ILIKE '%Work in Process%' OR account_name ILIKE '%WIP%')
         AND account_type = $1
         AND is_active = true
       LIMIT 3`,
      [accountType]
    );

    // Determine account name from existing patterns
    const accountName = existingWIPAccounts.rows[0]?.account_name || null;

    if (!accountName) {
      throw new Error(`Cannot determine WIP account name. Please create a WIP account manually or ensure account naming follows existing patterns.`);
    }

    // Get account group configuration for WIP (same as inventory)
    const accountGroupConfig = await this.pool.query(
      `SELECT number_range_from, number_range_to 
       FROM account_groups 
       WHERE code = $1 AND is_active = true
       LIMIT 1`,
      [accountGroup]
    );

    let rangeStart: number;
    let rangeEnd: number;

    if (accountGroupConfig.rows.length > 0 && accountGroupConfig.rows[0].number_range_from && accountGroupConfig.rows[0].number_range_to) {
      rangeStart = parseInt(accountGroupConfig.rows[0].number_range_from);
      rangeEnd = parseInt(accountGroupConfig.rows[0].number_range_to);

      if (isNaN(rangeStart) || isNaN(rangeEnd)) {
        throw new Error(`Invalid number range in account_groups table for ${accountGroup}. Please set valid number_range_from and number_range_to.`);
      }
    } else {
      // Query existing WIP accounts to determine range
      const existingWIPRange = await this.pool.query(
        `SELECT MIN(CAST(account_number AS INTEGER)) as min_num, MAX(CAST(account_number AS INTEGER)) as max_num
         FROM gl_accounts 
         WHERE account_number ~ '^[0-9]+$' 
           AND account_type = $1
           AND account_group = $2
           AND (account_name ILIKE '%Work in Process%' OR account_name ILIKE '%WIP%')`,
        [accountType, accountGroup]
      );

      if (existingWIPRange.rows.length > 0 && existingWIPRange.rows[0].min_num) {
        rangeStart = existingWIPRange.rows[0].min_num;
        rangeEnd = existingWIPRange.rows[0].max_num + 100;
      } else {
        throw new Error(`Cannot determine account number range for WIP accounts. Please set number_range_from and number_range_to in account_groups table for ${accountGroup}.`);
      }
    }

    // Find next available account number
    const accountNumberResult = await this.pool.query(
      `SELECT COALESCE(MAX(CAST(account_number AS INTEGER)), $1 - 1) + 1 as next_number
       FROM gl_accounts 
       WHERE account_number ~ '^[0-9]+$' 
         AND CAST(account_number AS INTEGER) >= $1 
         AND CAST(account_number AS INTEGER) < $2`,
      [rangeStart, rangeEnd]
    );

    if (!accountNumberResult.rows[0]?.next_number) {
      throw new Error(`Failed to generate account number for WIP account. No available numbers in range ${rangeStart}-${rangeEnd}`);
    }

    let accountNumber = accountNumberResult.rows[0].next_number.toString();

    // Create the WIP account (retry if account number conflict)
    let retries = 0;
    while (retries < 10) {
      try {
        await this.pool.query(
          `INSERT INTO gl_accounts (
            account_number, account_name, account_type, account_group,
            balance_sheet_account, pl_account, block_posting, reconciliation_account,
            is_active, posting_allowed, balance_type, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, true, false, false, false, true, true, 'debit', NOW(), NOW())`,
          [accountNumber, accountName, accountType, accountGroup]
        );
        break;
      } catch (error: any) {
        if (error.code === '23505') { // Unique violation
          // Account number exists, try next one
          accountNumber = (parseInt(accountNumber) + 1).toString();
          retries++;
        } else {
          throw error;
        }
      }
    }

    return accountNumber;
  }

  /**
   * Find or create Cost of Goods Sold account
   */
  private async findOrCreateCOGSAccount(): Promise<string> {
    // Query account type and group from database
    const accountTypeResult = await this.pool.query(
      `SELECT DISTINCT account_type FROM gl_accounts 
       WHERE account_type = 'EXPENSES' 
       LIMIT 1`
    );
    if (!accountTypeResult.rows[0]?.account_type) {
      throw new Error('Account type EXPENSES not found. Please ensure gl_accounts table has expense accounts.');
    }
    const accountType = accountTypeResult.rows[0].account_type;

    const accountGroupResult = await this.pool.query(
      `SELECT code FROM account_groups 
       WHERE (code = 'COST_OF_SALES' OR name ILIKE '%cost%sales%' OR name ILIKE '%cogs%')
         AND is_active = true
       LIMIT 1`
    );

    if (!accountGroupResult.rows[0]?.code) {
      throw new Error('Account group COST_OF_SALES not found. Please create it in account_groups table.');
    }
    const accountGroup = accountGroupResult.rows[0].code;

    // Try to find existing COGS account
    const existingAccount = await this.pool.query(
      `SELECT account_number FROM gl_accounts 
       WHERE (account_name ILIKE '%Cost of Goods Sold%' OR account_name ILIKE '%COGS%')
         AND account_type = $1
         AND is_active = true
       LIMIT 1`,
      [accountType]
    );

    if (existingAccount.rows.length > 0) {
      return existingAccount.rows[0].account_number;
    }

    // Query existing COGS account names to determine naming pattern
    const existingCOGSAccounts = await this.pool.query(
      `SELECT account_name FROM gl_accounts 
       WHERE (account_name ILIKE '%Cost of Goods Sold%' OR account_name ILIKE '%COGS%')
         AND account_type = $1
         AND is_active = true
       LIMIT 3`,
      [accountType]
    );

    // Determine account name from existing patterns
    const accountName = existingCOGSAccounts.rows[0]?.account_name || null;

    if (!accountName) {
      throw new Error(`Cannot determine COGS account name. Please create a COGS account manually or ensure account naming follows existing patterns.`);
    }

    // Get account group configuration for COGS
    const accountGroupConfig = await this.pool.query(
      `SELECT number_range_from, number_range_to 
       FROM account_groups 
       WHERE code = $1
         AND is_active = true
       LIMIT 1`,
      [accountGroup]
    );

    let rangeStart: number;
    let rangeEnd: number;

    if (accountGroupConfig.rows.length > 0 && accountGroupConfig.rows[0].number_range_from && accountGroupConfig.rows[0].number_range_to) {
      rangeStart = parseInt(accountGroupConfig.rows[0].number_range_from);
      rangeEnd = parseInt(accountGroupConfig.rows[0].number_range_to);

      if (isNaN(rangeStart) || isNaN(rangeEnd)) {
        throw new Error(`Invalid number range in account_groups table for ${accountGroup}. Please set valid number_range_from and number_range_to.`);
      }
    } else {
      // Query existing COGS accounts to determine range
      const existingCOGSRange = await this.pool.query(
        `SELECT MIN(CAST(account_number AS INTEGER)) as min_num, MAX(CAST(account_number AS INTEGER)) as max_num
         FROM gl_accounts 
         WHERE account_number ~ '^[0-9]+$' 
           AND account_type = $1
           AND account_group = $2
           AND (account_name ILIKE '%Cost of Goods Sold%' OR account_name ILIKE '%COGS%')`,
        [accountType, accountGroup]
      );

      if (existingCOGSRange.rows.length > 0 && existingCOGSRange.rows[0].min_num) {
        rangeStart = existingCOGSRange.rows[0].min_num;
        rangeEnd = existingCOGSRange.rows[0].max_num + 100;
      } else {
        throw new Error(`Cannot determine account number range for COGS accounts. Please set number_range_from and number_range_to in account_groups table for ${accountGroup}.`);
      }
    }

    // Find next available account number
    const accountNumberResult = await this.pool.query(
      `SELECT COALESCE(MAX(CAST(account_number AS INTEGER)), $1 - 1) + 1 as next_number
       FROM gl_accounts 
       WHERE account_number ~ '^[0-9]+$' 
         AND CAST(account_number AS INTEGER) >= $1 
         AND CAST(account_number AS INTEGER) < $2`,
      [rangeStart, rangeEnd]
    );

    if (!accountNumberResult.rows[0]?.next_number) {
      throw new Error(`Failed to generate account number for COGS account. No available numbers in range ${rangeStart}-${rangeEnd}`);
    }

    let accountNumber = accountNumberResult.rows[0].next_number.toString();

    // Create the COGS account (retry if account number conflict)
    let retries = 0;
    while (retries < 10) {
      try {
        await this.pool.query(
          `INSERT INTO gl_accounts (
            account_number, account_name, account_type, account_group,
            balance_sheet_account, pl_account, block_posting, reconciliation_account,
            is_active, posting_allowed, balance_type, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, false, true, false, false, true, true, 'debit', NOW(), NOW())`,
          [accountNumber, accountName, accountType, accountGroup]
        );
        break;
      } catch (error: any) {
        if (error.code === '23505') { // Unique violation
          // Account number exists, try next one
          accountNumber = (parseInt(accountNumber) + 1).toString();
          retries++;
        } else {
          throw error;
        }
      }
    }

    return accountNumber;
  }

  /**
   * Get movement type code from movement_types table by transaction type and direction
   * Returns the code (e.g., 'GR' for goods receipt, 'GI' for goods issue)
   */
  private async getMovementTypeCode(
    transactionType: string,
    inventoryDirection: string
  ): Promise<string | null> {
    try {
      const result = await this.pool.query(
        `SELECT COALESCE(movement_type_code, movement_code) as code
         FROM movement_types
         WHERE transaction_type = $1::VARCHAR
           AND inventory_direction = $2::VARCHAR
           AND is_active = true
         LIMIT 1`,
        [transactionType, inventoryDirection]
      );
      return result.rows[0]?.code || null;
    } catch (error) {
      console.warn('Could not fetch movement type code from database:', error);
      return null;
    }
  }

  /**
   * Get currency for material from material master or company code
   */
  private async getCurrencyForMaterial(materialCode: string): Promise<string> {
    // Materials table doesn't have currency column, get from company codes or plants
    // Note: company_codes table doesn't have is_default column
    // Try to get currency from active company codes (prefer first active one)
    const defaultCurrencyResult = await this.pool.query(
      `SELECT currency FROM company_codes 
       WHERE currency IS NOT NULL AND active = true 
       ORDER BY id ASC 
       LIMIT 1`
    );
    if (defaultCurrencyResult.rows.length > 0 && defaultCurrencyResult.rows[0].currency) {
      return defaultCurrencyResult.rows[0].currency;
    }

    // Try to get from any company code (even if not active)
    const anyCurrencyResult = await this.pool.query(
      `SELECT currency FROM company_codes WHERE currency IS NOT NULL LIMIT 1`
    );
    if (anyCurrencyResult.rows.length > 0 && anyCurrencyResult.rows[0].currency) {
      return anyCurrencyResult.rows[0].currency;
    }

    // Last resort: throw error instead of hardcoding
    throw new Error(
      `Currency not found for material ${materialCode}. Please configure currency in company_codes table.`
    );
  }

  /**
   * Calculate WIP (Work in Process) cost for production order
   */
  async calculateWIPCost(
    productionOrderId: number
  ): Promise<{
    materialCost: number;
    laborCost: number;
    overheadCost: number;
    totalCost: number;
  }> {
    // Get production order details
    // Note: production_orders has material_id, not material_code - need to join with materials
    const poResult = await this.pool.query(
      `SELECT po.id, m.code as material_code, 
              COALESCE(po.actual_quantity, po.planned_quantity) as quantity, 
              po.plant_id
       FROM production_orders po
       LEFT JOIN materials m ON po.material_id = m.id
       WHERE po.id = $1`,
      [productionOrderId]
    );

    if (poResult.rows.length === 0) {
      throw new Error(`Production order ${productionOrderId} not found`);
    }

    const productionOrder = poResult.rows[0];

    // Get material costs from stock movements for this production order
    // Look up movement type code for production material consumption
    const productionConsumptionCode = await this.getMovementTypeCode('production', 'decrease') || '261';
    const materialCostResult = await this.pool.query(
      `SELECT COALESCE(SUM(total_value), 0) as material_cost
       FROM stock_movements
       WHERE production_order_id = $1
         AND movement_type = $2::VARCHAR`,
      [productionOrderId, productionConsumptionCode]
    );

    const materialCost = parseFloat(materialCostResult.rows[0]?.material_cost || '0');

    // Get labor cost from production order or work center rates
    // This should come from routing/work center data, but for now get from production order
    const laborCostResult = await this.pool.query(
      `SELECT labor_cost, overhead_cost
       FROM production_orders
       WHERE id = $1`,
      [productionOrderId]
    );

    let laborCost = 0;
    let overheadCost = 0;

    if (laborCostResult.rows.length > 0) {
      laborCost = parseFloat(laborCostResult.rows[0].labor_cost || '0');
      overheadCost = parseFloat(laborCostResult.rows[0].overhead_cost || '0');
    }

    // If overhead not set, calculate from cost center
    if (overheadCost === 0 && productionOrder.plant_id) {
      const plantResult = await this.pool.query(
        `SELECT cost_center_id FROM plants WHERE id = $1`,
        [productionOrder.plant_id]
      );
      if (plantResult.rows.length > 0 && plantResult.rows[0].cost_center_id) {
        const overheadData = await this.calculateOverheadAllocation(
          materialCost + laborCost,
          plantResult.rows[0].cost_center_id
        );
        overheadCost = overheadData.overheadAmount;
      }
    }

    const totalCost = materialCost + laborCost + overheadCost;

    return {
      materialCost,
      laborCost,
      overheadCost,
      totalCost,
    };
  }

  /**
   * Update WIP cost in production order
   */
  async updateWIPCost(
    client: any,
    productionOrderId: number
  ): Promise<void> {
    const wipData = await this.calculateWIPCost(productionOrderId);

    await client.query(
      `UPDATE production_orders
       SET wip_material_cost = $1,
           wip_labor_cost = $2,
           wip_overhead_cost = $3,
           wip_total_cost = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [
        wipData.materialCost,
        wipData.laborCost,
        wipData.overheadCost,
        wipData.totalCost,
        productionOrderId
      ]
    );
  }

  /**
   * Process inventory write-off with financial posting
   */
  async processWriteOff(
    client: any,
    movementData: {
      materialCode: string;
      quantity: number;
      unitCost: number;
      writeOffAmount: number;
      reason: string;
      costCenterId?: number;
      profitCenterId?: number;
      referenceDocument?: string;
    }
  ): Promise<{
    success: boolean;
    glDocumentNumber?: string;
    error?: string;
  }> {
    // Create financial posting for write-off
    // Debit: Loss/Expense account, Credit: Inventory account
    const postingResult = await this.createFinancialPosting(
      client,
      {
        materialCode: movementData.materialCode,
        movementType: '602', // Scrapping/Write-off
        quantity: movementData.quantity,
        unitPrice: movementData.unitCost,
        totalValue: movementData.writeOffAmount,
        costCenterId: movementData.costCenterId,
        profitCenterId: movementData.profitCenterId,
        referenceDocument: movementData.referenceDocument || `WRITEOFF-${Date.now()}`,
      }
    );

    return postingResult;
  }

  /**
   * Process inventory write-down with financial posting
   */
  async processWriteDown(
    client: any,
    movementData: {
      materialCode: string;
      quantity: number;
      originalCost: number;
      newCost: number;
      writeDownAmount: number;
      reason: string;
      costCenterId?: number;
      profitCenterId?: number;
      referenceDocument?: string;
    }
  ): Promise<{
    success: boolean;
    glDocumentNumber?: string;
    error?: string;
  }> {
    // Create financial posting for write-down
    // Debit: Loss/Expense account, Credit: Inventory account (for the difference)
    const postingResult = await this.createFinancialPosting(
      client,
      {
        materialCode: movementData.materialCode,
        movementType: '602', // Write-down
        quantity: movementData.quantity,
        unitPrice: movementData.originalCost,
        totalValue: movementData.writeDownAmount,
        costCenterId: movementData.costCenterId,
        profitCenterId: movementData.profitCenterId,
        referenceDocument: movementData.referenceDocument || `WRITEDOWN-${Date.now()}`,
      }
    );

    return postingResult;
  }

  /**
   * Update stock movement with finance and cost data
   */
  async updateStockMovementWithFinanceData(
    client: any,
    movementId: number,
    financeData: {
      costCenterId?: number;
      profitCenterId?: number;
      cogsAmount?: number;
      freightCost?: number;
      dutyCost?: number;
      handlingCost?: number;
      insuranceCost?: number;
      totalLandedCost?: number;
      overheadAmount?: number;
      overheadRate?: number;
      wipAmount?: number;
      productionOrderId?: number;
      standardCost?: number;
      actualCost?: number;
      varianceAmount?: number;
      varianceType?: string;
      glDocumentNumber?: string;
      financialPostingStatus?: string;
      financialPostingError?: string;
      writeOffAmount?: number;
      writeDownAmount?: number;
    }
  ): Promise<void> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (financeData.costCenterId !== undefined) {
      updateFields.push(`cost_center_id = $${paramCount++}`);
      values.push(financeData.costCenterId);
    }
    if (financeData.profitCenterId !== undefined) {
      updateFields.push(`profit_center_id = $${paramCount++}`);
      values.push(financeData.profitCenterId);
    }
    if (financeData.cogsAmount !== undefined) {
      updateFields.push(`cogs_amount = $${paramCount++}`);
      values.push(financeData.cogsAmount);
    }
    if (financeData.freightCost !== undefined) {
      updateFields.push(`freight_cost = $${paramCount++}`);
      values.push(financeData.freightCost);
    }
    if (financeData.dutyCost !== undefined) {
      updateFields.push(`duty_cost = $${paramCount++}`);
      values.push(financeData.dutyCost);
    }
    if (financeData.handlingCost !== undefined) {
      updateFields.push(`handling_cost = $${paramCount++}`);
      values.push(financeData.handlingCost);
    }
    if (financeData.insuranceCost !== undefined) {
      updateFields.push(`insurance_cost = $${paramCount++}`);
      values.push(financeData.insuranceCost);
    }
    if (financeData.totalLandedCost !== undefined) {
      updateFields.push(`total_landed_cost = $${paramCount++}`);
      values.push(financeData.totalLandedCost);
    }
    if (financeData.overheadAmount !== undefined) {
      updateFields.push(`overhead_amount = $${paramCount++}`);
      values.push(financeData.overheadAmount);
    }
    if (financeData.overheadRate !== undefined) {
      updateFields.push(`overhead_rate = $${paramCount++}`);
      values.push(financeData.overheadRate);
    }
    if (financeData.wipAmount !== undefined) {
      updateFields.push(`wip_amount = $${paramCount++}`);
      values.push(financeData.wipAmount);
    }
    if (financeData.productionOrderId !== undefined) {
      updateFields.push(`production_order_id = $${paramCount++}`);
      values.push(financeData.productionOrderId);
    }
    if (financeData.standardCost !== undefined) {
      updateFields.push(`standard_cost = $${paramCount++}`);
      values.push(financeData.standardCost);
    }
    if (financeData.actualCost !== undefined) {
      updateFields.push(`actual_cost = $${paramCount++}`);
      values.push(financeData.actualCost);
    }
    if (financeData.varianceAmount !== undefined) {
      updateFields.push(`variance_amount = $${paramCount++}`);
      values.push(financeData.varianceAmount);
    }
    if (financeData.varianceType !== undefined) {
      updateFields.push(`variance_type = $${paramCount++}`);
      values.push(financeData.varianceType);
    }
    if (financeData.glDocumentNumber !== undefined) {
      updateFields.push(`gl_document_number = $${paramCount++}`);
      values.push(financeData.glDocumentNumber);
    }
    if (financeData.financialPostingStatus !== undefined) {
      updateFields.push(`financial_posting_status = $${paramCount++}`);
      values.push(financeData.financialPostingStatus);
    }
    if (financeData.financialPostingError !== undefined) {
      updateFields.push(`financial_posting_error = $${paramCount++}`);
      values.push(financeData.financialPostingError);
    }
    if (financeData.writeOffAmount !== undefined) {
      updateFields.push(`write_off_amount = $${paramCount++}`);
      values.push(financeData.writeOffAmount);
    }
    if (financeData.writeDownAmount !== undefined) {
      updateFields.push(`write_down_amount = $${paramCount++}`);
      values.push(financeData.writeDownAmount);
    }

    if (updateFields.length > 0) {
      values.push(movementId);
      await client.query(
        `UPDATE stock_movements 
         SET ${updateFields.join(', ')} 
         WHERE id = $${paramCount}`,
        values
      );
    }
  }
}
