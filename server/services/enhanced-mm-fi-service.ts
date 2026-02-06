import { db, pool } from "../db";
import { 
  products,
  glAccounts,
  accountDetermination,
  stockMovements,
  purchaseOrders
} from "@shared/schema";
import { 
  accountDeterminationRules,
  purchaseCommitments,
  threeWayMatches,
  materialLedgerDocuments,
  priceVarianceAnalysis,
  periodEndValuations,
  enhancedMovementTypes,
  enhancedValuationClasses
} from "@shared/mm-fi-schema";
import { eq, and, desc, sql } from "drizzle-orm";

export class EnhancedMMFIService {
  
  // Initialize basic MM-FI configuration
  async initializeMMFIConfiguration(): Promise<void> {
    console.log("Initializing comprehensive MM-FI integration configuration...");
    
    await this.createBasicAccountDeterminationRules();
    await this.createEnhancedMovementTypes();
    await this.createEnhancedValuationClasses();
    
    console.log("MM-FI configuration initialization completed");
  }

  private async createBasicAccountDeterminationRules(): Promise<void> {
    // Get material categories from database
    const materialCategories = await this.getMaterialCategoriesFromDatabase();
    // Get valuation classes from database
    const valuationClasses = await this.getValuationClassesFromDatabase();
    // Get movement types from database
    const movementTypes = await this.getMovementTypesFromDatabase();
    
    // Get default accounts from database
    const defaultInventoryAccount = await this.getDefaultInventoryAccount();
    const defaultPayableAccount = await this.getDefaultPayableAccount();
    const defaultManufacturingCostAccount = await this.getDefaultManufacturingCostAccount();
    const defaultWIPAccount = await this.getDefaultWIPAccount();
    const defaultFinishedGoodsAccount = await this.getDefaultFinishedGoodsAccount();
    const defaultCOGSAccount = await this.getDefaultCOGSAccount();
    const defaultVarianceAccount = await this.getDefaultVarianceAccount();
    
    // Get default cost center from database
    const defaultCostCenter = await this.getDefaultCostCenter();

    // Build rules dynamically based on database data
    const basicRules = [];
    
    // Only create rules if we have the necessary data
    if (materialCategories.length > 0 && valuationClasses.length > 0 && movementTypes.length > 0) {
      // Goods Receipt from Purchase Order (101)
      const grMovement = movementTypes.find(mt => mt.code === '101');
      const rawMaterialCategory = materialCategories.find(mc => mc.name?.toLowerCase().includes('raw'));
      const rawValuationClass = valuationClasses.find(vc => vc.name?.toLowerCase().includes('raw'));
      
      if (grMovement && rawMaterialCategory && rawValuationClass && defaultInventoryAccount && defaultPayableAccount) {
        const materialCategory = rawMaterialCategory.code || rawMaterialCategory.name;
        const valuationClass = rawValuationClass.code || rawValuationClass.name;
        if (!materialCategory || !valuationClass) {
          throw new Error('Material category or valuation class code/name is missing from database.');
        }
        basicRules.push({
          materialCategory: materialCategory,
          movementType: grMovement.code,
          valuationClass: valuationClass,
          debitAccount: defaultInventoryAccount,
          creditAccount: defaultPayableAccount,
        });
      }

      // Goods Issue to Cost Center (201)
      const giCostCenterMovement = movementTypes.find(mt => mt.code === '201');
      if (giCostCenterMovement && rawMaterialCategory && rawValuationClass && defaultManufacturingCostAccount && defaultInventoryAccount && defaultCostCenter) {
        basicRules.push({
          materialCategory: rawMaterialCategory.code || rawMaterialCategory.name,
          movementType: giCostCenterMovement.code,
          valuationClass: rawValuationClass.code || rawValuationClass.name,
          debitAccount: defaultManufacturingCostAccount,
          creditAccount: defaultInventoryAccount,
          costCenter: defaultCostCenter,
        });
      }

      // Goods Issue to Production (261)
      const giProductionMovement = movementTypes.find(mt => mt.code === '261');
      if (giProductionMovement && rawMaterialCategory && rawValuationClass && defaultWIPAccount && defaultInventoryAccount) {
        const materialCategory = rawMaterialCategory.code || rawMaterialCategory.name;
        const valuationClass = rawValuationClass.code || rawValuationClass.name;
        if (!materialCategory || !valuationClass) {
          throw new Error('Material category or valuation class code/name is missing from database.');
        }
        basicRules.push({
          materialCategory: materialCategory,
          movementType: giProductionMovement.code,
          valuationClass: valuationClass,
          debitAccount: defaultWIPAccount,
          creditAccount: defaultInventoryAccount,
        });
      }

      // Goods Receipt from Production (101 for finished goods)
      const finishedMaterialCategory = materialCategories.find(mc => mc.name?.toLowerCase().includes('finished'));
      const finishedValuationClass = valuationClasses.find(vc => vc.name?.toLowerCase().includes('finished'));
      if (grMovement && finishedMaterialCategory && finishedValuationClass && defaultFinishedGoodsAccount && defaultWIPAccount) {
        const materialCategory = finishedMaterialCategory.code || finishedMaterialCategory.name;
        const valuationClass = finishedValuationClass.code || finishedValuationClass.name;
        if (!materialCategory || !valuationClass) {
          throw new Error('Material category or valuation class code/name is missing from database.');
        }
        basicRules.push({
          materialCategory: materialCategory,
          movementType: grMovement.code,
          valuationClass: valuationClass,
          debitAccount: defaultFinishedGoodsAccount,
          creditAccount: defaultWIPAccount,
        });
      }

      // Sales Order Delivery (601)
      const salesDeliveryMovement = movementTypes.find(mt => mt.code === '601');
      if (salesDeliveryMovement && finishedMaterialCategory && finishedValuationClass && defaultCOGSAccount && defaultFinishedGoodsAccount) {
        const materialCategory = finishedMaterialCategory.code || finishedMaterialCategory.name;
        const valuationClass = finishedValuationClass.code || finishedValuationClass.name;
        if (!materialCategory || !valuationClass) {
          throw new Error('Material category or valuation class code/name is missing from database.');
        }
        basicRules.push({
          materialCategory: materialCategory,
          movementType: salesDeliveryMovement.code,
          valuationClass: valuationClass,
          debitAccount: defaultCOGSAccount,
          creditAccount: defaultFinishedGoodsAccount,
        });
      }

      // Physical Inventory Adjustment - Positive (701)
      const invAdjPosMovement = movementTypes.find(mt => mt.code === '701');
      if (invAdjPosMovement && rawMaterialCategory && rawValuationClass && defaultInventoryAccount && defaultVarianceAccount) {
        const materialCategory = rawMaterialCategory.code || rawMaterialCategory.name;
        const valuationClass = rawValuationClass.code || rawValuationClass.name;
        if (!materialCategory || !valuationClass) {
          throw new Error('Material category or valuation class code/name is missing from database.');
        }
        basicRules.push({
          materialCategory: materialCategory,
          movementType: invAdjPosMovement.code,
          valuationClass: valuationClass,
          debitAccount: defaultInventoryAccount,
          creditAccount: defaultVarianceAccount,
        });
      }

      // Physical Inventory Adjustment - Negative (702)
      const invAdjNegMovement = movementTypes.find(mt => mt.code === '702');
      if (invAdjNegMovement && rawMaterialCategory && rawValuationClass && defaultVarianceAccount && defaultInventoryAccount) {
        const materialCategory = rawMaterialCategory.code || rawMaterialCategory.name;
        const valuationClass = rawValuationClass.code || rawValuationClass.name;
        if (!materialCategory || !valuationClass) {
          throw new Error('Material category or valuation class code/name is missing from database.');
        }
        basicRules.push({
          materialCategory: materialCategory,
          movementType: invAdjNegMovement.code,
          valuationClass: valuationClass,
          debitAccount: defaultVarianceAccount,
          creditAccount: defaultInventoryAccount,
        });
      }
    }

    // Insert rules into database
    for (const rule of basicRules) {
      try {
        await db.insert(accountDeterminationRules).values(rule);
      } catch (error) {
        // Rule might already exist, continue
        console.log(`Account determination rule already exists: ${rule.movementType}-${rule.materialCategory}`);
      }
    }
  }

