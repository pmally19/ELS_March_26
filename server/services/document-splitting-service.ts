import { db } from "../db";
import { pool } from "../db";
import { sql } from "drizzle-orm";
import { glAccounts } from "@shared/schema";
import { accountingDocuments, accountingDocumentItems } from "@shared/sales-finance-integration-schema";
import {
  documentSplittingItemCategories,
  documentSplittingGlAccountCategories,
  documentSplittingBusinessTransactions,
  documentSplittingDocumentTypeMapping,
  documentSplittingMethods,
  documentSplittingRules,
  documentSplittingZeroBalanceAccounts,
  documentSplittingCharacteristics,
  documentSplittingConstants,
  documentSplittingActivation,
  documentSplittingSplitDocuments,
} from "@shared/document-splitting-schema";
import { eq, and, or, isNull, isNotNull } from "drizzle-orm";

interface DocumentItem {
  glAccount: string;
  debitAmount: number;
  creditAmount: number;
  costCenter?: string;
  profitCenter?: string;
  businessArea?: string;
  segment?: string;
  description?: string;
  accountType?: string;
  partnerId?: number;
  taxCode?: string;
  materialId?: number;
}

interface SplitItem extends DocumentItem {
  splitCharacteristicValue?: string;
  splitRatio?: number;
}

interface SplitResult {
  success: boolean;
  splitItems: SplitItem[];
  zeroBalanceItems?: SplitItem[];
  splitDocuments?: Array<{
    documentId: number;
    characteristicValue: string;
    ratio: number;
  }>;
  message?: string;
}

export class DocumentSplittingService {

  /**
   * Check if document splitting is active for a given company code and ledger
   */
  async isDocumentSplittingActive(
    companyCode: string,
    ledgerId?: number
  ): Promise<{
    isActive: boolean;
    activation?: any;
    ledgerId?: number;
  }> {
    try {
      console.log(`🔍 isDocumentSplittingActive: companyCode=${companyCode}, ledgerId=${ledgerId || 'undefined'}`);

      // First, get company code ID
      // Note: company_codes table uses 'active' column, not 'is_active'
      const companyCodeResult = await db.execute(sql`
        SELECT id FROM company_codes WHERE code = ${companyCode} AND active = true LIMIT 1
      `);

      console.log(`   Company code query result: ${companyCodeResult.rows.length} rows`);

      if (companyCodeResult.rows.length === 0) {
        console.log(`   ⚠️  Company code not found or not active`);
        return { isActive: false };
      }

      const companyCodeId = companyCodeResult.rows[0].id;
      console.log(`   Company Code ID: ${companyCodeId}`);

      // If ledgerId is provided, check that specific ledger
      if (ledgerId) {
        const activationResult = await db.execute(sql`
          SELECT dsa.*, l.document_splitting_active as ledger_flag
          FROM document_splitting_activation dsa
          JOIN ledgers l ON dsa.ledger_id = l.id
          WHERE dsa.ledger_id = ${ledgerId}
            AND (dsa.company_code_id = ${companyCodeId} OR dsa.company_code_id IS NULL)
            AND dsa.is_active = true
            AND l.document_splitting_active = true
            AND l.is_active = true
          LIMIT 1
        `);

        if (activationResult.rows.length > 0) {
          return {
            isActive: true,
            activation: activationResult.rows[0],
            ledgerId: ledgerId
          };
        }
      }

      // Otherwise, find any active ledger for this company code with splitting enabled
      // First try to find activation with specific company_code_id
      console.log(`   Searching for activation with company_code_id = ${companyCodeId}`);
      let ledgerResult = await db.execute(sql`
        SELECT l.id, l.document_splitting_active, dsa.*
        FROM document_splitting_activation dsa
        JOIN ledgers l ON dsa.ledger_id = l.id
        WHERE dsa.company_code_id = ${companyCodeId}
          AND dsa.is_active = true
          AND l.document_splitting_active = true
          AND l.is_active = true
        ORDER BY l.is_default DESC, l.id ASC
        LIMIT 1
      `);

      console.log(`   Query 1 (specific company_code_id): ${ledgerResult.rows.length} results`);

      // If no specific activation found, try to find activation with NULL company_code_id (applies to all)
      if (ledgerResult.rows.length === 0) {
        console.log(`   Searching for activation with company_code_id IS NULL`);
        ledgerResult = await db.execute(sql`
          SELECT l.id, l.document_splitting_active, dsa.*
          FROM document_splitting_activation dsa
          JOIN ledgers l ON dsa.ledger_id = l.id
          WHERE dsa.company_code_id IS NULL
            AND dsa.is_active = true
            AND l.document_splitting_active = true
            AND l.is_active = true
          ORDER BY l.is_default DESC, l.id ASC
          LIMIT 1
        `);
        console.log(`   Query 2 (NULL company_code_id): ${ledgerResult.rows.length} results`);
      }

      // Also check if ledger is linked through company_code_ledger_assignments
      if (ledgerResult.rows.length === 0) {
        console.log(`   Searching through company_code_ledger_assignments`);
        ledgerResult = await db.execute(sql`
          SELECT DISTINCT l.id, l.document_splitting_active, dsa.*
          FROM ledgers l
          JOIN company_code_ledger_assignments ccla ON l.id = ccla.ledger_id
          LEFT JOIN document_splitting_activation dsa ON dsa.ledger_id = l.id 
            AND (dsa.company_code_id = ${companyCodeId} OR dsa.company_code_id IS NULL)
          WHERE ccla.company_code_id = ${companyCodeId}
            AND l.document_splitting_active = true
            AND l.is_active = true
            AND (dsa.is_active = true OR dsa.id IS NULL)
          ORDER BY l.is_default DESC, l.id ASC
          LIMIT 1
        `);
        console.log(`   Query 3 (through assignments): ${ledgerResult.rows.length} results`);
      }

      if (ledgerResult.rows.length > 0 && ledgerResult.rows[0].document_splitting_active) {
        console.log(`   ✅ Found active ledger: ${ledgerResult.rows[0].id}`);
        return {
          isActive: true,
          activation: ledgerResult.rows[0],
          ledgerId: ledgerResult.rows[0].id
        };
      }

      console.log(`   ⚠️  No active ledger found`);
      return { isActive: false };
    } catch (error) {
      console.error('Error checking document splitting activation:', error);
      return { isActive: false };
    }
  }

