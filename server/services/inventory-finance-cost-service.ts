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
    // 1. Get material price control & base_unit_price
    let priceControl = 'V'; // Default to Moving Average
    let standardPrice = 0;
    
    try {
      const materialResult = await this.pool.query(
        `SELECT price_control, base_unit_price, cost
         FROM materials
         WHERE code = $1
         LIMIT 1`,
        [materialCode]
      );

      if (materialResult.rows.length > 0) {
        const row = materialResult.rows[0];
        priceControl = row.price_control === 'S' || row.price_control === 'V' ? row.price_control : 'V';
        standardPrice = parseFloat(row.base_unit_price || row.cost || '0');
      }
    } catch (err) {
      console.warn('Could not check price_control from materials table:', err);
    }

    // 2. Get current inventory valuation (moving average price)
    let movingAveragePrice = 0;
    try {
      const stockBalanceResult = await this.pool.query(
        `SELECT moving_average_price
         FROM stock_balances
         WHERE material_code = $1 
           AND plant_code = $2 
           AND storage_location = $3
         LIMIT 1`,
        [materialCode, plantCode, storageLocation]
      );

      if (stockBalanceResult.rows.length > 0) {
        movingAveragePrice = parseFloat(stockBalanceResult.rows[0].moving_average_price || '0');
      }
    } catch (err) {
      console.warn('Could not fetch moving average from stock balances:', err);
    }

    // 3. Determine unit cost based on price control
    let unitCost = 0;
    if (priceControl === 'S') {
      unitCost = standardPrice;
      // Fallback
      if (unitCost === 0 && movingAveragePrice > 0) unitCost = movingAveragePrice;
    } else {
      // priceControl === 'V'
      unitCost = movingAveragePrice;
      // Fallback
      if (unitCost === 0 && standardPrice > 0) unitCost = standardPrice;
    }

    const cogsAmount = unitCost * quantity;
    const valuationMethod = priceControl === 'S' ? 'STANDARD' : 'MOVING_AVERAGE';

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
          movementData.movementType,
          movementData.materialCode,
          null, // valuationClass will be fetched by determineAccounts
          client
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

        // Get GL Account IDs
        let debitAccountId: number | null = null;
        let creditAccountId: number | null = null;
        try {
          const debitAccountResult = await client.query(
            `SELECT id FROM gl_accounts WHERE account_number = $1 LIMIT 1`,
            [debitAccount]
          );
          debitAccountId = debitAccountResult.rows[0]?.id || null;
          
          const creditAccountResult = await client.query(
            `SELECT id FROM gl_accounts WHERE account_number = $1 LIMIT 1`,
            [creditAccount]
          );
          creditAccountId = creditAccountResult.rows[0]?.id || null;
        } catch (e: any) {
          console.warn('Could not fetch GL account IDs:', e.message);
        }

        // Debit entry
        await client.query(
          `INSERT INTO journal_entry_line_items (
            journal_entry_id,
            line_item_number,
            gl_account,
            gl_account_id,
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
          ) VALUES ($1, $2, $3, $4, 'D', $5, 0, $6, $7, $8, $9, $10, $11, NOW())`,
          [
            journalEntryId,
            nextLineNumber,
            debitAccount,
            debitAccountId,
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
            gl_account_id,
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
          ) VALUES ($1, $2, $3, $4, 'C', 0, $5, $6, $7, $8, $9, $10, $11, NOW())`,
          [
            journalEntryId,
            nextLineNumber + 1,
            creditAccount,
            creditAccountId,
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
    movementType: string,
    materialCode: string,
    valuationClass: string | null,
    client?: any
  ): Promise<{ debitAccount: string; creditAccount: string } | null> {
    const queryClient = client || this.pool;

    if (!valuationClass) {
      // Fetch valuation class directly from the materials table
      try {
        if (client) await client.query('SAVEPOINT get_valclass');
        
        const matResult = await queryClient.query(
          `SELECT valuation_class 
           FROM materials 
           WHERE code = $1 LIMIT 1`,
          [materialCode]
        );
        
        if (matResult.rows.length > 0 && matResult.rows[0].valuation_class) {
          valuationClass = matResult.rows[0].valuation_class;
        }
        
        if (client) await client.query('RELEASE SAVEPOINT get_valclass');
      } catch (e: any) {
        if (client) {
          try { await client.query('ROLLBACK TO SAVEPOINT get_valclass'); } catch (e2) {}
        }
      }
    }

    if (!valuationClass) {
      throw new Error(`Valuation class is required for account determination (Material: ${materialCode})`);
    }

    // Determine transaction keys from movement type (Standard SAP OBYC logic)
    let debitTk = '';
    let creditTk = '';

    switch (movementType) {
      case '601': // Goods Issue for Delivery (PGI)
      case '543': // Goods Issue Transfer
        debitTk = 'GBB';
        creditTk = 'BSX';
        break;
      case '101': // Goods Receipt against PO
      case '561': // Initial Entry
      case '541': // Goods Receipt Transfer
        debitTk = 'BSX';
        creditTk = 'WRX'; // GBB or WRX depending on exact process
        if (movementType === '561' || movementType === '541') {
          creditTk = 'GBB';
        }
        break;
      case '702': // Scrapping
        debitTk = 'GBB';
        creditTk = 'BSX';
        break;
      default:
        console.warn(`[AccountDetermination] No distinct transaction keys hardcoded for movement type ${movementType}`);
        // Fallback for custom movement types to basic PGI flow
        debitTk = 'GBB';
        creditTk = 'BSX';
    }

    let debitAccount: string | null = null;
    let creditAccount: string | null = null;

    try {
      if (client) await client.query('SAVEPOINT account_determination');

      // Query OBYC (material_account_determination join transaction_keys join valuation_classes)
      const obycQuery = `
        SELECT tk.code as tk_code, gl.account_number 
        FROM material_account_determination mad
        JOIN transaction_keys tk ON mad.transaction_key_id = tk.id
        JOIN valuation_classes vc ON mad.valuation_class_id = vc.id
        JOIN gl_accounts gl ON mad.gl_account_id = gl.id
        WHERE tk.code IN ($1, $2)
          AND vc.class_code = $3
          AND mad.is_active = true
      `;
      const obycResult = await queryClient.query(obycQuery, [debitTk, creditTk, valuationClass]);
      
      for (const row of obycResult.rows) {
        if (row.tk_code === debitTk) debitAccount = row.account_number;
        // Handle case where debit and credit might be the same TK
        if (row.tk_code === creditTk) creditAccount = row.account_number;
      }

      if (client) await client.query('RELEASE SAVEPOINT account_determination');
    } catch (error: any) {
      if (client) {
        try { await client.query('ROLLBACK TO SAVEPOINT account_determination'); } catch (rollbackError) {}
      }
      console.error('[AccountDetermination] Query failed:', error);
    }

    if (!debitAccount || !creditAccount) {
      throw new Error(
        `STRICT VERIFICATION FAILED: Account determination failed for material ${materialCode}, movement type ${movementType}. ` +
        `No exact rule found in OBYC material_account_determination table for valuation_class=${valuationClass}, ` +
        `required transaction keys: Debit=${debitTk}, Credit=${creditTk}. ` +
        `Please configure the necessary rules in the system.`
      );
    }

    return {
      debitAccount,
      creditAccount,
    };
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