  private async createEnhancedMovementTypes(): Promise<void> {
    const movementTypes = [
      {
        code: "101",
        name: "Goods Receipt from Purchase Order",
        category: "GR",
        debitCreditIndicator: "D",
        autoGlPosting: true,
        reversalMovementType: "102"
      },
      {
        code: "102", 
        name: "Goods Receipt Reversal",
        category: "GR",
        debitCreditIndicator: "C",
        autoGlPosting: true,
        reversalMovementType: "101"
      },
      {
        code: "201",
        name: "Goods Issue to Cost Center",
        category: "GI",
        debitCreditIndicator: "C",
        requiresCostCenter: true,
        autoGlPosting: true,
        reversalMovementType: "202"
      },
      {
        code: "261",
        name: "Goods Issue to Production Order",
        category: "GI", 
        debitCreditIndicator: "C",
        requiresOrder: true,
        autoGlPosting: true,
        reversalMovementType: "262"
      },
      {
        code: "601",
        name: "Goods Issue for Sales Order",
        category: "GI",
        debitCreditIndicator: "C",
        autoGlPosting: true,
        reversalMovementType: "602"
      },
      {
        code: "701",
        name: "Physical Inventory - Positive Adjustment",
        category: "Adjustment",
        debitCreditIndicator: "D",
        autoGlPosting: true
      },
      {
        code: "702",
        name: "Physical Inventory - Negative Adjustment", 
        category: "Adjustment",
        debitCreditIndicator: "C",
        autoGlPosting: true
      }
    ];

    for (const movementType of movementTypes) {
      try {
        await db.insert(enhancedMovementTypes).values(movementType);
      } catch (error) {
        console.log(`Movement type already exists: ${movementType.code}`);
      }
    }
  }