  /**
   * Get item category for a GL account
   */
  async getItemCategory(glAccount: string, chartOfAccountsId?: number): Promise<string | null> {
    try {
      // First try to get by gl_account_id
      let query = sql`
        SELECT dsic.code, dsic.category_type
        FROM document_splitting_gl_account_categories dsgac
        JOIN document_splitting_item_categories dsic ON dsgac.item_category_id = dsic.id
        JOIN gl_accounts ga ON dsgac.gl_account_id = ga.id
        WHERE ga.account_number = ${glAccount}
          AND dsgac.is_active = true
          AND dsic.is_active = true
          AND (dsgac.valid_to IS NULL OR dsgac.valid_to >= CURRENT_DATE)
      `;

      if (chartOfAccountsId) {
        query = sql`
          SELECT dsic.code, dsic.category_type
          FROM document_splitting_gl_account_categories dsgac
          JOIN document_splitting_item_categories dsic ON dsgac.item_category_id = dsic.id
          JOIN gl_accounts ga ON dsgac.gl_account_id = ga.id
          WHERE ga.account_number = ${glAccount}
            AND (dsgac.chart_of_accounts_id = ${chartOfAccountsId} OR dsgac.chart_of_accounts_id IS NULL)
            AND dsgac.is_active = true
            AND dsic.is_active = true
            AND (dsgac.valid_to IS NULL OR dsgac.valid_to >= CURRENT_DATE)
          ORDER BY dsgac.chart_of_accounts_id DESC NULLS LAST
          LIMIT 1
        `;
      }

      const result = await db.execute(query);

      if (result.rows.length > 0) {
        return result.rows[0].code;
      }

      return null;
    } catch (error) {
      console.error('Error getting item category:', error);
      return null;
    }
  }

  /**
   * Get business transaction for a document type
   * Dynamically finds matching business transactions without requiring pre-configured mappings
   */
  async getBusinessTransaction(
    documentType: string,
    companyCodeId?: number
  ): Promise<{
    businessTransactionId: number;
    businessTransactionVariantId?: number;
  } | null> {
    try {
      // First, try to find an existing mapping
      let query = sql`
        SELECT 
          dtm.business_transaction_id,
          dtm.business_transaction_variant_id
        FROM document_splitting_document_type_mapping dtm
        WHERE dtm.document_type = ${documentType}
          AND dtm.is_active = true
      `;

      if (companyCodeId) {
        query = sql`
          SELECT 
            dtm.business_transaction_id,
            dtm.business_transaction_variant_id
          FROM document_splitting_document_type_mapping dtm
          WHERE dtm.document_type = ${documentType}
            AND (dtm.company_code_id = ${companyCodeId} OR dtm.company_code_id IS NULL)
            AND dtm.is_active = true
          ORDER BY dtm.company_code_id DESC NULLS LAST
          LIMIT 1
        `;
      }

      const result = await db.execute(query);

      if (result.rows.length > 0) {
        return {
          businessTransactionId: result.rows[0].business_transaction_id,
          businessTransactionVariantId: result.rows[0].business_transaction_variant_id || undefined
        };
      }

      // If no mapping exists, try to find a matching business transaction by type pattern
      // Map document type codes to transaction types dynamically
      const docTypeUpper = documentType.toUpperCase();
      let transactionType: string | null = null;

      // Determine transaction type based on document type pattern
      if (docTypeUpper.includes('KR') || docTypeUpper.includes('VENDOR') || docTypeUpper.includes('AP')) {
        transactionType = 'VENDOR_INVOICE';
      } else if (docTypeUpper.includes('SA') || docTypeUpper.includes('DR') || docTypeUpper.includes('CUSTOMER') || docTypeUpper.includes('AR')) {
        transactionType = 'CUSTOMER_INVOICE';
      } else if (docTypeUpper.includes('ZP') || docTypeUpper.includes('PAY')) {
        transactionType = 'PAYMENT';
      } else if (docTypeUpper.includes('AB') || docTypeUpper.includes('GL') || docTypeUpper.includes('JE')) {
        transactionType = 'GL_POSTING';
      } else if (docTypeUpper.includes('WE') || docTypeUpper.includes('GR')) {
        transactionType = 'GOODS_RECEIPT';
      } else if (docTypeUpper.includes('WA') || docTypeUpper.includes('GI')) {
        transactionType = 'GOODS_ISSUE';
      }

      // Find a business transaction matching the transaction type
      if (transactionType) {
        console.log(`   🔍 No mapping for ${documentType}, trying to find ${transactionType} business transaction`);

        const btResult = await db.execute(sql`
          SELECT id, code, name
          FROM document_splitting_business_transactions
          WHERE transaction_type = ${transactionType}
            AND is_active = true
          LIMIT 1
        `);

        if (btResult.rows.length > 0) {
          console.log(`   ✅ Found business transaction: ${btResult.rows[0].code}`);
          return {
            businessTransactionId: btResult.rows[0].id,
            businessTransactionVariantId: undefined
          };
        }
      }

      // Last fallback: try to find any active business transaction
      console.log(`   ⚠️  No matching business transaction found for ${documentType}`);
      return null;
    } catch (error) {
      console.error('Error getting business transaction:', error);
      return null;
    }
  }