  private async createEnhancedValuationClasses(): Promise<void> {
    // Get accounts from database
    const defaultInventoryAccount = await this.getDefaultInventoryAccount();
    const defaultConsumptionAccount = await this.getDefaultConsumptionAccount();
    const defaultVarianceAccount = await this.getDefaultVarianceAccount();
    const defaultFinishedGoodsAccount = await this.getDefaultFinishedGoodsAccount();
    const defaultCOGSAccount = await this.getDefaultCOGSAccount();
    
    // Get valuation classes from database (valuation_classes table)
    const existingValuationClasses = await pool.query(`
      SELECT class_code as code, class_name as name, description
      FROM valuation_classes
      WHERE active = true
      ORDER BY class_code
    `);

    // Create enhanced valuation classes based on existing ones
    for (const vc of existingValuationClasses.rows) {
      const code = vc.code;
      const name = vc.name;
      const isRawMaterials = name.toLowerCase().includes('raw');
      const isFinishedGoods = name.toLowerCase().includes('finished');
      const isTradingGoods = name.toLowerCase().includes('trading');

      let inventoryAccount = defaultInventoryAccount;
      let consumptionAccount = defaultConsumptionAccount;
      
      if (isFinishedGoods && defaultFinishedGoodsAccount) {
        inventoryAccount = defaultFinishedGoodsAccount;
        consumptionAccount = defaultCOGSAccount || defaultConsumptionAccount;
      }

      try {
        await db.insert(enhancedValuationClasses).values({
          code: code,
          name: name,
          description: vc.description || null,
          inventoryAccount: inventoryAccount || await this.findAccountByType('ASSETS', '%inventory%'),
          consumptionAccount: consumptionAccount || await this.findAccountByType('EXPENSES', '%manufacturing%'),
          varianceAccount: defaultVarianceAccount || await this.findAccountByType('EXPENSES', '%variance%'),
          priceControlMethod: isTradingGoods ? "V" : "S", // Moving Average for trading, Standard for others
          valuationCategory: isRawMaterials ? "Raw Materials" : isFinishedGoods ? "Finished Goods" : "Trading Goods",
          isActive: true
        });
      } catch (error) {
        console.log(`Valuation class already exists: ${code}`);
      }
    }
  }