  /**
   * Get splitting rules for a business transaction
   */
  async getSplittingRules(
    businessTransactionId: number,
    businessTransactionVariantId?: number
  ): Promise<any[]> {
    try {
      let query = sql`
        SELECT 
          dsr.*,
          dsic_source.code as source_item_category_code,
          dsic_target.code as target_item_category_code,
          dsm.code as method_code,
          dsm.method_type
        FROM document_splitting_rules dsr
        JOIN document_splitting_item_categories dsic_source ON dsr.source_item_category_id = dsic_source.id
        LEFT JOIN document_splitting_item_categories dsic_target ON dsr.target_item_category_id = dsic_target.id
        JOIN document_splitting_methods dsm ON dsr.splitting_method_id = dsm.id
        WHERE dsr.business_transaction_id = ${businessTransactionId}
          AND dsr.is_active = true
          AND dsm.is_active = true
      `;

      if (businessTransactionVariantId) {
        query = sql`
          SELECT 
            dsr.*,
            dsic_source.code as source_item_category_code,
            dsic_target.code as target_item_category_code,
            dsm.code as method_code,
            dsm.method_type
          FROM document_splitting_rules dsr
          JOIN document_splitting_item_categories dsic_source ON dsr.source_item_category_id = dsic_source.id
          LEFT JOIN document_splitting_item_categories dsic_target ON dsr.target_item_category_id = dsic_target.id
          JOIN document_splitting_methods dsm ON dsr.splitting_method_id = dsm.id
          WHERE dsr.business_transaction_id = ${businessTransactionId}
            AND (dsr.business_transaction_variant_id = ${businessTransactionVariantId} OR dsr.business_transaction_variant_id IS NULL)
            AND dsr.is_active = true
            AND dsm.is_active = true
          ORDER BY dsr.priority DESC, dsr.id ASC
        `;
      } else {
        query = sql`
          SELECT 
            dsr.*,
            dsic_source.code as source_item_category_code,
            dsic_target.code as target_item_category_code,
            dsm.code as method_code,
            dsm.method_type
          FROM document_splitting_rules dsr
          JOIN document_splitting_item_categories dsic_source ON dsr.source_item_category_id = dsic_source.id
          LEFT JOIN document_splitting_item_categories dsic_target ON dsr.target_item_category_id = dsic_target.id
          JOIN document_splitting_methods dsm ON dsr.splitting_method_id = dsm.id
          WHERE dsr.business_transaction_id = ${businessTransactionId}
            AND dsr.business_transaction_variant_id IS NULL
            AND dsr.is_active = true
            AND dsm.is_active = true
          ORDER BY dsr.priority DESC, dsr.id ASC
        `;
      }

      const result = await db.execute(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting splitting rules:', error);
      return [];
    }
  }

  /**
   * Get active splitting characteristics
   */
  async getActiveCharacteristics(ledgerId: number, companyCodeId?: number): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT dsc.*
        FROM document_splitting_characteristics dsc
        WHERE dsc.is_active = true
        ORDER BY dsc.is_mandatory DESC, dsc.id ASC
      `);

      return result.rows;
    } catch (error) {
      console.error('Error getting characteristics:', error);
      return [];
    }
  }

  /**
   * Derive profit center from cost center
   */
  async deriveProfitCenterFromCostCenter(costCenter: string): Promise<string | null> {
    try {
      const result = await db.execute(sql`
        SELECT profit_center_code
        FROM cost_centers
        WHERE code = ${costCenter}
          AND is_active = true
          AND profit_center_code IS NOT NULL
        LIMIT 1
      `);

      if (result.rows.length > 0) {
        return result.rows[0].profit_center_code;
      }

      return null;
    } catch (error) {
      console.error('Error deriving profit center:', error);
      return null;
    }
  }

  /**
   * Derive profit center from material master
   */
  async deriveProfitCenterFromMaterial(materialId: number): Promise<string | null> {
    try {
      const result = await db.execute(sql`
        SELECT profit_center
        FROM materials
        WHERE id = ${materialId}
          AND (is_active = true OR active = true)
          AND profit_center IS NOT NULL
          AND profit_center != ''
        LIMIT 1
      `);

      if (result.rows.length > 0) {
        return result.rows[0].profit_center;
      }

      return null;
    } catch (error) {
      console.error('Error deriving profit center from material:', error);
      return null;
    }
  }

  /**
   * Derive cost center from material master
   */
  async deriveCostCenterFromMaterial(materialId: number): Promise<string | null> {
    try {
      const result = await db.execute(sql`
        SELECT cost_center
        FROM materials
        WHERE id = ${materialId}
          AND (is_active = true OR active = true)
          AND cost_center IS NOT NULL
          AND cost_center != ''
        LIMIT 1
      `);

      if (result.rows.length > 0) {
        return result.rows[0].cost_center;
      }

      return null;
    } catch (error) {
      console.error('Error deriving cost center from material:', error);
      return null;
    }
  }

  /**
   * Calculate split ratios based on assigned items
   */
  calculateSplitRatios(items: DocumentItem[], fieldName: string): Map<string, number> {
    const ratios = new Map<string, number>();

    // Normalize field name - convert to camelCase for matching
    // "profit_center" -> "profitCenter", "PROFIT CENTER" -> "profitCenter"
    const normalizedFieldName = fieldName.toLowerCase().replace(/[_\s]+/g, '');
    const camelCaseFieldName = normalizedFieldName.charAt(0).toLowerCase() + normalizedFieldName.slice(1);

    console.log(`   🔍 calculateSplitRatios: fieldName="${fieldName}", camelCase="${camelCaseFieldName}"`);
    console.log(`   Items to check: ${items.length}`);

    // Helper to get field value from item - try multiple variations including case-insensitive
    const getFieldValue = (item: any): string | null => {
      // Try exact field name first
      if (item[fieldName]) {
        console.log(`     Found "${item[fieldName]}" using exact: ${fieldName}`);
        return item[fieldName] as string;
      }

      // Try camelCase version (e.g., "profitCenter")
      if (item[camelCaseFieldName]) {
        console.log(`     Found "${item[camelCaseFieldName]}" using camelCase: ${camelCaseFieldName}`);
        return item[camelCaseFieldName] as string;
      }

      // Try case-insensitive matching on all item keys
      const itemKeys = Object.keys(item);
      const normalizedFieldLower = normalizedFieldName.toLowerCase();

      for (const key of itemKeys) {
        const normalizedKey = key.toLowerCase().replace(/[_\s]+/g, '');
        if (normalizedKey === normalizedFieldLower) {
          console.log(`     Found "${item[key]}" using case-insensitive match: ${key}`);
          return item[key] as string;
        }
      }

      // Try other variations
      const variations = [
        fieldName.toLowerCase(),
        fieldName.toUpperCase(),
        fieldName.replace(/[_\s]+/g, ''),
        fieldName.replace(/\s+/g, '_'),
        fieldName.replace(/_/g, ' '),
      ];

      for (const variant of variations) {
        if (item[variant]) {
          console.log(`     Found "${item[variant]}" using variant: ${variant}`);
          return item[variant] as string;
        }
      }

      // Debug: show what keys the item has
      console.log(`     Item ${item.glAccount}: keys=${itemKeys.join(', ')}, profitCenter=${item.profitCenter || 'NONE'}`);

      return null;
    };

    // Get all items with the characteristic assigned
    const assignedItems = items.filter(item => {
      const value = getFieldValue(item);
      return value && value !== null && value !== undefined && String(value).trim() !== '';
    });

    console.log(`   Items with characteristic: ${assignedItems.length} out of ${items.length}`);

    if (assignedItems.length === 0) {
      console.log(`   ⚠️  No items with characteristic value found`);
      return ratios;
    }

    // Calculate total amount for each characteristic value
    const totals = new Map<string, number>();
    let grandTotal = 0;

    assignedItems.forEach(item => {
      const value = String(getFieldValue(item) || '');
      const amount = Math.abs(item.debitAmount) + Math.abs(item.creditAmount);

      if (!totals.has(value)) {
        totals.set(value, 0);
      }
      totals.set(value, totals.get(value)! + amount);
      grandTotal += amount;
    });

    // Calculate ratios
    if (grandTotal > 0) {
      totals.forEach((total, value) => {
        ratios.set(value, total / grandTotal);
      });
    }

    return ratios;
  }

  /**
   * Perform active splitting - split documents based on characteristics
   */
  async performActiveSplitting(
    items: DocumentItem[],
    splittingRules: any[],
    characteristics: any[],
    ledgerId: number,
    companyCodeId?: number
  ): Promise<SplitResult> {
    try {
      const splitItems: SplitItem[] = [];
      const itemsToSplit: DocumentItem[] = [];
      const itemsToKeep: DocumentItem[] = [];

      // First, derive characteristics for items that don't have them
      for (const item of items) {
        // Derive profit center from cost center if not set
        if (!item.profitCenter && item.costCenter) {
          const derivedPC = await this.deriveProfitCenterFromCostCenter(item.costCenter);
          if (derivedPC) {
            item.profitCenter = derivedPC;
          }
        }

        // Check if this item should be split based on rules
        const itemCategory = await this.getItemCategory(item.glAccount);
        if (!itemCategory) {
          itemsToKeep.push(item);
          continue;
        }

        const applicableRule = splittingRules.find(rule =>
          rule.source_item_category_code?.toUpperCase() === itemCategory?.toUpperCase()
        );

        if (applicableRule) {
          itemsToSplit.push(item);
        } else {
          itemsToKeep.push(item);
        }
      }

      // If no items to split, return original items
      if (itemsToSplit.length === 0) {
        console.log('⚠️  No items to split. Items to split:', itemsToSplit.length, 'Items to keep:', itemsToKeep.length);
        return {
          success: true,
          splitItems: items.map(item => ({ ...item }))
        };
      }

      console.log(`📊 Splitting ${itemsToSplit.length} items based on ${itemsToKeep.length} source items`);

      // Group characteristics by type to avoid duplicate processing
      const characteristicsByType = new Map<string, any[]>();
      for (const characteristic of characteristics) {
        const type = characteristic.characteristic_type;
        if (!characteristicsByType.has(type)) {
          characteristicsByType.set(type, []);
        }
        characteristicsByType.get(type)!.push(characteristic);
      }

      console.log(`   Processing ${characteristicsByType.size} unique characteristic types`);

      // Track which items have been processed to avoid duplicate splitting
      const processedItems = new Set<string>();

      // Process each characteristic type (only once per type)
      for (const [characteristicType, chars] of Array.from(characteristicsByType.entries())) {
        // Use the first characteristic of this type that has a valid field name
        const characteristic = chars.find(c => c.field_name) || chars[0];
        const fieldName = characteristic.field_name;

        console.log(`🔍 Processing characteristic type: ${characteristicType}, field: ${fieldName}`);

        // Calculate ratios based on assigned items
        const ratios = this.calculateSplitRatios(itemsToKeep, fieldName);

        console.log(`   Ratios calculated: ${ratios.size} values`);
        ratios.forEach((ratio, value) => {
          console.log(`     ${value}: ${(ratio * 100).toFixed(2)}%`);
        });

        if (ratios.size === 0) {
          console.log(`   ⚠️  No ratios found for characteristic ${fieldName}`);
          continue; // No assigned items for this characteristic
        }

        // Split each item that needs splitting (only if not already processed)
        for (const item of itemsToSplit) {
          // Create a unique key for this item to track if it's been processed
          const itemKey = `${item.glAccount}-${item.debitAmount}-${item.creditAmount}`;

          if (processedItems.has(itemKey)) {
            console.log(`     ⏭️  Item ${item.glAccount} (${itemKey}) already processed, skipping`);
            continue;
          }
          const itemCategory = await this.getItemCategory(item.glAccount);
          const applicableRule = splittingRules.find(rule =>
            rule.source_item_category_code?.toUpperCase() === itemCategory?.toUpperCase()
          );

          if (!applicableRule) {
            splitItems.push({ ...item });
            continue;
          }

          // If target item category is specified, derive from those items
          let sourceItems = itemsToKeep;
          if (applicableRule.target_item_category_code) {
            const sourceItemsPromises = itemsToKeep.map(async (it) => {
              const cat = await this.getItemCategory(it.glAccount);
              return cat?.toUpperCase() === applicableRule.target_item_category_code?.toUpperCase() ? it : null;
            });
            const sourceItemsResults = await Promise.all(sourceItemsPromises);
            sourceItems = sourceItemsResults.filter((it): it is DocumentItem => it !== null);
          }

          // Calculate ratios from source items
          const sourceRatios = this.calculateSplitRatios(sourceItems, fieldName);

          console.log(`     Source ratios for item ${item.glAccount}: ${sourceRatios.size} values`);
          sourceRatios.forEach((ratio, value) => {
            console.log(`       Ratio: ${value} = ${(ratio * 100).toFixed(2)}%`);
          });

          if (sourceRatios.size === 0) {
            // No source items, keep original
            splitItems.push({ ...item });
            continue;
          }

          // Split the item according to ratios
          console.log(`     Splitting item ${item.glAccount} (${item.debitAmount || item.creditAmount}) into ${sourceRatios.size} items`);

          // Convert Map to Array to ensure proper iteration
          const ratiosArray = Array.from(sourceRatios.entries());
          console.log(`     Ratios array: ${JSON.stringify(ratiosArray.map(([v, r]) => `${v}=${(r * 100).toFixed(2)}%`))}`);

          ratiosArray.forEach(([value, ratio]) => {
            console.log(`       Creating split item with value: "${value}", ratio: ${(ratio * 100).toFixed(2)}%`);
            // Map field name to camelCase for the item
            // "PROFIT CENTER" -> "profitCenter", "profit_center" -> "profitCenter"
            const camelCaseFieldName = fieldName
              .toLowerCase()
              .replace(/[_\s]+/g, ' ')  // Replace underscores and multiple spaces with single space
              .split(' ')                // Split by space
              .map((word, index) => index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
              .join('');                 // Join back together

            console.log(`       Field name conversion: "${fieldName}" -> "${camelCaseFieldName}"`);

            const splitItem: SplitItem = {
              ...item,
            };

            // Clear any existing profit center variations to avoid conflicts
            delete (splitItem as any).profitCenter;
            delete (splitItem as any).profit_center;
            delete (splitItem as any)['PROFIT CENTER'];
            delete (splitItem as any).profitcenter;

            // Set the field value using camelCase (should be "profitCenter")
            (splitItem as any)[camelCaseFieldName] = value;
            splitItem.splitCharacteristicValue = value;
            splitItem.splitRatio = ratio;

            console.log(`       Setting ${camelCaseFieldName} = "${value}" on split item`);
            console.log(`       Split item profitCenter after setting: ${(splitItem as any).profitCenter || (splitItem as any).profit_center || 'NOT SET'}`);

            // Adjust amounts based on ratio
            if (item.debitAmount > 0) {
              splitItem.debitAmount = parseFloat((item.debitAmount * ratio).toFixed(2));
            }
            if (item.creditAmount > 0) {
              splitItem.creditAmount = parseFloat((item.creditAmount * ratio).toFixed(2));
            }

            // Verify profit center is set correctly
            const actualProfitCenter = (splitItem as any).profitCenter || (splitItem as any).profit_center || (splitItem as any)['PROFIT CENTER'];
            console.log(`     ✅ Created split item: ${splitItem.glAccount}, ${camelCaseFieldName}=${value}, actualProfitCenter=${actualProfitCenter}, amount=${splitItem.debitAmount || splitItem.creditAmount}`);

            splitItems.push(splitItem);
          });

          // Mark this item as processed
          processedItems.add(itemKey);
          console.log(`     ✅ Item ${item.glAccount} (${itemKey}) processed and split into ${sourceRatios.size} items`);
        }
      }

      // Add items that don't need splitting
      splitItems.push(...itemsToKeep.map(item => ({ ...item })));

      return {
        success: true,
        splitItems: splitItems
      };
    } catch (error) {
      console.error('Error performing active splitting:', error);
      return {
        success: false,
        splitItems: items.map(item => ({ ...item })),
        message: `Splitting failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Perform zero balancing - add zero balance items when needed
   */
  async performZeroBalancing(
    splitItems: SplitItem[],
    ledgerId: number,
    companyCodeId?: number
  ): Promise<SplitItem[]> {
    try {
      // Get zero balance clearing account
      const zeroBalanceResult = await db.execute(sql`
        SELECT gl_account_number
        FROM document_splitting_zero_balance_accounts
        WHERE ledger_id = ${ledgerId}
          AND (company_code_id = ${companyCodeId} OR company_code_id IS NULL)
          AND is_active = true
        ORDER BY company_code_id DESC NULLS LAST
        LIMIT 1
      `);

      if (zeroBalanceResult.rows.length === 0) {
        // No zero balance account configured, return items as-is
        return splitItems;
      }

      const zeroBalanceAccount = zeroBalanceResult.rows[0].gl_account_number;

      // Group items by characteristic values
      const groupedItems = new Map<string, SplitItem[]>();

      splitItems.forEach(item => {
        const key = item.splitCharacteristicValue || 'DEFAULT';
        if (!groupedItems.has(key)) {
          groupedItems.set(key, []);
        }
        groupedItems.get(key)!.push(item);
      });

      const balancedItems: SplitItem[] = [];

      // Check balance for each group
      groupedItems.forEach((groupItems, key) => {
        let totalDebits = 0;
        let totalCredits = 0;

        groupItems.forEach(item => {
          totalDebits += item.debitAmount || 0;
          totalCredits += item.creditAmount || 0;
        });

        const difference = Math.abs(totalDebits - totalCredits);

        // If not balanced, add zero balance item
        if (difference > 0.01) {
          const zeroBalanceItem: SplitItem = {
            glAccount: zeroBalanceAccount,
            debitAmount: totalCredits > totalDebits ? difference : 0,
            creditAmount: totalDebits > totalCredits ? difference : 0,
            description: `Zero Balance Clearing - ${key}`,
            splitCharacteristicValue: key,
            accountType: 'S'
          };

          balancedItems.push(...groupItems, zeroBalanceItem);
        } else {
          balancedItems.push(...groupItems);
        }
      });

      return balancedItems;
    } catch (error) {
      console.error('Error performing zero balancing:', error);
      return splitItems;
    }
  }

  /**
   * Apply inheritance - inherit characteristics from other items
   */
  async applyInheritance(
    items: SplitItem[],
    enableInheritance: boolean
  ): Promise<SplitItem[]> {
    if (!enableInheritance) {
      return items;
    }

    // Find items without characteristics
    const itemsWithoutChars = items.filter(item =>
      !item.profitCenter && !item.businessArea && !item.segment && !item.costCenter
    );

    if (itemsWithoutChars.length === 0) {
      return items;
    }

    // Find items with characteristics
    const itemsWithChars = items.filter(item =>
      item.profitCenter || item.businessArea || item.segment || item.costCenter
    );

    if (itemsWithChars.length === 0) {
      return items;
    }

    // Inherit from first item with characteristics
    const sourceItem = itemsWithChars[0];

    itemsWithoutChars.forEach(item => {
      if (!item.profitCenter && sourceItem.profitCenter) {
        item.profitCenter = sourceItem.profitCenter;
      }
      if (!item.businessArea && sourceItem.businessArea) {
        item.businessArea = sourceItem.businessArea;
      }
      if (!item.segment && sourceItem.segment) {
        item.segment = sourceItem.segment;
      }
      if (!item.costCenter && sourceItem.costCenter) {
        item.costCenter = sourceItem.costCenter;
      }
    });

    return items;
  }

  /**
   * Apply standard assignment using constants
   */
  async applyStandardAssignment(
    items: SplitItem[],
    ledgerId: number,
    companyCodeId?: number
  ): Promise<SplitItem[]> {
    try {
      // Get constants for this ledger
      const constantsResult = await db.execute(sql`
        SELECT dsc.*, dsch.field_name
        FROM document_splitting_constants dsc
        JOIN document_splitting_characteristics dsch ON dsc.characteristic_id = dsch.id
        WHERE dsc.ledger_id = ${ledgerId}
          AND (dsc.company_code_id = ${companyCodeId} OR dsc.company_code_id IS NULL)
          AND dsc.is_active = true
        ORDER BY dsc.company_code_id DESC NULLS LAST
      `);

      if (constantsResult.rows.length === 0) {
        return items;
      }

      // Apply constants to items without characteristics
      items.forEach(item => {
        constantsResult.rows.forEach((constant: any) => {
          const fieldName = constant.field_name;
          if (!(item as any)[fieldName]) {
            (item as any)[fieldName] = constant.constant_value;
          }
        });
      });

      return items;
    } catch (error) {
      console.error('Error applying standard assignment:', error);
      return items;
    }
  }

  /**
   * Main method to split a document
   */
  async splitDocument(
    items: DocumentItem[],
    documentType: string,
    companyCode: string,
    ledgerId?: number
  ): Promise<SplitResult> {
    try {
      console.log(`🔍 DocumentSplittingService.splitDocument called: documentType=${documentType}, companyCode=${companyCode}, items=${items.length}`);

      // Check if splitting is active
      const activationCheck = await this.isDocumentSplittingActive(companyCode, ledgerId);
      console.log(`   Activation check:`, { isActive: activationCheck.isActive, ledgerId: activationCheck.ledgerId });

      if (!activationCheck.isActive || !activationCheck.ledgerId) {
        console.log(`   ⚠️  Document splitting not active, returning original items`);
        return {
          success: true,
          splitItems: items.map(item => ({ ...item }))
        };
      }

      const activeLedgerId = activationCheck.ledgerId;
      const activation = activationCheck.activation;
      console.log(`   ✅ Splitting is active for ledger ${activeLedgerId}`);

      // Get company code ID
      // Note: company_codes table uses 'active' column, not 'is_active'
      const companyCodeResult = await db.execute(sql`
        SELECT id FROM company_codes WHERE code = ${companyCode} AND active = true LIMIT 1
      `);
      const companyCodeId = companyCodeResult.rows.length > 0 ? companyCodeResult.rows[0].id : undefined;
      console.log(`   Company Code ID: ${companyCodeId}`);

      // Get business transaction
      const businessTransaction = await this.getBusinessTransaction(documentType, companyCodeId);
      console.log(`   Business Transaction:`, businessTransaction ? { id: businessTransaction.businessTransactionId, variant: businessTransaction.businessTransactionVariantId } : 'NOT FOUND');

      if (!businessTransaction) {
        console.log(`   ⚠️  No business transaction found, returning original items`);
        return {
          success: true,
          splitItems: items.map(item => ({ ...item }))
        };
      }

      // Get splitting rules
      const splittingRules = await this.getSplittingRules(
        businessTransaction.businessTransactionId,
        businessTransaction.businessTransactionVariantId
      );
      console.log(`   Splitting Rules: ${splittingRules.length} found`);
      splittingRules.forEach((rule, idx) => {
        console.log(`     Rule ${idx + 1}: source=${rule.source_item_category_code}, target=${rule.target_item_category_code || 'NONE'}`);
      });

      if (splittingRules.length === 0) {
        console.log(`   ⚠️  No splitting rules found, returning original items`);
        return {
          success: true,
          splitItems: items.map(item => ({ ...item }))
        };
      }

      // Get characteristics
      const characteristics = await this.getActiveCharacteristics(activeLedgerId, companyCodeId);
      console.log(`   Characteristics: ${characteristics.length} found`);
      characteristics.forEach((char, idx) => {
        console.log(`     Char ${idx + 1}: ${char.characteristic_type}, field=${char.field_name}`);
      });

      if (characteristics.length === 0) {
        console.log(`   ⚠️  No characteristics found, returning original items`);
        return {
          success: true,
          splitItems: items.map(item => ({ ...item }))
        };
      }

      // Perform active splitting
      let splitResult = await this.performActiveSplitting(
        items,
        splittingRules,
        characteristics,
        activeLedgerId,
        companyCodeId
      );

      if (!splitResult.success) {
        return splitResult;
      }

      // Apply inheritance if enabled
      if (activation?.enable_inheritance) {
        splitResult.splitItems = await this.applyInheritance(
          splitResult.splitItems,
          true
        );
      }

      // Apply standard assignment if enabled
      if (activation?.enable_standard_assignment) {
        splitResult.splitItems = await this.applyStandardAssignment(
          splitResult.splitItems,
          activeLedgerId,
          companyCodeId
        );
      }

      // Perform zero balancing
      splitResult.splitItems = await this.performZeroBalancing(
        splitResult.splitItems,
        activeLedgerId,
        companyCodeId
      );

      return splitResult;
    } catch (error) {
      console.error('Error splitting document:', error);
      return {
        success: false,
        splitItems: items.map(item => ({ ...item })),
        message: `Document splitting failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Record split documents in the tracking table for audit purposes
   * This method should be called after the accounting document is created
   */
  async recordSplitDocuments(
    originalDocumentId: number,
    splitItems: SplitItem[],
    characteristicId?: number
  ): Promise<boolean> {
    try {
      // Only record if we have split items with characteristic values
      const itemsWithCharacteristics = splitItems.filter(
        item => item.splitCharacteristicValue && item.splitRatio
      );

      if (itemsWithCharacteristics.length === 0) {
        console.log('   No split items with characteristics to record');
        return true;
      }

      // Get or find the characteristic id if not provided
      let charId = characteristicId;
      if (!charId) {
        const charResult = await db.execute(sql`
          SELECT id FROM document_splitting_characteristics 
          WHERE is_active = true 
          ORDER BY is_mandatory DESC, id ASC 
          LIMIT 1
        `);
        if (charResult.rows.length > 0) {
          charId = charResult.rows[0].id;
        }
      }

      // Group items by characteristic value and calculate total ratio per value
      const groupedByValue = new Map<string, { ratio: number; count: number }>();
      itemsWithCharacteristics.forEach(item => {
        const value = item.splitCharacteristicValue!;
        const existing = groupedByValue.get(value);
        if (existing) {
          existing.count++;
          // Keep max ratio for the group
          existing.ratio = Math.max(existing.ratio, item.splitRatio || 0);
        } else {
          groupedByValue.set(value, { ratio: item.splitRatio || 0, count: 1 });
        }
      });

      // Insert records for each unique characteristic value
      for (const [value, data] of Array.from(groupedByValue.entries())) {
        try {
          await db.execute(sql`
            INSERT INTO document_splitting_split_documents (
              original_document_id,
              split_document_id,
              characteristic_id,
              characteristic_value,
              split_ratio,
              created_at
            ) VALUES (
              ${originalDocumentId},
              ${originalDocumentId},
              ${charId || null},
              ${value},
              ${data.ratio.toFixed(6)},
              CURRENT_TIMESTAMP
            )
            ON CONFLICT (original_document_id, split_document_id) DO UPDATE
            SET characteristic_value = ${value},
                split_ratio = ${data.ratio.toFixed(6)}
          `);
        } catch (insertError) {
          // Log but don't fail - tracking is non-critical
          console.log(`   Could not record split for value ${value}:`, insertError);
        }
      }

      console.log(`   ✅ Recorded ${groupedByValue.size} split document entries`);
      return true;
    } catch (error) {
      console.error('Error recording split documents:', error);
      return false;
    }
  }

  /**
   * Perform passive splitting - inherit splitting from original document
   */
  async performPassiveSplitting(
    originalDocumentId: number,
    paymentItems: DocumentItem[]
  ): Promise<SplitResult> {
    try {
      // Get original document items with splitting information
      const originalItemsResult = await db.execute(sql`
        SELECT 
          adi.*,
          dssd.characteristic_value,
          dssd.split_ratio
        FROM accounting_document_items adi
        LEFT JOIN document_splitting_split_documents dssd ON adi.document_id = dssd.original_document_id
        WHERE adi.document_id = ${originalDocumentId}
        ORDER BY adi.line_item
      `);

      if (originalItemsResult.rows.length === 0) {
        return {
          success: true,
          splitItems: paymentItems.map(item => ({ ...item }))
        };
      }

      // Group original items by characteristic value
      const groupedOriginal = new Map<string, any[]>();

      originalItemsResult.rows.forEach((item: any) => {
        const key = item.characteristic_value || 'DEFAULT';
        if (!groupedOriginal.has(key)) {
          groupedOriginal.set(key, []);
        }
        groupedOriginal.get(key)!.push(item);
      });

      // Calculate ratios from original document
      const ratios = new Map<string, number>();
      let totalAmount = 0;
      const amountsByChar = new Map<string, number>();

      originalItemsResult.rows.forEach((item: any) => {
        const amount = Math.abs(parseFloat(item.debit_amount || 0)) + Math.abs(parseFloat(item.credit_amount || 0));
        const key = item.characteristic_value || 'DEFAULT';

        if (!amountsByChar.has(key)) {
          amountsByChar.set(key, 0);
        }
        amountsByChar.set(key, amountsByChar.get(key)! + amount);
        totalAmount += amount;
      });

      if (totalAmount > 0) {
        amountsByChar.forEach((amount, key) => {
          ratios.set(key, amount / totalAmount);
        });
      }

      // Split payment items according to ratios
      const splitItems: SplitItem[] = [];

      paymentItems.forEach(paymentItem => {
        if (ratios.size === 0) {
          splitItems.push({ ...paymentItem });
          return;
        }

        ratios.forEach((ratio, characteristicValue) => {
          const splitItem: SplitItem = {
            ...paymentItem,
            splitCharacteristicValue: characteristicValue,
            splitRatio: ratio
          };

          // Get characteristic field from original items
          const originalGroup = groupedOriginal.get(characteristicValue);
          if (originalGroup && originalGroup.length > 0) {
            const sample = originalGroup[0];
            if (sample.profit_center) splitItem.profitCenter = sample.profit_center;
            if (sample.business_area) splitItem.businessArea = sample.business_area;
            if (sample.segment) splitItem.segment = sample.segment;
            if (sample.cost_center) splitItem.costCenter = sample.cost_center;
          }

          // Adjust amounts
          if (paymentItem.debitAmount > 0) {
            splitItem.debitAmount = parseFloat((paymentItem.debitAmount * ratio).toFixed(2));
          }
          if (paymentItem.creditAmount > 0) {
            splitItem.creditAmount = parseFloat((paymentItem.creditAmount * ratio).toFixed(2));
          }

          splitItems.push(splitItem);
        });
      });

      return {
        success: true,
        splitItems: splitItems
      };
    } catch (error) {
      console.error('Error performing passive splitting:', error);
      return {
        success: false,
        splitItems: paymentItems.map(item => ({ ...item })),
        message: `Passive splitting failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const documentSplittingService = new DocumentSplittingService();