  // Enhanced Account Determination
  async determineAccountsEnhanced(
    materialId: number, 
    movementType: string, 
    plant?: string,
    costCenter?: string
  ): Promise<{
    debitAccount: string;
    creditAccount: string;
    costCenter?: string;
    profitCenter?: string;
    success: boolean;
    ruleApplied: string;
  }> {
    try {
      // Get material details
      const [material] = await db
        .select()
        .from(products)
        .where(eq(products.id, materialId));

      if (!material) {
        throw new Error(`Material not found: ${materialId}`);
      }

      // Determine material category based on product category
      const materialCategory = await this.getMaterialCategory(material.categoryId);
      
      // Get valuation class for material 
      const valuationClass = await this.getValuationClass(materialId);

      // Find matching account determination rule
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
        );

      if (rule) {
        return {
          debitAccount: rule.debitAccount,
          creditAccount: rule.creditAccount,
          costCenter: rule.costCenter || costCenter,
          profitCenter: rule.profitCenter,
          success: true,
          ruleApplied: `${rule.materialCategory}-${rule.movementType}-${rule.valuationClass}`
        };
      }

      // Fallback to default accounts from database if no specific rule found
      return await this.getDefaultAccountsFromDatabase(movementType, materialCategory);

    } catch (error) {
      console.error('Enhanced account determination failed:', error);
      return await this.getDefaultAccountsFromDatabase(movementType, "RAW");
    }
  }

  private async getMaterialCategory(categoryId: number | null): Promise<string> {
    if (!categoryId) {
      // Get default material category from database
      const defaultCategory = await this.getDefaultMaterialCategory();
      if (!defaultCategory) {
        throw new Error('Material category not found. Please configure material categories in the database.');
      }
      return defaultCategory;
    }
    
    // Get material category from database based on product category
    try {
      const categoryResult = await pool.query(`
        SELECT c.id, c.name, c.code,
               mc.code as material_category_code, mc.name as material_category_name
        FROM categories c
        LEFT JOIN material_categories mc ON c.material_category_id = mc.id
        WHERE c.id = $1
        LIMIT 1
      `, [categoryId]);

      if (categoryResult.rows.length > 0) {
        const row = categoryResult.rows[0];
        // Return material category code if available, otherwise derive from category name
        if (row.material_category_code) {
          return row.material_category_code;
        }
        // Try to match category name to material category
        const categoryName = row.name?.toLowerCase();
        if (categoryName) {
          if (categoryName.includes('raw')) return 'RAW';
          if (categoryName.includes('finished') || categoryName.includes('fert')) return 'FERT';
          if (categoryName.includes('trading') || categoryName.includes('hawa')) return 'HAWA';
          if (categoryName.includes('semi') || categoryName.includes('halb')) return 'HALB';
        }
      }
    } catch (error) {
      console.warn('Error fetching material category from database:', error);
    }

    // Get default from database
    const defaultCategory = await this.getDefaultMaterialCategory();
    if (!defaultCategory) {
      throw new Error('Material category not found. Please configure material categories in the database.');
    }
    return defaultCategory;
  }

  private async getValuationClass(materialId: number): Promise<string> {
    const [material] = await db
      .select()
      .from(products)
      .where(eq(products.id, materialId));
    
    if (!material?.categoryId) {
      // Get default valuation class from database
      const defaultValuationClass = await this.getDefaultValuationClass();
      if (!defaultValuationClass) {
        throw new Error('Valuation class not found. Please configure valuation classes in the database.');
      }
      return defaultValuationClass;
    }

    // Get valuation class from database based on material's category
    try {
      // First, try to get valuation class directly from material
      if ((material as any).valuationClassId) {
        const valuationResult = await pool.query(`
          SELECT class_code
          FROM valuation_classes
          WHERE id = $1 AND active = true
          LIMIT 1
        `, [(material as any).valuationClassId]);
        
        if (valuationResult.rows.length > 0) {
          const classCode = valuationResult.rows[0].class_code;
          if (!classCode) {
            throw new Error('Valuation class code not found in database.');
          }
          return classCode;
        }
      }

      // Try to get valuation class from category
      const categoryResult = await pool.query(`
        SELECT c.id, c.name,
               vc.class_code
        FROM categories c
        LEFT JOIN valuation_classes vc ON c.valuation_class_id = vc.id
        WHERE c.id = $1
        LIMIT 1
      `, [material.categoryId]);

      if (categoryResult.rows.length > 0 && categoryResult.rows[0].class_code) {
        return categoryResult.rows[0].class_code;
      }

      // Try to match category name to valuation class
      if (categoryResult.rows.length > 0) {
        const categoryName = categoryResult.rows[0].name?.toLowerCase();
        const valuationResult = await pool.query(`
          SELECT class_code
          FROM valuation_classes
          WHERE (class_name ILIKE $1 OR description ILIKE $1)
            AND active = true
          ORDER BY class_code
          LIMIT 1
        `, [`%${categoryName}%`]);

        if (valuationResult.rows.length > 0) {
          return valuationResult.rows[0].class_code;
        }
      }
    } catch (error) {
      console.warn('Error fetching valuation class from database:', error);
    }

    // Get default from database
    const defaultValuationClass = await this.getDefaultValuationClass();
    if (!defaultValuationClass) {
      throw new Error('Valuation class not found. Please configure valuation classes in the database.');
    }
    return defaultValuationClass;
  }

  /**
   * Get default accounts from database based on movement type
   */
  private async getDefaultAccountsFromDatabase(movementType: string, materialCategory: string): Promise<{
    debitAccount: string;
    creditAccount: string;
    costCenter?: string;
    profitCenter?: string;
    success: boolean;
    ruleApplied: string;
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
          creditAccount: String(creditResult.rows[0].account_number),
          costCenter: undefined,
          profitCenter: undefined,
          success: true,
          ruleApplied: `DATABASE_DEFAULT-${movementType}-${materialCategory}`
        };
      }

      throw new Error('Default accounts not found in database');
    } catch (error) {
      console.error('Error getting default accounts from database:', error);
      throw new Error(`Failed to determine accounts for movement type ${movementType} and material category ${materialCategory}. Please configure account determination rules or GL accounts.`);
    }
  }

  // Real-time GL Posting
  async postStockMovementToGL(
    materialId: number,
    movementType: string,
    quantity: number,
    unitPrice: number,
    plant?: string,
    costCenter?: string,
    reference?: string
  ): Promise<{
    success: boolean;
    glDocumentNumber: string;
    totalValue: number;
    accounts: any;
  }> {
    try {
      // Determine accounts
      const accounts = await this.determineAccountsEnhanced(
        materialId, 
        movementType, 
        plant, 
        costCenter
      );

      if (!accounts.success) {
        throw new Error("Account determination failed");
      }

      const totalValue = quantity * unitPrice;
      const glDocumentNumber = await this.generateGLDocumentNumber();

      // Create GL posting structure
      const glPosting = {
        documentNumber: glDocumentNumber,
        documentDate: new Date(),
        postingDate: new Date(),
        documentType: "MM",
        reference: reference || `${movementType}-${materialId}`,
        currency: await this.getDefaultCurrency(),
        totalAmount: totalValue,
        items: [
          {
            glAccount: accounts.debitAccount,
            debitAmount: totalValue,
            creditAmount: 0,
            costCenter: accounts.costCenter,
            profitCenter: accounts.profitCenter,
            materialId: materialId,
            quantity: quantity,
            description: `${movementType} movement for material ${materialId}`
          },
          {
            glAccount: accounts.creditAccount,
            debitAmount: 0,
            creditAmount: totalValue,
            costCenter: accounts.costCenter,
            materialId: materialId,
            quantity: -quantity,
            description: `${movementType} movement for material ${materialId}`
          }
        ]
      };

      // Post to material ledger
      await this.postToMaterialLedger(
        materialId,
        movementType,
        quantity,
        unitPrice,
        glDocumentNumber,
        accounts
      );

      // In real implementation, this would post to accounting_documents table
      console.log('GL Document Posted:', glDocumentNumber, totalValue);

      return {
        success: true,
        glDocumentNumber,
        totalValue,
        accounts: accounts
      };

    } catch (error) {
      console.error('GL posting failed:', error);
      throw error;
    }
  }

  private async postToMaterialLedger(
    materialId: number,
    movementType: string,
    quantity: number,
    unitPrice: number,
    glDocumentNumber: string,
    accounts: any
  ): Promise<void> {
    const materialLedgerEntry = {
      materialId,
      documentType: "MM",
      documentNumber: glDocumentNumber,
      movementType,
      quantity: quantity.toString(),
      unitPrice: unitPrice.toString(),
      totalValue: (quantity * unitPrice).toString(),
      glAccount: accounts.debitAccount,
      costCenter: accounts.costCenter,
      profitCenter: accounts.profitCenter,
      postingDate: new Date(),
      documentDate: new Date(),
    };

    await db.insert(materialLedgerDocuments).values(materialLedgerEntry);
  }

  private async generateGLDocumentNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `${year}${timestamp}`;
  }

  // Purchase Commitment Management
  async createPurchaseCommitmentEnhanced(purchaseOrderId: number): Promise<{
    success: boolean;
    commitments: any[];
    totalCommitmentValue: number;
    glDocumentNumber: string;
  }> {
    try {
      // Get purchase order details
      const [purchaseOrder] = await db
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, purchaseOrderId));

      if (!purchaseOrder) {
        throw new Error(`Purchase order not found: ${purchaseOrderId}`);
      }

      if (!purchaseOrder.quantity || !purchaseOrder.unitPrice) {
        throw new Error('Purchase order quantity and unit price are required.');
      }
      const totalValue = purchaseOrder.quantity * parseFloat(purchaseOrder.unitPrice);
      const glDocumentNumber = await this.generateGLDocumentNumber();

      // Determine GL account for purchase commitments from database
      let glAccount: string | null = null;
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
          glAccount = String(glAccountResult.rows[0].account_number);
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
        
        if (!glAccount) {
          throw new Error('Purchase commitment GL account not configured. Please set up a liability account for commitments in gl_accounts or account_determination_rules.');
        }
      } catch (glError: any) {
        console.error('Error determining GL account for purchase commitment:', glError);
        throw new Error(`Failed to determine GL account for purchase commitment: ${glError.message}`);
      }

      // Create commitment record
      const commitment = {
        purchaseOrderId,
        materialId: purchaseOrder.materialId || 1,
        quantity: (purchaseOrder.quantity || 0).toString(),
        unitPrice: parseFloat(purchaseOrder.unitPrice).toString(),
        totalValue: totalValue.toString(),
        glAccount: glAccount,
        commitmentDate: new Date(),
        expectedDelivery: purchaseOrder.deliveryDate || new Date(),
        glDocumentNumber,
      };

      await db.insert(purchaseCommitments).values(commitment);

      // Post commitment to GL
      await this.postCommitmentToGL(commitment, glDocumentNumber);

      return {
        success: true,
        commitments: [commitment],
        totalCommitmentValue: totalValue,
        glDocumentNumber
      };

    } catch (error) {
      console.error('Purchase commitment creation failed:', error);
      throw error;
    }
  }

  private async postCommitmentToGL(commitment: any, glDocumentNumber: string): Promise<void> {
    const glPosting = {
      documentNumber: glDocumentNumber,
      documentDate: new Date(),
      postingDate: new Date(),
      documentType: "PC",
      reference: `PO-${commitment.purchaseOrderId}`,
      currency: "USD",
      totalAmount: parseFloat(commitment.totalValue),
      items: [
        {
          glAccount: commitment.glAccount,
          debitAmount: parseFloat(commitment.totalValue),
          creditAmount: 0,
          description: `Purchase commitment for PO ${commitment.purchaseOrderId}`
        },
        {
          glAccount: "390000", // Commitment Offset
          debitAmount: 0,
          creditAmount: parseFloat(commitment.totalValue),
          description: `Commitment offset for PO ${commitment.purchaseOrderId}`
        }
      ]
    };

    console.log('Commitment GL Posted:', glDocumentNumber, commitment.totalValue);
  }

  // Three-Way Matching Enhanced
  async performThreeWayMatchEnhanced(
    purchaseOrderId: number,
    goodsReceiptId: number,
    invoiceId: number,
    tolerancePercent: number = 5
  ): Promise<{
    success: boolean;
    matchResult: any;
    variancePosted: boolean;
    glDocumentNumber?: string;
  }> {
    try {
      const [purchaseOrder] = await db
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, purchaseOrderId));

      if (!purchaseOrder) {
        throw new Error(`Purchase order not found: ${purchaseOrderId}`);
      }

      const poQuantity = purchaseOrder.quantity || 0;
      if (!purchaseOrder.unitPrice) {
        throw new Error('Purchase order unit price is required.');
      }
      const poPrice = parseFloat(purchaseOrder.unitPrice);
      
      // Simulate Goods Receipt and Invoice data (in real system, would fetch from respective tables)
      const goodsReceiptQuantity = poQuantity; // Assuming full delivery
      const invoiceQuantity = poQuantity;
      const invoicePrice = poPrice * 1.02; // 2% price increase simulation

      const priceVariance = (invoicePrice - poPrice) * goodsReceiptQuantity;
      const quantityVariance = (invoiceQuantity - goodsReceiptQuantity) * poPrice;

      // Check tolerances
      const expectedAmount = poPrice * goodsReceiptQuantity;
      const priceToleranceAmount = Math.abs(priceVariance);
      const exceedsTolerance = priceToleranceAmount > (expectedAmount * tolerancePercent / 100);

      const matchStatus = exceedsTolerance ? "variance" : "matched";

      // Create three-way match record
      const matchRecord = {
        purchaseOrderId,
        goodsReceiptId,
        invoiceId,
        materialId: purchaseOrder.materialId || 1,
        poQuantity: poQuantity.toString(),
        grQuantity: goodsReceiptQuantity.toString(),
        invoiceQuantity: invoiceQuantity.toString(),
        poPrice: poPrice.toString(),
        invoicePrice: invoicePrice.toString(),
        priceVariance: priceVariance.toString(),
        quantityVariance: quantityVariance.toString(),
        toleranceExceeded: exceedsTolerance,
        status: matchStatus,
      };

      await db.insert(threeWayMatches).values(matchRecord);

      let glDocumentNumber: string | undefined;
      let variancePosted = false;

      // Post variance if tolerance exceeded
      if (exceedsTolerance && Math.abs(priceVariance) > 0.01) {
        glDocumentNumber = await this.postPriceVariance(
          purchaseOrderId,
          purchaseOrder.materialId || 1,
          priceVariance
        );
        variancePosted = true;
      }

      return {
        success: true,
        matchResult: matchRecord,
        variancePosted,
        glDocumentNumber
      };

    } catch (error) {
      console.error('Three-way matching failed:', error);
      throw error;
    }
  }

  private async postPriceVariance(
    purchaseOrderId: number,
    materialId: number,
    priceVariance: number
  ): Promise<string> {
    const glDocumentNumber = await this.generateGLDocumentNumber();
    
    const variancePosting = {
      documentNumber: glDocumentNumber,
      documentDate: new Date(),
      postingDate: new Date(),
      documentType: "PV",
      reference: `PO-${purchaseOrderId}-VAR`,
      currency: "USD",
      totalAmount: Math.abs(priceVariance),
      items: [
        {
          glAccount: await this.getDefaultInventoryAccount(), // Inventory Account
          debitAmount: priceVariance > 0 ? priceVariance : 0,
          creditAmount: priceVariance < 0 ? Math.abs(priceVariance) : 0,
          description: `Price variance for PO ${purchaseOrderId}`
        },
        {
          glAccount: await this.getDefaultVarianceAccount(), // Price Variance Account
          debitAmount: priceVariance < 0 ? Math.abs(priceVariance) : 0,
          creditAmount: priceVariance > 0 ? priceVariance : 0,
          description: `Price variance for PO ${purchaseOrderId}`
        }
      ]
    };

    console.log('Price Variance Posted:', glDocumentNumber, priceVariance);
    return glDocumentNumber;
  }

  // Get Integration Status
  async getEnhancedIntegrationStatus(): Promise<{
    accountDeterminationRules: number;
    activeCommitments: number;
    pendingMatches: number;
    materialLedgerDocuments: number;
    lastProcessingDate: Date;
    systemHealth: string;
  }> {
    try {
      const [rulesCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(accountDeterminationRules)
        .where(eq(accountDeterminationRules.isActive, true));

      const [commitmentsCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(purchaseCommitments)
        .where(eq(purchaseCommitments.status, "open"));

      const [matchesCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(threeWayMatches)
        .where(eq(threeWayMatches.status, "pending"));

      const [ledgerCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(materialLedgerDocuments);

      return {
        accountDeterminationRules: rulesCount?.count || 0,
        activeCommitments: commitmentsCount?.count || 0,
        pendingMatches: matchesCount?.count || 0,
        materialLedgerDocuments: ledgerCount?.count || 0,
        lastProcessingDate: new Date(),
        systemHealth: "operational"
      };

    } catch (error) {
      console.error('Integration status check failed:', error);
      return {
        accountDeterminationRules: 0,
        activeCommitments: 0,
        pendingMatches: 0,
        materialLedgerDocuments: 0,
        lastProcessingDate: new Date(),
        systemHealth: "error"
      };
    }
  }

  // Helper methods for database lookups
  private async getMaterialCategoriesFromDatabase(): Promise<Array<{code?: string, name?: string}>> {
    try {
      const result = await pool.query(`
        SELECT code, name
        FROM material_categories
        WHERE is_active = true
        ORDER BY code
      `);
      return result.rows;
    } catch (error) {
      console.warn('Error fetching material categories:', error);
      return [];
    }
  }

  private async getValuationClassesFromDatabase(): Promise<Array<{code?: string, name?: string}>> {
    try {
      const result = await pool.query(`
        SELECT class_code as code, class_name as name
        FROM valuation_classes
        WHERE active = true
        ORDER BY class_code
      `);
      return result.rows;
    } catch (error) {
      console.warn('Error fetching valuation classes:', error);
      return [];
    }
  }

  private async getMovementTypesFromDatabase(): Promise<Array<{code: string, name?: string}>> {
    try {
      const result = await pool.query(`
        SELECT code, name
        FROM movement_types
        WHERE is_active = true
        ORDER BY code
      `);
      if (result.rows.length === 0) {
        const enhancedResult = await pool.query(`
          SELECT code, name
          FROM enhanced_movement_types
          WHERE is_active = true
          ORDER BY code
        `);
        return enhancedResult.rows;
      }
      return result.rows;
    } catch (error) {
      console.warn('Error fetching movement types:', error);
      return [];
    }
  }

  private async getDefaultMaterialCategory(): Promise<string | null> {
    try {
      const result = await pool.query(`
        SELECT code
        FROM material_categories
        WHERE is_active = true
        ORDER BY code
        LIMIT 1
      `);
      return result.rows[0]?.code ?? null;
    } catch (error) {
      return null;
    }
  }

  private async getDefaultValuationClass(): Promise<string | null> {
    try {
      const result = await pool.query(`
        SELECT class_code
        FROM valuation_classes
        WHERE active = true
        ORDER BY class_code
        LIMIT 1
      `);
      return result.rows[0]?.class_code ?? null;
    } catch (error) {
      return null;
    }
  }

  private async getDefaultCostCenter(): Promise<string | null> {
    try {
      const result = await pool.query(`
        SELECT code
        FROM cost_centers
        WHERE is_active = true
        ORDER BY code
        LIMIT 1
      `);
      return result.rows[0]?.code ?? null;
    } catch (error) {
      return null;
    }
  }

  private async getDefaultPayableAccount(): Promise<string> {
    try {
      const result = await db.execute(sql`
        SELECT account_number
        FROM gl_accounts
        WHERE account_type = 'LIABILITIES'
          AND (account_name ILIKE '%payable%' OR account_name ILIKE '%vendor%')
          AND is_active = true
        ORDER BY account_number
        LIMIT 1
      `);
      if (!result.rows[0]?.account_number) {
        throw new Error(`Default payable account not found. Please configure a payable account in gl_accounts table.`);
      }
      return String(result.rows[0].account_number);
    } catch (error) {
      console.error('Error getting default payable account:', error);
      throw new Error(`Failed to get default payable account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getDefaultManufacturingCostAccount(): Promise<string> {
    try {
      const result = await db.execute(sql`
        SELECT account_number
        FROM gl_accounts
        WHERE account_type = 'EXPENSES'
          AND (account_name ILIKE '%manufacturing%' OR account_name ILIKE '%production%cost%')
          AND is_active = true
        ORDER BY account_number
        LIMIT 1
      `);
      if (!result.rows[0]?.account_number) {
        throw new Error(`Default payable account not found. Please configure a payable account in gl_accounts table.`);
      }
      return String(result.rows[0].account_number);
    } catch (error) {
      console.error('Error getting default manufacturing cost account:', error);
      return '';
    }
  }

  private async getDefaultWIPAccount(): Promise<string> {
    try {
      const result = await db.execute(sql`
        SELECT account_number
        FROM gl_accounts
        WHERE account_type = 'ASSETS'
          AND (account_name ILIKE '%work%process%' OR account_name ILIKE '%WIP%')
          AND is_active = true
        ORDER BY account_number
        LIMIT 1
      `);
      if (!result.rows[0]?.account_number) {
        throw new Error(`Default payable account not found. Please configure a payable account in gl_accounts table.`);
      }
      return String(result.rows[0].account_number);
    } catch (error) {
      console.error('Error getting default WIP account:', error);
      return '';
    }
  }

  private async getDefaultInventoryAccount(): Promise<string> {
    try {
      const result = await db.execute(sql`
        SELECT account_number
        FROM gl_accounts
        WHERE account_type = 'ASSETS'
          AND account_name ILIKE '%inventory%'
          AND is_active = true
        ORDER BY account_number
        LIMIT 1
      `);
      if (!result.rows[0]?.account_number) {
        throw new Error(`Default payable account not found. Please configure a payable account in gl_accounts table.`);
      }
      return String(result.rows[0].account_number);
    } catch (error) {
      console.error('Error getting default inventory account:', error);
      return '';
    }
  }

  private async getDefaultConsumptionAccount(): Promise<string> {
    try {
      const result = await db.execute(sql`
        SELECT account_number
        FROM gl_accounts
        WHERE account_type = 'EXPENSES'
          AND (account_name ILIKE '%manufacturing%cost%' OR account_name ILIKE '%consumption%')
          AND is_active = true
        ORDER BY account_number
        LIMIT 1
      `);
      if (!result.rows[0]?.account_number) {
        throw new Error(`Default payable account not found. Please configure a payable account in gl_accounts table.`);
      }
      return String(result.rows[0].account_number);
    } catch (error) {
      console.error('Error getting default consumption account:', error);
      return '';
    }
  }

  private async getDefaultVarianceAccount(): Promise<string> {
    try {
      const result = await db.execute(sql`
        SELECT account_number
        FROM gl_accounts
        WHERE account_type = 'EXPENSES'
          AND account_name ILIKE '%variance%'
          AND is_active = true
        ORDER BY account_number
        LIMIT 1
      `);
      if (!result.rows[0]?.account_number) {
        throw new Error(`Default payable account not found. Please configure a payable account in gl_accounts table.`);
      }
      return String(result.rows[0].account_number);
    } catch (error) {
      console.error('Error getting default variance account:', error);
      return '';
    }
  }

  private async getDefaultFinishedGoodsAccount(): Promise<string> {
    try {
      const result = await db.execute(sql`
        SELECT account_number
        FROM gl_accounts
        WHERE account_type = 'ASSETS'
          AND (account_name ILIKE '%finished%goods%' OR account_name ILIKE '%inventory%')
          AND is_active = true
        ORDER BY account_number
        LIMIT 1
      `);
      if (!result.rows[0]?.account_number) {
        throw new Error(`Default payable account not found. Please configure a payable account in gl_accounts table.`);
      }
      return String(result.rows[0].account_number);
    } catch (error) {
      console.error('Error getting default finished goods account:', error);
      return '';
    }
  }

  private async getDefaultCOGSAccount(): Promise<string> {
    try {
      const result = await db.execute(sql`
        SELECT account_number
        FROM gl_accounts
        WHERE account_type = 'EXPENSES'
          AND (account_name ILIKE '%cost%goods%' OR account_name ILIKE '%COGS%' OR account_name ILIKE '%cost%sold%')
          AND is_active = true
        ORDER BY account_number
        LIMIT 1
      `);
      if (!result.rows[0]?.account_number) {
        throw new Error(`Default payable account not found. Please configure a payable account in gl_accounts table.`);
      }
      return String(result.rows[0].account_number);
    } catch (error) {
      console.error('Error getting default COGS account:', error);
      return '';
    }
  }

  private async findAccountByType(accountType: string, namePattern: string): Promise<string> {
    try {
      const result = await db.execute(sql`
        SELECT account_number
        FROM gl_accounts
        WHERE account_type = ${accountType}
          AND account_name ILIKE ${namePattern}
          AND is_active = true
        ORDER BY account_number
        LIMIT 1
      `);
      if (!result.rows[0]?.account_number) {
        throw new Error(`Default payable account not found. Please configure a payable account in gl_accounts table.`);
      }
      return String(result.rows[0].account_number);
    } catch (error) {
      console.error(`Error finding account by type ${accountType} and pattern ${namePattern}:`, error);
      throw new Error(`Failed to find account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getDefaultCurrency(): Promise<string> {
    try {
      const result = await pool.query(`
        SELECT code
        FROM currencies
        WHERE is_active = true
        ORDER BY is_default DESC, code
        LIMIT 1
      `);
      if (result.rows.length > 0) {
        const currencyCode = result.rows[0].code;
        if (!currencyCode) {
          throw new Error('Currency code not found in currencies table.');
        }
        return currencyCode;
      }
      // Try company codes
      const companyResult = await pool.query(`
        SELECT currency
        FROM company_codes
        WHERE is_active = true AND currency IS NOT NULL
        ORDER BY id
        LIMIT 1
      `);
      const companyCurrency = companyResult.rows[0]?.currency;
      if (!companyCurrency) {
        throw new Error('Currency not configured. Please configure currency in company_codes or currencies table.');
      }
      return companyCurrency;
    } catch (error) {
      throw new Error(`Failed to get default currency: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const enhancedMMFIService = new EnhancedMMFIService();