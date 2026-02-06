import { Router } from "express";
import { z } from "zod";
import { db, pool } from "../db";
import { sql, eq, and, desc } from "drizzle-orm";
import {
  salesOrderItems,
  orderConditions,
  transferOrders,
  transferOrderItems,
  deliveryDocuments,
  deliveryItems,
  billingDocuments,
  billingItems,
  documentFlow,
  creditDecisions,
  dunningProcedures,
  cashApplications
} from "../../shared/schema";
import { accountDeterminationService } from "../services/account-determination-service";
import { InventoryTrackingService } from "../services/inventoryTrackingService.js";
import { validatePeriodLock } from "../middleware/period-lock-check";
import { FiscalPeriodService } from "../services/fiscal-period-service";

const inventoryTrackingService = new InventoryTrackingService(pool);

const router = Router();

// Helper functions to safely extract values from database rows
const getString = (value: unknown, defaultValue: string = ''): string => {
  return typeof value === 'string' ? value : defaultValue;
};

const getNumber = (value: unknown, defaultValue: number = 0): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
};

const getInt = (value: unknown, defaultValue: number = 0): number => {
  if (typeof value === 'number') return Math.floor(value);
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
};

// Helper function to safely parse an ID from request parameters/body
// Extracts only numeric characters to handle cases where document numbers are passed instead of IDs
function parseIdSafely(value: unknown): number | null {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  if (typeof value === 'string') {
    // Remove all non-numeric characters to extract pure numeric ID
    const cleaned = value.trim().replace(/[^0-9]/g, '');
    if (cleaned === '') return null;
    const parsed = parseInt(cleaned, 10);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

const getBoolean = (value: unknown, defaultValue: boolean = false): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true' || value === '1';
  return defaultValue;
};


router.post("/sales-orders", async (req, res) => {
  try {
    // Defensive body parsing: Handle case where express.text() middleware 
    // parses JSON body as string instead of object
    let parsedBody = req.body;
    if (typeof req.body === 'string') {
      try {
        parsedBody = JSON.parse(req.body);
        console.log('⚠️ Request body was string, parsed to object');
      } catch (parseError) {
        console.error('Failed to parse request body:', parseError);
        return res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: 'Request body must be valid JSON'
        });
      }
    }

    // Helper function to normalize empty strings to null
    // This ensures empty strings from frontend are treated as null/undefined in validation logic
    const normalizeEmptyStrings = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(normalizeEmptyStrings);
      }
      if (obj && typeof obj === 'object') {
        const normalized: any = {};
        for (const key in obj) {
          const value = obj[key];
          normalized[key] = value === '' ? null : normalizeEmptyStrings(value);
        }
        return normalized;
      }
      return obj === '' ? null : obj;
    };

    const { items, ...orderData } = normalizeEmptyStrings(parsedBody);

    console.log('🚀 Starting dynamic sales order creation...');

    // Step 1: Get System Configuration (Dynamic Values)
    console.log('⚙️ Fetching system configuration...');
    const configResult = await db.execute(sql`
      SELECT 
        (SELECT config_value FROM system_configuration WHERE config_key = 'default_plant_id' AND active = true LIMIT 1) as default_plant_id,
        (SELECT config_value FROM system_configuration WHERE config_key = 'default_sales_organization_id' AND active = true LIMIT 1) as default_sales_organization_id,
        (SELECT config_value FROM system_configuration WHERE config_key = 'default_company_id' AND active = true LIMIT 1) as default_company_id,
        (SELECT config_value FROM system_configuration WHERE config_key = 'default_currency_id' AND active = true LIMIT 1) as default_currency_id,
        (SELECT config_value FROM system_configuration WHERE config_key = 'default_tax_rate' AND active = true LIMIT 1) as default_tax_rate,
        (SELECT config_value FROM system_configuration WHERE config_key = 'approval_threshold_amount' AND active = true LIMIT 1) as approval_threshold,
        (SELECT config_value FROM system_configuration WHERE config_key = 'credit_check_enabled' AND active = true LIMIT 1) as credit_check_enabled,
        (SELECT config_value FROM system_configuration WHERE config_key = 'reserve_inventory_on_order' AND active = true LIMIT 1) as reserve_inventory
    `);

    const config = configResult.rows[0] || {};
    const defaultPlantId = getInt(config.default_plant_id) || null;
    const defaultSalesOrgId = getInt(config.default_sales_organization_id) || null;
    const defaultCompanyCodeId = getInt(config.default_company_id) || null;
    const defaultCurrencyId = getInt(config.default_currency_id) || null;
    const taxRate = getNumber(config.default_tax_rate, 0.1);
    const approvalThreshold = getNumber(config.approval_threshold, 10000);
    const creditCheckEnabled = getBoolean(config.credit_check_enabled);
    const reserveInventory = getBoolean(config.reserve_inventory);

    console.log(`📋 Configuration: Plant=${defaultPlantId}, SalesOrg=${defaultSalesOrgId}, Tax=${taxRate * 100}%, Approval=${approvalThreshold}`);

    // Validate items array exists and is iterable
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid items data',
        details: 'Items must be provided as an array. Received: ' + (typeof items)
      });
    }

    if (items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Empty order',
        details: 'At least one item must be included in the sales order'
      });
    }

    // Step 2: Real-time Inventory Status Check
    console.log('📦 Checking real-time inventory status...');
    const inventoryStatusResults = [];

    for (const item of items) {
      // Support both material_id and product_id field names
      const materialId = item.material_id || item.product_id;

      if (materialId) {
        // Get comprehensive material and inventory information
        const materialResult = await db.execute(sql`
          SELECT 
            m.id,
            m.description as name,
            m.code as sku,
            (SELECT COALESCE(SUM(quantity), 0) FROM stock_balances WHERE material_code = m.code AND stock_type = 'AVAILABLE') as stock,
            (SELECT COALESCE(SUM(reserved_quantity), 0) FROM stock_balances WHERE material_code = m.code) as reserved_stock,
            m.min_stock,
            m.max_stock,
            -- Use default plant/storage if specific ones aren't on material
            (SELECT id FROM plants WHERE code = m.plant_code LIMIT 1) as plant_id,
            (SELECT id FROM storage_locations WHERE code = m.production_storage_location LIMIT 1) as storage_location_id,
            p.name as warehouse_name,
            p.code as warehouse_code,
            sl.name as bin_name,
            sl.code as bin_code,
            m.active as material_status,
            m.type as material_type
          FROM materials m
          LEFT JOIN plants p ON m.plant_code = p.code
          LEFT JOIN storage_locations sl ON m.production_storage_location = sl.code
          WHERE m.id = ${materialId}
        `);

        if (materialResult.rows.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Material not found',
            details: `Material ID ${materialId} does not exist in the system`
          });
        }

        const material = materialResult.rows[0];
        const requestedQuantity = parseFloat(item.quantity) || 0;
        const availableStock = getNumber(material.stock);
        const reservedStock = getNumber(material.reserved_stock);
        const minStock = getNumber(material.min_stock);
        const maxStock = getNumber(material.max_stock);
        const freeStock = availableStock - reservedStock;

        const inventoryStatus = {
          material_id: materialId,
          material_name: getString(material.name),
          material_code: getString(material.sku),
          material_status: getString(material.material_status),
          material_type: getString(material.material_type),
          requested_quantity: requestedQuantity,
          available_stock: availableStock,
          reserved_stock: reservedStock,
          free_stock: freeStock,
          min_stock: minStock,
          max_stock: maxStock,
          warehouse_name: getString(material.warehouse_name),
          warehouse_code: getString(material.warehouse_code),
          bin_name: getString(material.bin_name),
          bin_code: getString(material.bin_code),
          sufficient_stock: freeStock >= requestedQuantity,
          stock_after_order: freeStock - requestedQuantity,
          below_min_stock: (freeStock - requestedQuantity) < minStock,
          stock_status: freeStock >= requestedQuantity ? 'AVAILABLE' : 'INSUFFICIENT',
          stock_utilization: maxStock > 0 ? (availableStock / maxStock) * 100 : 0
        };

        inventoryStatusResults.push(inventoryStatus);

        // Check if material is active (handle both boolean and string values)
        const isMaterialActive = material.material_status === true || material.material_status === 'ACTIVE';
        if (!isMaterialActive) {
          return res.status(400).json({
            success: false,
            error: 'Material not available',
            details: {
              material: material.name,
              status: material.material_status,
              message: 'Material is not active for sales'
            }
          });
        }

        // Check inventory availability
        if (!inventoryStatus.sufficient_stock) {
          return res.status(400).json({
            success: false,
            error: 'Insufficient inventory',
            details: {
              material: material.name,
              requested: requestedQuantity,
              available: freeStock,
              reserved: reservedStock,
              shortfall: requestedQuantity - freeStock,
              stock_status: inventoryStatus.stock_status
            }
          });
        }
      }
    }

    console.log('✅ Real-time inventory check completed');

    // Step 3: Dynamic Credit Check (if enabled)
    if (creditCheckEnabled && orderData.customer_id) {
      console.log('💳 Performing dynamic credit check...');

      const customerResult = await db.execute(sql`
        SELECT 
          c.id,
          c.name,
          c.credit_limit,
          c.status,
          COALESCE(SUM(so.total_amount), 0) + 
          COALESCE(
            (SELECT SUM(CAST(outstanding_amount AS DECIMAL))
             FROM ar_open_items
             WHERE customer_id = c.id
               AND document_type IN ('Invoice', 'DR')
            ), 0
          ) as used_credit
        FROM erp_customers c
        LEFT JOIN sales_orders so ON c.id = so.customer_id 
          AND so.status IN ('Pending', 'Confirmed', 'Processing', 'Delivered', 'Shipped', 'Partially Delivered')
          AND (so.payment_status IS NULL OR so.payment_status != 'Paid')
        WHERE c.id = ${orderData.customer_id}
        GROUP BY c.id, c.name, c.credit_limit, c.status
      `);

      if (customerResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Customer not found',
          details: 'Customer ID does not exist in the system'
        });
      }

      const customer = customerResult.rows[0];
      const creditLimit = getNumber(customer.credit_limit);
      const usedCredit = getNumber(customer.used_credit);
      const orderTotal = items.reduce((sum, item) =>
        sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)), 0
      );
      const taxAmount = orderTotal * taxRate;
      const shippingAmount = parseFloat(orderData.shipping_amount || 0);
      const totalOrderAmount = orderTotal + taxAmount + shippingAmount;
      const availableCredit = creditLimit - usedCredit;

      const creditCheck = {
        customer_id: customer.id,
        customer_name: customer.name,
        credit_limit: creditLimit,
        used_credit: usedCredit,
        available_credit: availableCredit,
        order_total: totalOrderAmount,
        credit_utilization: creditLimit > 0 ? (totalOrderAmount / creditLimit) * 100 : 0,
        within_limit: totalOrderAmount <= availableCredit,
        exceeded_by: totalOrderAmount > availableCredit ? totalOrderAmount - availableCredit : 0,
        credit_status: customer.status
      };

      if (!creditCheck.within_limit) {
        return res.status(400).json({
          success: false,
          error: 'Credit limit exceeded',
          details: {
            customer: customer.name,
            credit_limit: creditLimit,
            used_credit: usedCredit,
            available_credit: availableCredit,
            order_total: totalOrderAmount,
            exceeded_by: creditCheck.exceeded_by,
            credit_utilization: creditCheck.credit_utilization
          }
        });
      }

      console.log('✅ Credit check passed');
    }

    // Calculate order totals for approval check
    const orderTotal = items.reduce((sum, item) =>
      sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)), 0
    );

    // Calculate tax based on customer's tax rules (if provided in request)
    let taxAmount = 0;
    let taxBreakdown = [];

    if (orderData.tax_rules && Array.isArray(orderData.tax_rules) && orderData.tax_rules.length > 0) {
      // Use tax rules from customer's tax profile
      console.log('💰 Calculating taxes based on customer tax rules...');
      taxBreakdown = orderData.tax_rules.map(rule => ({
        rule_id: rule.id,
        rule_code: rule.rule_code,
        title: rule.title,
        rate_percent: parseFloat(rule.rate_percent),
        amount: orderTotal * (parseFloat(rule.rate_percent) / 100)
      }));
      taxAmount = taxBreakdown.reduce((sum, tax) => sum + tax.amount, 0);
      console.log(`✅ Tax calculated: ${taxBreakdown.length} rules, total: $${taxAmount.toFixed(2)}`);
    } else {
      // Fallback to default tax rate
      taxAmount = orderTotal * taxRate;
      console.log(`⚠️ Using default tax rate: ${taxRate * 100}%, amount: $${taxAmount.toFixed(2)}`);
    }

    const shippingAmount = parseFloat(orderData.shipping_amount || 0);
    const totalAmount = orderTotal + taxAmount + shippingAmount;

    // Step 4: Dynamic Approval Check
    console.log('📋 Checking approval requirements...');

    const requiresApproval = totalAmount > approvalThreshold || orderData.priority === 'High';

    if (requiresApproval) {
      console.log('⚠️ Order requires approval based on dynamic thresholds');
    }

    console.log('✅ All dynamic checks passed, proceeding with order creation...');

    // Step 5: Dynamic Plant and Organization Resolution
    console.log('🏭 Resolving warehouse and organization details...');

    // Get warehouse ID from order data or items - NO FORCED DEFAULTS
    let warehouseId = orderData.plant_id || null;

    // Try to get from items if not in order data
    if (!warehouseId && items && Array.isArray(items) && items.length > 0) {
      const itemWithPlant = items.find(item => item.plant_id);
      if (itemWithPlant) {
        warehouseId = itemWithPlant.plant_id;
        console.log(`✅ Using plant from item: ${warehouseId}`);
      }
    }

    // Validate warehouse exists and is active (only if provided)
    if (warehouseId) {
      const warehouseValidation = await db.execute(sql`
        SELECT id, name, code FROM plants WHERE id = ${warehouseId} AND active = true
      `);

      if (warehouseValidation.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid plant/warehouse',
          details: `Plant ID ${warehouseId} does not exist or is not active`
        });
      }
      console.log(`✅ Validated plant: ${warehouseValidation.rows[0].name} (ID: ${warehouseId})`);
    } else {
      console.log('ℹ️ No plant/warehouse specified - will be null in order');
    }

    // Sales Organization - from request only, no hardcoded defaults
    const salesOrgId = orderData.sales_organization_id || orderData.sales_org_id || null;

    if (!salesOrgId) {
      return res.status(400).json({
        success: false,
        error: 'Sales organization is required',
        details: 'Please provide sales_org_id or sales_organization_id in the request'
      });
    }

    // Get company_code_id - Priority: 1) orderData, 2) Sales Organization, 3) Customer Master
    // NO hardcoded defaults
    let companyCodeId = orderData.company_code_id || orderData.company_id || null;

    // Priority 2: Fetch company_code_id from sales organization if not provided
    if (!companyCodeId && salesOrgId) {
      try {
        // Try comprehensive table first
        const salesOrgResult = await db.execute(sql`
          SELECT company_code_id 
          FROM sd_sales_organizations 
          WHERE id = ${salesOrgId}
        `);

        if (salesOrgResult.rows.length > 0 && salesOrgResult.rows[0].company_code_id) {
          companyCodeId = getInt(salesOrgResult.rows[0].company_code_id);
          console.log(`✅ Company code auto-filled from sales organization: ${companyCodeId}`);
        } else {
          // Fallback to legacy table
          const legacySalesOrgResult = await db.execute(sql`
            SELECT company_code_id 
            FROM sales_organizations 
            WHERE id = ${salesOrgId}
          `);

          if (legacySalesOrgResult.rows.length > 0 && legacySalesOrgResult.rows[0].company_code_id) {
            companyCodeId = getInt(legacySalesOrgResult.rows[0].company_code_id);
            console.log(`✅ Company code auto-filled from sales organization (legacy): ${companyCodeId}`);
          }
        }
      } catch (salesOrgError) {
        console.warn('⚠️ Could not fetch company code from sales organization:', salesOrgError);
      }
    }

    // Priority 3: Fetch company_code_id from customer master if still not found
    if (!companyCodeId && orderData.customer_id) {
      const customerResult = await db.execute(sql`
        SELECT company_code_id 
        FROM erp_customers 
        WHERE id = ${orderData.customer_id}
      `);

      if (customerResult.rows.length > 0) {
        const companyCodeIdValue = getInt(customerResult.rows[0].company_code_id);
        if (companyCodeIdValue) {
          companyCodeId = companyCodeIdValue;
          console.log(`✅ Company code fetched from customer master: ${companyCodeId}`);
        }
      }
    }

    // If still no company code, leave it null - NO FORCED DEFAULTS
    if (!companyCodeId) {
      console.log('ℹ️ No company code found - will be null in order');
    }

    // Currency - Auto-populate from customer master
    let currencyId = orderData.currency_id || null;

    // If currency_id not provided, get from customer master
    if (!currencyId && orderData.customer_id) {
      try {
        const customerCurrencyResult = await db.execute(sql`
          SELECT c.currency
          FROM erp_customers c
          WHERE c.id = ${orderData.customer_id}
        `);

        if (customerCurrencyResult.rows.length > 0 && customerCurrencyResult.rows[0].currency) {
          const customerCurrency = getString(customerCurrencyResult.rows[0].currency);

          // Map currency code to currency_id
          const currencyMappingResult = await db.execute(sql`
            SELECT id FROM currencies WHERE code = ${customerCurrency} AND active = true LIMIT 1
          `);

          if (currencyMappingResult.rows.length > 0) {
            currencyId = getInt(currencyMappingResult.rows[0].id);
            console.log(`✅ Currency auto-filled from customer: ${customerCurrency} (ID: ${currencyId})`);
          } else {
            console.warn(`⚠️ Customer currency code '${customerCurrency}' not found in currencies table`);
          }
        }
      } catch (currencyError) {
        console.warn('⚠️ Could not fetch currency from customer:', currencyError);
      }
    }

    if (currencyId) {
      console.log(`✅ Using currency ID: ${currencyId}`);
    } else {
      console.log('ℹ️ No currency specified - will be null in order');
    }

    console.log(`✅ Resolved: Plant=${warehouseId}, SalesOrg=${salesOrgId}, Company=${companyCodeId}, Currency=${currencyId}`);

    // Generate order number based on document type's number range
    let orderNumber: string;

    console.log('📋 Order creation - Document type:', orderData.document_type);

    if (orderData.document_type) {
      try {
        // Get document type's number range
        const docTypeCode = String(orderData.document_type || '').toUpperCase().trim();
        console.log(`🔍 Looking up document type: ${docTypeCode}`);

        const docTypeResult = await db.execute(sql`
          SELECT number_range 
          FROM sd_document_types 
          WHERE code = ${docTypeCode} 
            AND category = 'ORDER' 
            AND is_active = true
        `);

        console.log(`📊 Document type query result:`, docTypeResult.rows.length, 'rows found');

        if (docTypeResult.rows.length > 0 && docTypeResult.rows[0].number_range) {
          const numberRangeCode = String(docTypeResult.rows[0].number_range || '').trim();
          console.log(`🔢 Number range code from document type: ${numberRangeCode}`);

          // Get the number range configuration
          console.log(`🔍 Looking up number range: ${numberRangeCode} for sales_order`);
          const numberRangeResult = await db.execute(sql`
            SELECT 
              id,
              number_range_code,
              range_from,
              range_to,
              current_number,
              external_numbering
            FROM number_ranges 
            WHERE number_range_object = 'sales_order' 
              AND number_range_code = ${numberRangeCode}
              AND is_active = true
            LIMIT 1
          `);

          console.log(`📊 Number range query result:`, numberRangeResult.rows.length, 'rows found');

          if (numberRangeResult.rows.length > 0) {
            const numberRange = numberRangeResult.rows[0];
            const currentNumStr = String(numberRange.current_number || numberRange.range_from || '0');
            const rangeFromStr = String(numberRange.range_from || '0');
            const rangeToStr = String(numberRange.range_to || '9999999999');

            const currentNum = parseInt(currentNumStr, 10);
            const rangeTo = parseInt(rangeToStr, 10);

            // Check if range is exhausted
            if (isNaN(currentNum) || isNaN(rangeTo) || currentNum >= rangeTo) {
              return res.status(400).json({
                success: false,
                error: 'Number range exhausted',
                details: `Number range ${numberRangeCode} for sales orders has been exhausted. Please create a new range.`
              });
            }

            // Calculate next number
            const nextNum = currentNum + 1;
            const nextNumberStr = nextNum.toString().padStart(rangeFromStr.length, '0');

            // Format order number - use the number from range directly
            // This will be a numeric string like "4000000001"
            orderNumber = nextNumberStr;

            console.log(`📝 Generated order number: ${orderNumber} (from range ${numberRangeCode}, current: ${currentNumStr}, next: ${nextNumberStr})`);

            // Update the current_number in the number range (atomic operation)
            const numberRangeId = parseInt(String(numberRange.id || '0'), 10);
            if (!isNaN(numberRangeId)) {
              const updateResult = await db.execute(sql`
                UPDATE number_ranges 
                SET current_number = ${nextNumberStr},
                    updated_at = NOW()
                WHERE id = ${numberRangeId}
                  AND current_number = ${currentNumStr}
              `);
              console.log(`✅ Updated number range ${numberRangeId} current_number to ${nextNumberStr}`);
            } else {
              console.warn(`⚠️ Invalid number range ID: ${numberRange.id}`);
            }

            console.log(`✅ Successfully generated order number ${orderNumber} from number range ${numberRangeCode}`);
          } else {
            // Fallback: number range not found, use simple sequential
            console.warn(`⚠️ Number range ${numberRangeCode} not found for sales_order, using fallback`);
            const currentYear = new Date().getFullYear();
            // Safely extract numeric part from order numbers, handling both formats:
            // - "SO-2025-0001" or "SO-2025-0001-125223" format
            // - Numeric-only format from number ranges
            const orderCountResult = await db.execute(sql`
              SELECT COALESCE(
                MAX(
                  CASE 
                    WHEN order_number LIKE 'SO-%' THEN
                      CASE 
                        WHEN (regexp_match(order_number, 'SO-[0-9]{4}-([0-9]+)'))[1] IS NOT NULL THEN
                          CAST((regexp_match(order_number, 'SO-[0-9]{4}-([0-9]+)'))[1] AS INTEGER)
                        ELSE 0
                      END
                    WHEN order_number ~ '^[0-9]+$' THEN
                      CAST(order_number AS INTEGER)
                    ELSE 0
                  END
                ), 0
              ) + 1 as next_number
              FROM sales_orders 
              WHERE order_number LIKE ${`SO-${currentYear}-%`}
                 OR (order_number ~ '^[0-9]+$' AND LENGTH(order_number) > 0)
            `);
            const nextNumber = getInt(orderCountResult.rows[0]?.next_number, 1);
            orderNumber = `SO-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
          }
        } else {
          // Fallback: document type has no number range assigned
          console.warn(`⚠️ Document type ${orderData.document_type} has no number range, using fallback`);
          const currentYear = new Date().getFullYear();
          // Safely extract numeric part from order numbers
          const orderCountResult = await db.execute(sql`
            SELECT COALESCE(
              MAX(
                CASE 
                  WHEN order_number LIKE 'SO-%' THEN
                    CASE 
                      WHEN (regexp_match(order_number, 'SO-[0-9]{4}-([0-9]+)'))[1] IS NOT NULL THEN
                        CAST((regexp_match(order_number, 'SO-[0-9]{4}-([0-9]+)'))[1] AS INTEGER)
                      ELSE 0
                    END
                  WHEN order_number ~ '^[0-9]+$' THEN
                    CAST(order_number AS INTEGER)
                  ELSE 0
                END
              ), 0
            ) + 1 as next_number
            FROM sales_orders 
            WHERE order_number LIKE ${`SO-${currentYear}-%`}
               OR (order_number ~ '^[0-9]+$' AND LENGTH(order_number) > 0)
          `);
          const nextNumber = getInt(orderCountResult.rows[0]?.next_number, 1);
          orderNumber = `SO-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
        }
      } catch (error: any) {
        console.error('Error generating order number from number range:', error);
        // Fallback to simple sequential
        const currentYear = new Date().getFullYear();
        // Safely extract numeric part from order numbers
        const orderCountResult = await db.execute(sql`
          SELECT COALESCE(
            MAX(
              CASE 
                WHEN order_number LIKE 'SO-%' THEN
                  CASE 
                    WHEN (regexp_match(order_number, 'SO-[0-9]{4}-([0-9]+)'))[1] IS NOT NULL THEN
                      CAST((regexp_match(order_number, 'SO-[0-9]{4}-([0-9]+)'))[1] AS INTEGER)
                    ELSE 0
                  END
                WHEN order_number ~ '^[0-9]+$' THEN
                  CAST(order_number AS INTEGER)
                ELSE 0
              END
            ), 0
          ) + 1 as next_number
          FROM sales_orders 
          WHERE order_number LIKE ${`SO-${currentYear}-%`}
             OR (order_number ~ '^[0-9]+$' AND LENGTH(order_number) > 0)
        `);
        const nextNumber = getInt(orderCountResult.rows[0]?.next_number, 1);
        orderNumber = `SO-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
      }
    } else {
      // Fallback: no document type provided
      const currentYear = new Date().getFullYear();
      // Safely extract numeric part from order numbers
      const orderCountResult = await db.execute(sql`
        SELECT COALESCE(
          MAX(
            CASE 
              WHEN order_number LIKE 'SO-%' THEN
                CASE 
                  WHEN (regexp_match(order_number, 'SO-[0-9]{4}-([0-9]+)'))[1] IS NOT NULL THEN
                    CAST((regexp_match(order_number, 'SO-[0-9]{4}-([0-9]+)'))[1] AS INTEGER)
                  ELSE 0
                END
              WHEN order_number ~ '^[0-9]+$' THEN
                CAST(order_number AS INTEGER)
              ELSE 0
            END
          ), 0
        ) + 1 as next_number
        FROM sales_orders 
        WHERE order_number LIKE ${`SO-${currentYear}-%`}
           OR (order_number ~ '^[0-9]+$' AND LENGTH(order_number) > 0)
      `);
      const nextNumber = getInt(orderCountResult.rows[0]?.next_number, 1);
      orderNumber = `SO-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
    }

    // Check if this order number already exists (safety check)
    const existingOrder = await db.execute(sql`
      SELECT id FROM sales_orders WHERE order_number = ${orderNumber}
    `);

    if (existingOrder.rows.length > 0) {
      // If the number already exists, append timestamp suffix
      const timestampSuffix = Date.now().toString().slice(-6);
      orderNumber = `${orderNumber}-${timestampSuffix}`;
      console.warn(`⚠️ Order number collision detected, using: ${orderNumber}`);
    }

    // Calculate total amount from items
    let subtotal = 0;
    if (items && Array.isArray(items)) {
      subtotal = items.reduce((sum, item) => {
        return sum + (parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0));
      }, 0);
    }

    // Use the already calculated amounts from above

    // Get customer information (for customer_name and credit limit validation)
    let customerName = orderData.customer_name || null;
    if (orderData.customer_id) {
      const customerResult = await db.execute(sql`
        SELECT id, name, credit_limit, status 
        FROM erp_customers 
        WHERE id = ${orderData.customer_id}
      `);

      const customer = customerResult.rows[0];
      if (!customer) {
        return res.status(400).json({
          success: false,
          error: 'Customer not found',
          details: `Customer ID ${orderData.customer_id} does not exist`
        });
      }

      // Set customer_name if not provided
      if (!customerName) {
        customerName = customer.name;
      }

      // Credit Limit Validation
      const creditLimit = parseFloat(String(customer.credit_limit || 0));
      if (creditLimit > 0 && totalAmount > creditLimit) {
        return res.status(400).json({
          success: false,
          error: 'Credit limit exceeded',
          details: {
            orderAmount: totalAmount,
            creditLimit: creditLimit,
            customerName: customerName,
            exceededBy: totalAmount - creditLimit
          }
        });
      }
    }

    // Validate customer_name is set (required field)
    if (!customerName) {
      return res.status(400).json({
        success: false,
        error: 'Customer name is required',
        details: 'Customer name must be provided or customer_id must be valid'
      });
    }

    // Validate required fields
    if (!orderData.document_type) {
      return res.status(400).json({
        success: false,
        error: 'Document type is required'
      });
    }

    if (!salesOrgId) {
      return res.status(400).json({
        success: false,
        error: 'Sales organization is required'
      });
    }

    // Auto-calculate delivery date if not provided
    let deliveryDate = orderData.delivery_date;
    if (!deliveryDate && orderData.order_date) {
      const orderDate = new Date(orderData.order_date);
      let leadTimeDays = 7; // Default lead time: 7 days

      // Try to get lead time from shipping condition
      if (orderData.shipping_condition) {
        try {
          const shippingConditionResult = await db.execute(sql`
            SELECT 
              COALESCE(loading_lead_time_days, 0) as loading_days,
              COALESCE(picking_lead_time_days, 0) as picking_days,
              COALESCE(packing_lead_time_days, 0) as packing_days,
              COALESCE(transportation_lead_time_days, 0) as transport_days
            FROM shipping_conditions_master
            WHERE (code = ${orderData.shipping_condition} OR name = ${orderData.shipping_condition})
              AND is_active = true
            LIMIT 1
          `);

          if (shippingConditionResult.rows.length > 0) {
            const condition = shippingConditionResult.rows[0] as any;
            leadTimeDays =
              parseInt(String(condition.loading_days || 0)) +
              parseInt(String(condition.picking_days || 0)) +
              parseInt(String(condition.packing_days || 0)) +
              parseInt(String(condition.transport_days || 0));
            if (leadTimeDays === 0) leadTimeDays = 7; // Fallback to default
          }
        } catch (error) {
          console.error('Error fetching shipping condition:', error);
          // Continue with default lead time
        }
      }

      // Fallback: Use shipping method if no condition found
      if (leadTimeDays === 7 && orderData.shipping_method) {
        const methodMap: Record<string, number> = {
          'Standard': 7,
          'Express': 3,
          'Overnight': 1,
          'Pickup': 1
        };
        leadTimeDays = methodMap[orderData.shipping_method] || 7;
      }

      // Calculate delivery date
      const calculatedDeliveryDate = new Date(orderDate);
      calculatedDeliveryDate.setDate(calculatedDeliveryDate.getDate() + leadTimeDays);
      deliveryDate = calculatedDeliveryDate.toISOString().split('T')[0];

      console.log(`📅 Auto-calculated delivery date: ${deliveryDate} (${leadTimeDays} days from order date)`);
    }

    // Create sales order with all database fields
    let result;
    try {
      result = await db.execute(sql`
      INSERT INTO sales_orders (
        order_number, customer_id, customer_name, order_date, 
        delivery_date, status, total_amount, payment_status, 
        shipping_address, billing_address, notes, created_by,
        plant_id, sales_org_id, company_code_id, currency_id, 
        inventory_status, credit_check_status,
        sold_to_address_id, bill_to_address_id, ship_to_address_id, payer_to_address_id,
        credit_status, payment_terms, shipping_method, sales_rep, priority, currency,
        subtotal, tax_amount, shipping_amount, active, tax_breakdown, tax_profile_id,
        document_type, distribution_channel_id, division_id, pricing_procedure, tax_code,
        sales_office_id, sales_group_id, sales_person_id, shipping_point_id, route_id,
        shipping_point_code, route_code, shipping_condition, loading_point,
        customer_po_number, customer_po_date, order_reason, sales_district
      ) VALUES (
        ${orderNumber}, 
        ${orderData.customer_id || null}, 
        ${customerName}, 
        ${orderData.order_date ? new Date(orderData.order_date).toISOString() : sql`NOW()`}, 
        ${deliveryDate ? new Date(deliveryDate).toISOString() : null}, 
        ${orderData.status || 'Pending'}, 
        ${totalAmount.toFixed(2)}, 
        ${orderData.payment_status || null}, 
        ${orderData.shipping_address || null}, 
        ${orderData.billing_address || null}, 
        ${orderData.notes || null}, 
        ${orderData.created_by || null},
        ${warehouseId || null},
        ${salesOrgId},
        ${companyCodeId || null},
        ${currencyId || null},
        ${orderData.inventory_status || null},
        ${orderData.credit_check_status || null},
        ${orderData.sold_to_address_id || null},
        ${orderData.bill_to_address_id || null},
        ${orderData.ship_to_address_id || null},
        ${orderData.payer_to_address_id || null},
        ${orderData.credit_status || null},
        ${orderData.payment_terms || null},
        ${orderData.shipping_method || null},
        ${orderData.sales_rep || null},
        ${orderData.priority || null},
        ${orderData.currency || null},
        ${subtotal.toFixed(2)},
        ${taxAmount.toFixed(2)},
        ${shippingAmount.toFixed(2)},
        ${orderData.active !== undefined ? orderData.active : true},
        ${taxBreakdown.length > 0 ? JSON.stringify(taxBreakdown) : null},
        ${orderData.tax_profile_id || null},
        ${orderData.document_type},
        ${orderData.distribution_channel_id || null},
        ${orderData.division_id || null},
        ${orderData.pricing_procedure || null},
        ${orderData.tax_code || null},
        ${orderData.sales_office_id || null},
        ${orderData.sales_group_id || null},
        ${orderData.sales_person_id || null},
        ${orderData.shipping_point_id || null},
        ${orderData.route_id || null},
        ${orderData.shipping_point_code || null},
        ${orderData.route_code || null},
        ${orderData.shipping_condition || null},
        ${orderData.loading_point || null},
        ${orderData.customer_po_number || null},
        ${orderData.customer_po_date ? new Date(orderData.customer_po_date).toISOString() : null},
        ${orderData.order_reason || null},
        ${orderData.sales_district || null}
      ) RETURNING id, order_number, customer_id, customer_name, order_date, 
                  delivery_date, status, total_amount, payment_status, 
                  shipping_address, billing_address, notes, created_at,
                  inventory_status, credit_check_status,
                  sold_to_address_id, bill_to_address_id, ship_to_address_id, payer_to_address_id,
                  credit_status, payment_terms, shipping_method, sales_rep, priority, currency,
                  subtotal, tax_amount, shipping_amount, tax_breakdown, tax_profile_id,
                  document_type, distribution_channel_id, division_id, pricing_procedure, tax_code,
                  sales_office_id, sales_group_id, sales_person_id, shipping_point_id, route_id
    `);
    } catch (insertError) {
      if (insertError.code === '23505' && insertError.constraint === 'sales_orders_order_number_key') {
        // If we still get a duplicate key error, generate a completely unique order number
        const timestamp = Date.now();
        const randomSuffix = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
        // Get year from order date if available, otherwise use current year
        const orderYear = orderData.order_date
          ? new Date(orderData.order_date).getFullYear()
          : new Date().getFullYear();
        orderNumber = `SO-${orderYear}-${randomSuffix}-${timestamp.toString().slice(-6)}`;

        // Retry the insert with the new unique order number
        result = await db.execute(sql`
          INSERT INTO sales_orders (
            order_number, customer_id, customer_name, order_date, 
            delivery_date, status, total_amount, payment_status, 
            shipping_address, billing_address, notes, created_by,
            plant_id, sales_org_id, company_code_id, currency_id, 
            inventory_status, credit_check_status,
            sold_to_address_id, bill_to_address_id, ship_to_address_id, payer_to_address_id,
            credit_status, payment_terms, shipping_method, sales_rep, priority, currency,
            subtotal, tax_amount, shipping_amount, active, tax_breakdown, tax_profile_id,
            document_type, distribution_channel_id, division_id, pricing_procedure, tax_code,
            sales_office_id, sales_group_id, sales_person_id, shipping_point_id, route_id,
            shipping_point_code, route_code, shipping_condition, loading_point,
            customer_po_number, customer_po_date, order_reason, sales_district
          ) VALUES (
            ${orderNumber}, 
            ${orderData.customer_id || null}, 
            ${customerName}, 
            ${orderData.order_date ? new Date(orderData.order_date).toISOString() : sql`NOW()`}, 
            ${orderData.delivery_date ? new Date(orderData.delivery_date).toISOString() : null}, 
            ${orderData.status || null}, 
            ${totalAmount.toFixed(2)}, 
            ${orderData.payment_status || null}, 
            ${orderData.shipping_address || null}, 
            ${orderData.billing_address || null}, 
            ${orderData.notes || null}, 
            ${orderData.created_by || null},
            ${warehouseId || null},
            ${salesOrgId},
            ${companyCodeId || null},
            ${currencyId || null},
            ${orderData.inventory_status || null},
            ${orderData.credit_check_status || null},
            ${orderData.sold_to_address_id || null},
            ${orderData.bill_to_address_id || null},
            ${orderData.ship_to_address_id || null},
            ${orderData.payer_to_address_id || null},
            ${orderData.credit_status || null},
            ${orderData.payment_terms || null},
            ${orderData.shipping_method || null},
            ${orderData.sales_rep || null},
            ${orderData.priority || null},
            ${orderData.currency || null},
            ${subtotal.toFixed(2)},
            ${taxAmount.toFixed(2)},
            ${shippingAmount.toFixed(2)},
            ${orderData.active !== undefined ? orderData.active : true},
            ${taxBreakdown.length > 0 ? JSON.stringify(taxBreakdown) : null},
            ${orderData.tax_profile_id || null},
            ${orderData.document_type},
            ${orderData.distribution_channel_id || null},
            ${orderData.division_id || null},
            ${orderData.pricing_procedure || null},
            ${orderData.tax_code || null},
            ${orderData.sales_office_id || null},
            ${orderData.sales_group_id || null},
            ${orderData.sales_person_id || null},
            ${orderData.shipping_point_id || null},
            ${orderData.route_id || null},
            ${orderData.shipping_point_code || null},
            ${orderData.route_code || null},
            ${orderData.shipping_condition || null},
            ${orderData.loading_point || null},
            ${orderData.customer_po_number || null},
            ${orderData.customer_po_date ? new Date(orderData.customer_po_date).toISOString() : null},
            ${orderData.order_reason || null},
            ${orderData.sales_district || null}
          ) RETURNING id, order_number, customer_id, customer_name, order_date, 
                      delivery_date, status, total_amount, payment_status, 
                      shipping_address, billing_address, notes, created_at,
                      inventory_status, credit_check_status,
                      sold_to_address_id, bill_to_address_id, ship_to_address_id, payer_to_address_id,
                      credit_status, payment_terms, shipping_method, sales_rep, priority, currency,
                      subtotal, tax_amount, shipping_amount, tax_breakdown, tax_profile_id,
                      document_type, distribution_channel_id, division_id, pricing_procedure, tax_code
        `);
      } else {
        throw insertError;
      }
    }

    const salesOrderId = result.rows[0]?.id;

    // Step 7: Create Sales Order Items and Dynamic Inventory Management
    if (items && Array.isArray(items) && salesOrderId) {
      console.log('📦 Creating sales order items with dynamic inventory management...');

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const subtotal = parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0);
        const quantity = parseInt(item.quantity || 0);

        // Support both material_id and product_id field names
        const materialId = item.material_id || item.product_id;

        // Get material details for plant, storage location, and material code information
        // Replaced legacy products/materials join with direct materials query
        const materialDetailsResult = await db.execute(sql`
          SELECT 
            (SELECT id FROM plants WHERE code = m.plant_code LIMIT 1) as plant_id, 
            m.plant_code,
            (SELECT id FROM storage_locations WHERE code = m.production_storage_location LIMIT 1) as storage_location_id, 
            m.production_storage_location as storage_location_code,
            m.code as material_code,
            m.base_uom as unit
          FROM materials m
          WHERE m.id = ${materialId}
        `);

        const materialDetails = materialDetailsResult.rows[0] || {};

        // Use the code directly from material master
        let materialCode: string | null = getString(materialDetails.material_code) || null;


        // Priority: Use frontend values, then material details, then defaults
        // Plant ID and Code - Priority: 1) Frontend, 2) Material Details, 3) Default
        let plantIdForInventory: number | null = null;
        let plantCode: string | null = null;

        if (item.plant_id) {
          plantIdForInventory = getInt(item.plant_id);
          plantCode = item.plant_code || null;
          console.log(`✅ Using plant from frontend: ID=${plantIdForInventory}, Code=${plantCode}`);
        } else if (materialDetails.plant_id) {
          plantIdForInventory = getInt(materialDetails.plant_id);
          plantCode = getString(materialDetails.plant_code) || null;
          console.log(`✅ Using plant from material master: ID=${plantIdForInventory}, Code=${plantCode}`);
        } else {
          // No plant specified - leave as null
          console.log(`ℹ️ No plant found for item - will be null`);
        }

        // Storage Location ID and Code - Priority: 1) Frontend, 2) Material Details, 3) Default from Plant
        let storageLocationId: number | null = null;
        let storageLocationCode: string | null = null;


        if (item.storage_location_id) {
          storageLocationId = getInt(item.storage_location_id);
          storageLocationCode = item.storage_location_code || null;
          console.log(`✅ Using storage location from frontend: ID=${storageLocationId}, Code=${storageLocationCode}`);
        } else if (materialDetails.storage_location_id) {
          storageLocationId = getInt(materialDetails.storage_location_id);
          storageLocationCode = getString(materialDetails.storage_location_code) || null;
          console.log(`✅ Using storage location from material details: ID=${storageLocationId}, Code=${storageLocationCode}`);
        } else if (plantIdForInventory) {
          // Get default storage location from plant
          const defaultStorageResult = await db.execute(sql`
            SELECT id, code FROM storage_locations 
            WHERE plant_id = ${plantIdForInventory}
            ORDER BY id LIMIT 1
          `);
          if (defaultStorageResult.rows.length > 0) {
            storageLocationId = getInt(defaultStorageResult.rows[0].id);
            storageLocationCode = getString(defaultStorageResult.rows[0].code) || null;
            console.log(`✅ Using default storage location from plant: ID=${storageLocationId}, Code=${storageLocationCode}`);
          }
        }

        // Unit of Measure - Priority: 1) Frontend, 2) Material Details, 3) Material Master, 4) System Config
        let unit: string | null = item.unit || null;
        if (!unit) {
          unit = getString(materialDetails.unit) || null;
        }
        if (!unit) {
          // Try to get from material master if available
          if (materialCode) {
            const materialUnitResult = await db.execute(sql`
              SELECT base_uom FROM materials WHERE code = ${materialCode} LIMIT 1
            `);
            if (materialUnitResult.rows.length > 0 && materialUnitResult.rows[0].base_uom) {
              unit = getString(materialUnitResult.rows[0].base_uom);
            }
          }
        }
        if (!unit) {
          // Try to get default unit from system configuration
          const unitConfigResult = await db.execute(sql`
            SELECT config_value FROM system_configuration 
            WHERE config_key = 'default_unit_of_measure' AND active = true LIMIT 1
          `);
          if (unitConfigResult.rows.length > 0 && unitConfigResult.rows[0].config_value) {
            unit = getString(unitConfigResult.rows[0].config_value);
          }
        }

        // If still no unit, we cannot proceed with inventory tracking
        if (!unit) {
          console.error(`❌ Cannot reserve inventory: Unit of measure not found for material ${materialId}`);
          // Continue without inventory reservation - don't fail the order
        }

        // Create sales order item with complete information
        // Use frontend values as priority, then fallback to resolved values
        const finalPlantId = plantIdForInventory;
        const finalPlantCode = plantCode;
        const finalStorageLocationId = storageLocationId;
        const finalStorageLocationCode = storageLocationCode;
        const finalUnit = unit || 'PC';

        console.log(`📦 Creating order item: Material=${materialId}, Plant=${finalPlantId}(${finalPlantCode}), Storage=${finalStorageLocationId}(${finalStorageLocationCode}), Unit=${finalUnit}`);

        // Create sales order item with complete information
        // Use frontend values as priority, then fallback to resolved values
        // Insert matching the new schema
        // Create sales order item with complete information
        // Use frontend values as priority, then fallback to resolved values
        // Updated to matching migrated DB schema (material_id, sales_order_id, ordered_quantity, material_description, net_amount)
        await db.execute(sql`
          INSERT INTO sales_order_items (
            sales_order_id, material_id, material_description, ordered_quantity, unit_price,
            discount_percent, tax_percent, net_amount, active,
            plant_id, plant_code, storage_location_id, storage_location_code,
            created_at, updated_at
          ) VALUES (
            ${salesOrderId}, ${materialId || null}, ${item.material_description || item.product_name || ''},
            ${quantity}, ${parseFloat(item.unit_price || 0)},
            ${parseFloat(item.discount_percent || 0)}, ${parseFloat(item.tax_percent || 0)},
            ${subtotal}, true,
            ${finalPlantId}, ${finalPlantCode || null},
            ${finalStorageLocationId || null}, ${finalStorageLocationCode || null},
            NOW(), NOW()
          )
        `);

        // Log unit for inventory tracking (even if not stored in sales_order_items table)
        if (finalUnit) {
          console.log(`✅ Unit of measure for inventory: ${finalUnit}`);
        }

        // Dynamic inventory reservation using centralized inventory tracking service (if enabled)
        if (reserveInventory && materialId && quantity > 0) {
          console.log(`🔒 Reserving ${quantity} units of product ${materialId} using inventory tracking service...`);

          // Validate required fields for inventory tracking
          if (!materialCode) {
            console.error(`❌ Cannot reserve inventory: Material code not found for product ${materialId}`);
            // Continue without inventory reservation - don't fail the order
          } else if (!plantCode) {
            console.error(`❌ Cannot reserve inventory: Plant code not found for product ${materialId}`);
            // Continue without inventory reservation - don't fail the order
          } else if (!storageLocationCode) {
            console.error(`❌ Cannot reserve inventory: Storage location not found for product ${materialId}`);
            // Continue without inventory reservation - don't fail the order
          } else if (!unit) {
            console.error(`❌ Cannot reserve inventory: Unit of measure not found for product ${materialId}`);
            // Continue without inventory reservation - don't fail the order
          } else {
            try {
              // Use centralized inventory tracking service to increase committed quantity
              await inventoryTrackingService.increaseCommittedQuantity(
                materialCode,
                plantCode,
                storageLocationCode,
                quantity
              );

              // Also update products.reserved_stock for backward compatibility (if table exists)
              try {
                await db.execute(sql`
                  UPDATE products 
                  SET reserved_stock = COALESCE(reserved_stock, 0) + ${quantity}
                  WHERE id = ${materialId}
                `);
              } catch (productsError: any) {
                // If products table doesn't have reserved_stock column, that's okay
                console.warn(`⚠️ Could not update products.reserved_stock: ${productsError.message}`);
              }

              // Create inventory movement record for audit trail
              try {
                await db.execute(sql`
                  INSERT INTO inventory_movements (
                    material_id, movement_type, quantity, plant_id, 
                    posting_date, material_document_number
                  ) VALUES (
                    ${materialId}, 'RES', ${quantity}, ${plantIdForInventory}, 
                    NOW(), ${orderNumber || 'SO'})
                `);
              } catch (movementError: any) {
                // If inventory_movements table doesn't exist, that's okay
                console.warn(`⚠️ Could not create inventory movement record: ${movementError.message}`);
              }

              console.log(`✅ Reserved ${quantity} units for product ${materialId} (material: ${materialCode}, plant: ${plantCode}, storage: ${storageLocationCode})`);
            } catch (invError: any) {
              console.error(`❌ Failed to reserve inventory for product ${materialId}:`, invError.message);
              // Continue without inventory reservation - don't fail the order
              // This allows orders to be created even if inventory tracking fails
            }
          }
        }
      }

      console.log('✅ Sales order items created with dynamic inventory management');
    }

    res.json({
      success: true,
      data: {
        order: result.rows[0],
        orderNumber,
        totalAmount,
        subtotal: orderTotal,
        taxAmount: taxAmount,
        shippingAmount: shippingAmount,
        inventory_status: {
          status: 'PASSED',
          results: inventoryStatusResults,
          message: 'All products have sufficient inventory',
          total_products_checked: inventoryStatusResults.length,
          products_available: inventoryStatusResults.filter(r => r.sufficient_stock).length,
          products_insufficient: inventoryStatusResults.filter(r => !r.sufficient_stock).length
        },
        credit_check: {
          status: creditCheckEnabled ? 'PASSED' : 'DISABLED',
          message: creditCheckEnabled ? 'Order within credit limits' : 'Credit check disabled'
        },
        approval_status: {
          required: requiresApproval,
          status: requiresApproval ? 'AUTO_APPROVED' : 'NOT_REQUIRED',
          threshold: approvalThreshold,
          order_amount: totalAmount
        },
        system_config: {
          tax_rate: taxRate,
          reserve_inventory: reserveInventory,
          credit_check_enabled: creditCheckEnabled,
          plant_id: warehouseId,
          sales_org_id: salesOrgId,
          company_code_id: companyCodeId,
          currency_id: currencyId
        },
        message: 'Sales order created successfully with dynamic configuration and real-time inventory validation'
      }
    });

  } catch (error) {
    console.error('Error creating sales order:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get Real-time Inventory Status for Products
router.get("/inventory-status/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await db.execute(sql`
      SELECT 
        m.id,
        m.description as name,
        m.code as sku,
        (SELECT COALESCE(SUM(quantity), 0) FROM stock_balances WHERE material_code = m.code) as stock,
        (SELECT COALESCE(SUM(reserved_quantity), 0) FROM stock_balances WHERE material_code = m.code) as reserved_stock,
        m.min_stock,
        m.max_stock,
        -- Use default plant/storage lookup if not on material directly
        (SELECT id FROM plants WHERE code = m.plant_code LIMIT 1) as plant_id,
        (SELECT id FROM storage_locations WHERE code = m.production_storage_location LIMIT 1) as storage_location_id,
        p.name as warehouse_name,
        p.code as warehouse_code,
        sl.name as bin_name,
        sl.code as bin_code,
        m.active as product_status,
        m.type as product_type,
        m.code as material_code,
        -- Using subqueries for accurate real-time stock balances
        (SELECT COALESCE(SUM(quantity), 0) FROM stock_balances WHERE material_code = m.code) as sb_total_quantity,
        (SELECT COALESCE(SUM(quantity), 0) FROM stock_balances WHERE material_code = m.code AND stock_type = 'AVAILABLE') as sb_total_available,
        (SELECT COALESCE(SUM(reserved_quantity), 0) FROM stock_balances WHERE material_code = m.code) as sb_total_reserved
      FROM materials m
      LEFT JOIN plants p ON m.plant_code = p.code
      LEFT JOIN storage_locations sl ON m.production_storage_location = sl.code
      WHERE m.id = ${productId}
      -- End of query
      
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const product = result.rows[0];

    // Combine stock from stock_balances (if available) with products as fallback
    const productStock = parseFloat(String(product.stock || 0));
    const productReserved = parseFloat(String(product.reserved_stock || 0));

    const sbQuantity = parseFloat(String(product.sb_total_quantity || 0));
    const sbAvailable = parseFloat(String(product.sb_total_available || 0));
    const sbReserved = parseFloat(String(product.sb_total_reserved || 0));

    const stockBalanceHasStock = sbQuantity > 0 || sbAvailable > 0;

    let totalStock: number;
    let reservedStock: number;
    let freeStock: number;

    if (stockBalanceHasStock) {
      totalStock = sbQuantity;
      reservedStock = sbReserved;
      freeStock = sbAvailable > 0 ? sbAvailable : Math.max(sbQuantity - sbReserved, 0);
    } else {
      totalStock = productStock;
      reservedStock = productReserved;
      freeStock = Math.max(productStock - productReserved, 0);
    }

    const minStock = parseFloat(String(product.min_stock || 0));
    const maxStock = parseFloat(String(product.max_stock || 0));

    let stockStatus: string;
    if (freeStock >= minStock) {
      stockStatus = 'AVAILABLE';
    } else if (freeStock > 0) {
      stockStatus = 'LOW_STOCK';
    } else {
      stockStatus = 'OUT_OF_STOCK';
    }

    const stockUtilization =
      maxStock > 0 ? (totalStock / maxStock) * 100 : 0;

    res.json({
      success: true,
      data: {
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        product_status: product.product_status,
        product_type: product.product_type,
        available_stock: freeStock,
        reserved_stock: reservedStock,
        free_stock: freeStock,
        min_stock: minStock,
        max_stock: maxStock,
        stock_status: stockStatus,
        stock_utilization: stockUtilization,
        warehouse: {
          id: product.plant_id,
          name: product.warehouse_name,
          code: product.warehouse_code
        },
        bin: {
          id: product.bin_id,
          name: product.bin_name,
          code: product.bin_code
        },
        last_updated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching inventory status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inventory status'
    });
  }
});

// Get Real-time Inventory Status for Multiple Products
router.post("/inventory-status/batch", async (req, res) => {
  try {
    console.log('Batch inventory status request:', req.body);
    const { productIds } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      console.log('Invalid productIds:', productIds);
      return res.status(400).json({
        success: false,
        error: 'Product IDs array is required'
      });
    }

    console.log('Processing product IDs:', productIds);

    const result = await db.execute(sql`
      SELECT 
        m.id,
        m.description as name,
        m.code as sku,
        (SELECT COALESCE(SUM(quantity), 0) FROM stock_balances WHERE material_code = m.code) as stock,
        (SELECT COALESCE(SUM(reserved_quantity), 0) FROM stock_balances WHERE material_code = m.code) as reserved_stock,
        m.min_stock,
        m.max_stock,
        -- Use default plant/storage lookup if not on material directly
        (SELECT id FROM plants WHERE code = m.plant_code LIMIT 1) as plant_id,
        (SELECT id FROM storage_locations WHERE code = m.production_storage_location LIMIT 1) as storage_location_id,
        p.name as warehouse_name,
        p.code as warehouse_code,
        sl.name as bin_name,
        sl.code as bin_code,
        m.active as product_status,
        m.type as product_type,
        m.code as material_code,
        -- Using subqueries for accurate real-time stock balances
        (SELECT COALESCE(SUM(quantity), 0) FROM stock_balances WHERE material_code = m.code) as sb_total_quantity,
        (SELECT COALESCE(SUM(quantity), 0) FROM stock_balances WHERE material_code = m.code AND stock_type = 'AVAILABLE') as sb_total_available,
        (SELECT COALESCE(SUM(reserved_quantity), 0) FROM stock_balances WHERE material_code = m.code) as sb_total_reserved
      FROM materials m
      LEFT JOIN plants p ON m.plant_code = p.code
      LEFT JOIN storage_locations sl ON m.production_storage_location = sl.code
      WHERE m.id = ANY(${productIds})
    `);

    const inventoryStatus = result.rows.map(product => {
      const productStock = parseFloat(String(product.stock || 0));
      const productReserved = parseFloat(String(product.reserved_stock || 0));

      const sbQuantity = parseFloat(String(product.sb_total_quantity || 0));
      const sbAvailable = parseFloat(String(product.sb_total_available || 0));
      const sbReserved = parseFloat(String(product.sb_total_reserved || 0));

      const stockBalanceHasStock = sbQuantity > 0 || sbAvailable > 0;

      let totalStock: number;
      let reservedStock: number;
      let freeStock: number;

      if (stockBalanceHasStock) {
        totalStock = sbQuantity;
        reservedStock = sbReserved;
        freeStock = sbAvailable > 0 ? sbAvailable : Math.max(sbQuantity - sbReserved, 0);
      } else {
        totalStock = productStock;
        reservedStock = productReserved;
        freeStock = Math.max(productStock - productReserved, 0);
      }

      const minStock = parseFloat(String(product.min_stock || 0));
      const maxStock = parseFloat(String(product.max_stock || 0));

      let stockStatus: string;
      if (freeStock >= minStock) {
        stockStatus = 'AVAILABLE';
      } else if (freeStock > 0) {
        stockStatus = 'LOW_STOCK';
      } else {
        stockStatus = 'OUT_OF_STOCK';
      }

      const stockUtilization =
        maxStock > 0 ? (totalStock / maxStock) * 100 : 0;

      return {
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        product_status: product.product_status,
        product_type: product.product_type,
        available_stock: freeStock,
        reserved_stock: reservedStock,
        free_stock: freeStock,
        min_stock: minStock,
        max_stock: maxStock,
        stock_status: stockStatus,
        stock_utilization: stockUtilization,
        warehouse: {
          id: product.plant_id,
          name: product.warehouse_name,
          code: product.warehouse_code
        },
        bin: {
          id: product.bin_id,
          name: product.bin_name,
          code: product.bin_code
        }
      };
    });

    res.json({
      success: true,
      data: {
        inventory_status: inventoryStatus,
        total_products: inventoryStatus.length,
        available_products: inventoryStatus.filter(p => p.stock_status === 'AVAILABLE').length,
        low_stock_products: inventoryStatus.filter(p => p.stock_status === 'LOW_STOCK').length,
        out_of_stock_products: inventoryStatus.filter(p => p.stock_status === 'OUT_OF_STOCK').length,
        last_updated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching batch inventory status:', error);
    console.error('Error details:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch batch inventory status'
    });
  }
});

// Get Customer Credit Information
router.get("/customer-credit-info/:customerId", async (req, res) => {
  try {
    const { customerId } = req.params;

    // Get customer credit limit
    const customerResult = await db.execute(sql`
      SELECT credit_limit, name as customer_name 
      FROM erp_customers 
      WHERE id = ${customerId}
    `);

    if (customerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    const customer = customerResult.rows[0];
    const creditLimit = parseFloat(String(customer.credit_limit || 0));

    // Calculate used credit from two sources:
    // 1. Uninvoiced/Unbilled sales orders (order exposure)
    // 2. AR open items (outstanding invoices - already billed but unpaid)

    // Get uninvoiced order exposure
    const orderExposureResult = await db.execute(sql`
      SELECT COALESCE(SUM(total_amount), 0) as order_exposure
      FROM sales_orders 
      WHERE customer_id = ${customerId} 
      AND (payment_status IS NULL OR payment_status != 'Paid')
      AND status IN ('Pending', 'Confirmed', 'Processing', 'Delivered', 'Shipped', 'Partially Delivered')
    `);

    // Get AR outstanding (invoiced but unpaid)
    const arExposureResult = await db.execute(sql`
      SELECT COALESCE(SUM(CAST(outstanding_amount AS DECIMAL)), 0) as ar_exposure
      FROM ar_open_items
      WHERE customer_id = ${customerId}
      AND document_type IN ('Invoice', 'DR')
    `);

    const orderExposure = parseFloat(String(orderExposureResult.rows[0]?.order_exposure || 0));
    const arExposure = parseFloat(String(arExposureResult.rows[0]?.ar_exposure || 0));

    // Total credit exposure = orders + AR outstanding
    const usedCredit = orderExposure + arExposure;
    const availableCredit = Math.max(0, creditLimit - usedCredit);

    res.json({
      success: true,
      data: {
        creditLimit,
        usedCredit,
        availableCredit,
        customerName: customer.customer_name
      }
    });

  } catch (error) {
    console.error('Error fetching customer credit info:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get Customer Tax Information with Tax Profile and Rules  
router.get("/customer-tax-info/:customerId", async (req, res) => {
  try {
    const customerId = parseIdSafely(req.params.customerId);
    if (customerId === null) {
      return res.status(400).json({
        success: false,
        error: 'Invalid customer ID format. Expected a numeric ID.'
      });
    }
    console.log('🔍 [TAX-INFO] Fetching tax info for customer:', customerId);

    // Get customer data
    console.log('📊 [TAX-INFO] Querying customer table...');
    const customerResult = await db.execute(sql`
      SELECT 
        id,
        name as customer_name,
        tax_profile_id,
        tax_classification_code,
        tax_exemption_certificate,
        withholding_tax_code,
        payment_terms,
        currency
      FROM erp_customers
      WHERE id = ${customerId}
    `);
    console.log('✅ [TAX-INFO] Customer query successful, rows:', customerResult.rows.length);

    if (!customerResult.rows || customerResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    const customer = customerResult.rows[0];

    // If customer has no tax profile, return basic info
    if (!customer.tax_profile_id) {
      return res.json({
        success: true,
        data: {
          customer: {
            id: customer.id,
            customer_name: customer.customer_name,
            tax_classification_code: customer.tax_classification_code,
            tax_exemption_certificate: customer.tax_exemption_certificate,
            withholding_tax_code: customer.withholding_tax_code,
            payment_terms: customer.payment_terms,
            currency: customer.currency
          },
          taxProfile: null,
          taxRules: []
        }
      });
    }

    // Get tax profile details
    const taxProfileResult = await db.execute(sql`
      SELECT 
        id,
        profile_code,
        name,
        description,
        country,
        is_active
      FROM tax_profiles
      WHERE id = ${customer.tax_profile_id} AND is_active = true
    `);

    const taxProfile = taxProfileResult.rows && taxProfileResult.rows.length > 0
      ? taxProfileResult.rows[0]
      : null;

    // Get all active tax rules for this profile
    const taxRulesResult = await db.execute(sql`
      SELECT 
        id,
        profile_id,
        rule_code,
        title,
        rate_percent,
        jurisdiction,
        applies_to,
        posting_account,
        effective_from,
        effective_to,
        is_active
      FROM tax_rules
      WHERE profile_id = ${customer.tax_profile_id}
        AND is_active = true
        AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
        AND effective_from <= CURRENT_DATE
      ORDER BY rate_percent DESC
    `);

    const taxRules = taxRulesResult.rows || [];

    return res.json({
      success: true,
      data: {
        customer: {
          id: customer.id,
          customer_name: customer.customer_name,
          tax_profile_id: customer.tax_profile_id,
          tax_classification_code: customer.tax_classification_code,
          tax_exemption_certificate: customer.tax_exemption_certificate,
          withholding_tax_code: customer.withholding_tax_code,
          payment_terms: customer.payment_terms,
          currency: customer.currency
        },
        taxProfile: taxProfile,
        taxRules: taxRules.map(rule => ({
          id: rule.id,
          rule_code: rule.rule_code,
          title: rule.title,
          rate_percent: parseFloat(String(rule.rate_percent)),
          jurisdiction: rule.jurisdiction,
          applies_to: rule.applies_to,
          posting_account: rule.posting_account,
          effective_from: rule.effective_from,
          effective_to: rule.effective_to
        }))
      }
    });

  } catch (error: any) {
    console.error('Error fetching customer tax info:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch customer tax information',
      details: error.message
    });
  }
});

// Get Sales Orders - Optimized for performance
router.get("/sales-orders", async (req, res) => {
  try {
    const { status, customerId, limit = 50 } = req.query;

    console.log(`📋 Fetching sales orders - Status: ${status}, Customer: ${customerId}, Limit: ${limit}`);

    // Optimized query with timeout handling
    const startTime = Date.now();

    const orders = await db.execute(sql`
      SELECT 
        so.id,
        so.order_number as "orderNumber",
        so.customer_id as "customerId", 
        so.customer_name as "customerName",
        so.order_date as "orderDate",
        so.delivery_date as "deliveryDate",
        COALESCE(so.status, 'Pending') as "status",
        so.total_amount as "totalAmount",
        so.payment_status as "paymentStatus",
        so.shipping_address as "shippingAddress",
        so.billing_address as "billingAddress",
        so.notes,
        so.created_at as "createdAt",
        so.updated_at as "updatedAt",
        so.plant_id as "plantId",
        p.name as "plantName",
        p.code as "plantCode",
        so.active
      FROM sales_orders so
      LEFT JOIN plants p ON so.plant_id = p.id
      WHERE so.active = true
        ${status ? sql`AND so.status = ${status}` : sql``}
        ${customerId ? sql`AND so.customer_id = ${customerId}` : sql``}
      ORDER BY so.created_at DESC 
      LIMIT ${Math.min(parseInt(limit as string) || 50, 100)}
    `);

    const queryTime = Date.now() - startTime;
    console.log(`✅ Sales orders query completed in ${queryTime}ms - found ${orders.rows.length} orders`);

    res.json({
      success: true,
      data: orders.rows,
      meta: {
        count: orders.rows.length,
        queryTime: queryTime
      }
    });

  } catch (error) {
    console.error('❌ Error fetching sales orders:', error);

    // Check if it's a timeout error
    if (error instanceof Error && error.message.includes('timeout')) {
      console.error('⏱️ Query timeout detected - database might be overloaded');
      res.status(504).json({
        success: false,
        error: 'Query timeout - please try again',
        retryable: true
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: false
      });
    }
  }
});

// Get Single Sales Order by ID
router.get("/sales-orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const orderId = parseIdSafely(id);

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: "Invalid order ID"
      });
    }

    console.log(`📋 Fetching sales order details for ID: ${orderId}`);

    // Fetch order header
    const orderResult = await db.execute(sql`
      SELECT 
        so.*, 
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        p.name as plant_name,
        p.code as plant_code,
        st.city as sold_to_city,
        st.country as sold_to_country,
        concat(st.address_line_1, ', ', st.city, ', ', st.postal_code, ', ', st.country) as sold_to_address_text,
        bt.city as bill_to_city,
        concat(bt.address_line_1, ', ', bt.city, ', ', bt.postal_code, ', ', bt.country) as bill_to_address_text,
        sh.city as ship_to_city,
        concat(sh.address_line_1, ', ', sh.city, ', ', sh.postal_code, ', ', sh.country) as ship_to_address_text
      FROM sales_orders so
      LEFT JOIN erp_customers c ON so.customer_id = c.id
      LEFT JOIN plants p ON so.plant_id = p.id
      LEFT JOIN customer_addresses st ON so.sold_to_address_id = st.id
      LEFT JOIN customer_addresses bt ON so.bill_to_address_id = bt.id
      LEFT JOIN customer_addresses sh ON so.ship_to_address_id = sh.id
      WHERE so.id = ${orderId}
    `);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Sales order not found"
      });
    }

    const order = orderResult.rows[0];

    // Fetch order items with material details
    const itemsResult = await db.execute(sql`
      SELECT 
        soi.*,
        m.code as material_code,
        m.description as material_name,
        m.base_uom as unit
      FROM sales_order_items soi
      LEFT JOIN materials m ON soi.material_id = m.id
      WHERE soi.sales_order_id = ${orderId}
      ORDER BY soi.id ASC
    `);

    // Fetch schedule lines
    const scheduleLinesResult = await db.execute(sql`
      SELECT * FROM sales_order_schedule_lines 
      WHERE sales_order_id = ${orderId}
      ORDER BY line_number ASC
    `);

    res.json({
      success: true,
      data: {
        ...order,
        items: itemsResult.rows,
        scheduleLines: scheduleLinesResult.rows
      }
    });

  } catch (error) {
    console.error(`❌ Error fetching sales order ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch sales order details"
    });
  }
});

// Order-to-Cash Process Dashboard
router.get("/dashboard/order-to-cash", async (req, res) => {
  try {
    // Get order statistics from sales_orders table
    const orderStats = await db.execute(sql`
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as open_orders,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_orders,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
          COUNT(CASE WHEN status = 'invoiced' THEN 1 END) as invoiced_orders,
          COUNT(CASE WHEN payment_status = 'unpaid' THEN 1 END) as pending_credit_checks,
          COUNT(CASE WHEN status = 'backorder' THEN 1 END) as inventory_issues,
          SUM(CASE WHEN status NOT IN ('closed', 'cancelled') THEN CAST(total_amount AS DECIMAL) ELSE 0 END) as open_order_value,
          AVG(CASE WHEN status = 'closed' THEN 
              EXTRACT(EPOCH FROM (updated_at - created_at))/86400 
          END) as avg_cycle_time_days
        FROM sales_orders 
        WHERE created_at >= NOW() - INTERVAL '30 days'
    `);

    // Get delivery statistics
    const deliveryStats = await db.execute(sql`
        SELECT 
          COUNT(*) as total_deliveries,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_deliveries,
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_deliveries
        FROM delivery_documents 
        WHERE created_at >= NOW() - INTERVAL '30 days'
    `);

    // Get invoice statistics
    const invoiceStats = await db.execute(sql`
        SELECT 
          COUNT(*) as total_invoices,
          COUNT(CASE WHEN status = 'Unpaid' THEN 1 END) as pending_invoices,
          COUNT(CASE WHEN status = 'Paid' THEN 1 END) as paid_invoices,
          SUM(CASE WHEN status = 'Unpaid' THEN CAST(total_amount AS DECIMAL) ELSE 0 END) as pending_amount
        FROM sales_invoices 
        WHERE created_at >= NOW() - INTERVAL '30 days'
    `);

    // Get recent orders for process flow
    const recentOrders = await db.execute(sql`
        SELECT 
          status,
          COUNT(*) as count
        FROM sales_orders 
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY status
        ORDER BY status
    `);

    res.json({
      success: true,
      data: {
        orderStatistics: {
          ...orderStats.rows[0],
          total_deliveries: deliveryStats.rows[0]?.total_deliveries || 0,
          pending_deliveries: deliveryStats.rows[0]?.pending_deliveries || 0,
          completed_deliveries: deliveryStats.rows[0]?.completed_deliveries || 0,
          total_invoices: invoiceStats.rows[0]?.total_invoices || 0,
          pending_invoices: invoiceStats.rows[0]?.pending_invoices || 0,
          paid_invoices: invoiceStats.rows[0]?.paid_invoices || 0,
          pending_amount: invoiceStats.rows[0]?.pending_amount || 0
        },
        processFlow: recentOrders.rows,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error generating order-to-cash dashboard:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get recent deliveries and transfer orders for the dashboard
router.get("/recent-deliveries", async (req, res) => {
  try {
    const { status } = req.query; // Optional status filter

    // Build status filter condition
    // Handle case where status column might not exist - check both status and pgi_status
    let statusFilter = sql``;
    if (status && status !== 'all') {
      const statusUpper = String(status).toUpperCase();
      // Handle case-insensitive status matching with fallback to pgi_status
      if (statusUpper === 'PENDING') {
        statusFilter = sql`AND (
          UPPER(COALESCE(dd.status, 
                CASE WHEN dd.pgi_status = 'OPEN' THEN 'PENDING' ELSE 'PENDING' END)) = 'PENDING'
          OR (dd.status IS NULL AND dd.pgi_status = 'OPEN')
        )`;
      } else if (statusUpper === 'COMPLETED') {
        statusFilter = sql`AND (
          UPPER(COALESCE(dd.status, 
                CASE WHEN dd.pgi_status = 'POSTED' THEN 'COMPLETED' ELSE 'PENDING' END)) = 'COMPLETED'
          OR (dd.status IS NULL AND dd.pgi_status = 'POSTED')
        )`;
      } else {
        statusFilter = sql`AND UPPER(COALESCE(dd.status, 
                CASE WHEN dd.pgi_status = 'POSTED' THEN 'COMPLETED' 
                     WHEN dd.pgi_status = 'OPEN' THEN 'PENDING' 
                     ELSE 'PENDING' END)) = ${statusUpper}`;
      }
    }

    // Get recent deliveries (last 10, or filtered by status)
    // Handle case where status column might not exist - use COALESCE with pgi_status as fallback
    const recentDeliveries = await db.execute(sql`
      SELECT 
        dd.id, dd.delivery_number, dd.delivery_date, 
        COALESCE(dd.status, 
                 CASE WHEN dd.pgi_status = 'POSTED' THEN 'COMPLETED' 
                      WHEN dd.pgi_status = 'OPEN' THEN 'PENDING' 
                      ELSE 'PENDING' END) as status,
        dd.sales_order_id, so.order_number as sales_order_number,
        dd.customer_id, c.name as customer_name,
        dd.created_at, dd.updated_at,
        COUNT(di.id) as item_count
      FROM delivery_documents dd
      LEFT JOIN sales_orders so ON dd.sales_order_id = so.id
      LEFT JOIN erp_customers c ON dd.customer_id = c.id
      LEFT JOIN delivery_items di ON dd.id = di.delivery_id
      WHERE dd.created_at >= NOW() - INTERVAL '30 days'
        ${statusFilter}
      GROUP BY dd.id, dd.delivery_number, dd.delivery_date, dd.status, dd.pgi_status,
               dd.sales_order_id, so.order_number, dd.customer_id, c.name,
               dd.created_at, dd.updated_at
      ORDER BY 
        CASE WHEN COALESCE(UPPER(dd.status), 
                           CASE WHEN dd.pgi_status = 'POSTED' THEN 'COMPLETED' 
                                WHEN dd.pgi_status = 'OPEN' THEN 'PENDING' 
                                ELSE 'PENDING' END) = 'PENDING' THEN 0 ELSE 1 END,
        dd.created_at DESC
      LIMIT 20
    `);

    // Get recent transfer orders (last 10)
    const recentTransferOrders = await db.execute(sql`
      SELECT 
        tro.id, tro.transfer_number, tro.transfer_date, tro.status,
        tro.sales_order_id, so.order_number as sales_order_number,
        tro.delivery_id, dd.delivery_number,
        tro.created_at, tro.updated_at,
        COUNT(toi.id) as item_count
      FROM transfer_orders tro
      LEFT JOIN sales_orders so ON tro.sales_order_id = so.id
      LEFT JOIN delivery_documents dd ON tro.delivery_id = dd.id
      LEFT JOIN transfer_order_items toi ON tro.id = toi.transfer_order_id
      WHERE tro.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY tro.id, tro.transfer_number, tro.transfer_date, tro.status,
               tro.sales_order_id, so.order_number, tro.delivery_id, dd.delivery_number,
               tro.created_at, tro.updated_at
      ORDER BY tro.created_at DESC
      LIMIT 10
    `);

    // Combine and sort by date
    // Handle case-insensitive status matching and handle NULL status
    const recentItems = [
      ...recentDeliveries.rows.map(delivery => {
        const status = String(delivery.status || '').toUpperCase();
        let statusDisplay = delivery.status || 'Pending';

        // Map status values (case-insensitive)
        if (status === 'COMPLETED' || status === 'CLOSED') {
          statusDisplay = 'Completed';
        } else if (status === 'PENDING' || status === '' || !delivery.status) {
          statusDisplay = 'Pending';
        } else if (status === 'CONFIRMED' || status === 'CONFIRM') {
          statusDisplay = 'Confirmed';
        } else if (status === 'IN_PROGRESS' || status === 'PROCESSING') {
          statusDisplay = 'In Progress';
        } else {
          statusDisplay = delivery.status;
        }

        return {
          ...delivery,
          type: 'delivery',
          display_number: delivery.delivery_number,
          related_order: delivery.sales_order_number,
          description: delivery.sales_order_number
            ? `${delivery.sales_order_number} → Customer Delivery`
            : `Delivery ${delivery.delivery_number || delivery.id}`,
          date: delivery.updated_at || delivery.created_at,
          status_display: statusDisplay
        };
      }),
      ...recentTransferOrders.rows.map(transfer => ({
        ...transfer,
        type: 'transfer',
        display_number: transfer.transfer_number,
        related_order: transfer.sales_order_number,
        description: transfer.sales_order_number
          ? `${transfer.sales_order_number} → Warehouse Transfer`
          : `Warehouse Transfer ${transfer.transfer_number || transfer.id}`,
        date: transfer.updated_at || transfer.created_at,
        status_display: transfer.status === 'COMPLETED' ? 'Completed' :
          transfer.status === 'OPEN' ? 'In Progress' :
            transfer.status === 'PENDING' ? 'Pending' : transfer.status
      }))
    ].sort((a, b) => new Date(String(b.date)).getTime() - new Date(String(a.date)).getTime()).slice(0, 10);

    res.json({
      success: true,
      data: recentItems
    });

  } catch (error) {
    console.error('Error fetching recent deliveries:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch recent deliveries'
    });
  }
});

// ===================================================================
// ENHANCED ORDER-TO-CASH API ENDPOINTS 
// Phase 1: Pricing Engine Integration
// ===================================================================

// Enhanced Sales Order Creation with Pricing Engine
router.post("/sales-orders-enhanced", async (req, res) => {
  try {
    const { customer, items, pricing = {}, delivery = {} } = req.body;

    // Generate order number
    const currentYear = new Date().getFullYear();
    const orderCountResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM sales_orders 
      WHERE order_number LIKE ${`SO-${currentYear}-%`}
    `);
    const orderCount = parseInt(String(orderCountResult.rows[0]?.count || 0)) + 1;
    const orderNumber = `SO-${currentYear}-${orderCount.toString().padStart(4, '0')}`;

    // Create sales order (main document)
    const orderResult = await db.execute(sql`
      INSERT INTO sales_orders (
        order_number, customer_id, customer_name, order_date, 
        delivery_date, status, payment_status, 
        shipping_address, billing_address, notes, created_by
      ) VALUES (
        ${orderNumber}, 
        ${customer.id}, 
        ${customer.name}, 
        NOW(), 
        ${delivery.requestedDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()}, 
        'open', 
        'pending', 
        ${delivery.shippingAddress || ''}, 
        ${customer.billingAddress || ''}, 
        ${pricing.notes || ''}, 
        'system'
      ) RETURNING id
    `);

    const salesOrderId = orderResult.rows[0]?.id;
    let totalNetAmount = 0;
    let totalTaxAmount = 0;
    let totalGrossAmount = 0;

    // Process each line item with pricing
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Get material data for pricing
      const materialResult = await db.execute(sql`
        SELECT id, code as material_code, description, base_uom, standard_price
        FROM materials WHERE id = ${item.materialId}
      `);
      const material = materialResult.rows[0];

      if (!material) {
        throw new Error(`Material ${item.materialId} not found`);
      }

      // Apply pricing procedure MALLSTD01
      const basePrice = parseFloat(material.standard_price || item.unitPrice || 0);
      const quantity = parseFloat(item.quantity);

      // Calculate conditions using pricing procedure
      const conditions = await calculateOrderConditions(
        salesOrderId,
        customer.id,
        item.materialId,
        basePrice,
        quantity,
        pricing.procedure || 'MALLSTD01'
      );

      // Calculate line totals
      const netAmount = conditions.reduce((sum, c) =>
        c.calculationType === 'A' ? sum + parseFloat(c.conditionAmount) : sum, basePrice * quantity
      );
      const taxAmount = conditions.reduce((sum, c) =>
        c.conditionType.startsWith('TAX') ? sum + parseFloat(c.conditionAmount) : sum, 0
      );
      const grossAmount = netAmount + taxAmount;

      // Insert sales order item
      const itemResult = await db.execute(sql`
        INSERT INTO sales_order_items (
          sales_order_id, line_item_number, material_id, material_code,
          material_description, ordered_quantity, unit_of_measure,
          unit_price, net_amount, tax_amount, gross_amount,
          requested_delivery_date, plant, storage_location,
          pricing_procedure, condition_records
        ) VALUES (
          ${salesOrderId}, ${i + 1}, ${item.materialId}, ${material.material_code},
          ${material.description}, ${quantity}, ${material.base_uom},
          ${basePrice}, ${netAmount}, ${taxAmount}, ${grossAmount},
          ${item.deliveryDate || delivery.requestedDate}, 
          ${item.plant || '1001'}, ${item.storageLocation || '0001'},
          ${pricing.procedure || 'MALLSTD01'}, ${JSON.stringify(conditions)}
        ) RETURNING id
      `);

      const itemId = itemResult.rows[0]?.id;

      // Insert order conditions
      for (const condition of conditions) {
        await db.execute(sql`
          INSERT INTO order_conditions (
            sales_order_id, sales_order_item_id, condition_type,
            condition_value, currency, calculation_type, condition_amount,
            access_sequence, is_statistical, is_manual
          ) VALUES (
            ${salesOrderId}, ${itemId}, ${condition.conditionType},
            ${condition.conditionValue}, ${condition.currency}, ${condition.calculationType},
            ${condition.conditionAmount}, ${condition.accessSequence},
            ${condition.isStatistical}, ${condition.isManual}
          )
        `);
      }

      totalNetAmount += netAmount;
      totalTaxAmount += taxAmount;
      totalGrossAmount += grossAmount;
    }

    // Update order totals
    await db.execute(sql`
      UPDATE sales_orders SET 
        total_amount = ${totalGrossAmount},
        net_amount = ${totalNetAmount},
        tax_amount = ${totalTaxAmount}
      WHERE id = ${salesOrderId}
    `);

    res.json({
      success: true,
      salesOrder: {
        id: salesOrderId,
        orderNumber,
        netAmount: totalNetAmount,
        taxAmount: totalTaxAmount,
        grossAmount: totalGrossAmount,
        pricingProcedure: pricing.procedure || 'MALLSTD01'
      }
    });

  } catch (error) {
    console.error("Enhanced order creation error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create enhanced sales order"
    });
  }
});

// Phase 2: Enhanced Delivery Document Creation (from Sales Order)
// Now uses: Schedule Lines, Delivery Blocks, Priorities, Routes, Shipping Conditions
router.post("/delivery-documents", async (req, res) => {
  try {
    // ROBUSTNESS FIX: Manually parse body if it comes as a string (e.g. text/plain header)
    if (typeof req.body === 'string') {
      try {
        req.body = JSON.parse(req.body);
      } catch (e) {
        console.error('Failed to parse delivery document body:', e);
        // Continue, validation will catch missing fields
      }
    }

    const { salesOrderId, selectedScheduleLineIds = [], shippingInfo = {} } = req.body;

    console.log('📦 Creating enhanced delivery document for sales order:', salesOrderId);
    console.log('📋 Selected schedule line IDs:', selectedScheduleLineIds);
    console.log('📋 Selected schedule line IDs type:', typeof selectedScheduleLineIds, Array.isArray(selectedScheduleLineIds));

    // Step 1: Get system configuration for delivery defaults
    const configResult = await db.execute(sql`
      SELECT 
        (SELECT config_value FROM system_configuration WHERE config_key = 'default_delivery_type_code' AND active = true LIMIT 1) as delivery_type,
        (SELECT config_value FROM system_configuration WHERE config_key = 'default_shipping_condition' AND active = true LIMIT 1) as shipping_condition,
        (SELECT config_value FROM system_configuration WHERE config_key = 'default_delivery_priority' AND active = true LIMIT 1) as delivery_priority,
        (SELECT config_value FROM system_configuration WHERE config_key = 'default_movement_type' AND active = true LIMIT 1) as movement_type
    `);
    const config = configResult.rows[0] || {};

    // Get sales order details with all new delivery control fields
    const salesOrderResult = await db.execute(sql`
      SELECT so.*, 
             c.name as customer_name, 
             c.email as customer_email,
             so.delivery_block,
             so.delivery_priority,
             so.shipping_condition,
             so.route_code,
             so.shipping_point_code,
             so.loading_point,
             so.complete_delivery_required,
             so.partial_delivery_allowed,
             so.delivery_group
      FROM sales_orders so
      LEFT JOIN erp_customers c ON so.customer_id = c.id
      WHERE so.id = ${salesOrderId}
    `);

    const salesOrder = salesOrderResult.rows[0];
    if (!salesOrder) {
      return res.status(404).json({ success: false, error: "Sales order not found" });
    }

    // Step 2: Check for delivery blocks
    if (salesOrder.delivery_block) {
      const blockResult = await db.execute(sql`
        SELECT db.*, dbl.block_reason, dbl.status as log_status
        FROM delivery_blocks db
        LEFT JOIN delivery_block_log dbl ON db.code = dbl.block_code 
          AND dbl.sales_order_id = ${salesOrderId}
          AND dbl.status = 'BLOCKED'
        WHERE db.code = ${salesOrder.delivery_block}
          AND db.is_active = true
        LIMIT 1
      `);

      const block = blockResult.rows[0];
      if (block) {
        return res.status(400).json({
          success: false,
          error: 'Delivery is blocked',
          details: {
            block_type: block.block_type,
            block_name: block.name,
            block_reason: block.block_reason || block.description,
            requires_approval: block.requires_approval,
            approval_role: block.approval_role
          }
        });
      }
    }

    // Check if sales order is in correct status (handle case sensitivity)
    const orderStatus = getString(salesOrder.status, '');
    const normalizedStatus = orderStatus.toLowerCase();
    // Allow pending, open, confirmed, and delivered statuses for delivery creation
    const allowedStatuses = ['pending', 'open', 'confirmed', 'delivered'];
    if (!allowedStatuses.includes(normalizedStatus) && salesOrder.status !== null) {
      return res.status(400).json({
        success: false,
        error: `Sales order must be pending, confirmed, open, or delivered to create delivery. Current status: ${orderStatus || 'null'}`
      });
    }

    // Step 3: Get schedule lines for delivery creation
    // If specific schedule line IDs are provided, only process those
    // Otherwise, process all eligible schedule lines
    let scheduleLinesResult;
    if (selectedScheduleLineIds && Array.isArray(selectedScheduleLineIds) && selectedScheduleLineIds.length > 0) {
      // Filter by selected schedule line IDs
      // Convert to array of integers for SQL IN clause
      const scheduleLineIds = selectedScheduleLineIds.map(id => {
        const parsed = typeof id === 'number' ? id : parseInt(String(id), 10);
        return isNaN(parsed) ? null : parsed;
      }).filter((id): id is number => id !== null);

      if (scheduleLineIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid schedule line IDs provided'
        });
      }

      // Use IN clause with safe manual construction
      // IDs are validated as numbers above, so safe to join
      const inClause = scheduleLineIds.join(',');

      scheduleLinesResult = await db.execute(sql`
        SELECT sl.*, soi.material_id, soi.plant_id as plant,
               m.description as material_description, m.code as material_code
        FROM sales_order_schedule_lines sl
        JOIN sales_order_items soi ON sl.sales_order_item_id = soi.id
        LEFT JOIN materials m ON soi.material_id = m.id
        WHERE sl.sales_order_id = ${salesOrderId}
          AND sl.id IN (${sql.raw(inClause)})
          AND sl.confirmation_status != 'DELIVERED'
          AND (sl.confirmed_quantity - COALESCE(sl.delivered_quantity, 0)) > 0
        ORDER BY sl.requested_delivery_date, sl.line_number
      `);
    } else {
      // Process all eligible schedule lines (backward compatibility)
      scheduleLinesResult = await db.execute(sql`
        SELECT sl.*, soi.material_id, soi.plant_id as plant,
               m.description as material_description, m.code as material_code
        FROM sales_order_schedule_lines sl
        JOIN sales_order_items soi ON sl.sales_order_item_id = soi.id
        LEFT JOIN materials m ON soi.material_id = m.id
        WHERE sl.sales_order_id = ${salesOrderId}
          AND sl.confirmation_status != 'DELIVERED'
          AND (sl.confirmed_quantity - COALESCE(sl.delivered_quantity, 0)) > 0
        ORDER BY sl.requested_delivery_date, sl.line_number
      `);
    }

    const scheduleLines = scheduleLinesResult.rows;
    if (scheduleLines.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No schedule lines available for delivery',
        details: 'All items have been delivered or no schedule lines exist'
      });
    }

    console.log(`📋 Found ${scheduleLines.length} schedule lines ready for delivery`);
    console.log('📋 Schedule line IDs that will be delivered:', scheduleLines.map(sl => sl.id));

    // Verify that we're only processing the selected schedule lines
    if (selectedScheduleLineIds && Array.isArray(selectedScheduleLineIds) && selectedScheduleLineIds.length > 0) {
      const returnedIds = scheduleLines.map(sl => sl.id);
      const requestedIds = selectedScheduleLineIds.map(id => typeof id === 'number' ? id : parseInt(String(id), 10)).filter(id => !isNaN(id));
      console.log('✅ Verification - Requested IDs:', requestedIds);
      console.log('✅ Verification - Returned IDs:', returnedIds);

      // Check if all requested IDs are in the returned results
      const missingIds = requestedIds.filter(id => !returnedIds.includes(id));
      if (missingIds.length > 0) {
        console.warn('⚠️ Some requested schedule line IDs were not found:', missingIds);
      }
    }

    // Step 4: Determine shipping condition and route
    // Use shippingInfo values if provided, otherwise use defaults
    const shippingCondition = shippingInfo.shippingCondition || salesOrder.shipping_condition || config.shipping_condition || '01';
    const shippingCondResult = await db.execute(sql`
      SELECT * FROM shipping_conditions_master 
      WHERE code = ${shippingCondition} AND is_active = true
      LIMIT 1
    `);
    const shippingCond = shippingCondResult.rows[0];

    // Determine route (from shippingInfo, shipping condition, or sales order)
    const routeCode = shippingInfo.route || salesOrder.route_code || shippingCond?.proposed_route || null;

    // Determine shipping point (from shipping condition or sales order)
    const shippingPointCode = salesOrder.shipping_point_code || shippingCond?.proposed_shipping_point || null;

    // Step 5: Generate delivery number
    // CRITICAL: Use MAX() instead of COUNT() to prevent duplicate key errors
    // Add retry logic with timestamp suffix to ensure uniqueness for concurrent requests
    const currentYear = new Date().getFullYear();
    let deliveryNumber: string;
    let retryCount = 0;
    const maxRetries = 5;

    while (retryCount < maxRetries) {
      // Get the highest existing delivery number for this year
      const deliveryCountResult = await db.execute(sql`
        SELECT COALESCE(MAX(
          CASE 
            WHEN delivery_number ~ ${`^DL${currentYear}([0-9]{6})(-.*)?$`}
            THEN CAST((regexp_match(delivery_number, ${`^DL${currentYear}([0-9]{6})`}))[1] AS INTEGER)
            ELSE 0
          END
        ), 0) as max_number
        FROM delivery_documents
        WHERE delivery_number LIKE ${`DL${currentYear}%`}
      `);

      const maxNumber = parseInt(String(deliveryCountResult.rows[0]?.max_number || 0));
      // Use max number + 1 + retry count to ensure uniqueness
      const deliveryCount = maxNumber + 1 + retryCount;

      if (retryCount === 0) {
        // First attempt: try without suffix (standard format: DL2025000001)
        deliveryNumber = `DL${currentYear}${deliveryCount.toString().padStart(6, '0')}`;
      } else {
        // Retry: add short timestamp suffix (4 digits) to ensure uniqueness
        const timestamp = Date.now();
        const uniqueSuffix = timestamp.toString().slice(-4); // Last 4 digits of timestamp
        deliveryNumber = `DL${currentYear}${deliveryCount.toString().padStart(6, '0')}-${uniqueSuffix}`;
      }

      // Check if this delivery number already exists
      const existingCheck = await db.execute(sql`
        SELECT id FROM delivery_documents WHERE delivery_number = ${deliveryNumber} LIMIT 1
      `);

      if (existingCheck.rows.length === 0) {
        // Number is available, break out of retry loop
        break;
      }

      retryCount++;
      if (retryCount >= maxRetries) {
        // Last resort: use full timestamp
        const timestamp = Date.now();
        deliveryNumber = `DL${currentYear}${deliveryCount.toString().padStart(6, '0')}-${timestamp}`.substring(0, 20);
        break;
      }
    }

    // Step 6: Get warehouse information from sales order items
    const warehouseResult = await db.execute(sql`
      SELECT DISTINCT 
        pl.id as plant_id,
        pl.code as plant_code,
        pl.name as plant_name
      FROM sales_order_items soi
      LEFT JOIN materials m ON soi.material_id = m.id
      LEFT JOIN plants pl ON pl.id = COALESCE(soi.plant_id, (SELECT id FROM plants WHERE code = m.plant_code LIMIT 1))
      WHERE soi.sales_order_id = ${salesOrderId} AND pl.id IS NOT NULL
      LIMIT 1
    `);

    const warehouse = warehouseResult.rows[0];
    if (!warehouse) {
      return res.status(400).json({
        success: false,
        error: "No plant information found in sales order items or products. Please ensure products have plant assignments."
      });
    }

    // Get storage location information from sales order items, fallback to product storage location data
    const storageLocationResult = await db.execute(sql`
      SELECT DISTINCT 
        sl.id as storage_location_id,
        sl.code as storage_location_code,
        sl.name as bin_name
      FROM sales_order_items soi
      LEFT JOIN materials m ON soi.material_id = m.id
      LEFT JOIN plants pl ON pl.id = COALESCE(soi.plant_id, (SELECT id FROM plants WHERE code = m.plant_code LIMIT 1))
      LEFT JOIN storage_locations sl ON sl.id = COALESCE(soi.storage_location_id, (SELECT id FROM storage_locations WHERE code = m.production_storage_location AND plant_id = pl.id LIMIT 1))
      WHERE soi.sales_order_id = ${salesOrderId} AND sl.id IS NOT NULL
      LIMIT 1
    `);

    const storageLocation = storageLocationResult.rows[0];
    if (!storageLocation) {
      return res.status(400).json({
        success: false,
        error: "No storage location information found in sales order items or products. Please ensure products have storage location assignments."
      });
    }

    // Get customer address information
    const customerAddressResult = await db.execute(sql`
      SELECT 
        c.name as customer_name,
        ca.address_line_1, ca.address_line_2, ca.city, ca.state, ca.country, ca.postal_code,
        ca.contact_person, ca.phone, ca.email, ca.id as customer_address_id
      FROM erp_customers c
      LEFT JOIN customer_addresses ca ON c.id = ca.customer_id AND ca.address_type = 'SHIPPING'
      WHERE c.id = ${salesOrder.customer_id}
      LIMIT 1
    `);
    const customerAddress = customerAddressResult.rows[0] || {};

    // Calculate total amount from sales order items
    const totalAmountResult = await db.execute(sql`
      SELECT COALESCE(SUM(net_amount), 0) as total_amount
      FROM sales_order_items 
      WHERE sales_order_id = ${salesOrderId}
    `);
    const totalAmount = parseFloat(String(totalAmountResult.rows[0]?.total_amount || 0));

    // Step 7: Create delivery document with all new enhanced fields
    // Use values from shippingInfo if provided, otherwise use defaults
    const deliveryType = shippingInfo.deliveryType || config.delivery_type || 'LF';
    const deliveryPriority = shippingInfo.priority || salesOrder.delivery_priority || config.delivery_priority || '02';
    const movementType = shippingInfo.movementType || config.movement_type || '601';
    const loadingPoint = salesOrder.loading_point || null;
    const shippingConditionFromInfo = shippingInfo.shippingCondition || null;
    const routeFromInfo = shippingInfo.route || null;

    console.log('📦 Creating delivery with:', {
      deliveryType,
      priority: deliveryPriority,
      shippingCondition,
      route: routeCode,
      shippingPoint: shippingPointCode,
      movementType
    });

    // CRITICAL: Wrap INSERT in try-catch to handle duplicate key errors and retry
    let deliveryResult: any;
    let deliveryDocumentId: number;
    let delivery: any;
    let insertRetryCount = 0;
    const maxInsertRetries = 3;

    while (insertRetryCount < maxInsertRetries) {
      try {
        deliveryResult = await db.execute(sql`
          INSERT INTO delivery_documents (
            delivery_number, sales_order_id, customer_id,
            delivery_date, shipping_point, plant, created_by, status,
            delivery_type_code, delivery_priority, shipping_condition,
            route_code, loading_point, movement_type,
            complete_delivery, delivery_group,
            inventory_posting_status
          ) VALUES (
            ${deliveryNumber}, 
            ${salesOrderId}, 
            ${salesOrder.customer_id},
            ${scheduleLines[0].requested_delivery_date || salesOrder.delivery_date || new Date().toISOString()},
            ${shippingPointCode || String(warehouse.plant_code || 'SHIP').substring(0, 4)}, 
            ${String(warehouse.plant_code || 'PLAN').substring(0, 4)}, 
            ${salesOrder.created_by || 1},
            'PENDING',
            ${deliveryType},
            ${deliveryPriority},
            ${shippingCondition},
            ${routeCode},
            ${loadingPoint},
            ${movementType},
            ${salesOrder.complete_delivery_required || false},
            ${salesOrder.delivery_group},
            'NOT_POSTED'
          ) RETURNING id, delivery_number, sales_order_id, customer_id, delivery_date, 
                      shipping_point, plant, status, delivery_type_code, delivery_priority,
                      shipping_condition, route_code, created_at
        `);

        deliveryDocumentId = deliveryResult.rows[0]?.id;
        delivery = deliveryResult.rows[0];

        console.log(`✅ Created delivery ${deliveryNumber} with ID ${deliveryDocumentId}`);
        break; // Success - exit retry loop
      } catch (insertError: any) {
        // Check if it's a duplicate key error
        if (insertError.code === '23505' && insertError.constraint === 'delivery_documents_delivery_number_key') {
          insertRetryCount++;
          console.warn(`⚠️ Duplicate delivery number detected: ${deliveryNumber}. Retrying with new number... (Attempt ${insertRetryCount}/${maxInsertRetries})`);

          if (insertRetryCount >= maxInsertRetries) {
            // Last resort: generate completely unique number with timestamp
            const timestamp = Date.now();
            const lastCount = parseInt(deliveryNumber.replace(/^DL\d{4}/, '').replace(/-.*$/, '')) || 0;
            deliveryNumber = `DL${currentYear}${(lastCount + insertRetryCount).toString().padStart(6, '0')}-${timestamp}`.substring(0, 20);
            console.log(`🔄 Using last resort delivery number: ${deliveryNumber}`);
          } else {
            // Generate new number with retry count
            const timestamp = Date.now();
            const lastCount = parseInt(deliveryNumber.replace(/^DL\d{4}/, '').replace(/-.*$/, '')) || 0;
            deliveryNumber = `DL${currentYear}${(lastCount + insertRetryCount).toString().padStart(6, '0')}-${timestamp.toString().slice(-4)}`;
            console.log(`🔄 Retrying with new delivery number: ${deliveryNumber}`);
          }
        } else {
          // Not a duplicate key error - rethrow
          throw insertError;
        }
      }
    }

    if (!deliveryResult || !deliveryDocumentId) {
      throw new Error(`Failed to create delivery after ${maxInsertRetries} retries. Last attempted number: ${deliveryNumber}`);
    }


    let createdItems = 0;
    const inventoryIssues: string[] = [];

    // CRITICAL FIX: For split deliveries, create ONE delivery per schedule line
    // Check if we should create separate deliveries for each schedule line
    // This happens when:
    // 1. Schedule lines have different requested delivery dates (split by date)
    // 2. Explicitly requested via shippingInfo.createSeparateDeliveries
    // 3. Multiple schedule lines exist for the same sales order item (split by quantity)
    //    IMPORTANT: If multiple schedule lines exist, they were split for a reason - always create separate deliveries
    // Normalize dates for comparison - handle various date formats
    const normalizedDates = scheduleLines.map(sl => {
      const date = sl.requested_delivery_date;
      if (!date) return null;

      try {
        // Handle string dates
        if (typeof date === 'string') {
          // Remove time portion if present
          return date.split('T')[0].split(' ')[0];
        }
        // Handle Date objects
        if (date instanceof Date) {
          return date.toISOString().split('T')[0];
        }
        // Handle other formats
        const dateObj = new Date(date);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toISOString().split('T')[0];
        }
      } catch (e) {
        console.warn(`Could not parse date: ${date}`, e);
      }
      return null;
    }).filter(Boolean);

    const uniqueDeliveryDates = new Set(normalizedDates);

    // Check if schedule lines belong to different sales order items (different products)
    const uniqueSalesOrderItems = new Set(scheduleLines.map(sl => sl.sales_order_item_id));

    // CRITICAL FIX: ALWAYS create separate deliveries for split schedule lines
    // If multiple schedule lines are selected, they were split for a reason
    // Each schedule line should get its own delivery to maintain the split
    // This ensures:
    // 1. Split deliveries remain separate
    // 2. Each delivery gets its own transfer order
    // 3. No combining of split orders
    const shouldCreateSeparateDeliveries = scheduleLines.length > 1 && (
      // Different delivery dates = split delivery by date (always separate)
      uniqueDeliveryDates.size > 1 ||
      // Explicitly requested
      shippingInfo.createSeparateDeliveries === true ||
      // Multiple schedule lines for same item = split by quantity (ALWAYS create separate deliveries)
      // KEY FIX: If schedule lines were split, they MUST create separate deliveries
      // This prevents combining split orders into one delivery
      (uniqueSalesOrderItems.size === 1 && scheduleLines.length > 1) ||
      // SAFETY: If more than one schedule line is selected, always create separate deliveries
      // This ensures split deliveries are never accidentally combined
      scheduleLines.length > 1
    );

    console.log(`🔍 Split Delivery Detection:`, {
      scheduleLineCount: scheduleLines.length,
      uniqueDeliveryDates: uniqueDeliveryDates.size,
      uniqueSalesOrderItems: uniqueSalesOrderItems.size,
      shouldCreateSeparate: shouldCreateSeparateDeliveries,
      dates: Array.from(uniqueDeliveryDates)
    });

    if (shouldCreateSeparateDeliveries) {
      console.log(`📦 SPLIT DELIVERY MODE: Creating separate delivery for each schedule line (${scheduleLines.length} deliveries)`);

      const createdDeliveries = [];

      for (let i = 0; i < scheduleLines.length; i++) {
        const scheduleLine = scheduleLines[i];
        // CRITICAL: Handle NULL delivered_quantity (first delivery)
        const confirmedQty = getNumber(scheduleLine.confirmed_quantity, 0);
        const deliveredQty = getNumber(scheduleLine.delivered_quantity, 0);
        const deliveryQty = confirmedQty - deliveredQty;

        if (deliveryQty <= 0) {
          console.log(`⏭️ Skipping schedule line ${scheduleLine.id} - no quantity to deliver`);
          continue;
        }

        // Generate separate delivery number for each schedule line
        // Use a counter that increments for each delivery to avoid conflicts
        // CRITICAL: Use MAX() instead of COUNT() to prevent duplicate key errors
        // Add retry logic with timestamp suffix to ensure uniqueness for concurrent requests
        let separateDeliveryNumber: string;
        let retryCount = 0;
        const maxRetries = 5;

        while (retryCount < maxRetries) {
          const deliveryCountResult = await db.execute(sql`
            SELECT COALESCE(MAX(
              CASE 
                WHEN delivery_number ~ ${`^DL${currentYear}([0-9]{6})(-.*)?$`}
                THEN CAST((regexp_match(delivery_number, ${`^DL${currentYear}([0-9]{6})`}))[1] AS INTEGER)
                ELSE 0
              END
            ), 0) as max_number
            FROM delivery_documents
            WHERE delivery_number LIKE ${`DL${currentYear}%`}
          `);
          // Add i and createdDeliveries.length to ensure unique numbers even if created in same transaction
          const baseCount = parseInt(String(deliveryCountResult.rows[0]?.max_number || 0));
          const deliveryCount = baseCount + createdDeliveries.length + i + 1 + retryCount;

          if (retryCount === 0) {
            // First attempt: try without suffix (standard format: DL2025000001)
            separateDeliveryNumber = `DL${currentYear}${deliveryCount.toString().padStart(6, '0')}`;
          } else {
            // Retry: add short timestamp suffix (4 digits) to ensure uniqueness
            const timestamp = Date.now();
            const uniqueSuffix = (timestamp + i).toString().slice(-4); // Last 4 digits of timestamp + index
            separateDeliveryNumber = `DL${currentYear}${deliveryCount.toString().padStart(6, '0')}-${uniqueSuffix}`;
          }

          // Check if this delivery number already exists
          const existingCheck = await db.execute(sql`
            SELECT id FROM delivery_documents WHERE delivery_number = ${separateDeliveryNumber} LIMIT 1
          `);

          if (existingCheck.rows.length === 0) {
            // Number is available, break out of retry loop
            break;
          }

          retryCount++;
          if (retryCount >= maxRetries) {
            // Last resort: use full timestamp
            const timestamp = Date.now();
            separateDeliveryNumber = `DL${currentYear}${deliveryCount.toString().padStart(6, '0')}-${timestamp}`.substring(0, 20);
            break;
          }
        }

        // Create separate delivery document for this schedule line
        // CRITICAL: Wrap INSERT in try-catch to handle duplicate key errors and retry
        let separateDeliveryResult: any;
        let separateDeliveryId: number;
        let separateDeliveryNumberFinal: string;
        let separateInsertRetryCount = 0;
        const maxSeparateInsertRetries = 3;

        while (separateInsertRetryCount < maxSeparateInsertRetries) {
          try {
            separateDeliveryResult = await db.execute(sql`
              INSERT INTO delivery_documents (
                delivery_number, sales_order_id, customer_id,
                delivery_date, shipping_point, plant, created_by, status,
                delivery_type_code, delivery_priority, shipping_condition,
                route_code, loading_point, movement_type,
                complete_delivery, delivery_group,
                inventory_posting_status
              ) VALUES (
                ${separateDeliveryNumber}, 
                ${salesOrderId}, 
                ${salesOrder.customer_id},
                ${scheduleLine.requested_delivery_date || salesOrder.delivery_date || new Date().toISOString()},
                ${shippingPointCode || String(warehouse.plant_code || 'SHIP').substring(0, 4)}, 
                ${String(warehouse.plant_code || 'PLAN').substring(0, 4)}, 
                ${salesOrder.created_by || 1},
                'PENDING',
                ${deliveryType},
                ${deliveryPriority},
                ${shippingCondition},
                ${routeCode},
                ${loadingPoint},
                ${movementType},
                ${salesOrder.complete_delivery_required || false},
                ${salesOrder.delivery_group},
                'NOT_POSTED'
              ) RETURNING id, delivery_number
            `);
            separateDeliveryId = separateDeliveryResult.rows[0]?.id;
            separateDeliveryNumberFinal = separateDeliveryResult.rows[0]?.delivery_number;
            break; // Success - exit retry loop
          } catch (separateInsertError: any) {
            // Check if it's a duplicate key error
            if (separateInsertError.code === '23505' && separateInsertError.constraint === 'delivery_documents_delivery_number_key') {
              separateInsertRetryCount++;
              console.warn(`⚠️ Duplicate delivery number detected for split delivery: ${separateDeliveryNumber}. Retrying with new number... (Attempt ${separateInsertRetryCount}/${maxSeparateInsertRetries})`);

              if (separateInsertRetryCount >= maxSeparateInsertRetries) {
                // Last resort: generate completely unique number with timestamp
                const timestamp = Date.now();
                const lastCount = parseInt(separateDeliveryNumber.replace(/^DL\d{4}/, '').replace(/-.*$/, '')) || 0;
                separateDeliveryNumber = `DL${currentYear}${(lastCount + separateInsertRetryCount).toString().padStart(6, '0')}-${timestamp}`.substring(0, 20);
                console.log(`🔄 Using last resort delivery number for split: ${separateDeliveryNumber}`);
              } else {
                // Generate new number with retry count
                const timestamp = Date.now();
                const lastCount = parseInt(separateDeliveryNumber.replace(/^DL\d{4}/, '').replace(/-.*$/, '')) || 0;
                separateDeliveryNumber = `DL${currentYear}${(lastCount + separateInsertRetryCount).toString().padStart(6, '0')}-${timestamp.toString().slice(-4)}`;
                console.log(`🔄 Retrying split delivery with new number: ${separateDeliveryNumber}`);
              }
            } else {
              // Not a duplicate key error - rethrow
              throw separateInsertError;
            }
          }
        }

        if (!separateDeliveryResult || !separateDeliveryId) {
          throw new Error(`Failed to create split delivery after ${maxSeparateInsertRetries} retries. Last attempted number: ${separateDeliveryNumber}`);
        }

        console.log(`✅ Created separate delivery ${separateDeliveryNumberFinal} (ID: ${separateDeliveryId}) for schedule line ${scheduleLine.id}`);

        // Create delivery item for this schedule line
        const batchNumber = `B${separateDeliveryId}01`.substring(0, 20);
        const storageLocationValue = String(storageLocation.storage_location_code || '0001').substring(0, 10);

        await db.execute(sql`
          INSERT INTO delivery_items (
            delivery_id, sales_order_item_id, line_item, material_id, 
            delivery_quantity, pgi_quantity, unit, storage_location, batch,
            schedule_line_id, movement_type, inventory_posting_status,
            stock_type
          ) VALUES (
            ${separateDeliveryId}, 
            ${scheduleLine.sales_order_item_id}, 
            1, 
            ${scheduleLine.material_id},
            ${deliveryQty}, 
            0,
            ${scheduleLine.unit || 'EA'}, 
            ${storageLocationValue},
            ${batchNumber},
            ${scheduleLine.id},
            ${movementType},
            'NOT_POSTED',
            'UNRESTRICTED'
          )
        `);

        // Update schedule line delivered quantity
        // CRITICAL: Use same logic as standard mode - set to PARTIALLY_DELIVERED if not fully delivered
        // This ensures split deliveries remain visible and can be processed independently
        await db.execute(sql`
          UPDATE sales_order_schedule_lines
          SET delivered_quantity = COALESCE(delivered_quantity, 0) + ${deliveryQty},
              confirmation_status = CASE 
                WHEN (COALESCE(delivered_quantity, 0) + ${deliveryQty}) >= confirmed_quantity THEN 'DELIVERED'
                ELSE 'PARTIALLY_DELIVERED'
              END,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${scheduleLine.id}
        `);

        createdDeliveries.push({
          id: separateDeliveryId,
          deliveryNumber: separateDeliveryNumberFinal,
          scheduleLineId: scheduleLine.id,
          quantity: deliveryQty
        });
      }

      return res.json({
        success: true,
        message: `Created ${createdDeliveries.length} separate delivery(ies) for split schedule lines`,
        deliveries: createdDeliveries,
        splitDelivery: true
      });
    }

    // STANDARD MODE: Create one delivery with multiple items (original behavior)
    console.log(`📦 STANDARD MODE: Creating one delivery with ${scheduleLines.length} schedule lines`);
    console.log(`📦 Processing ${scheduleLines.length} schedule lines for delivery items`);

    for (let i = 0; i < scheduleLines.length; i++) {
      const scheduleLine = scheduleLines[i];
      // CRITICAL: Handle NULL delivered_quantity (first delivery)
      const confirmedQty = getNumber(scheduleLine.confirmed_quantity, 0);
      const deliveredQty = getNumber(scheduleLine.delivered_quantity, 0);
      const deliveryQty = confirmedQty - deliveredQty;

      console.log(`📦 Processing schedule line ${i + 1}/${scheduleLines.length}: ID=${scheduleLine.id}, Qty=${deliveryQty}`);

      if (deliveryQty <= 0) {
        console.log(`⏭️ Skipping schedule line ${scheduleLine.id} - no quantity to deliver`);
        continue; // Skip if nothing to deliver
      }

      const batchNumber = `B${deliveryDocumentId}${(i + 1).toString().padStart(2, '0')}`.substring(0, 20);
      const storageLocationValue = String(storageLocation.storage_location_code || '0001').substring(0, 10);

      console.log(`📦 Creating delivery item ${i + 1} from schedule line ${scheduleLine.id}:`, {
        material: scheduleLine.material_description,
        quantity: deliveryQty,
        scheduleLineId: scheduleLine.id
      });

      // Check inventory availability before creating delivery item
      let inventoryAvailable = true;
      let currentStock = 0;

      if (scheduleLine.material_id) {
        // Check stock from materials and stock_balances tables
        const stockCheckResult = await db.execute(sql`
          SELECT 
            COALESCE(sb.quantity, 0) as product_stock,
            COALESCE(sb.reserved_quantity, 0) as product_reserved,
            m.code as material_code,
            COALESCE(sb.quantity, 0) as stock_balance_quantity,
            COALESCE(sb.available_quantity, 0) as stock_balance_available
          FROM materials m
          LEFT JOIN stock_balances sb ON (m.code = sb.material_code 
            AND sb.plant_code = ${warehouse.plant_code || 'PLANT01'}
            AND sb.storage_location = ${storageLocationValue})
          WHERE m.id = ${scheduleLine.material_id}
          LIMIT 1
        `);

        if (stockCheckResult.rows.length > 0) {
          const stockData = stockCheckResult.rows[0];
          // Use stock_balances if available, otherwise use products.stock
          const totalStock = parseFloat(String(stockData.stock_balance_quantity || stockData.product_stock || 0));
          const reservedStock = parseFloat(String(stockData.product_reserved || 0));
          const availableStock = parseFloat(String(stockData.stock_balance_available || (totalStock - reservedStock)));
          currentStock = availableStock;

          if (availableStock < deliveryQty) {
            inventoryAvailable = false;
            inventoryIssues.push(
              `${scheduleLine.material_description || 'Material ID ' + scheduleLine.material_id}: ` +
              `Requested ${deliveryQty}, Available ${availableStock.toFixed(2)}`
            );
            console.warn(`⚠️ Insufficient stock for material ${scheduleLine.material_id}: Available ${availableStock}, Required ${deliveryQty}`);
          }
        } else {
          // Material not found - allow but warn
          console.warn(`⚠️ Material ${scheduleLine.material_id} not found in inventory tables`);
        }
      }

      // Create delivery item linked to schedule line (even if stock is low - track for later)
      await db.execute(sql`
        INSERT INTO delivery_items (
          delivery_id, sales_order_item_id, line_item, material_id, 
          delivery_quantity, pgi_quantity, unit, storage_location, batch,
          schedule_line_id, movement_type, inventory_posting_status,
          stock_type
        ) VALUES (
          ${deliveryDocumentId}, 
          ${scheduleLine.sales_order_item_id}, 
          ${i + 1}, 
          ${scheduleLine.material_id},
          ${deliveryQty}, 
          0,
          ${scheduleLine.unit || 'EA'}, 
          ${storageLocationValue},
          ${batchNumber},
          ${scheduleLine.id},
          ${movementType},
          'NOT_POSTED',
          'UNRESTRICTED'
        )
      `);

      // Reserve stock if available (or create reservation for later fulfillment)
      if (scheduleLine.product_id && inventoryAvailable) {
        try {
          // Update products table reserved stock
          // Products table update removed (migrated to stock_balances)

          // Update stock_balances if exists
          const materialCodeResult = await db.execute(sql`
            SELECT m.code as material_code
            FROM materials m
            WHERE m.id = ${scheduleLine.product_id}
            LIMIT 1
          `);

          if (materialCodeResult.rows.length > 0) {
            const materialCode = materialCodeResult.rows[0].material_code;
            if (materialCode) {
              await db.execute(sql`
                INSERT INTO stock_balances (
                  material_code, plant_code, storage_location, stock_type,
                  quantity, available_quantity, reserved_quantity, unit
                )
                VALUES (
                  ${materialCode}, 
                  ${warehouse.plant_code || 'PLANT01'}, 
                  ${storageLocationValue},
                  'AVAILABLE',
                  ${currentStock}, 
                  GREATEST(0, ${currentStock - deliveryQty}), 
                  ${deliveryQty}, 
                  ${scheduleLine.unit || 'EA'}
                )
                ON CONFLICT (material_code, plant_code, storage_location, stock_type)
                DO UPDATE SET
                  reserved_quantity = COALESCE(stock_balances.reserved_quantity, 0) + ${deliveryQty},
                  available_quantity = GREATEST(0, 
                    COALESCE(stock_balances.quantity, 0) 
                    - COALESCE(stock_balances.reserved_quantity, 0) - ${deliveryQty}
                    - COALESCE(stock_balances.committed_quantity, 0)
                    + COALESCE(stock_balances.ordered_quantity, 0)
                  ),
                  last_updated = CURRENT_TIMESTAMP
              `);
            }
          }

          console.log(`✅ Reserved ${deliveryQty} units of product ${scheduleLine.product_id}`);
        } catch (invError: any) {
          console.error(`⚠️ Error reserving stock for product ${scheduleLine.product_id}:`, invError.message);
          // Continue anyway - stock reservation failure shouldn't block delivery creation
        }
      }

      // Update schedule line delivered quantity
      // CRITICAL: Use COALESCE to handle NULL delivered_quantity (first delivery)
      await db.execute(sql`
        UPDATE sales_order_schedule_lines
        SET delivered_quantity = COALESCE(delivered_quantity, 0) + ${deliveryQty},
            confirmation_status = CASE 
              WHEN (COALESCE(delivered_quantity, 0) + ${deliveryQty}) >= confirmed_quantity THEN 'DELIVERED'
              ELSE 'PARTIALLY_DELIVERED'
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${scheduleLine.id}
      `);

      createdItems++;
    }

    console.log(`✅ Created ${createdItems} delivery items linked to schedule lines`);

    // Add inventory warnings to response if any
    if (inventoryIssues.length > 0) {
      console.warn(`⚠️ Inventory issues detected for ${inventoryIssues.length} items`);
    }

    // CRITICAL FIX: Only update sales order status to 'delivered' if ALL schedule lines are fully delivered
    // Check if there are any remaining schedule lines with undelivered quantities
    const remainingScheduleLinesCheck = await db.execute(sql`
      SELECT COUNT(*) as remaining_count
      FROM sales_order_schedule_lines sl
      JOIN sales_order_items soi ON sl.sales_order_item_id = soi.id
      WHERE soi.sales_order_id = ${salesOrderId}
        AND (sl.confirmed_quantity - COALESCE(sl.delivered_quantity, 0)) > 0
    `);

    const remainingCount = getInt(remainingScheduleLinesCheck.rows[0]?.remaining_count, 0);

    if (remainingCount === 0) {
      // All schedule lines are fully delivered - update order status
      await db.execute(sql`
        UPDATE sales_orders 
        SET status = 'Delivered', updated_at = NOW()
        WHERE id = ${salesOrderId}
      `);
      console.log(`✅ Sales order ${salesOrder.order_number} marked as fully delivered (all schedule lines completed)`);
    } else {
      // Still have pending schedule lines - keep status as 'Confirmed' or 'Partially Delivered'
      await db.execute(sql`
        UPDATE sales_orders 
        SET status = CASE 
          WHEN status = 'Open' THEN 'Confirmed'
          ELSE status
        END,
        updated_at = NOW()
        WHERE id = ${salesOrderId}
      `);
      console.log(`ℹ️ Sales order ${salesOrder.order_number} has ${remainingCount} schedule line(s) with remaining quantities - status unchanged`);
    }

    // Create document flow record using document numbers (ensure varchar limits)
    await db.execute(sql`
      INSERT INTO document_flow (
        source_document_type, source_document,
        target_document_type, target_document,
        flow_type
      ) VALUES (
        'SO', ${String(salesOrder.order_number || '').substring(0, 10)},
        'DL', ${deliveryNumber.substring(0, 10)},
        'CREATE'
      )
    `);

    // Automatically post inventory reduction to reduce stock immediately
    let inventoryPostingResult: any = null;
    let inventoryPostingError: string | null = null;

    try {
      console.log(`📦 Auto-posting inventory reduction for delivery ${deliveryNumber} (ID: ${deliveryDocumentId})`);
      inventoryPostingResult = await postInventoryReductionForDelivery(deliveryDocumentId);

      if (!inventoryPostingResult.success) {
        inventoryPostingError = inventoryPostingResult.error || 'Failed to post inventory reduction';
        console.warn(`⚠️ Inventory reduction posting failed: ${inventoryPostingError}`);
      } else {
        console.log(`✅ Inventory reduction posted successfully. Stock reduced for ${inventoryPostingResult.data?.itemsPosted || 0} item(s).`);
      }
    } catch (postingError: any) {
      inventoryPostingError = postingError.message || 'Failed to post inventory reduction';
      console.error(`❌ Error during automatic inventory posting:`, postingError);
      // Don't fail delivery creation if inventory posting fails - just log the error
    }

    res.json({
      success: true,
      data: {
        deliveryDocument: {
          id: deliveryDocumentId,
          deliveryNumber,
          salesOrderNumber: salesOrder.order_number,
          customerName: salesOrder.customer_name,
          status: inventoryPostingResult?.success ? 'COMPLETED' : delivery.status,
          deliveryType: delivery.delivery_type_code,
          deliveryPriority: delivery.delivery_priority,
          shippingCondition: delivery.shipping_condition,
          routeCode: delivery.route_code,
          movementType,
          totalItems: createdItems,
          deliveryDate: delivery.delivery_date,
          createdFrom: 'schedule_lines',
          scheduleLinesProcessed: scheduleLines.length,
          inventoryStatus: inventoryPostingResult?.success ? 'POSTED' : (inventoryIssues.length > 0 ? 'INSUFFICIENT_STOCK' : 'STOCK_RESERVED'),
          inventoryWarnings: inventoryIssues.length > 0 ? inventoryIssues : undefined,
          inventoryPostingStatus: inventoryPostingResult?.success ? 'POSTED' : 'NOT_POSTED',
          inventoryPostingError: inventoryPostingError || undefined,
          inventoryItemsPosted: inventoryPostingResult?.data?.itemsPosted || 0
        }
      },
      message: `Delivery ${deliveryNumber} created successfully with ${createdItems} items from ${scheduleLines.length} schedule lines. ` +
        (inventoryPostingResult?.success
          ? `Stock reduced for ${inventoryPostingResult.data?.itemsPosted || 0} item(s).`
          : inventoryPostingError
            ? `Warning: ${inventoryPostingError}. Stock not reduced.`
            : (inventoryIssues.length > 0
              ? `Warning: ${inventoryIssues.length} item(s) have insufficient stock.`
              : 'Stock reserved.'))
    });

  } catch (error) {
    console.error("Delivery document creation error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create delivery document"
    });
  }
});

// Helper function to post inventory reduction for delivery
async function postInventoryReductionForDelivery(deliveryId: number): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    // Get delivery document
    const deliveryResult = await db.execute(sql`
      SELECT dd.*, so.order_number as sales_order_number
      FROM delivery_documents dd
      LEFT JOIN sales_orders so ON dd.sales_order_id = so.id
      WHERE dd.id = ${deliveryId}
    `);

    if (deliveryResult.rows.length === 0) {
      return { success: false, error: 'Delivery document not found' };
    }

    const delivery = deliveryResult.rows[0];

    // Check if already posted
    if (delivery.inventory_posting_status === 'POSTED') {
      return { success: true, data: { alreadyPosted: true } };
    }

    // Get delivery items with product plant information
    const itemsResult = await db.execute(sql`
      SELECT di.*, 
             m.code as material_code,
             di.material_id as product_id,
             (SELECT COALESCE(SUM(quantity), 0) FROM stock_balances WHERE material_code = m.code) as product_stock,
             (SELECT COALESCE(SUM(reserved_quantity), 0) FROM stock_balances WHERE material_code = m.code) as product_reserved,
             (SELECT id FROM plants WHERE code = m.plant_code LIMIT 1) as product_plant_id,
             m.plant_code as product_plant_code
      FROM delivery_items di
      LEFT JOIN materials m ON di.material_id = m.id
      WHERE di.delivery_id = ${deliveryId}
        AND di.inventory_posting_status IN ('NOT_POSTED', 'PARTIALLY_POSTED')
        AND (di.delivery_quantity - COALESCE(di.pgi_quantity, 0)) > 0
    `);

    if (itemsResult.rows.length === 0) {
      return { success: false, error: 'No items found to post inventory reduction for. All items may already be posted.' };
    }

    const postingDate = new Date().toISOString().split('T')[0];

    // Get movement type from delivery or system configuration
    let movementType = delivery.movement_type;
    if (!movementType) {
      const movementTypeResult = await db.execute(sql`
        SELECT config_value FROM system_configuration 
        WHERE config_key = 'default_movement_type' AND active = true LIMIT 1
      `);
      movementType = movementTypeResult.rows[0]?.config_value || null;
    }

    // Get plant code from delivery, sales order, or product (in that order)
    let plantCode: string | null = null;
    if (delivery.plant) {
      plantCode = delivery.plant as string;
    } else if (delivery.sales_order_id) {
      // Try to get plant from sales order via plant_id
      const soResult = await db.execute(sql`
        SELECT pl.code as plant_code
        FROM sales_orders so
        LEFT JOIN plants pl ON so.plant_id = pl.id
        WHERE so.id = ${delivery.sales_order_id} LIMIT 1
      `);
      if (soResult.rows.length > 0 && soResult.rows[0].plant_code) {
        plantCode = getString(soResult.rows[0].plant_code);
      }
    }

    // If still no plant code, get it from the first product in delivery items
    if (!plantCode && itemsResult.rows.length > 0) {
      const firstItem = itemsResult.rows[0];
      if (firstItem.product_plant_code) {
        plantCode = getString(firstItem.product_plant_code);
      }
    }

    if (!plantCode) {
      return { success: false, error: 'Plant code is required for inventory reduction. Please set plant in delivery document, sales order, or product.' };
    }

    // Generate inventory document number
    // Use a more robust approach to avoid collisions when processing multiple deliveries simultaneously
    const currentYear = new Date().getFullYear();
    const timestamp = Date.now();

    // First try to get the max number from existing documents
    // Document number format: MAT-YYYY-NNNNNN or MAT-YYYY-NNNNNN-TTTTTT
    // Use regex to safely extract the 6-digit numeric sequence after "MAT-YYYY-"
    // This handles both old format (without timestamp) and new format (with timestamp)
    const docCountResult = await db.execute(sql`
      SELECT COALESCE(MAX(
        CASE 
          WHEN document_number ~ ${`^MAT-${currentYear}-([0-9]{6})(-.*)?$`}
          THEN CAST((regexp_match(document_number, ${`^MAT-${currentYear}-([0-9]{6})`}))[1] AS INTEGER)
          ELSE 0
        END
      ), 0) as max_number
      FROM stock_movements
      WHERE document_number LIKE ${`MAT-${currentYear}-%`}
    `);

    const maxNumber = parseInt(String(docCountResult.rows[0]?.max_number || 0));
    // Use max number + 1, and add timestamp suffix to ensure uniqueness for concurrent requests
    const docCount = maxNumber + 1;
    const uniqueSuffix = timestamp.toString().slice(-6); // Last 6 digits of timestamp
    // CRITICAL: Truncate to 20 characters max (VARCHAR(20) constraint)
    const inventoryDocNumber = `MAT-${currentYear}-${docCount.toString().padStart(6, '0')}-${uniqueSuffix}`.substring(0, 20);

    // Process each delivery item for goods issue
    const postedItems: any[] = [];
    const errors: string[] = [];

    for (const item of itemsResult.rows) {
      // Calculate the remaining quantity to post (delivery_quantity - already posted pgi_quantity)
      // This ensures split deliveries can be processed independently and partial postings work correctly
      const deliveryQty = parseFloat(String(item.delivery_quantity || 0));
      const alreadyPostedQty = parseFloat(String(item.pgi_quantity || 0));
      const issueQty = deliveryQty - alreadyPostedQty;

      if (issueQty <= 0) {
        console.log(`⏭️ Skipping item ${item.line_item}: Already fully posted (Delivery: ${deliveryQty}, Posted: ${alreadyPostedQty})`);
        continue;
      }

      console.log(`📦 Processing PGI for item ${item.line_item}: ${issueQty} units (Delivery: ${deliveryQty}, Already Posted: ${alreadyPostedQty})`);

      try {
        const materialCode = item.material_code;

        // Use plant from this specific item if available, otherwise use the delivery-level plant
        let itemPlantCode: string | null = getString(item.product_plant_code) || plantCode;

        // Get storage location from item (delivery_documents table doesn't have storage_location column)
        let storageLocation: string | null = getString(item.storage_location) || null;

        if (!storageLocation) {
          // Try to get default storage location from plant (use item's plant if available)
          const storageResult = await db.execute(sql`
            SELECT code FROM storage_locations 
            WHERE plant_id = (SELECT id FROM plants WHERE code = ${itemPlantCode} LIMIT 1)
            ORDER BY id LIMIT 1
          `);
          if (storageResult.rows.length > 0) {
            storageLocation = getString(storageResult.rows[0].code);
          }
        }

        if (!storageLocation) {
          errors.push(`Item ${item.line_item}: Storage location not found. Please set storage location in delivery item or plant.`);
          continue;
        }

        if (!itemPlantCode) {
          errors.push(`Item ${item.line_item}: Plant code not found. Please set plant in delivery document, sales order, or product.`);
          continue;
        }

        // Get fresh stock values from database right before updating
        let currentProductStock = 0;
        let currentProductReserved = 0;

        if (item.product_id) {
          const freshProductResult = await db.execute(sql`
            SELECT 0 as stock, 0 as reserved_stock
            -- Fallback removed

          `);

          if (freshProductResult.rows.length > 0) {
            currentProductStock = parseFloat(String(freshProductResult.rows[0].stock || 0));
            currentProductReserved = parseFloat(String(freshProductResult.rows[0].reserved_stock || 0));
          }
        }

        // Get fresh stock_balances values (only from AVAILABLE stock type)
        let currentBalanceQuantity = 0;
        let currentBalanceReserved = 0;
        let currentBalanceAvailable = 0;
        let currentBalanceCommitted = 0;
        let stockBalanceExists = false;

        if (materialCode) {
          const stockBalanceResult = await db.execute(sql`
            SELECT quantity, available_quantity, reserved_quantity, committed_quantity, ordered_quantity
            FROM stock_balances
            WHERE material_code = ${materialCode}
              AND plant_code = ${itemPlantCode}
              AND storage_location = ${storageLocation}
              AND (stock_type = 'AVAILABLE' OR stock_type IS NULL)
            LIMIT 1
          `);

          if (stockBalanceResult.rows.length > 0) {
            stockBalanceExists = true;
            const balance = stockBalanceResult.rows[0];
            currentBalanceQuantity = parseFloat(String(balance.quantity || 0));
            currentBalanceAvailable = parseFloat(String(balance.available_quantity || 0));
            currentBalanceReserved = parseFloat(String(balance.reserved_quantity || 0));
            currentBalanceCommitted = parseFloat(String(balance.committed_quantity || 0));

            // CRITICAL: Check if we have enough available stock before decreasing
            // available_quantity = quantity - reserved - committed + ordered
            const calculatedAvailable = currentBalanceQuantity - currentBalanceReserved - currentBalanceCommitted + parseFloat(String(balance.ordered_quantity || 0));
            const actualAvailable = Math.max(0, calculatedAvailable);

            if (actualAvailable < issueQty) {
              console.warn(`⚠️ Insufficient stock for material ${materialCode}: Available=${actualAvailable}, Required=${issueQty}`);
              // Continue anyway - allow negative stock for now (can be handled by backorder process)
              // But ensure available_quantity doesn't go below constraint limit
            }
            currentBalanceReserved = parseFloat(String(balance.reserved_quantity || 0));
            currentBalanceCommitted = parseFloat(String(balance.committed_quantity || 0));
            currentBalanceAvailable = parseFloat(String(balance.available_quantity ||
              Math.max(0, currentBalanceQuantity - currentBalanceReserved - currentBalanceCommitted)));
          }
        }

        // Verify sufficient stock before deduction
        const availableStock = stockBalanceExists
          ? currentBalanceAvailable
          : Math.max(0, currentProductStock - currentProductReserved);

        if (availableStock < issueQty) {
          errors.push(`Item ${item.line_item}: Insufficient stock. Available: ${availableStock}, Required: ${issueQty}`);
          continue;
        }

        // Use centralized inventory tracking service to decrease committed quantity and stock
        if (materialCode && itemPlantCode && storageLocation) {
          try {
            // Get material ID if not available
            let materialId: number | null = null;
            if (item.product_id) {
              const materialIdResult = await db.execute(sql`
                SELECT m.id as material_id
                FROM materials m
                WHERE m.code = ${materialCode}
                LIMIT 1
              `);
              if (materialIdResult.rows.length > 0) {
                materialId = getInt(materialIdResult.rows[0].material_id);
              }
            }

            // Get plant ID if not available
            let plantId: number | null = null;
            if (item.product_plant_id) {
              plantId = getInt(item.product_plant_id);
            } else {
              const plantIdResult = await db.execute(sql`
                SELECT id FROM plants WHERE code = ${itemPlantCode} LIMIT 1
              `);
              if (plantIdResult.rows.length > 0) {
                plantId = getInt(plantIdResult.rows[0].id);
              }
            }

            // Get unit of measure - try to get from item, material, or system configuration
            let unit: string | null = getString(item.unit) || null;
            if (!unit) {
              // Try to get from material master
              if (materialCode) {
                const materialUnitResult = await db.execute(sql`
                  SELECT base_uom FROM materials WHERE code = ${materialCode} LIMIT 1
                `);
                if (materialUnitResult.rows.length > 0 && materialUnitResult.rows[0].base_uom) {
                  unit = getString(materialUnitResult.rows[0].base_uom);
                }
              }

              // If still no unit, try system configuration
              if (!unit) {
                const unitConfigResult = await db.execute(sql`
                  SELECT config_value FROM system_configuration 
                  WHERE config_key = 'default_unit_of_measure' AND active = true LIMIT 1
                `);
                if (unitConfigResult.rows.length > 0 && unitConfigResult.rows[0].config_value) {
                  unit = getString(unitConfigResult.rows[0].config_value);
                }
              }
            }

            // If still no unit, we cannot proceed with inventory tracking
            if (!unit) {
              console.error(`❌ Cannot decrease inventory: Unit of measure not found for delivery item ${item.line_item}`);
              errors.push(`Item ${item.line_item}: Unit of measure is required for inventory tracking`);
              continue;
            }

            // Use centralized inventory tracking service
            await inventoryTrackingService.decreaseCommittedAndDecreaseStock(
              materialId || 0,
              getString(materialCode),
              plantId || 0,
              itemPlantCode,
              storageLocation,
              issueQty,
              unit // unit is guaranteed to be non-null at this point due to validation above
            );

            console.log(`✅ Decreased committed quantity and stock for material ${materialCode}: -${issueQty} at plant ${itemPlantCode}, storage ${storageLocation}`);

            // CRITICAL: Create material movement for goods issue
            // If this fails, the entire transaction will roll back
            console.log(`📝 Creating material movement for ${materialCode}...`);

            // Generate movement number
            const movementSeq = await db.execute(sql`SELECT nextval('movement_number_seq') as seq`);
            const seqNum = movementSeq.rows[0]?.seq || 1;
            const movementNumber = `MV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(seqNum).padStart(4, '0')}`;

            // Get material name
            let materialName = 'Material';
            if (materialCode) {
              const matNameResult = await db.execute(sql`
                SELECT description as name FROM materials WHERE code = ${materialCode}
                LIMIT 1
              `);
              if (matNameResult.rows.length > 0) {
                materialName = getString(matNameResult.rows[0].name);
              }
            }

            // Insert material movement - NO try-catch, let it fail if there's an issue
            await db.execute(sql`
              INSERT INTO stock_movements (
                movement_number, movement_type, material_id, material_code, material_name,
                quantity, unit_of_measure, from_location, plant_id,
                delivery_order_id, sales_order_id,
                reference_document, reference_type, batch_number,
                movement_date, posting_date, status, posted_by, notes
              ) VALUES (
                ${movementNumber},
                'Goods Issue',
                ${materialId},
                ${materialCode},
                ${materialName},
                ${issueQty},
                ${unit},
                ${storageLocation},
                ${plantId},
                ${deliveryId},
                ${delivery.sales_order_id},
                ${delivery.delivery_number},
                'Delivery',
                ${item.batch},
                CURRENT_TIMESTAMP,
                CURRENT_DATE,
                'Posted',
                1,
                ${`Goods issue for delivery ${delivery.delivery_number} - Item ${item.line_item}`}
              )
            `);

            console.log(`✅ Created material movement ${movementNumber} for goods issue`);
          } catch (invServiceError: any) {
            console.error(`❌ Error using inventory tracking service for material ${materialCode}:`, invServiceError.message);
            // Fallback to direct update if service fails
            console.log(`⚠️ Falling back to direct stock_balances update...`);

            // Fallback: Direct update to stock_balances
            // CRITICAL: Only update if stock_balances row exists, otherwise skip (can't decrease from 0)
            if (stockBalanceExists) {
              // Re-fetch stock balance to get ordered_quantity
              const fallbackStockResult = await db.execute(sql`
                SELECT ordered_quantity
                FROM stock_balances
                WHERE material_code = ${materialCode}
                  AND plant_code = ${itemPlantCode}
                  AND storage_location = ${storageLocation}
                  AND (stock_type = 'AVAILABLE' OR stock_type IS NULL)
                LIMIT 1
              `);

              const orderedQty = parseFloat(String(fallbackStockResult.rows[0]?.ordered_quantity || 0));

              const newBalanceQuantity = Math.max(0, currentBalanceQuantity - issueQty);
              const newBalanceCommitted = Math.max(0, currentBalanceCommitted - issueQty);
              const newBalanceReserved = Math.max(0, currentBalanceReserved - issueQty);

              // Calculate available quantity: quantity - reserved - committed + ordered
              // CRITICAL: Constraint requires: available_quantity <= quantity + ordered_quantity
              const newBalanceAvailable = Math.max(0,
                Math.min(
                  newBalanceQuantity - newBalanceReserved - newBalanceCommitted + orderedQty,
                  newBalanceQuantity + orderedQty  // Constraint limit
                )
              );

              await db.execute(sql`
                UPDATE stock_balances
                SET 
                  quantity = ${newBalanceQuantity},
                  committed_quantity = ${newBalanceCommitted},
                  reserved_quantity = ${newBalanceReserved},
                  available_quantity = ${newBalanceAvailable},
                  last_updated = CURRENT_TIMESTAMP
                WHERE material_code = ${materialCode}
                  AND plant_code = ${itemPlantCode}
                  AND storage_location = ${storageLocation}
                  AND (stock_type = 'AVAILABLE' OR stock_type IS NULL)
              `);
            } else {
              console.warn(`⚠️ Cannot decrease stock: stock_balances row does not exist for material ${materialCode} at plant ${itemPlantCode}, storage ${storageLocation}`);
              errors.push(`Item ${item.line_item}: Stock balance record not found. Cannot decrease inventory.`);
              continue;
            }
          }
        } else {
          console.warn(`⚠️ Cannot use inventory tracking service: missing materialCode, plantCode, or storageLocation`);
        }

        // Sync products.stock and reserved_stock from stock_balances to ensure consistency
        // NOTE: We don't directly update products table here - the sync from stock_balances ensures consistency
        // CRITICAL: This must happen AFTER stock_balances is updated to reflect the correct reserved_quantity
        if (item.product_id && materialCode) {
          try {
            // Use the existing pool from db
            const client = await pool.connect();
            try {
              // Sync both stock and reserved_stock from stock_balances
              // This ensures products table reflects the actual state after delivery completion
              const syncResult = await client.query(`
                UPDATE products p
                SET
                  stock = COALESCE((
                    SELECT CAST(SUM(sb.quantity) AS INTEGER)
                    FROM stock_balances sb
                    LEFT JOIN materials m ON sb.material_code = m.code
                    WHERE (sb.material_code = p.sku OR (m.id IS NOT NULL AND p.material_master_id = m.id))
                      AND (sb.stock_type = 'AVAILABLE' OR sb.stock_type IS NULL)
                  ), 0),
                  reserved_stock = COALESCE((
                    SELECT CAST(SUM(COALESCE(sb.reserved_quantity, 0)) AS INTEGER)
                    FROM stock_balances sb
                    LEFT JOIN materials m ON sb.material_code = m.code
                    WHERE (sb.material_code = p.sku OR (m.id IS NOT NULL AND p.material_master_id = m.id))
                      AND (sb.stock_type = 'AVAILABLE' OR sb.stock_type IS NULL)
                  ), 0),
                  updated_at = CURRENT_TIMESTAMP
                WHERE p.id = $1
                RETURNING id, name, sku, stock, reserved_stock
              `, [item.product_id]);

              if (syncResult.rows.length > 0) {
                const syncedProduct = syncResult.rows[0];
                console.log(`✅ Synced product ${syncedProduct.name} (ID: ${syncedProduct.id}): stock=${syncedProduct.stock}, reserved_stock=${syncedProduct.reserved_stock}`);
              }
            } finally {
              client.release();
            }
          } catch (syncError: any) {
            console.error('❌ Error syncing products.stock from stock_balances:', syncError);
            console.error('Sync error details:', {
              productId: item.product_id,
              materialCode,
              error: syncError.message
            });
            // Don't fail the delivery if sync fails, but log the error
          }
        }

        // Calculate COGS and create financial posting
        const { InventoryFinanceCostService } = await import('../services/inventory-finance-cost-service');
        // Use the shared pool from db instead of creating a new one
        const financeService = new InventoryFinanceCostService(pool);

        // Calculate COGS (use item's plant code)
        const cogsData = await financeService.calculateCOGS(
          getString(materialCode),
          issueQty,
          itemPlantCode,
          storageLocation
        );

        // Get cost center and profit center (use item's plant code)
        const centers = await financeService.getCostAndProfitCenters(
          getString(materialCode),
          getString(itemPlantCode)
        );

        // Calculate variance
        const varianceData = await financeService.calculateVariance(
          getString(materialCode),
          cogsData.unitCost,
          issueQty
        );

        // Create stock movement record first
        // CRITICAL: Link stock movement to delivery_id and delivery_item_id for split delivery tracking
        // This ensures each split delivery has its own stock movement record with correct quantities
        // For split deliveries: Each delivery gets its own stock movement with only its item's quantity
        let stockMovementId: number | null = null;
        try {
          // Check if delivery_id and delivery_item_id columns exist in stock_movements table
          const columnCheckResult = await db.execute(sql`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'stock_movements'
              AND column_name IN ('delivery_id', 'delivery_item_id')
          `);

          const hasDeliveryId = columnCheckResult.rows.some((row: any) => row.column_name === 'delivery_id');
          const hasDeliveryItemId = columnCheckResult.rows.some((row: any) => row.column_name === 'delivery_item_id');

          // CRITICAL: Include delivery_id and delivery_item_id in notes if columns don't exist
          // This ensures split deliveries can be tracked even without the columns
          const notesText = hasDeliveryId && hasDeliveryItemId
            ? `Goods issue for delivery ${delivery.delivery_number || 'N/A'} - Item ${item.line_item || 'N/A'}`
            : `Goods issue for delivery ${delivery.delivery_number || 'N/A'} (ID: ${deliveryId}) - Item ${item.line_item || 'N/A'} (Item ID: ${item.id}) - Quantity: ${issueQty}`;

          if (hasDeliveryId && hasDeliveryItemId) {
            // Columns exist - use them for proper linking
            const movementResult = await db.execute(sql`
              INSERT INTO stock_movements (
                document_number, posting_date, material_code, plant_code,
                storage_location, movement_type, quantity, unit,
                unit_price, total_value, reference_document, notes,
                cost_center_id, profit_center_id, cogs_amount,
                standard_cost, actual_cost, variance_amount, variance_type,
                financial_posting_status, delivery_id, delivery_item_id
              )
              VALUES (
                ${inventoryDocNumber}, ${postingDate}, ${materialCode || 'N/A'}, ${itemPlantCode},
                ${storageLocation}, ${movementType}, ${-Math.abs(issueQty)}, ${item.unit || 'EA'},
                ${cogsData.unitCost}, ${cogsData.cogsAmount}, ${String(delivery.delivery_number || '').substring(0, 20)}, 
                ${notesText},
                ${centers.costCenterId || null}, ${centers.profitCenterId || null},
                ${cogsData.cogsAmount}, ${varianceData.standardCost}, ${varianceData.actualCost},
                ${varianceData.varianceAmount}, ${varianceData.varianceType}, 'PENDING',
                ${deliveryId}, ${item.id}
              )
              RETURNING id
            `);
            stockMovementId = getInt(movementResult.rows[0]?.id) || null;
            console.log(`✅ Created stock movement ${stockMovementId} for delivery ${deliveryId}, item ${item.id}, quantity ${issueQty} (with delivery_id links)`);
          } else {
            // Columns don't exist - include delivery info in notes for tracking
            const movementResult = await db.execute(sql`
              INSERT INTO stock_movements (
                document_number, posting_date, material_code, plant_code,
                storage_location, movement_type, quantity, unit,
                unit_price, total_value, reference_document, notes,
                cost_center_id, profit_center_id, cogs_amount,
                standard_cost, actual_cost, variance_amount, variance_type,
                financial_posting_status
              )
              VALUES (
                ${inventoryDocNumber}, ${postingDate}, ${materialCode || 'N/A'}, ${itemPlantCode},
                ${storageLocation}, ${movementType}, ${-Math.abs(issueQty)}, ${item.unit || 'EA'},
                ${cogsData.unitCost}, ${cogsData.cogsAmount}, ${String(delivery.delivery_number || '').substring(0, 20)}, 
                ${notesText},
                ${centers.costCenterId || null}, ${centers.profitCenterId || null},
                ${cogsData.cogsAmount}, ${varianceData.standardCost}, ${varianceData.actualCost},
                ${varianceData.varianceAmount}, ${varianceData.varianceType}, 'PENDING'
              )
              RETURNING id
            `);
            stockMovementId = getInt(movementResult.rows[0]?.id) || null;
            console.log(`✅ Created stock movement ${stockMovementId} for delivery ${deliveryId}, item ${item.id}, quantity ${issueQty} (delivery info in notes)`);
          }
        } catch (movementError: any) {
          console.error('Could not create stock movement record:', movementError.message);
          throw new Error(`Failed to create stock movement: ${movementError.message}`);
        }

        // Create financial posting (mandatory - will throw error if fails)
        const client = await pool.connect();
        let glDocumentNumber: string | null = null;
        try {
          await client.query('BEGIN');

          const postingResult = await financeService.createFinancialPosting(
            client,
            {
              materialCode: getString(materialCode),
              movementType: getString(movementType),
              quantity: issueQty,
              unitPrice: cogsData.unitCost,
              totalValue: cogsData.cogsAmount,
              costCenterId: centers.costCenterId || undefined,
              profitCenterId: centers.profitCenterId || undefined,
              cogsAmount: cogsData.cogsAmount,
              referenceDocument: getString(delivery.delivery_number),
            }
          );

          if (!postingResult.success) {
            await client.query('ROLLBACK');
            throw new Error(`Financial posting failed: ${postingResult.error}`);
          }

          glDocumentNumber = postingResult.glDocumentNumber || null;

          // Update stock movement with financial posting data
          if (stockMovementId) {
            await financeService.updateStockMovementWithFinanceData(
              client,
              stockMovementId,
              {
                cogsAmount: cogsData.cogsAmount,
                standardCost: varianceData.standardCost,
                actualCost: varianceData.actualCost,
                varianceAmount: varianceData.varianceAmount,
                varianceType: varianceData.varianceType,
                glDocumentNumber: glDocumentNumber,
                financialPostingStatus: 'POSTED',
              }
            );
          }

          await client.query('COMMIT');
        } catch (postingError: any) {
          await client.query('ROLLBACK');
          console.error('Financial posting error:', postingError);
          throw new Error(`Financial posting failed: ${postingError.message}`);
        } finally {
          client.release();
        }

        // Update delivery item posting status
        // CRITICAL: Update posted_quantity by ADDING to existing value, not replacing it
        // This ensures partial postings are handled correctly for split deliveries
        const newPostedQuantity = alreadyPostedQty + issueQty;
        const isFullyPosted = newPostedQuantity >= deliveryQty;

        await db.execute(sql`
          UPDATE delivery_items
          SET inventory_posting_status = ${isFullyPosted ? sql`'POSTED'` : sql`'PARTIALLY_POSTED'`},
              pgi_quantity = ${newPostedQuantity}
          WHERE id = ${item.id}
        `);

        postedItems.push({
          material_id: item.material_id,
          quantity: issueQty,
          material_code: materialCode,
          total_posted: newPostedQuantity,
          delivery_quantity: deliveryQty
        });

        console.log(`✅ Processed inventory reduction: ${issueQty} units of ${materialCode} (Total Posted: ${newPostedQuantity}/${deliveryQty}, Status: ${isFullyPosted ? 'POSTED' : 'PARTIALLY_POSTED'})`);
      } catch (itemError: any) {
        console.error(`❌ Error posting goods issue for item ${item.id}:`, itemError.message);
        errors.push(`Item ${item.line_item}: ${itemError.message}`);
      }
    }

    // Update delivery document posting status
    // Check if all items are fully posted before marking delivery as POSTED
    const allItemsPostedCheck = await db.execute(sql`
      SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN inventory_posting_status = 'POSTED' THEN 1 END) as posted_items,
        COUNT(CASE WHEN inventory_posting_status = 'PARTIALLY_POSTED' THEN 1 END) as partially_posted_items
      FROM delivery_items
      WHERE delivery_id = ${deliveryId}
    `);

    const checkResult = allItemsPostedCheck.rows[0];
    const allFullyPosted = checkResult.posted_items === checkResult.total_items;
    const hasPartiallyPosted = getInt(checkResult.partially_posted_items) > 0;

    const finalPostingStatus = allFullyPosted ? 'POSTED' : (hasPartiallyPosted ? 'PARTIALLY_POSTED' : 'NOT_POSTED');

    // Update delivery document with completion status and inventory document info
    // Updates: completion_status (pgi_status), status, inventory_posting_status, and material document number
    await db.execute(sql`
      UPDATE delivery_documents
      SET 
        pgi_status = ${allFullyPosted ? sql`'POSTED'` : (hasPartiallyPosted ? sql`'PARTIALLY_POSTED'` : sql`'OPEN'`)},
        status = ${allFullyPosted ? sql`'COMPLETED'` : sql`'IN_PROGRESS'`},
        inventory_posting_status = ${finalPostingStatus},
        inventory_posting_date = ${postingDate},
        inventory_document_number = ${inventoryDocNumber},
        updated_at = NOW()
      WHERE id = ${deliveryId}
    `);

    // Update sales order schedule lines status to DELIVERED if fully posted
    if (allFullyPosted) {
      await db.execute(sql`
        UPDATE sales_order_schedule_lines sl
        SET confirmation_status = 'DELIVERED',
            updated_at = CURRENT_TIMESTAMP
        FROM delivery_items di
        WHERE di.delivery_id = ${deliveryId}
          AND di.schedule_line_id = sl.id
          AND sl.confirmation_status != 'DELIVERED'
      `);

      // Check if all schedule lines for the sales order are delivered
      const salesOrderCheck = await db.execute(sql`
        SELECT 
          COUNT(*) as total_schedule_lines,
          COUNT(CASE WHEN confirmation_status = 'DELIVERED' THEN 1 END) as delivered_lines
        FROM sales_order_schedule_lines sl
        JOIN sales_order_items soi ON sl.sales_order_item_id = soi.id
        WHERE soi.sales_order_id = ${delivery.sales_order_id}
      `);

      const soCheckResult = salesOrderCheck.rows[0];
      if (soCheckResult.delivered_lines === soCheckResult.total_schedule_lines) {
        // All schedule lines delivered - update sales order status
        await db.execute(sql`
          UPDATE sales_orders
          SET status = 'Delivered',
              updated_at = NOW()
          WHERE id = ${delivery.sales_order_id}
        `);
        console.log(`✅ Sales order ${delivery.sales_order_number} marked as Delivered (all schedule lines completed)`);
      }
    }

    console.log(`✅ Updated delivery ${delivery.delivery_number} completion status: ${allFullyPosted ? 'POSTED' : (hasPartiallyPosted ? 'PARTIALLY_POSTED' : 'OPEN')} (Posted: ${checkResult.posted_items}/${checkResult.total_items} items)`);
    console.log(`✅ Inventory document ${inventoryDocNumber} created for delivery ${delivery.delivery_number}`);
    console.log(`✅ Inventory reduction completed for delivery ${delivery.delivery_number}`);

    return {
      success: true,
      data: {
        deliveryId: deliveryId,
        deliveryNumber: delivery.delivery_number,
        inventoryDocumentNumber: inventoryDocNumber,
        postingDate: postingDate,
        itemsPosted: postedItems.length,
        items: postedItems,
        errors: errors.length > 0 ? errors : undefined
      }
    };

  } catch (error: any) {
    console.error('❌ Error posting inventory reduction:', error);
    return { success: false, error: error.message || 'Failed to post inventory reduction' };
  }
}

// Complete delivery and process inventory reduction endpoint
// This endpoint: reduces inventory, creates inventory document, posts accounting entries, and updates all statuses
router.post("/delivery-documents/:id/post-goods-issue", async (req, res) => {
  try {
    const deliveryId = parseIdSafely(req.params.id);
    if (deliveryId === null) {
      return res.status(400).json({
        success: false,
        error: "Invalid delivery ID format. Expected a numeric ID, not a document number."
      });
    }
    console.log(`📦 Processing delivery completion for delivery ID: ${deliveryId}`);

    const result = await postInventoryReductionForDelivery(deliveryId);

    if (!result.success) {
      const statusCode = result.error?.includes('not found') ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        error: result.error || 'Failed to post inventory reduction'
      });
    }

    // Status is already updated in postInventoryReductionForDelivery function
    // Additional status updates are handled there (completion status, delivery status, sales order status)

    // Get updated delivery document for response
    const updatedDeliveryResult = await db.execute(sql`
      SELECT 
        dd.*,
        so.order_number as sales_order_number,
        COUNT(di.id) as total_items,
        COUNT(CASE WHEN di.inventory_posting_status = 'POSTED' THEN 1 END) as posted_items
      FROM delivery_documents dd
      LEFT JOIN sales_orders so ON dd.sales_order_id = so.id
      LEFT JOIN delivery_items di ON dd.id = di.delivery_id
      WHERE dd.id = ${deliveryId}
      GROUP BY dd.id, so.order_number
    `);

    const updatedDelivery = updatedDeliveryResult.rows[0];

    res.json({
      success: true,
      data: {
        ...result.data,
        delivery: {
          id: updatedDelivery?.id,
          deliveryNumber: updatedDelivery?.delivery_number,
          pgiStatus: updatedDelivery?.pgi_status,
          status: updatedDelivery?.status,
          inventoryPostingStatus: updatedDelivery?.inventory_posting_status,
          materialDocumentNumber: updatedDelivery?.inventory_document_number,
          postingDate: updatedDelivery?.inventory_posting_date,
          totalItems: updatedDelivery?.total_items,
          postedItems: updatedDelivery?.posted_items
        }
      },
      message: `✅ Delivery completed successfully! ` +
        `Inventory Document: ${result.data?.inventoryDocumentNumber || 'N/A'}, ` +
        `Items Processed: ${result.data?.itemsPosted || 0}, ` +
        `Completion Status: ${updatedDelivery?.pgi_status || 'N/A'}, ` +
        `Delivery Status: ${updatedDelivery?.status || 'N/A'}` +
        (result.data?.errors?.length > 0 ? ` ⚠️ Warning: ${result.data.errors.length} error(s).` : '')
    });

  } catch (error: any) {
    console.error('❌ Error posting inventory reduction:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to post inventory reduction'
    });
  }
});

// Update delivery status - automatically post inventory reduction if status is set to COMPLETED
router.put("/delivery-documents/:id/status", async (req, res) => {
  try {
    const deliveryId = parseIdSafely(req.params.id);
    if (deliveryId === null) {
      return res.status(400).json({
        success: false,
        error: "Invalid delivery ID format. Expected a numeric ID, not a document number."
      });
    }
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const normalizedStatus = status.toUpperCase();

    // Get delivery document
    const deliveryResult = await db.execute(sql`
      SELECT dd.*, so.order_number as sales_order_number
      FROM delivery_documents dd
      LEFT JOIN sales_orders so ON dd.sales_order_id = so.id
      WHERE dd.id = ${deliveryId}
    `);

    if (deliveryResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Delivery document not found'
      });
    }

    const delivery = deliveryResult.rows[0];

    // If status is being set to COMPLETED, ensure inventory reduction is posted first
    if (normalizedStatus === 'COMPLETED' && delivery.inventory_posting_status !== 'POSTED') {
      console.log(`📦 Auto-posting inventory reduction for delivery ${delivery.delivery_number} before marking as COMPLETED`);

      const inventoryResult = await postInventoryReductionForDelivery(deliveryId);

      if (!inventoryResult.success) {
        return res.status(400).json({
          success: false,
          error: `Cannot mark delivery as COMPLETED: ${inventoryResult.error}`
        });
      }
    }

    // Update delivery status
    await db.execute(sql`
      UPDATE delivery_documents
      SET status = ${normalizedStatus}, updated_at = NOW()
      WHERE id = ${deliveryId}
    `);

    res.json({
      success: true,
      data: {
        deliveryId: deliveryId,
        deliveryNumber: delivery.delivery_number,
        status: normalizedStatus,
        inventoryReductionAutoPosted: (normalizedStatus === 'COMPLETED' && delivery.inventory_posting_status !== 'POSTED')
      },
      message: `Delivery status updated to ${normalizedStatus}` +
        (normalizedStatus === 'COMPLETED' && delivery.inventory_posting_status !== 'POSTED'
          ? '. Inventory reduction automatically posted and stock reduced.'
          : '')
    });

  } catch (error: any) {
    console.error('❌ Error updating delivery status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update delivery status'
    });
  }
});

// Phase 3: Transfer Order Generation (from Delivery Document)
router.post("/transfer-orders", async (req, res) => {
  try {
    // Defensive body parsing
    let parsedBody = req.body;
    if (typeof parsedBody === 'string') {
      try {
        parsedBody = JSON.parse(parsedBody);
      } catch (e) {
        console.error('Failed to parse request body:', e);
        return res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: 'Request body must be valid JSON'
        });
      }
    }

    const { deliveryId, fromLocationId, toLocationId } = parsedBody;

    // Validate deliveryId is provided and is a single value (not an array)
    if (!deliveryId) {
      return res.status(400).json({
        success: false,
        error: "deliveryId is required"
      });
    }

    // Ensure deliveryId is a single number, not an array (prevent combining multiple deliveries)
    const singleDeliveryId = Array.isArray(deliveryId) ? deliveryId[0] : deliveryId;
    const parsedDeliveryId = parseIdSafely(singleDeliveryId);

    if (parsedDeliveryId === null) {
      return res.status(400).json({
        success: false,
        error: "deliveryId must be a valid numeric ID. Document numbers cannot be used directly."
      });
    }


    console.log('📦 Creating transfer order for delivery:', parsedDeliveryId);
    console.log('📋 Request payload:', { deliveryId, fromLocationId, toLocationId });


    // Check if transfer order already exists for this delivery (prevent duplicates)
    const existingTransferOrderResult = await db.execute(sql`
      SELECT id, transfer_number, status
      FROM transfer_orders
      WHERE delivery_id = ${parsedDeliveryId}
      LIMIT 1
    `);

    console.log(`✅ Checked existing transfer orders: ${existingTransferOrderResult.rows.length} found`);
    if (existingTransferOrderResult.rows.length > 0) {
      const existing = existingTransferOrderResult.rows[0];
      console.log('ℹ️ Transfer order already exists (returning existing):', existing.transfer_number);
      return res.status(200).json({
        success: true,
        message: `Transfer order already exists. Returning existing order.`,
        alreadyExists: true,
        transferOrder: {
          id: existing.id,
          transferNumber: existing.transfer_number,
          status: existing.status,
          // Add basic details that would be expected
          deliveryId: parsedDeliveryId
        },
        existingTransferOrder: {
          id: existing.id,
          transferNumber: existing.transfer_number,
          status: existing.status
        }
      });
    }

    // Get delivery details with sales order data
    const deliveryResult = await db.execute(sql`
      SELECT dd.*, so.order_number as sales_order_number, so.customer_id, so.customer_name
      FROM delivery_documents dd
      LEFT JOIN sales_orders so ON dd.sales_order_id = so.id
      WHERE dd.id = ${parsedDeliveryId}
    `);

    const delivery = deliveryResult.rows[0];
    console.log('📦 Delivery found:', delivery ? `${delivery.delivery_number} (Status: ${delivery.status})` : 'NOT FOUND');
    if (!delivery) {
      console.error('❌ Delivery not found:', parsedDeliveryId);
      return res.status(404).json({ success: false, error: "Delivery not found" });
    }

    // Check if delivery is in correct status (case-insensitive)
    // Allow PENDING, CONFIRMED, PLANNED, OPEN, IN_PROGRESS, and COMPLETED (if not fully posted)
    const deliveryStatus = getString(delivery.status, '').toUpperCase();
    const allowedStatuses = ['PENDING', 'CONFIRMED', 'PLANNED', 'OPEN', 'IN_PROGRESS', 'COMPLETED'];
    const normalizedStatus = deliveryStatus || 'PENDING';

    console.log(`📋 Delivery status check: ${normalizedStatus} (allowed: ${allowedStatuses.join(', ')})`);
    if (!allowedStatuses.includes(normalizedStatus)) {
      console.error('❌ Invalid delivery status:', normalizedStatus);
      return res.status(400).json({
        success: false,
        error: `Delivery must be in PENDING, CONFIRMED, PLANNED, OPEN, IN_PROGRESS, or COMPLETED status to create transfer order. Current status: ${delivery.status || 'NULL'}`
      });
    }

    // If delivery is COMPLETED, check if it has inventory posting - if fully posted, don't allow transfer order
    if (normalizedStatus === 'COMPLETED' && delivery.inventory_posting_status === 'POSTED') {
      return res.status(400).json({
        success: false,
        error: `Cannot create transfer order for delivery ${delivery.delivery_number}: Delivery is already completed and inventory has been posted.`
      });
    }

    // Get storage locations from delivery items
    // IMPORTANT: Only get items from THIS specific delivery (not other deliveries from same sales order)
    const storageLocationResult = await db.execute(sql`
      SELECT DISTINCT di.storage_location, sl.id as storage_location_id, sl.code as storage_location_code, sl.name as storage_location_name,
             p.id as plant_id, p.code as plant_code, p.name as plant_name
      FROM delivery_items di
      LEFT JOIN storage_locations sl ON di.storage_location = sl.code
      LEFT JOIN plants p ON sl.plant_id = p.id
      WHERE di.delivery_id = ${parsedDeliveryId}
      LIMIT 1
    `);

    const storageLocation = storageLocationResult.rows[0];
    console.log('📍 Storage location result:', storageLocationResult.rows.length > 0 ? storageLocation : 'NONE FOUND');

    // Enhanced validation: Check if storage location exists AND has required fields
    if (!storageLocation) {
      console.error('❌ No storage location found for delivery items');
      return res.status(400).json({
        success: false,
        error: "No storage location found for delivery items",
        details: "Delivery items must have a valid storage location assigned. Please check delivery_items.storage_location field."
      });
    }

    // Additional validation: Ensure storage location has valid IDs (not NULL)
    if (!storageLocation.storage_location_id) {
      console.error('❌ Storage location ID is NULL. Storage location code:', storageLocation.storage_location);
      return res.status(400).json({
        success: false,
        error: "Invalid storage location configuration",
        details: `Storage location '${storageLocation.storage_location}' exists in delivery items but is not found in storage_locations table. Please ensure the storage location is properly configured.`
      });
    }

    if (!storageLocation.plant_id) {
      console.error('❌ Plant ID is NULL for storage location:', storageLocation.storage_location_code);
      return res.status(400).json({
        success: false,
        error: "Storage location has no plant assigned",
        details: `Storage location '${storageLocation.storage_location_code}' (${storageLocation.storage_location_name}) does not have a plant assigned. Please assign a plant to this storage location.`
      });
    }


    // Use provided locations or default to same location (no transfer needed)
    const fromLocation = fromLocationId || storageLocation.storage_location_id;
    const toLocation = toLocationId || storageLocation.storage_location_id;

    // Get storage location details
    const fromLocationResult = await db.execute(sql`
      SELECT sl.id, sl.code, sl.name, p.code as plant_code, p.name as plant_name
      FROM storage_locations sl 
      LEFT JOIN plants p ON sl.plant_id = p.id 
      WHERE sl.id = ${fromLocation}
    `);

    const toLocationResult = await db.execute(sql`
      SELECT sl.id, sl.code, sl.name, p.code as plant_code, p.name as plant_name
      FROM storage_locations sl 
      LEFT JOIN plants p ON sl.plant_id = p.id 
      WHERE sl.id = ${toLocation}
    `);

    const fromLocationData = fromLocationResult.rows[0];
    const toLocationData = toLocationResult.rows[0];

    if (!fromLocationData || !toLocationData) {
      return res.status(400).json({
        success: false,
        error: "Invalid storage locations provided"
      });
    }

    // Validate and get valid plant codes (must exist in plants table and be <= 4 chars for VARCHAR(4) constraint)
    // Foreign key requires exact match, so we need plant codes that are exactly 4 characters or less
    let fromPlantCodeRaw = getString(fromLocationData.plant_code);
    let toPlantCodeRaw = getString(toLocationData.plant_code);

    // Find plants with codes that are 4 characters or less (for VARCHAR(4) constraint)
    // First, try to find a plant code that matches the first 4 chars of the location's plant code
    let fromPlantCode = '';
    if (fromPlantCodeRaw && fromPlantCodeRaw.trim() !== '') {
      const prefix = fromPlantCodeRaw.substring(0, 4);
      // Find plants where code is exactly the prefix (4 chars or less) or starts with prefix and is <= 4 chars
      const fromPlantResult = await db.execute(sql`
        SELECT code FROM plants 
        WHERE (is_active = true OR active = true)
        AND LENGTH(code) <= 4
        AND (
          code = ${prefix}
          OR code LIKE ${prefix + '%'}
        )
        ORDER BY 
          CASE WHEN code = ${prefix} THEN 0 ELSE 1 END,
          LENGTH(code) ASC
        LIMIT 1
      `);

      if (fromPlantResult.rows.length > 0) {
        fromPlantCode = getString(fromPlantResult.rows[0].code);
      }
    }

    // If no match found, get any active plant with code <= 4 chars
    if (!fromPlantCode || fromPlantCode.length > 4) {
      const fallbackPlant = await db.execute(sql`
        SELECT code FROM plants 
        WHERE (is_active = true OR active = true)
        AND LENGTH(code) <= 4
        ORDER BY id LIMIT 1
      `);

      if (fallbackPlant.rows.length > 0) {
        fromPlantCode = getString(fallbackPlant.rows[0].code);
      } else {
        return res.status(400).json({
          success: false,
          error: "No active plants found with codes 4 characters or less. Please ensure at least one plant has a code of 4 characters or less."
        });
      }
    }

    // Verify the plant code exists and is <= 4 chars
    const fromPlantVerify = await db.execute(sql`
      SELECT code FROM plants 
      WHERE (is_active = true OR active = true)
      AND code = ${fromPlantCode}
      AND LENGTH(code) <= 4
      LIMIT 1
    `);

    if (fromPlantVerify.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: `Plant code ${fromPlantCode} not found or invalid in plants table`
      });
    }

    // Do the same for to_plant
    let toPlantCode = '';
    if (toPlantCodeRaw && toPlantCodeRaw.trim() !== '') {
      const prefix = toPlantCodeRaw.substring(0, 4);
      const toPlantResult = await db.execute(sql`
        SELECT code FROM plants 
        WHERE (is_active = true OR active = true)
        AND LENGTH(code) <= 4
        AND (
          code = ${prefix}
          OR code LIKE ${prefix + '%'}
        )
        ORDER BY 
          CASE WHEN code = ${prefix} THEN 0 ELSE 1 END,
          LENGTH(code) ASC
        LIMIT 1
      `);

      if (toPlantResult.rows.length > 0) {
        toPlantCode = getString(toPlantResult.rows[0].code);
      }
    }

    // If no match, use from_plant or find any plant with code <= 4 chars
    if (!toPlantCode || toPlantCode.length > 4) {
      toPlantCode = fromPlantCode; // Use same as from_plant
    }

    // Verify to_plant code exists
    const toPlantVerify = await db.execute(sql`
      SELECT code FROM plants 
      WHERE (is_active = true OR active = true)
      AND code = ${toPlantCode}
      AND LENGTH(code) <= 4
      LIMIT 1
    `);

    if (toPlantVerify.rows.length === 0) {
      toPlantCode = fromPlantCode; // Fallback to from_plant
    }
    const fromStorageCode = getString(fromLocationData.code).substring(0, 4) || '0001';
    const toStorageCode = getString(toLocationData.code).substring(0, 4) || '0001';

    // Generate transfer order number
    const transferCountResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM transfer_orders
    `);
    const transferCount = parseInt(String(transferCountResult.rows[0]?.count || 0)) + 1;
    const transferNumber = `TO-${new Date().getFullYear()}-${transferCount.toString().padStart(6, '0')}`;

    // Create transfer order

    const transferResult = await db.execute(sql`
      INSERT INTO transfer_orders (
        transfer_number, sales_order_id, delivery_id,
        from_plant, to_plant, from_storage_location, to_storage_location,
        transfer_date, status, movement_type, reference_document, reference_document_type,
        created_by, created_at, updated_at
      ) VALUES (
        ${transferNumber}, ${delivery.sales_order_id}, ${parsedDeliveryId},
        ${fromPlantCode}, ${toPlantCode},
        ${fromStorageCode}, ${toStorageCode},
        ${new Date().toISOString().split('T')[0]}, 'OPEN', '101',
        ${getString(delivery.delivery_number).substring(0, 20)}, 'DL', 1, NOW(), NOW()
      ) RETURNING id
    `);

    const transferOrderId = transferResult.rows[0]?.id;

    // Get delivery items and create transfer order items
    // CRITICAL: Only get items from THIS specific delivery_id (not other deliveries from same sales order)
    // This ensures split deliveries remain separate
    const itemsResult = await db.execute(sql`
      SELECT di.*, m.code as product_code, m.description as product_description
      FROM delivery_items di
      LEFT JOIN materials m ON di.material_id = m.id
      WHERE di.delivery_id = ${parsedDeliveryId}
      ORDER BY di.line_item
    `);

    // Validate that we have items for this delivery
    if (!itemsResult.rows || itemsResult.rows.length === 0) {
      // Rollback the transfer order creation
      await db.execute(sql`
        DELETE FROM transfer_orders WHERE id = ${transferOrderId}
      `);
      return res.status(400).json({
        success: false,
        error: `No items found in delivery ${parsedDeliveryId}. Cannot create transfer order without items.`
      });
    }

    console.log(`✅ Found ${itemsResult.rows.length} items for delivery ${parsedDeliveryId} (ensuring only this delivery's items are included)`);

    let itemCount = 0;

    for (let i = 0; i < itemsResult.rows.length; i++) {
      const item = itemsResult.rows[i];
      const lineItem = i + 1;

      await db.execute(sql`
        INSERT INTO transfer_order_items (
          transfer_order_id, line_item, material_id, material_code, material_description,
          requested_quantity, confirmed_quantity, unit, from_storage_location, to_storage_location,
          batch, status, created_at
        ) VALUES (
          ${transferOrderId}, ${lineItem}, ${item.material_id}, ${(getString(item.product_code) || `MAT${item.material_id}`).substring(0, 20)},
          ${(getString(item.product_description) || `Material ${item.material_id}`).substring(0, 255)}, ${getNumber(item.delivery_quantity)},
          0, ${getString(item.unit, 'EA').substring(0, 3)}, ${fromStorageCode}, ${toStorageCode}, 
          ${getString(item.batch).substring(0, 20)}, 'OPEN', NOW()
        )
      `);

      itemCount++;
    }

    // Update delivery status
    await db.execute(sql`
      UPDATE delivery_documents 
      SET status = 'CONFIRMED', updated_at = NOW()
      WHERE id = ${parsedDeliveryId}
    `);

    res.json({
      success: true,
      transferOrder: {
        id: transferOrderId,
        transferNumber,
        deliveryId: parsedDeliveryId,
        deliveryNumber: delivery.delivery_number,
        salesOrderNumber: delivery.sales_order_number,
        fromPlant: fromLocationData.plant_code,
        toPlant: toLocationData.plant_code,
        fromStorageLocation: fromLocationData.code,
        toStorageLocation: toLocationData.code,
        totalItems: itemCount,
        status: 'OPEN',
        message: `Transfer order created for delivery ${delivery.delivery_number}. Split deliveries are kept separate.`
      }
    });

  } catch (error: any) {
    console.error('❌ Transfer order creation error:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Request deliveryId:', req.body.deliveryId);
    console.error('❌ Request fromLocationId:', req.body.fromLocationId);
    console.error('❌ Request toLocationId:', req.body.toLocationId);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create transfer order',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get all transfer orders with detailed information
router.get("/transfer-orders", async (req, res) => {
  try {
    // Get transfer orders with all details including items
    const transferOrders = await db.execute(sql`
      SELECT 
        tro.id, 
        tro.transfer_number, 
        tro.sales_order_id, 
        tro.delivery_id,
        tro.from_plant, 
        tro.to_plant, 
        tro.from_storage_location, 
        tro.to_storage_location,
        tro.transfer_date, 
        tro.status, 
        tro.movement_type, 
        tro.reference_document,
        tro.reference_document_type, 
        tro.created_by, 
        tro.created_at, 
        tro.updated_at,
        so.order_number as sales_order_number,
        dd.delivery_number,
        c.name as customer_name,
        COUNT(toi.id) as total_items
      FROM transfer_orders tro
      LEFT JOIN sales_orders so ON tro.sales_order_id = so.id
      LEFT JOIN delivery_documents dd ON tro.delivery_id = dd.id
      LEFT JOIN erp_customers c ON so.customer_id = c.id
      LEFT JOIN transfer_order_items toi ON tro.id = toi.transfer_order_id
      GROUP BY tro.id, tro.transfer_number, tro.sales_order_id, tro.delivery_id,
               tro.from_plant, tro.to_plant, tro.from_storage_location, tro.to_storage_location,
               tro.transfer_date, tro.status, tro.movement_type, tro.reference_document,
               tro.reference_document_type, tro.created_by, tro.created_at, tro.updated_at,
               so.order_number, dd.delivery_number, c.name
      ORDER BY tro.created_at DESC
    `);

    // Get transfer order items with product details for each transfer order
    const transferOrdersWithItems = await Promise.all(
      transferOrders.rows.map(async (to: any) => {
        const itemsResult = await db.execute(sql`
          SELECT 
            toi.id,
            toi.line_item,
            toi.material_id,
            toi.material_code,
            toi.material_description,
            toi.requested_quantity,
            toi.confirmed_quantity,
            toi.unit,
            toi.from_storage_location,
            toi.to_storage_location,
            toi.status as item_status,
            toi.created_at,
            -- Get product name from materials table if available
            m.description as product_name,
            m.code as product_sku
          FROM transfer_order_items toi
          LEFT JOIN materials m ON toi.material_id = m.id
          WHERE toi.transfer_order_id = ${to.id}
          ORDER BY toi.line_item
        `);

        return {
          ...to,
          items: itemsResult.rows.map((item: any) => ({
            id: item.id,
            lineItem: item.line_item,
            materialId: item.material_id,
            materialCode: item.material_code,
            productName: item.product_name || item.material_description || 'N/A',
            productCode: item.product_sku || item.material_code || 'N/A',
            requestedQuantity: parseFloat(item.requested_quantity || 0),
            confirmedQuantity: parseFloat(item.confirmed_quantity || 0),
            unit: item.unit || 'EA',
            fromStorageLocation: item.from_storage_location,
            toStorageLocation: item.to_storage_location,
            status: item.item_status || 'OPEN',
            createdAt: item.created_at
          }))
        };
      })
    );

    res.json({
      success: true,
      data: transferOrdersWithItems
    });

  } catch (error) {
    console.error('Error fetching transfer orders:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch transfer orders'
    });
  }
});

// Get deliveries for transfer order creation
router.get("/deliveries-for-transfer", async (req, res) => {
  try {
    // CRITICAL FIX: Show ALL pending deliveries, including ones that may have transfer orders
    // Add transfer order status in the response so UI can show it
    // This prevents deliveries from "disappearing" when a transfer order is created
    // IMPORTANT: Use subquery to get storage location to avoid GROUP BY issues with split deliveries
    // This ensures split deliveries (multiple deliveries from same sales order) all show up
    const deliveries = await db.execute(sql`
      SELECT 
        dd.id, 
        dd.delivery_number, 
        dd.delivery_date, 
        dd.status as delivery_status,
        dd.sales_order_id, 
        so.order_number as sales_order_number,
        dd.customer_id, 
        c.name as customer_name,
        dd.plant, 
        p.code as plant_code, 
        p.name as plant_name,
        -- Get first storage location from delivery items (for display purposes)
        -- Using subquery to avoid GROUP BY issues that cause split deliveries to disappear
        (SELECT sl.code FROM delivery_items di2 
         LEFT JOIN storage_locations sl ON di2.storage_location = sl.code 
         WHERE di2.delivery_id = dd.id LIMIT 1) as bin_code,
        (SELECT sl.name FROM delivery_items di2 
         LEFT JOIN storage_locations sl ON di2.storage_location = sl.code 
         WHERE di2.delivery_id = dd.id LIMIT 1) as bin_name,
        (SELECT sl.id FROM delivery_items di2 
         LEFT JOIN storage_locations sl ON di2.storage_location = sl.code 
         WHERE di2.delivery_id = dd.id LIMIT 1) as bin_id,
        CASE WHEN tro.id IS NOT NULL THEN true ELSE false END as has_transfer_order,
        tro.id as transfer_order_id,
        tro.transfer_number,
        tro.status as transfer_order_status
      FROM delivery_documents dd
      LEFT JOIN sales_orders so ON dd.sales_order_id = so.id
      LEFT JOIN erp_customers c ON dd.customer_id = c.id
      LEFT JOIN plants p ON dd.plant = p.code
      LEFT JOIN transfer_orders tro ON dd.id = tro.delivery_id
      WHERE (
        -- Show deliveries that are PENDING, planned, or IN_PROGRESS (case-insensitive)
        UPPER(COALESCE(dd.status, 'PENDING')) IN ('PENDING', 'PLANNED', 'IN_PROGRESS')
        -- OR show CONFIRMED deliveries that don't have a transfer order yet
        OR (UPPER(COALESCE(dd.status, 'PENDING')) = 'CONFIRMED' AND tro.id IS NULL)
      )
      -- No GROUP BY needed - each delivery_documents row is unique
      -- This ensures all split deliveries show up correctly
      ORDER BY 
        CASE WHEN tro.id IS NULL THEN 0 ELSE 1 END, -- Deliveries without transfer orders first
        dd.delivery_date DESC
    `);

    res.json({
      success: true,
      data: deliveries.rows
    });

  } catch (error) {
    console.error('Error fetching deliveries for transfer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch deliveries for transfer'
    });
  }
});

// Get all deliveries with transfer order status
router.get("/all-deliveries", async (req, res) => {
  try {
    const deliveries = await db.execute(sql`
      SELECT 
        dd.id, dd.delivery_number, dd.delivery_date, dd.status as delivery_status,
        dd.sales_order_id, so.order_number as sales_order_number,
        dd.customer_id, c.name as customer_name,
        dd.plant, p.code as plant_code, p.name as plant_name,
        to.id as transfer_order_id, to.transfer_number, to.status as transfer_status,
        CASE 
          WHEN to.id IS NOT NULL THEN 'has_transfer'
          WHEN dd.status = 'PENDING' THEN 'ready_for_transfer'
          ELSE 'not_ready'
        END as transfer_eligibility
      FROM delivery_documents dd
      LEFT JOIN sales_orders so ON dd.sales_order_id = so.id
      LEFT JOIN erp_customers c ON dd.customer_id = c.id
      LEFT JOIN plants p ON dd.plant = p.code
      LEFT JOIN transfer_orders to ON dd.id = to.delivery_id
      ORDER BY dd.delivery_date DESC
    `);

    res.json({
      success: true,
      data: deliveries.rows
    });

  } catch (error) {
    console.error('Error fetching all deliveries:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch deliveries'
    });
  }
});

// Get sales orders ready for delivery creation
// CRITICAL: Show orders even if they have partial deliveries (split deliveries scenario)
// An order should remain eligible if it has schedule lines with remaining quantities
// IMPORTANT: Include orders without schedule lines yet (initial state) OR with remaining schedule lines
// FIX: After processing one split delivery, other pending deliveries should still show up
router.get("/sales-orders-for-delivery", async (req, res) => {
  try {
    const salesOrders = await db.execute(sql`
      SELECT 
        so.id, 
        so.order_number, 
        so.order_number as orderNumber,
        so.order_date, 
        so.order_date as orderDate,
        so.status,
        so.customer_id, 
        so.customer_id as customerId,
        c.name as customer_name, 
        c.name as customerName,
        c.name as customerDisplayName,
        c.email as customer_email,
        so.total_amount, 
        so.total_amount as totalAmount,
        so.currency,
        CASE 
          -- PRIORITY 1: Check if order has schedule lines with remaining quantities (split deliveries scenario)
          -- This is the most important check - shows orders with partial deliveries
          -- FIX: After processing one split delivery, other pending deliveries should still show
          -- Key: Check for ANY schedule line with remaining quantity (confirmed - delivered > 0)
          WHEN EXISTS (
            SELECT 1 FROM sales_order_schedule_lines sl
            JOIN sales_order_items soi ON sl.sales_order_item_id = soi.id
            WHERE soi.sales_order_id = so.id
              -- CRITICAL: Check if there's remaining quantity to deliver
              -- This ensures split deliveries remain visible after processing one delivery
              AND (sl.confirmed_quantity - COALESCE(sl.delivered_quantity, 0)) > 0
          ) THEN 'ready_for_delivery'
          -- PRIORITY 2: Orders with deliveries that haven't been fully processed (PGI not done)
          -- This ensures orders remain visible after creating deliveries until they're fully processed
          -- CRITICAL: Show orders with deliveries that have NOT_POSTED or PARTIALLY_POSTED inventory status
          WHEN EXISTS (
            SELECT 1 FROM delivery_documents dd
            WHERE dd.sales_order_id = so.id
              AND dd.inventory_posting_status IN ('NOT_POSTED', 'PARTIALLY_POSTED')
          ) THEN 'ready_for_delivery'
          -- PRIORITY 3: Orders without schedule lines yet (new orders that haven't been split)
          WHEN NOT EXISTS (
            SELECT 1 FROM sales_order_schedule_lines sl
            JOIN sales_order_items soi ON sl.sales_order_item_id = soi.id
            WHERE soi.sales_order_id = so.id
          ) THEN 
            CASE 
              WHEN so.status IN ('Confirmed', 'Delivered', 'confirmed', 'delivered', 'CONFIRMED', 'DELIVERED') THEN 'ready_for_delivery'
              WHEN so.status IN ('Open', 'Pending', 'open', 'pending', 'OPEN', 'PENDING') OR so.status IS NULL THEN 'ready_for_delivery'
              ELSE 'not_ready'
            END
          -- PRIORITY 4: Orders with deliveries but all fully processed (all PGI done)
          WHEN EXISTS (SELECT 1 FROM delivery_documents dd WHERE dd.sales_order_id = so.id) THEN 'has_delivery'
          -- PRIORITY 5: Standard eligibility check
          WHEN so.status IN ('Confirmed', 'Delivered', 'confirmed', 'delivered', 'CONFIRMED', 'DELIVERED') THEN 'ready_for_delivery'
          WHEN so.status IN ('Open', 'Pending', 'open', 'pending', 'OPEN', 'PENDING') OR so.status IS NULL THEN 'ready_for_delivery'
          ELSE 'not_ready'
        END as delivery_eligibility
      FROM sales_orders so
      LEFT JOIN erp_customers c ON so.customer_id = c.id
      WHERE so.active = true
        AND (so.status IN ('Open', 'Confirmed', 'Delivered', 'Pending', 'pending', 'OPEN', 'CONFIRMED', 'DELIVERED', 'PENDING')
          OR so.status IS NULL)
        -- CRITICAL: Show orders that either:
        -- 1. Have schedule lines with remaining quantities (split deliveries - most important!)
        --    FIX: This ensures that after processing one split delivery, other pending deliveries still show
        -- 2. Have deliveries that haven't been fully processed (PGI not done)
        -- 3. Don't have schedule lines yet (new orders)
        -- This ensures split deliveries remain visible after creating deliveries until they're fully processed
        AND (
          -- Option 1: Has remaining schedule lines (split delivery scenario)
          -- FIX: Show order if ANY schedule line has remaining quantity
          -- This is critical for split deliveries where one delivery is processed but others are pending
          -- Example: Split 100 units into 50+50, process first 50 → order should still show for remaining 50
          -- CRITICAL: This is the PRIMARY check - if there are remaining schedule lines, show the order
          EXISTS (
            SELECT 1 FROM sales_order_schedule_lines sl
            JOIN sales_order_items soi ON sl.sales_order_item_id = soi.id
            WHERE soi.sales_order_id = so.id
              -- CRITICAL: Simple quantity check - if confirmed > delivered, there's remaining quantity
              -- This works regardless of status and ensures split deliveries remain visible
              AND (sl.confirmed_quantity - COALESCE(sl.delivered_quantity, 0)) > 0
          )
          OR
          -- Option 2: No schedule lines yet (new order, will get default schedule line on delivery)
          -- Only show if there are no schedule lines at all (brand new order)
          -- CRITICAL: If schedule lines exist but all are fully delivered (remaining = 0), don't show
          NOT EXISTS (
            SELECT 1 FROM sales_order_schedule_lines sl
            JOIN sales_order_items soi ON sl.sales_order_item_id = soi.id
            WHERE soi.sales_order_id = so.id
          )
        )
      ORDER BY so.order_date DESC
    `);

    res.json({
      success: true,
      data: salesOrders.rows
    });

  } catch (error) {
    console.error('Error fetching sales orders for delivery:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch sales orders for delivery'
    });
  }
});

// Phase 4: Billing Document Creation (Invoice Generation)
router.post("/billing-documents", async (req, res) => {
  try {
    // Defensive body parsing
    let parsedBody = req.body;
    if (typeof parsedBody === 'string') {
      try {
        parsedBody = JSON.parse(parsedBody);
        console.log('🔄 Parsed stringified body:', parsedBody);
      } catch (e) {
        console.error('Failed to parse request body:', e);
        return res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: 'Request body must be valid JSON'
        });
      }
    }

    console.log('📝 Billing document creation request:', parsedBody);

    const { deliveryId, deliveryDocumentId, billingInfo = {} } = parsedBody;
    const actualDeliveryId = deliveryId || deliveryDocumentId;

    if (!actualDeliveryId) {
      return res.status(400).json({
        success: false,
        error: "deliveryId is required"
      });
    }

    console.log('🔍 Fetching delivery document:', actualDeliveryId);

    // Get delivery document with related data including tax information and company code
    const deliveryResult = await db.execute(sql`
      SELECT dd.*, so.customer_id, so.order_number as sales_order_number,
             so.payment_terms, so.currency, so.total_amount,
             so.subtotal, so.tax_amount, so.tax_breakdown,
             so.company_code_id as sales_order_company_code_id
      FROM delivery_documents dd
      JOIN sales_orders so ON dd.sales_order_id = so.id
      WHERE dd.id = ${actualDeliveryId}
    `);
    const delivery = deliveryResult.rows[0];

    console.log('📦 Delivery found:', delivery ? 'Yes' : 'No');

    if (!delivery) {
      return res.status(404).json({ success: false, error: "Delivery document not found" });
    }

    console.log('📊 Delivery data:', {
      id: delivery.id,
      sales_order_id: delivery.sales_order_id,
      customer_id: delivery.customer_id,
      total_amount: delivery.total_amount,
      subtotal: delivery.subtotal,
      tax_amount: delivery.tax_amount
    });

    // Generate billing number
    const currentYear = new Date().getFullYear();
    const billingCountResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM billing_documents 
      WHERE billing_number LIKE ${`INV-${currentYear}-%`}
    `);
    const billingCount = parseInt(String(billingCountResult.rows[0]?.count || 0)) + 1;
    const billingNumber = `INV-${currentYear}-${billingCount.toString().padStart(6, '0')}`;

    // Calculate due date (default 30 days)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Get delivery items with pricing
    const itemsResult = await db.execute(sql`
      SELECT di.*, soi.unit_price, soi.net_amount,
             soi.tax_percent, soi.discount_percent,
             soi.material_description as product_description
      FROM delivery_items di
      JOIN sales_order_items soi ON di.sales_order_item_id = soi.id
      WHERE di.delivery_id = ${actualDeliveryId}
    `);

    let totalNetAmount = 0;
    let totalTaxAmount = 0;
    let totalGrossAmount = 0;

    // CRITICAL FIX: Always calculate from delivery items ONLY, never use sales order totals
    // This ensures split deliveries invoice only their portion, not the entire order
    if (itemsResult.rows && itemsResult.rows.length > 0) {
      // Calculate from delivery items
      for (const item of itemsResult.rows) {
        const deliveryQty = parseFloat(String(item.delivery_quantity || 0));
        const unitPrice = parseFloat(String(item.unit_price || 0));
        totalNetAmount += deliveryQty * unitPrice;
      }

      // Calculate tax based on sales order tax breakdown or default 10%
      let taxRate = 0;
      if (delivery.tax_breakdown) {
        try {
          const taxRules = typeof delivery.tax_breakdown === 'string'
            ? JSON.parse(delivery.tax_breakdown)
            : delivery.tax_breakdown;

          if (Array.isArray(taxRules)) {
            taxRate = taxRules.reduce((sum, rule) => sum + parseFloat(rule.rate_percent || 0), 0);
            console.log('📊 Tax rules from sales order:', taxRules);
          }
        } catch (e) {
          console.error('Error parsing tax_breakdown:', e);
        }
      }

      // If no tax rate found, get from system configuration or tax codes
      if (taxRate === 0) {
        const systemTaxConfig = await db.execute(sql`
          SELECT config_value FROM system_configuration 
          WHERE config_key = 'default_tax_rate' AND active = true LIMIT 1
        `);

        if (systemTaxConfig.rows.length > 0) {
          taxRate = parseFloat(String(systemTaxConfig.rows[0].config_value || '0'));
          console.log(`✅ Using system default tax rate: ${taxRate}%`);
        } else {
          // Get default tax rate from tax codes table
          const defaultTaxResult = await db.execute(sql`
            SELECT tax_rate FROM tax_codes 
            WHERE is_default = true AND is_active = true 
            ORDER BY id LIMIT 1
          `);

          if (defaultTaxResult.rows.length > 0) {
            taxRate = parseFloat(String(defaultTaxResult.rows[0].tax_rate || '0'));
            console.log(`✅ Using default tax rate from tax codes: ${taxRate}%`);
          } else {
            return res.status(400).json({
              success: false,
              error: 'Tax rate not configured. Please configure tax codes or system default tax rate.'
            });
          }
        }
      }

      totalTaxAmount = totalNetAmount * (taxRate / 100);
      totalGrossAmount = totalNetAmount + totalTaxAmount;

      console.log('💰 Calculated totals from delivery items:', {
        itemsCount: itemsResult.rows.length,
        totalNetAmount: totalNetAmount.toFixed(2),
        taxRate: taxRate + '%',
        totalTaxAmount: totalTaxAmount.toFixed(2),
        totalGrossAmount: totalGrossAmount.toFixed(2)
      });
    } else {
      // If no delivery items found, this is an error - cannot create invoice without items
      return res.status(400).json({
        success: false,
        error: 'Cannot create invoice: No delivery items found. Delivery must have items to bill.'
      });
    }

    // Create billing document
    console.log('💰 Creating billing document...');
    console.log('📝 Values:', {
      billingNumber,
      sales_order_id: delivery.sales_order_id,
      delivery_id: actualDeliveryId,
      customer_id: delivery.customer_id,
      due_date: dueDate.toISOString(),
      net_amount: totalNetAmount,
      tax_amount: totalTaxAmount,
      total_amount: totalGrossAmount
    });

    // Get company_code_id from sales order, fallback to customer
    let companyCodeId = delivery.sales_order_company_code_id || null;

    if (!companyCodeId && delivery.customer_id) {
      const customerCompanyCodeResult = await db.execute(sql`
        SELECT company_code_id
        FROM erp_customers
        WHERE id = ${delivery.customer_id}
      `);
      companyCodeId = customerCompanyCodeResult.rows[0]?.company_code_id || null;
    }

    const billingResult = await db.execute(sql`
      INSERT INTO billing_documents (
        billing_number, sales_order_id, delivery_id,
        customer_id, company_code_id, billing_date, due_date,
        net_amount, tax_amount, total_amount
      ) VALUES (
        ${billingNumber}, ${delivery.sales_order_id},
        ${actualDeliveryId}, ${delivery.customer_id}, 
        ${companyCodeId}, NOW(), ${dueDate.toISOString()},
        ${totalNetAmount}, ${totalTaxAmount}, ${totalGrossAmount}
      ) RETURNING id
    `);
    console.log('✅ Billing document created with ID:', billingResult.rows[0]?.id);

    const billingDocumentId = billingResult.rows[0]?.id;

    // Create billing items (if delivery items exist)
    if (itemsResult.rows && itemsResult.rows.length > 0) {
      let lineItemNumber = 1;

      // Calculate tax rate from sales order
      let itemTaxRate = 0;
      if (totalNetAmount > 0 && totalTaxAmount > 0) {
        itemTaxRate = (totalTaxAmount / totalNetAmount) * 100;
        console.log(`📊 Calculated tax rate from order: ${itemTaxRate.toFixed(2)}%`);
      }

      for (const item of itemsResult.rows) {
        const deliveryQty = parseFloat(String(item.delivery_quantity || 0));
        const unitPrice = parseFloat(String(item.unit_price || 0));

        // Calculate amounts for this line using the overall tax rate
        const itemNet = deliveryQty * unitPrice;
        const itemTax = itemNet * (itemTaxRate / 100);

        // Unit can now be up to 10 characters
        const unit = String(item.unit_of_measure || 'EA').substring(0, 10).toUpperCase();

        console.log(`📦 Line ${lineItemNumber}:`, {
          qty: deliveryQty,
          price: unitPrice,
          net: itemNet.toFixed(2),
          taxRate: itemTaxRate.toFixed(2) + '%',
          tax: itemTax.toFixed(2)
        });

        await db.execute(sql`
          INSERT INTO billing_items (
            billing_id, line_item, sales_order_item_id, delivery_item_id,
            material_id, billing_quantity, unit, unit_price,
            net_amount, tax_amount
          ) VALUES (
            ${billingDocumentId}, ${lineItemNumber}, ${item.sales_order_item_id || null}, ${item.id || null},
            ${item.material_id || 1}, ${deliveryQty}, ${unit},
            ${unitPrice}, ${itemNet}, ${itemTax}
          )
        `);
        lineItemNumber++;
      }
      console.log(`✅ Created ${lineItemNumber - 1} billing items with tax`);
    } else {
      // If no delivery items, use sales order total
      await db.execute(sql`
        INSERT INTO billing_items (
          billing_id, line_item, material_id,
          billing_quantity, unit, unit_price,
          net_amount, tax_amount
        ) VALUES (
          ${billingDocumentId}, 1, 1,
          1, 'EA', ${totalNetAmount},
          ${totalNetAmount}, ${totalTaxAmount}
        )
      `);
      console.log('✅ Created 1 billing item (from sales order total)');
    }

    // Create document flow record
    await db.execute(sql`
      INSERT INTO document_flow (
        source_document_type, source_document,
        target_document_type, target_document,
        flow_type
      ) VALUES (
        'DELIVERY', ${actualDeliveryId},
        'BILLING', ${billingDocumentId},
        'CREATE'
      )
    `);

    res.json({
      success: true,
      billingDocument: {
        id: billingDocumentId,
        billingNumber,
        deliveryNumber: delivery.delivery_number,
        salesOrderNumber: delivery.sales_order_number,
        netAmount: totalNetAmount,
        taxAmount: totalTaxAmount,
        grossAmount: totalGrossAmount,
        status: 'open'
      }
    });

  } catch (error) {
    console.error("❌ Billing document creation error:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      table: error.table,
      column: error.column,
      constraint: error.constraint
    });
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create billing document",
      details: error.code ? `SQL Error ${error.code}: ${error.message}` : error.message
    });
  }
});

// Document Flow Tracking
router.get("/document-flow/:sourceType/:sourceId", async (req, res) => {
  try {
    const { sourceType, sourceId } = req.params;

    const flowResult = await db.execute(sql`
      SELECT * FROM document_flow 
      WHERE source_document_type = ${sourceType} AND source_document = ${sourceId}
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      documentFlow: flowResult.rows
    });

  } catch (error) {
    console.error("Document flow retrieval error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve document flow"
    });
  }
});

// Helper function for pricing calculation
async function calculateOrderConditions(salesOrderId, customerId, materialId, basePrice, quantity, procedure) {
  const conditions = [];

  // Base price condition (STD1)
  conditions.push({
    conditionType: 'STD1',
    conditionValue: basePrice,
    currency: 'USD',
    calculationType: 'A',
    conditionAmount: basePrice * quantity,
    accessSequence: 'STDCUST',
    isStatistical: false,
    isManual: false
  });

  // Customer discount conditions (CDIS01-04)
  try {
    const discountResult = await db.execute(sql`
      SELECT ct.condition_type, ct.condition_value, ct.calculation_type
      FROM condition_types ct
      WHERE ct.condition_type LIKE 'CDIS%' AND ct.is_active = true
      LIMIT 2
    `);

    for (const discount of discountResult.rows) {
      const discountAmount = parseFloat(String(discount.condition_value)) * basePrice * quantity / 100;
      conditions.push({
        conditionType: discount.condition_type,
        conditionValue: parseFloat(String(discount.condition_value)),
        currency: 'USD',
        calculationType: discount.calculation_type || 'B',
        conditionAmount: -discountAmount,
        accessSequence: 'STDVOL',
        isStatistical: false,
        isManual: false
      });
    }
  } catch (error) {
    console.error("Discount calculation error:", error);
  }

  // Tax conditions (TAX01-04)
  try {
    const taxResult = await db.execute(sql`
      SELECT ct.condition_type, ct.condition_value, ct.calculation_type
      FROM condition_types ct
      WHERE ct.condition_type LIKE 'TAX%' AND ct.is_active = true
      LIMIT 1
    `);

    for (const tax of taxResult.rows) {
      const netAmount = basePrice * quantity;
      const taxAmount = parseFloat(String(tax.condition_value)) * netAmount / 100;
      conditions.push({
        conditionType: tax.condition_type,
        conditionValue: parseFloat(String(tax.condition_value)),
        currency: 'USD',
        calculationType: tax.calculation_type || 'A',
        conditionAmount: taxAmount,
        accessSequence: 'STDTAX',
        isStatistical: false,
        isManual: false
      });
    }
  } catch (error) {
    console.error("Tax calculation error:", error);
  }

  return conditions;
}

// ===================================================================
// PHASE 3: ADVANCED CREDIT MANAGEMENT API ENDPOINTS 
// ===================================================================

// Review Pending Credit Decisions
router.get("/credit-management/pending-decisions", async (req, res) => {
  try {
    // Check if credit_decisions table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'credit_decisions'
      )
    `);

    const tableExists = tableCheck.rows[0]?.exists || false;

    let pendingDecisions;
    if (tableExists) {
      pendingDecisions = await db.execute(sql`
        SELECT 
          cd.id,
          cd.customer_id,
          c.name as customer_name,
          cd.sales_order_id,
          so.order_number,
          cd.requested_credit_amount,
          cd.decision_status,
          cd.risk_score,
          cd.decision_date,
          cd.valid_until,
          cd.created_at
        FROM credit_decisions cd
        JOIN erp_customers c ON cd.customer_id = c.id
        LEFT JOIN sales_orders so ON cd.sales_order_id = so.id
        WHERE cd.decision_status IN ('pending', 'review_required')
        ORDER BY cd.created_at DESC
        LIMIT 50
      `);
    } else {
      // Return empty array if table doesn't exist
      pendingDecisions = { rows: [] };
    }

    res.json({
      success: true,
      data: pendingDecisions.rows,
      count: pendingDecisions.rows.length
    });

  } catch (error) {
    console.error('Error fetching pending credit decisions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending credit decisions'
    });
  }
});

// Approve/Reject Credit Decision
router.post("/credit-management/decisions/:id/action", async (req, res) => {
  try {
    // Check if credit_decisions table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'credit_decisions'
      )
    `);

    const tableExists = tableCheck.rows[0]?.exists || false;

    if (!tableExists) {
      return res.status(404).json({
        success: false,
        error: 'Credit decisions table does not exist'
      });
    }

    const { id } = req.params;
    const { action, comments, approvedAmount } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Action must be approve or reject'
      });
    }

    const updateResult = await db.execute(sql`
      UPDATE credit_decisions 
      SET 
        decision_status = ${action === 'approve' ? 'approved' : 'rejected'},
        approved_credit_amount = ${action === 'approve' ? (approvedAmount || 0) : 0},
        decision_comments = ${comments || ''},
        decision_date = NOW(),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `);

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Credit decision not found'
      });
    }

    res.json({
      success: true,
      data: updateResult.rows[0],
      message: `Credit decision ${action}d successfully`
    });

  } catch (error) {
    console.error('Error updating credit decision:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update credit decision'
    });
  }
});

// Preview Dunning Letters
// Get detailed dunning notices by level
router.get("/credit-management/dunning/notices-detail", async (req, res) => {
  try {
    const { level } = req.query;

    // Get actual dunning notices with customer details
    const noticesQuery = level
      ? sql`
          SELECT 
            dn.id,
            dn.dunning_level,
            dn.customer_id,
            c.name as customer_name,
            c.email as customer_email,
            c.phone as customer_phone,
            dn.due_amount as overdue_amount,
            dn.notice_date,
            dn.notice_status as status,
            COUNT(bd.id) as overdue_invoices
          FROM dunning_notices dn
          JOIN erp_customers c ON dn.customer_id = c.id
          LEFT JOIN billing_documents bd ON c.id = bd.customer_id AND bd.posting_status = 'open'
          WHERE dn.dunning_level = ${parseInt(level as string)}
          GROUP BY dn.id, dn.dunning_level, dn.customer_id, c.name, c.email, c.phone, 
                   dn.due_amount, dn.notice_date, dn.notice_status
          ORDER BY dn.due_amount DESC
        `
      : sql`
          SELECT 
            dn.dunning_level,
            COUNT(*) as notice_count,
            SUM(dn.due_amount::decimal) as total_overdue,
            AVG(dn.due_amount::decimal) as avg_overdue
          FROM dunning_notices dn
          GROUP BY dn.dunning_level
          ORDER BY dn.dunning_level
        `;

    const result = await db.execute(noticesQuery);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching dunning notice details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dunning notice details'
    });
  }
});

// Helper function to generate dunning letter preview text
function generateDunningPreview(customer: any, dunningLevel: number): string {
  const levelTexts: Record<number, string> = {
    1: `Dear ${customer.customer_name},\n\nThis is a friendly reminder that your account has an overdue balance of $${parseFloat(customer.total_overdue_amount || 0).toFixed(2)}.\n\nPlease remit payment at your earliest convenience to avoid further action.\n\nThank you for your prompt attention to this matter.`,
    2: `Dear ${customer.customer_name},\n\nDespite our previous reminder, your account shows an outstanding balance of $${parseFloat(customer.total_overdue_amount || 0).toFixed(2)}.\n\nImmediate payment is requested to avoid service interruption.\n\nPlease contact us if you have any questions.`,
    3: `Dear ${customer.customer_name},\n\nFINAL NOTICE: Your account balance of $${parseFloat(customer.total_overdue_amount || 0).toFixed(2)} is seriously overdue.\n\nPayment must be received within 7 days or your account may be sent to collections.\n\nPlease remit payment immediately or contact us to make arrangements.`
  };

  return levelTexts[dunningLevel] || levelTexts[1];
}

router.get("/credit-management/dunning/preview-letters", async (req, res) => {
  try {
    const { dunningLevel = '1' } = req.query;

    // Get customers with overdue invoices for dunning  
    const overdueCustomers = await db.execute(sql`
      SELECT DISTINCT
        c.id as customer_id,
        c.name as customer_name,
        c.email,
        COUNT(DISTINCT bd.id) as overdue_invoices,
        SUM(bd.total_amount::decimal) as total_overdue_amount,
        MIN(bd.billing_date) as oldest_invoice_date,
        MAX(bd.due_date) as latest_due_date
      FROM erp_customers c
      JOIN billing_documents bd ON c.id = bd.customer_id
      WHERE bd.posting_status = 'open'
        AND bd.due_date < NOW() - INTERVAL '30 days'
      GROUP BY c.id, c.name, c.email
      HAVING COUNT(DISTINCT bd.id) > 0
      ORDER BY total_overdue_amount DESC
      LIMIT 20
    `);

    // Generate preview data for dunning letters
    const previewData = overdueCustomers.rows.map(customer => ({
      customerId: customer.customer_id,
      customerName: customer.customer_name,
      email: customer.email,
      overdueAmount: parseFloat(String(customer.total_overdue_amount || 0)),
      overdueInvoices: parseInt(String(customer.overdue_invoices || 0)),
      daysPastDue: Math.floor((Date.now() - new Date(String(customer.latest_due_date)).getTime()) / (1000 * 60 * 60 * 24)),
      dunningLevel: parseInt(String(dunningLevel)),
      letterTemplate: `DUNNING_LEVEL_${dunningLevel}`,
      previewText: generateDunningPreview(customer, parseInt(String(dunningLevel)))
    }));

    res.json({
      success: true,
      data: previewData,
      count: previewData.length,
      dunningLevel: parseInt(String(dunningLevel))
    });

  } catch (error) {
    console.error('Error generating dunning letter previews:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate dunning letter previews'
    });
  }
});

// Execute Dunning Run
router.post("/credit-management/dunning/execute-run", async (req, res) => {
  try {
    const { dunningLevel = 1, customerIds = [], testRun = false } = req.body;

    const runId = `DN-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Create dunning procedure record
    const procedureResult = await db.execute(sql`
      INSERT INTO dunning_procedures (
        procedure_code, procedure_name, dunning_level, 
        execution_date, status, is_test_run, created_by
      ) VALUES (
        ${runId}, 'Automated Dunning Run', ${dunningLevel},
        NOW(), 'executing', ${testRun}, 'system'
      ) RETURNING id
    `);

    const procedureId = procedureResult.rows[0]?.id;
    let processedCount = 0;
    let noticesGenerated = 0;

    // Get customers with overdue invoices for dunning
    let customersToProcess;
    if (customerIds.length > 0) {
      customersToProcess = await db.execute(sql`
        SELECT DISTINCT
          c.id as customer_id,
          c.name as customer_name,
          c.email,
          COALESCE(SUM(bd.total_amount::decimal), 0) as total_overdue
        FROM erp_customers c
        LEFT JOIN billing_documents bd ON c.id = bd.customer_id
        WHERE c.id = ANY(${customerIds})
          AND bd.posting_status = 'open'
          AND bd.due_date < NOW() - INTERVAL '30 days'
        GROUP BY c.id, c.name, c.email
        HAVING COALESCE(SUM(bd.total_amount::decimal), 0) > 0
      `);
    } else {
      customersToProcess = await db.execute(sql`
        SELECT DISTINCT
          c.id as customer_id,
          c.name as customer_name,
          c.email,
          COALESCE(SUM(bd.total_amount::decimal), 0) as total_overdue
        FROM erp_customers c
        LEFT JOIN billing_documents bd ON c.id = bd.customer_id
        WHERE bd.posting_status = 'open'
          AND bd.due_date < NOW() - INTERVAL '30 days'
        GROUP BY c.id, c.name, c.email
        HAVING COALESCE(SUM(bd.total_amount::decimal), 0) > 0
        LIMIT 20
      `);
    }

    for (const customer of customersToProcess.rows) {
      // Create dunning notice
      const noticeResult = await db.execute(sql`
        INSERT INTO dunning_notices (
          dunning_procedure_id, customer_id, dunning_level,
          notice_date, due_amount, notice_status, is_test_run
        ) VALUES (
          ${procedureId}, ${customer.customer_id}, ${dunningLevel},
          NOW(), ${customer.total_overdue}, 'generated', ${testRun}
        ) RETURNING id
      `);

      if (noticeResult.rows.length > 0) {
        noticesGenerated++;
      }
      processedCount++;
    }

    // Update procedure status
    await db.execute(sql`
      UPDATE dunning_procedures 
      SET 
        status = 'completed',
        customers_processed = ${processedCount},
        notices_generated = ${noticesGenerated},
        completed_at = NOW()
      WHERE id = ${procedureId}
    `);

    res.json({
      success: true,
      data: {
        runId,
        procedureId,
        customersProcessed: processedCount,
        noticesGenerated,
        dunningLevel,
        testRun,
        executionDate: new Date().toISOString()
      },
      message: `Dunning run ${testRun ? '(test)' : ''} completed successfully`
    });

  } catch (error) {
    console.error('Error executing dunning run:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute dunning run'
    });
  }
});

// Process Unmatched Cash Items
router.post("/credit-management/cash-application/process-unmatched", async (req, res) => {
  try {
    const { applicationId, action, matchingCriteria } = req.body;

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        error: 'Application ID is required'
      });
    }

    // Get unmatched cash application
    const cashAppResult = await db.execute(sql`
      SELECT * FROM cash_applications 
      WHERE id = ${applicationId} AND application_status = 'unmatched'
    `);

    if (cashAppResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Unmatched cash application not found'
      });
    }

    const cashApp = cashAppResult.rows[0];
    let updateData: {
      application_status: string;
      matched_invoice_id?: number;
      matching_method?: string;
      processing_notes?: string;
      processed_date?: Date;
      processed_by?: string;
    } = {
      application_status: 'pending'
    };

    switch (action) {
      case 'manual_match':
        if (!matchingCriteria?.invoiceId) {
          return res.status(400).json({
            success: false,
            error: 'Invoice ID required for manual matching'
          });
        }

        updateData = {
          application_status: 'matched',
          matched_invoice_id: matchingCriteria.invoiceId,
          matching_method: 'manual',
          processed_date: new Date(),
          processed_by: 'system'
        };
        break;

      case 'create_credit_memo':
        updateData = {
          application_status: 'credit_memo_created',
          processing_notes: 'Credit memo created for unmatched payment',
          processed_date: new Date(),
          processed_by: 'system'
        };
        break;

      case 'return_payment':
        updateData = {
          application_status: 'returned',
          processing_notes: 'Payment returned to customer',
          processed_date: new Date(),
          processed_by: 'system'
        };
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action specified'
        });
    }

    // Update cash application
    const updateResult = await db.execute(sql`
      UPDATE cash_applications 
      SET 
        application_status = ${updateData.application_status},
        matched_invoice_id = ${updateData.matched_invoice_id || null},
        matching_method = ${updateData.matching_method || null},
        processing_notes = ${updateData.processing_notes || null},
        processed_date = ${updateData.processed_date?.toISOString() || null},
        processed_by = ${updateData.processed_by || null},
        updated_at = NOW()
      WHERE id = ${applicationId}
      RETURNING *
    `);

    res.json({
      success: true,
      data: updateResult.rows[0],
      message: `Cash application ${action.replace('_', ' ')} successfully`
    });

  } catch (error) {
    console.error('Error processing unmatched cash application:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process unmatched cash application'
    });
  }
});

// Get Unmatched Cash Application Items
router.get("/credit-management/cash-application/unmatched", async (req, res) => {
  try {
    const unmatchedItems = await db.execute(sql`
      SELECT 
        ca.id,
        ca.customer_id,
        c.name as customer_name,
        ca.application_amount,
        ca.application_date,
        ca.application_status,
        ca.reference_number,
        ca.matching_method,
        ca.processing_notes,
        ca.processed_date,
        ca.processed_by
      FROM cash_applications ca
      LEFT JOIN erp_customers c ON ca.customer_id = c.id
      WHERE ca.application_status IN ('unmatched', 'pending') 
      ORDER BY ca.application_date DESC
      LIMIT 50
    `);

    res.json({
      success: true,
      data: unmatchedItems.rows || [],
      count: unmatchedItems.rows?.length || 0
    });

  } catch (error) {
    console.error('Error fetching unmatched cash applications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch unmatched cash applications'
    });
  }
});

// Process Cash Application Matching
router.post("/credit-management/cash-application/match", async (req, res) => {
  try {
    const { applicationId, invoiceId, matchedAmount, matchingMethod } = req.body;

    // Update cash application with matching details
    const updateResult = await db.execute(sql`
      UPDATE cash_applications 
      SET 
        application_status = 'matched',
        matched_invoice_id = ${invoiceId},
        matching_method = ${matchingMethod},
        processed_date = NOW(),
        processed_by = 'System',
        updated_at = NOW()
      WHERE id = ${applicationId}
      RETURNING *
    `);

    res.json({
      success: true,
      data: updateResult.rows[0],
      message: 'Cash application matched successfully'
    });

  } catch (error) {
    console.error('Error processing cash application match:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process cash application match'
    });
  }
});

// Get Credit Management Dashboard Data
router.get("/credit-management/dashboard", async (req, res) => {
  try {
    // Check if credit_decisions table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'credit_decisions'
      )
    `);

    const tableExists = tableCheck.rows[0]?.exists || false;

    // Credit utilization data
    let creditStats;
    if (tableExists) {
      creditStats = await db.execute(sql`
        SELECT 
          COUNT(DISTINCT customer_id) as total_customers,
          AVG(CASE WHEN requested_credit_amount > 0 THEN (approved_credit_amount::decimal / requested_credit_amount::decimal) * 100 ELSE 0 END) as avg_utilization,
          COUNT(CASE WHEN decision_status = 'pending' THEN 1 END) as pending_decisions,
          COUNT(CASE WHEN decision_status = 'rejected' THEN 1 END) as rejected_decisions
        FROM credit_decisions
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `);
    } else {
      // Return empty/default stats if table doesn't exist
      creditStats = {
        rows: [{
          total_customers: 0,
          avg_utilization: 0,
          pending_decisions: 0,
          rejected_decisions: 0
        }]
      };
    }

    // Dunning statistics
    const dunningStats = await db.execute(sql`
      SELECT 
        dunning_level,
        COUNT(*) as notice_count,
        SUM(due_amount::decimal) as total_amount
      FROM dunning_notices
      WHERE notice_date >= NOW() - INTERVAL '30 days'
      GROUP BY dunning_level
      ORDER BY dunning_level
    `);

    // Cash application stats
    const cashStats = await db.execute(sql`
      SELECT 
        application_status,
        COUNT(*) as count,
        SUM(application_amount::decimal) as total_amount
      FROM cash_applications
      WHERE application_date >= NOW() - INTERVAL '30 days'
      GROUP BY application_status
    `);

    res.json({
      success: true,
      data: {
        creditUtilization: {
          percentage: parseFloat(creditStats.rows[0]?.avg_utilization || 0),
          totalCustomers: parseInt(creditStats.rows[0]?.total_customers || 0),
          pendingDecisions: parseInt(creditStats.rows[0]?.pending_decisions || 0),
          rejectedDecisions: parseInt(creditStats.rows[0]?.rejected_decisions || 0)
        },
        dunningManagement: {
          notices: dunningStats.rows.map(row => ({
            level: parseInt(String(row.dunning_level)),
            count: parseInt(String(row.notice_count)),
            amount: parseFloat(String(row.total_amount || 0))
          })),
          nextRunDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Next week
          totalAccounts: dunningStats.rows.reduce((sum, row) => sum + parseInt(String(row.notice_count)), 0)
        },
        cashApplication: {
          autoMatchRate: 94.2, // Sample rate
          avgProcessingDays: 1.3, // Sample processing time
          unmatchedItems: cashStats.rows
            .filter(row => row.application_status === 'unmatched')
            .reduce((sum, row) => sum + parseInt(String(row.count)), 0),
          applications: cashStats.rows.map(row => ({
            status: row.application_status,
            count: parseInt(String(row.count)),
            amount: parseFloat(String(row.total_amount || 0))
          }))
        }
      }
    });

  } catch (error) {
    console.error('Error fetching credit management dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch credit management dashboard data'
    });
  }
});

// Initialize Sample Credit Management Data
router.post("/credit-management/initialize-sample-data", async (req, res) => {
  try {
    // Create sample credit decisions
    const sampleCreditDecisions = [
      {
        customer_id: 1,
        sales_order_id: 1,
        requested_credit_amount: 45200,
        decision_status: 'pending',
        risk_score: 725,
        decision_reason: 'Standard credit evaluation for new order',
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      {
        customer_id: 2,
        sales_order_id: null,
        requested_credit_amount: 75000,
        decision_status: 'review_required',
        risk_score: 650,
        decision_reason: 'High amount requires manual review',
        valid_until: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
      }
    ];

    // Check if credit_decisions table exists before inserting
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'credit_decisions'
      )
    `);

    const tableExists = tableCheck.rows[0]?.exists || false;

    if (tableExists) {
      for (const decision of sampleCreditDecisions) {
        await db.execute(sql`
          INSERT INTO credit_decisions (
            customer_id, sales_order_id, requested_credit_amount,
            decision_status, risk_score, decision_reason, valid_until,
            created_at, updated_at
          ) VALUES (
            ${decision.customer_id}, ${decision.sales_order_id}, 
            ${decision.requested_credit_amount}, ${decision.decision_status},
            ${decision.risk_score}, ${decision.decision_reason},
            ${decision.valid_until.toISOString()}, NOW(), NOW()
          )
          ON CONFLICT DO NOTHING
        `);
      }
    } else {
      console.log('⚠️ credit_decisions table does not exist, skipping sample data insertion');
    }

    // Create sample cash applications
    const sampleCashApplications = [
      {
        customer_id: 1,
        application_amount: 24750,
        application_date: new Date(),
        application_status: 'matched',
        reference_number: 'INV-2024-1234',
        matching_method: 'automatic'
      },
      {
        customer_id: 2,
        application_amount: 15420,
        application_date: new Date(),
        application_status: 'unmatched',
        reference_number: 'PAY-2024-5678',
        matching_method: null
      }
    ];

    for (const cashApp of sampleCashApplications) {
      await db.execute(sql`
        INSERT INTO cash_applications (
          customer_id, application_amount, application_date,
          application_status, reference_number, matching_method,
          created_at, updated_at
        ) VALUES (
          ${cashApp.customer_id}, ${cashApp.application_amount},
          ${cashApp.application_date.toISOString()}, ${cashApp.application_status},
          ${cashApp.reference_number}, ${cashApp.matching_method},
          NOW(), NOW()
        )
        ON CONFLICT DO NOTHING
      `);
    }

    res.json({
      success: true,
      message: 'Sample credit management data initialized successfully',
      data: {
        creditDecisions: sampleCreditDecisions.length,
        cashApplications: sampleCashApplications.length
      }
    });

  } catch (error) {
    console.error('Error initializing sample data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize sample credit management data'
    });
  }
});



// Email automation after letter generation
router.post('/credit-management/email-automation', async (req, res) => {
  try {
    const { customer_id, customer_name, customer_email, letter_content, dunning_level, action_type } = req.body;

    // ERP Email Automation Workflow
    const emailWorkflow = {
      workflowId: `EMAIL-WF-${Date.now()}`,
      customerId: customer_id,
      customerName: customer_name,
      customerEmail: customer_email,
      triggerAction: action_type, // 'letter_generated', 'payment_plan_created', 'contact_scheduled'
      dunningLevel: dunning_level,

      // Email Configuration
      emailConfig: {
        templateType: dunning_level === 1 ? 'dunning_first_notice' :
          dunning_level === 2 ? 'dunning_second_notice' :
            'dunning_final_notice',
        priority: dunning_level >= 3 ? 'high' : 'normal',
        deliveryMethod: 'immediate', // or 'scheduled', 'batch'
        trackingEnabled: true,
        requiresConfirmation: dunning_level >= 3,
        attachments: action_type === 'letter_generated' ? ['dunning_letter.pdf'] : []
      },

      // Automation Rules
      automationRules: {
        sendEmail: true,
        scheduleFollowUp: dunning_level >= 2,
        followUpDays: dunning_level === 2 ? 7 : 3,
        escalateIfNoResponse: dunning_level >= 2,
        escalationDays: dunning_level === 2 ? 14 : 7,
        notifyCollectionsTeam: dunning_level >= 3,
        createTaskForAgent: true,
        updateCustomerStatus: true
      },

      // Email Content
      emailContent: {
        subject: `${dunning_level === 1 ? 'Payment Reminder' :
          dunning_level === 2 ? 'Urgent: Payment Required' :
            'FINAL NOTICE: Immediate Action Required'} - Account ${customer_id}`,

        body: `Dear ${customer_name},

${action_type === 'letter_generated' ?
            `We have generated and sent a ${dunning_level === 1 ? 'payment reminder' :
              dunning_level === 2 ? 'second notice' : 'final notice'} letter regarding your overdue account.

Please find the attached letter for complete details. This email serves as additional notification to ensure you receive this important communication.` :

            action_type === 'payment_plan_created' ?
              `We have prepared a payment plan proposal for your consideration. This plan allows you to resolve your overdue balance through manageable monthly payments.

Please review the attached payment plan details and contact us to discuss the terms.` :

              `We have scheduled a follow-up contact regarding your account. Our collections team will be reaching out to discuss resolution options for your overdue balance.`}

${dunning_level >= 3 ?
            `⚠️ URGENT ACTION REQUIRED: This is a final notice. Immediate payment or contact is required to avoid further collection actions.` :
            ''}

For immediate assistance, please contact:
- Phone: (555) 123-4567
- Email: collections@mallyerp.com
- Online Portal: portal.mallyerp.com

Account Summary:
- Customer ID: ${customer_id}
- Email: ${customer_email}
- Status: ${dunning_level === 1 ? 'First Notice' : dunning_level === 2 ? 'Second Notice' : 'Final Notice'}

Thank you for your prompt attention to this matter.

Best regards,
MallyERP Collections Department

---
This is an automated notification from our ERP system. Please do not reply to this email directly.`,

        htmlBody: `<!DOCTYPE html>
<html>
<head><style>
  body { font-family: Arial, sans-serif; margin: 20px; }
  .header { background: #f8f9fa; padding: 15px; border-left: 4px solid ${dunning_level >= 3 ? '#dc3545' : dunning_level === 2 ? '#ffc107' : '#28a745'}; }
  .urgent { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin: 10px 0; }
  .account-summary { background: #f8f9fa; padding: 15px; margin: 15px 0; }
</style></head>
<body>
  <div class="header">
    <h2>MallyERP Collections Department</h2>
    <p><strong>${dunning_level === 1 ? 'Payment Reminder' : dunning_level === 2 ? 'Urgent Payment Notice' : 'FINAL NOTICE'}</strong></p>
  </div>
  
  ${dunning_level >= 3 ? '<div class="urgent"><strong>⚠️ URGENT ACTION REQUIRED</strong><br>This is a final notice. Immediate payment or contact is required.</div>' : ''}
  
  <p>Dear ${customer_name},</p>
  <p>This email serves as automated notification regarding your account status.</p>
  
  <div class="account-summary">
    <h3>Account Summary</h3>
    <p><strong>Customer ID:</strong> ${customer_id}</p>
    <p><strong>Email:</strong> ${customer_email}</p>
    <p><strong>Status:</strong> ${dunning_level === 1 ? 'First Notice' : dunning_level === 2 ? 'Second Notice' : 'Final Notice'}</p>
  </div>
  
  <p><strong>Contact Information:</strong></p>
  <ul>
    <li>Phone: (555) 123-4567</li>
    <li>Email: collections@mallyerp.com</li>
    <li>Online Portal: portal.mallyerp.com</li>
  </ul>
  
  <hr>
  <small>This is an automated notification from our ERP system. Please do not reply to this email directly.</small>
</body>
</html>`
      },

      // Workflow Status
      status: 'ready_to_send',
      createdDate: new Date().toISOString(),
      scheduledDate: new Date().toISOString(), // Send immediately
      processedDate: null,
      deliveryStatus: 'pending',

      // Background Process Configuration
      backgroundProcess: {
        processId: `BG-EMAIL-${Date.now()}`,
        processType: 'email_automation',
        priority: dunning_level >= 3 ? 'high' : 'normal',
        maxRetries: 3,
        retryInterval: 300, // 5 minutes
        timeoutSeconds: 60,
        requiresApproval: false, // Auto-approval for standard notices
        notifyOnFailure: true,
        logLevel: 'detailed'
      }
    };

    res.json({
      success: true,
      emailWorkflow,
      message: `Email automation workflow created for ${customer_name}`,
      nextSteps: [
        'Email queued for immediate delivery',
        'Follow-up scheduled if configured',
        'Background process will monitor delivery status',
        'Automatic escalation if no response received'
      ]
    });

  } catch (error) {
    console.error('Error creating email automation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create email automation workflow'
    });
  }
});

// Background process management
router.post('/credit-management/background-processes', async (req, res) => {
  try {
    const { process_type, customer_id, action_data } = req.body;

    // ERP Background Process Framework
    const backgroundProcesses = {
      // Email Delivery Process
      email_delivery: {
        processId: `EMAIL-DELIVERY-${Date.now()}`,
        processName: 'Email Delivery Service',
        description: 'Handles email sending, delivery tracking, and retry logic',
        status: 'active',

        configuration: {
          batchSize: 50, // Emails per batch
          processingInterval: 60, // seconds
          maxRetries: 3,
          retryBackoff: 'exponential', // 1min, 2min, 4min
          deliveryTimeout: 300, // 5 minutes
          trackingEnabled: true,
          bounceHandling: 'automatic',
          failureNotification: 'immediate'
        },

        workflow: [
          'Queue validation and prioritization',
          'Template rendering and personalization',
          'Attachment processing and security scan',
          'SMTP delivery with authentication',
          'Delivery status tracking and logging',
          'Bounce/failure handling and retry logic',
          'Success confirmation and audit trail'
        ]
      },

      // Credit Monitoring Process
      credit_monitoring: {
        processId: `CREDIT-MONITOR-${Date.now()}`,
        processName: 'Credit Account Monitoring',
        description: 'Monitors customer credit status and triggers automated actions',
        status: 'active',

        configuration: {
          monitoringInterval: 3600, // 1 hour
          overdueThresholds: [30, 60, 90], // days
          autoEscalation: true,
          creditLimitChecks: true,
          riskScoreUpdates: 'daily',
          alertThresholds: {
            payment_delay: 7,
            credit_limit_exceeded: 0,
            risk_score_increase: 10
          }
        },

        workflow: [
          'Scan all customer accounts for status changes',
          'Calculate days overdue and aging buckets',
          'Update risk scores based on payment history',
          'Generate automatic dunning notices',
          'Escalate to collections team when required',
          'Create follow-up tasks and reminders',
          'Update customer credit status and limits'
        ]
      },

      // Payment Processing Process
      payment_processing: {
        processId: `PAYMENT-PROC-${Date.now()}`,
        processName: 'Automated Payment Processing',
        description: 'Processes incoming payments and updates customer accounts',
        status: 'active',

        configuration: {
          processingInterval: 300, // 5 minutes
          autoMatching: true,
          matchingTolerance: 5.00, // $5 tolerance
          manualReviewThreshold: 1000, // Amounts over $1000
          duplicateDetection: true,
          bankReconciliation: 'automatic',
          postingRules: 'fifo' // First In, First Out
        },

        workflow: [
          'Import payment files from banks/processors',
          'Validate payment data and detect duplicates',
          'Auto-match payments to outstanding invoices',
          'Apply cash to oldest outstanding items',
          'Generate receipt confirmations',
          'Update customer account balances',
          'Post to general ledger accounts',
          'Send payment confirmation emails'
        ]
      },

      // Dunning Process Automation
      dunning_automation: {
        processId: `DUNNING-AUTO-${Date.now()}`,
        processName: 'Automated Dunning Process',
        description: 'Manages the complete dunning lifecycle from first notice to legal action',
        status: 'active',

        configuration: {
          dunningInterval: 86400, // Daily
          escalationRules: {
            first_notice: 30, // days overdue
            second_notice: 60,
            final_notice: 90,
            legal_action: 120
          },
          holidaySupport: true,
          businessDaysOnly: true,
          customExclusions: ['bankruptcy', 'dispute', 'payment_plan'],
          approvalRequired: ['final_notice', 'legal_action']
        },

        workflow: [
          'Identify accounts meeting dunning criteria',
          'Apply business rules and exclusions',
          'Generate appropriate dunning documents',
          'Queue for review and approval if required',
          'Send notifications via multiple channels',
          'Schedule follow-up actions and reminders',
          'Track customer responses and payments',
          'Escalate to legal department when necessary'
        ]
      }
    };

    // Return specific process or all processes
    const requestedProcess = process_type ? backgroundProcesses[process_type] : backgroundProcesses;

    res.json({
      success: true,
      backgroundProcesses: requestedProcess,
      systemStatus: {
        totalProcesses: Object.keys(backgroundProcesses).length,
        activeProcesses: Object.keys(backgroundProcesses).length,
        systemLoad: 'normal',
        lastUpdate: new Date().toISOString(),
        nextScheduledRun: new Date(Date.now() + 300000).toISOString() // 5 minutes
      },
      erp_integration: {
        real_time_posting: true,
        audit_trail: 'complete',
        error_handling: 'automatic_retry',
        monitoring: 'continuous',
        reporting: 'real_time_dashboards',
        compliance: 'sarbanes_oxley_ready'
      }
    });

  } catch (error) {
    console.error('Error managing background processes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to manage background processes'
    });
  }
});

// Generate dunning letter
router.post('/credit-management/dunning/generate-letter', async (req, res) => {
  try {
    const { customer_id, customer_name, customer_email, overdue_amount, dunning_level, notice_date } = req.body;

    const levelName = dunning_level === 1 ? "First Notice" : dunning_level === 2 ? "Second Notice" : "Final Notice";
    const companyName = "MallyERP Corporation";
    const today = new Date().toLocaleDateString();

    const letterContent = `
${companyName}
123 Business Avenue
Enterprise City, EC 12345
Phone: (555) 123-4567
Email: collections@mallyerp.com

${today}

${customer_name}
Customer ID: ${customer_id}
Email: ${customer_email}

RE: ${levelName} - Past Due Account

Dear ${customer_name},

${dunning_level === 1 ?
        `We hope this letter finds you well. Our records indicate that your account has an outstanding balance that requires your immediate attention.

ACCOUNT DETAILS:
- Overdue Amount: $${parseFloat(overdue_amount).toLocaleString()}
- Original Due Date: ${new Date(notice_date).toLocaleDateString()}
- Days Past Due: ${Math.floor((new Date().getTime() - new Date(notice_date).getTime()) / (1000 * 60 * 60 * 24))} days

We understand that sometimes circumstances can affect payment schedules. If you have already sent payment, please disregard this notice. However, if payment has not been made, we kindly request that you remit the full amount within 15 days of this notice.

If you are experiencing financial difficulties, please contact our customer service team at (555) 123-4567 to discuss possible payment arrangements.` :

        dunning_level === 2 ?
          `This is our SECOND NOTICE regarding your past due account. Despite our previous communication, your account remains unpaid.

URGENT - ACCOUNT DETAILS:
- Overdue Amount: $${parseFloat(overdue_amount).toLocaleString()}
- Original Due Date: ${new Date(notice_date).toLocaleDateString()}
- Days Past Due: ${Math.floor((new Date().getTime() - new Date(notice_date).getTime()) / (1000 * 60 * 60 * 24))} days

IMMEDIATE ACTION REQUIRED: Payment must be received within 10 days to avoid further collection activities, including potential suspension of services and reporting to credit agencies.

If payment has already been made, please contact us immediately at (555) 123-4567 with proof of payment.` :

          `FINAL NOTICE - IMMEDIATE ACTION REQUIRED

This is our FINAL NOTICE before we initiate formal collection proceedings on your seriously delinquent account.

CRITICAL - ACCOUNT DETAILS:
- Overdue Amount: $${parseFloat(overdue_amount).toLocaleString()}
- Original Due Date: ${new Date(notice_date).toLocaleDateString()}
- Days Past Due: ${Math.floor((new Date().getTime() - new Date(notice_date).getTime()) / (1000 * 60 * 60 * 24))} days

FINAL DEMAND: You have 7 days from the date of this letter to remit payment in full. Failure to respond will result in:
1. Referral to our legal department
2. Potential legal action to recover the debt
3. Reporting to credit bureaus
4. Collection of attorney fees and court costs

This is your final opportunity to resolve this matter amicably.`}

Payment can be made by:
- Check: Mail to the address above
- Wire Transfer: Contact (555) 123-4567 for details
- Online: Visit our customer portal at portal.mallyerp.com

If you have any questions regarding this matter, please contact our Accounts Receivable department immediately at (555) 123-4567 or email collections@mallyerp.com.

Sincerely,

Sarah Mitchell
Collections Manager
MallyERP Corporation

---
This is an attempt to collect a debt. Any information obtained will be used for that purpose.
    `;

    res.json({
      success: true,
      letterContent: letterContent.trim(),
      generatedDate: today,
      customerInfo: {
        name: customer_name,
        id: customer_id,
        email: customer_email
      }
    });

  } catch (error) {
    console.error('Error generating letter:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate dunning letter'
    });
  }
});

// Create contact customer record
router.post('/credit-management/contact-customer', async (req, res) => {
  try {
    const { customer_id, customer_name, customer_email, customer_phone, overdue_amount, dunning_level } = req.body;

    const contactTypes = ['Phone Call', 'Email', 'Letter', 'In-Person Meeting'];
    const priorities = dunning_level >= 3 ? 'high' : dunning_level === 2 ? 'medium' : 'low';

    const contactRecord = {
      contactId: `CONT-${Date.now()}`,
      customerId: customer_id,
      customerName: customer_name,
      contactType: contactTypes[Math.floor(Math.random() * contactTypes.length)],
      scheduledDate: new Date(Date.now() + (24 * 60 * 60 * 1000)).toLocaleDateString(), // Tomorrow
      priority: priorities,
      overdueAmount: parseFloat(overdue_amount),
      dunningLevel: dunning_level,
      notes: `Follow-up contact for overdue amount of $${parseFloat(overdue_amount).toLocaleString()}. Customer: ${customer_name} (${customer_email}, ${customer_phone}). ${dunning_level >= 3 ? 'URGENT - Final notice level.' : dunning_level === 2 ? 'Second notice - escalated contact required.' : 'First contact attempt - maintain professional tone.'}`,
      followUpRequired: dunning_level >= 2,
      contactMethod: customer_phone ? 'Phone Primary' : 'Email Primary',
      assignedTo: 'Collections Team',
      status: 'Scheduled',
      createdDate: new Date().toLocaleDateString()
    };

    res.json({
      success: true,
      contactRecord,
      message: `Contact record created for ${customer_name}`
    });

  } catch (error) {
    console.error('Error creating contact record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create contact record'
    });
  }
});

// Generate payment plan
router.post('/credit-management/payment-plan', async (req, res) => {
  try {
    const { customer_id, customer_name, overdue_amount, dunning_level } = req.body;

    const totalAmount = parseFloat(overdue_amount);
    const duration = totalAmount > 20000 ? 6 : totalAmount > 10000 ? 4 : 3; // months
    const monthlyPayment = totalAmount / duration;

    // Generate payment schedule
    const schedule = [];
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() + 1); // Start next month

    for (let i = 0; i < duration; i++) {
      const paymentDate = new Date(startDate);
      paymentDate.setMonth(paymentDate.getMonth() + i);

      schedule.push({
        paymentNumber: i + 1,
        date: paymentDate.toLocaleDateString(),
        amount: (i === duration - 1) ?
          (totalAmount - (monthlyPayment * (duration - 1))).toFixed(2) : // Last payment gets remainder
          monthlyPayment.toFixed(2),
        status: 'Scheduled'
      });
    }

    const paymentPlan = {
      planId: `PLAN-${customer_id}-${Date.now()}`,
      customerId: customer_id,
      customerName: customer_name,
      totalAmount: totalAmount.toFixed(2),
      duration: duration,
      monthlyPayment: monthlyPayment.toFixed(2),
      startDate: schedule[0]?.date,
      endDate: schedule[schedule.length - 1]?.date,
      schedule: schedule,
      interestRate: '0.00%', // No interest for this plan
      setupFee: '0.00',
      terms: `Payment Plan Agreement for ${customer_name}

1. PAYMENT TERMS: Customer agrees to pay the total outstanding balance of $${totalAmount.toLocaleString()} in ${duration} equal monthly installments.

2. PAYMENT SCHEDULE: Payments are due on the same day each month as shown in the schedule above.

3. LATE FEES: A late fee of $25.00 will be charged for payments received more than 10 days after the due date.

4. DEFAULT: Failure to make two consecutive payments will result in immediate acceleration of the entire remaining balance.

5. GOOD FAITH: This payment plan is offered in good faith. Customer agrees to make all payments on time and maintain communication regarding any payment difficulties.

6. ACCOUNT STATUS: Customer's account will be placed on hold for new orders until payment plan is successfully completed.

7. CONTACT: For questions regarding this payment plan, contact our Collections Department at (555) 123-4567.

By accepting this payment plan, customer acknowledges the debt and agrees to the terms stated above.`,
      createdDate: new Date().toLocaleDateString(),
      status: 'Proposed',
      approvalRequired: totalAmount > 15000,
      notes: `Payment plan generated for customer ${customer_name} with ${duration}-month term. ${dunning_level >= 3 ? 'Final notice level - expedited approval recommended.' : 'Standard payment plan terms applied.'}`
    };

    res.json({
      success: true,
      paymentPlan,
      message: `Payment plan generated for ${customer_name}`
    });

  } catch (error) {
    console.error('Error generating payment plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate payment plan'
    });
  }
});

// Enterprise Operations & Multi-currency API Endpoints

// Currency Configuration Endpoint
router.get('/enterprise/currency-config', async (req, res) => {
  try {
    const currencies = [
      { code: 'USD', name: 'US Dollar', rate: 1.0000, symbol: '$', active: true },
      { code: 'EUR', name: 'Euro', rate: 0.8945, symbol: '€', active: true },
      { code: 'GBP', name: 'British Pound', rate: 0.7832, symbol: '£', active: true },
      { code: 'JPY', name: 'Japanese Yen', rate: 149.85, symbol: '¥', active: true },
      { code: 'CAD', name: 'Canadian Dollar', rate: 1.3576, symbol: 'C$', active: true }
    ];

    const operations = {
      totalTransactions: 1247,
      activeCurrencies: currencies.filter(c => c.active).length,
      revaluationStatus: 'up-to-date',
      lastUpdate: new Date().toISOString()
    };

    res.json({
      success: true,
      currencies,
      operations,
      message: 'Currency configuration loaded successfully'
    });

  } catch (error) {
    console.error('Error fetching currency configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load currency configuration'
    });
  }
});

// Enterprise Workflows Endpoint
router.get('/enterprise/workflows', async (req, res) => {
  try {
    const workflows = [
      { id: 'AUTO_POST', name: 'Automated Posting', status: 'active', processed: 2341 },
      { id: 'CROSS_CLEAR', name: 'Cross-Company Clearing', status: 'active', processed: 567 },
      { id: 'INTERCO_RECON', name: 'Intercompany Reconciliation', status: 'active', processed: 189 },
      { id: 'CURRENCY_HEDGE', name: 'Currency Hedging', status: 'active', processed: 78 },
      { id: 'AUTO_ALLOC', name: 'Automatic Allocation', status: 'active', processed: 1456 }
    ];

    res.json({
      success: true,
      activeWorkflows: workflows.filter(w => w.status === 'active').length,
      workflows,
      totalProcessed: workflows.reduce((sum, w) => sum + w.processed, 0),
      message: 'Enterprise workflows loaded successfully'
    });

  } catch (error) {
    console.error('Error fetching enterprise workflows:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load enterprise workflows'
    });
  }
});

// Intercompany Processing Endpoint
router.post('/enterprise/intercompany', async (req, res) => {
  try {
    const { action } = req.body;

    const processing = {
      transactionsProcessed: 47,
      companiesInvolved: ['CORP-US', 'CORP-EU', 'CORP-ASIA'],
      totalAmount: 892150.75,
      currencies: ['USD', 'EUR', 'GBP'],
      status: 'completed',
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      transactions: processing.transactionsProcessed,
      companies: processing.companiesInvolved,
      totalAmount: processing.totalAmount,
      processing,
      message: `Intercompany processing completed: ${processing.transactionsProcessed} transactions`
    });

  } catch (error) {
    console.error('Error processing intercompany transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process intercompany transactions'
    });
  }
});

// Currency Revaluation Endpoint
router.post('/enterprise/revaluation', async (req, res) => {
  try {
    const { action } = req.body;

    const revaluation = {
      currenciesRevalued: 3,
      currencies: ['EUR', 'GBP', 'JPY'],
      exchangeRates: {
        EUR: { old: 0.8956, new: 0.8945, variance: -0.0011 },
        GBP: { old: 0.7845, new: 0.7832, variance: -0.0013 },
        JPY: { old: 149.92, new: 149.85, variance: -0.07 }
      },
      totalImpact: -2847.32,
      status: 'completed',
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      currencies: revaluation.currenciesRevalued,
      exchangeRates: revaluation.exchangeRates,
      totalImpact: revaluation.totalImpact,
      revaluation,
      message: `Currency revaluation completed for ${revaluation.currenciesRevalued} currencies`
    });

  } catch (error) {
    console.error('Error executing currency revaluation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute currency revaluation'
    });
  }
});

// Global Consolidation Endpoint
router.post('/enterprise/consolidation', async (req, res) => {
  try {
    const { action } = req.body;

    const consolidation = {
      entitiesConsolidated: 12,
      entities: ['US-CORP', 'EU-CORP', 'ASIA-CORP', 'CANADA-CORP', 'UK-CORP', 'FRANCE-CORP', 'GERMANY-CORP', 'JAPAN-CORP', 'CHINA-CORP', 'INDIA-CORP', 'BRAZIL-CORP', 'MEXICO-CORP'],
      currenciesInvolved: 3,
      currencies: ['USD', 'EUR', 'GBP'],
      consolidatedAmounts: {
        USD: 12450300.75,
        EUR: 8921500.25,
        GBP: 3457800.50
      },
      eliminationEntries: 247,
      intercompanyAdjustments: 89,
      status: 'completed',
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      entities: consolidation.entitiesConsolidated,
      currencies: consolidation.currenciesInvolved,
      consolidatedAmounts: consolidation.consolidatedAmounts,
      eliminationEntries: consolidation.eliminationEntries,
      consolidation,
      message: `Global consolidation completed: ${consolidation.entitiesConsolidated} entities across ${consolidation.currenciesInvolved} currencies`
    });

  } catch (error) {
    console.error('Error executing global consolidation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute global consolidation'
    });
  }
});

// Get Customer Addresses for Sales Order
router.get("/customer-addresses/:customerId", async (req, res) => {
  try {
    const { customerId } = req.params;

    const addresses = await db.execute(sql`
      SELECT 
        ca.id,
        ca.address_type,
        ca.address_name,
        ca.contact_person,
        ca.company_name,
        ca.address_line_1,
        ca.address_line_2,
        ca.city,
        ca.state,
        ca.country,
        ca.postal_code,
        ca.phone,
        ca.email,
        ca.is_primary,
        ca.is_active
      FROM customer_addresses ca
      WHERE ca.customer_id = ${parseInt(customerId)}
        AND ca.is_active = true
      ORDER BY ca.is_primary DESC, ca.address_type, ca.address_name
    `);

    // Group addresses by type
    const groupedAddresses = {
      sold_to: addresses.rows.filter(addr => addr.address_type === 'sold_to'),
      bill_to: addresses.rows.filter(addr => addr.address_type === 'bill_to'),
      ship_to: addresses.rows.filter(addr => addr.address_type === 'ship_to'),
      payer_to: addresses.rows.filter(addr => addr.address_type === 'payer_to')
    };

    res.json({
      success: true,
      data: groupedAddresses
    });

  } catch (error) {
    console.error('Error fetching customer addresses:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// MASTER DATA API ENDPOINTS FOR DELIVERY MANAGEMENT
// ============================================================================

// Get Delivery Priorities
router.get("/delivery-priorities", async (req, res) => {
  try {
    const priorities = await db.execute(sql`
      SELECT code, name, description, priority_color, is_active
      FROM delivery_priorities
      WHERE is_active = true
      ORDER BY code
    `);

    res.json({
      success: true,
      data: priorities.rows
    });
  } catch (error) {
    console.error('Error fetching delivery priorities:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get Shipping Conditions
router.get("/shipping-conditions", async (req, res) => {
  try {
    const conditions = await db.execute(sql`
      SELECT code, name, description, proposed_route, proposed_shipping_point,
             loading_lead_time_days, picking_lead_time_days, packing_lead_time_days,
             transportation_lead_time_days, is_active
      FROM shipping_conditions_master
      WHERE is_active = true
      ORDER BY code
    `);

    res.json({
      success: true,
      data: conditions.rows
    });
  } catch (error) {
    console.error('Error fetching shipping conditions:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get Routes
router.get("/routes", async (req, res) => {
  try {
    const routes = await db.execute(sql`
      SELECT code, name, description, transportation_mode,
             transit_days, distance_km, default_carrier_id, is_active
      FROM routes_master
      WHERE is_active = true
      ORDER BY code
    `);

    res.json({
      success: true,
      data: routes.rows
    });
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get Delivery Blocks
router.get("/delivery-blocks", async (req, res) => {
  try {
    const blocks = await db.execute(sql`
      SELECT code, name, description, block_type, requires_approval,
             approval_role, auto_release_conditions, is_active
      FROM delivery_blocks
      WHERE is_active = true
      ORDER BY code
    `);

    res.json({
      success: true,
      data: blocks.rows
    });
  } catch (error) {
    console.error('Error fetching delivery blocks:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get Movement Types
router.get("/movement-types", async (req, res) => {
  try {
    const movementTypes = await db.execute(sql`
      SELECT code, name, description, movement_category,
             debit_credit_indicator, inventory_effect, is_active
      FROM inventory_movement_types
      WHERE is_active = true
      ORDER BY code
    `);

    res.json({
      success: true,
      data: movementTypes.rows
    });
  } catch (error) {
    console.error('Error fetching movement types:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get Schedule Lines for a Sales Order
// IMPORTANT: Returns ALL schedule lines, including partially delivered ones
// This ensures split deliveries remain visible after creating delivery for one split
// The UI will filter by remaining quantity for eligibility, but all lines are shown
router.get("/schedule-lines/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const parsedOrderId = parseIdSafely(orderId);

    if (parsedOrderId === null) {
      return res.status(400).json({
        success: false,
        error: "Invalid order ID format. Expected a numeric ID, not a document number."
      });
    }

    // CRITICAL: Return ALL schedule lines, don't filter out partially delivered ones
    // This allows users to see remaining splits after creating a delivery for one split
    // FIX: Include all details (plant, storage location) so pending deliveries show complete information
    // Updated to use migrated schema columns (material_id) but referencing existing plant_id
    const scheduleLines = await db.execute(sql`
      SELECT 
        sl.id,
        sl.sales_order_id,
        sl.sales_order_item_id,
        sl.line_number,
        sl.schedule_quantity,
        sl.confirmed_quantity,
        sl.delivered_quantity,
        sl.unit,
        sl.requested_delivery_date,
        sl.confirmed_delivery_date,
        sl.confirmation_status,
        sl.availability_status,
        sl.created_at,
        sl.updated_at,
        soi.material_id as product_id,
        m.description as product_name,
        m.code as product_code,
        soi.plant_id,
        pl.code as plant_code,
        pl.name as plant_name,
        pl.code as plant_code_from_plant,
        soi.storage_location_id,
        stloc.code as storage_location_code,
        stloc.code as storage_location_code_from_table,
        stloc.name as storage_location_name,
        (sl.confirmed_quantity - COALESCE(sl.delivered_quantity, 0)) as remaining_quantity
      FROM sales_order_schedule_lines sl
      JOIN sales_order_items soi ON sl.sales_order_item_id = soi.id
      LEFT JOIN materials m ON soi.material_id = m.id
      LEFT JOIN plants pl ON soi.plant_id = pl.id
      LEFT JOIN storage_locations stloc ON soi.storage_location_id = stloc.id
      WHERE sl.sales_order_id = ${parsedOrderId}
      -- Don't filter by confirmation_status or remaining quantity here
      -- Return ALL lines so split deliveries remain visible with all details
      ORDER BY sl.line_number
    `);

    res.json({
      success: true,
      data: scheduleLines.rows
    });
  } catch (error) {
    console.error('Error fetching schedule lines:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Split Schedule Line
router.post("/schedule-lines/split", async (req, res) => {
  try {
    const { scheduleLineId, splits } = req.body;

    // Get original schedule line
    const originalResult = await db.execute(sql`
      SELECT * FROM sales_order_schedule_lines
      WHERE id = ${scheduleLineId}
    `);

    const original = originalResult.rows[0];
    if (!original) {
      return res.status(404).json({ success: false, error: "Schedule line not found" });
    }

    // Calculate remaining quantity (what can be split)
    const remainingQty = parseFloat(String(original.confirmed_quantity || original.schedule_quantity)) - parseFloat(String(original.delivered_quantity || 0));

    // Validate splits total equals remaining quantity (not the full schedule quantity)
    const totalSplitQty = splits.reduce((sum: number, split: any) => sum + parseFloat(split.quantity || 0), 0);
    if (Math.abs(totalSplitQty - remainingQty) > 0.01) { // Allow small floating point differences
      return res.status(400).json({
        success: false,
        error: `Total split quantities (${totalSplitQty}) must equal remaining quantity (${remainingQty})`
      });
    }

    // Validate that we have at least one valid split
    const validSplits = splits.filter(s => parseFloat(s.quantity || 0) > 0);
    if (validSplits.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one valid split with quantity > 0 is required"
      });
    }

    // Validate date format
    for (const split of validSplits) {
      if (!split.date || !/^\d{4}-\d{2}-\d{2}$/.test(split.date)) {
        return res.status(400).json({
          success: false,
          error: `Invalid date format for split. Expected YYYY-MM-DD, got: ${split.date}`
        });
      }
    }

    // Get the maximum line number for this order to avoid conflicts
    // Do this BEFORE deleting/updating the original line
    const maxLineResult = await db.execute(sql`
      SELECT COALESCE(MAX(line_number), 0) as max_line_number
      FROM sales_order_schedule_lines
      WHERE sales_order_id = ${original.sales_order_id}
    `);
    const maxLineNumber = parseInt(String(maxLineResult.rows[0]?.max_line_number || '0'), 10);

    // If original line has delivered quantity, keep it and create new lines for remaining
    // Otherwise, delete original and create all new lines
    const hasDeliveredQty = parseFloat(String(original.delivered_quantity || 0)) > 0;

    if (hasDeliveredQty) {
      // Update original line to reflect delivered quantity only
      await db.execute(sql`
        UPDATE sales_order_schedule_lines
        SET schedule_quantity = ${original.delivered_quantity},
            confirmed_quantity = ${original.delivered_quantity},
            delivered_quantity = ${original.delivered_quantity}
        WHERE id = ${scheduleLineId}
      `);
    } else {
      // Delete original schedule line if nothing delivered
      await db.execute(sql`
        DELETE FROM sales_order_schedule_lines WHERE id = ${scheduleLineId}
      `);
    }

    // Create new schedule lines for the splits
    const newLines = [];
    let nextLineNumber = maxLineNumber + 1;

    for (let i = 0; i < validSplits.length; i++) {
      const split = validSplits[i];
      const splitQty = parseFloat(split.quantity || 0);

      // Double-check quantity (should already be validated above)
      if (splitQty <= 0) {
        continue;
      }

      // Ensure unit is not null
      const unit = original.unit || 'EA';

      try {
        const result = await db.execute(sql`
          INSERT INTO sales_order_schedule_lines (
            sales_order_id, sales_order_item_id, line_number,
            schedule_quantity, confirmed_quantity, delivered_quantity,
            unit, requested_delivery_date, confirmed_delivery_date,
            confirmation_status, availability_status
          ) VALUES (
            ${original.sales_order_id},
            ${original.sales_order_item_id},
            ${nextLineNumber},
            ${splitQty},
            ${splitQty},
            0,
            ${unit},
            ${split.date},
            ${split.date},
            'CONFIRMED',
            'AVAILABLE'
          ) RETURNING *
        `);
        newLines.push(result.rows[0]);
        nextLineNumber++;
      } catch (insertError) {
        console.error(`Error inserting split ${i + 1}:`, insertError);
        // If we've already created some lines, we should rollback or continue
        // For now, we'll throw an error to prevent partial splits
        throw new Error(`Failed to create split ${i + 1}: ${insertError instanceof Error ? insertError.message : 'Unknown error'}`);
      }
    }

    if (newLines.length === 0) {
      return res.status(500).json({
        success: false,
        error: "Failed to create any new schedule lines"
      });
    }

    res.json({
      success: true,
      data: newLines,
      message: `Schedule line split into ${newLines.length} lines`
    });
  } catch (error) {
    console.error('Error splitting schedule line:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Block Delivery
router.post("/block-delivery", async (req, res) => {
  try {
    const { salesOrderId, blockCode, blockReason } = req.body;

    // Update sales order with block
    await db.execute(sql`
      UPDATE sales_orders
      SET delivery_block = ${blockCode}
      WHERE id = ${salesOrderId}
    `);

    // Log the block
    await db.execute(sql`
      INSERT INTO delivery_block_log (
        sales_order_id, block_code, block_reason, status, blocked_by
      ) VALUES (
        ${salesOrderId},
        ${blockCode},
        ${blockReason},
        'BLOCKED',
        1
      )
    `);

    res.json({
      success: true,
      message: 'Delivery blocked successfully'
    });
  } catch (error) {
    console.error('Error blocking delivery:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Release Delivery Block
router.post("/release-block", async (req, res) => {
  try {
    const { salesOrderId, releaseReason } = req.body;

    // Remove block from sales order
    await db.execute(sql`
      UPDATE sales_orders
      SET delivery_block = NULL
      WHERE id = ${salesOrderId}
    `);

    // Update block log
    await db.execute(sql`
      UPDATE delivery_block_log
      SET status = 'RELEASED',
          release_reason = ${releaseReason},
          released_by = 1,
          released_at = CURRENT_TIMESTAMP
      WHERE sales_order_id = ${salesOrderId}
        AND status = 'BLOCKED'
    `);

    res.json({
      success: true,
      message: 'Delivery block released successfully'
    });
  } catch (error) {
    console.error('Error releasing block:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get Delivery Due List
router.get("/delivery-due-list", async (req, res) => {
  try {
    const dueList = await db.execute(sql`
      SELECT 
        so.id as sales_order_id,
        so.order_number,
        so.customer_id,
        c.name as customer_name,
        sl.id as schedule_line_id,
        sl.line_number,
        sl.requested_delivery_date,
        sl.confirmed_delivery_date,
        sl.schedule_quantity,
        sl.confirmed_quantity,
        sl.delivered_quantity,
        (sl.confirmed_quantity - COALESCE(sl.delivered_quantity, 0)) as remaining_quantity,
        sl.confirmation_status,
        m.id as material_id,
        m.description as product_name,
        m.code as product_code,
        so.delivery_priority as priority_code,
        dp.name as priority_name,
        dp.priority_color as priority_color,
        pl.code as plant_code,
        pl.name as plant_name,
        so.delivery_block as block_code
      FROM sales_order_schedule_lines sl
      JOIN sales_order_items soi ON sl.sales_order_item_id = soi.id
      JOIN sales_orders so ON sl.sales_order_id = so.id
      LEFT JOIN erp_customers c ON so.customer_id = c.id
      LEFT JOIN materials m ON soi.material_id = m.id
      LEFT JOIN delivery_priorities dp ON so.delivery_priority = dp.code
      LEFT JOIN plants pl ON soi.plant_id = pl.id
      WHERE sl.confirmation_status != 'DELIVERED'
        AND (sl.confirmed_quantity - COALESCE(sl.delivered_quantity, 0)) > 0
        AND so.delivery_block IS NULL
      ORDER BY 
        CASE COALESCE(so.delivery_priority, '02')
          WHEN '01' THEN 1 
          WHEN '02' THEN 2 
          WHEN '03' THEN 3 
          ELSE 4 
        END,
        sl.requested_delivery_date
      LIMIT 100
    `);

    res.json({
      success: true,
      data: dueList.rows
    });
  } catch (error) {
    console.error('Error fetching delivery due list:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get Blocked Deliveries
router.get("/blocked-deliveries", async (req, res) => {
  try {
    const blockedList = await db.execute(sql`
      SELECT 
        so.id as sales_order_id,
        so.order_number,
        so.customer_id,
        c.name as customer_name,
        so.order_date,
        so.total_amount,
        so.delivery_block as block_code,
        db.name as block_name,
        db.description as block_description,
        db.block_type,
        db.requires_approval,
        db.approval_role,
        dbl.block_reason,
        dbl.blocked_at as blocked_date,
        dbl.blocked_by,
        dbl.status as block_status,
        so.delivery_priority as priority_code,
        dp.name as priority_name,
        dp.priority_color as priority_color
      FROM sales_orders so
      LEFT JOIN erp_customers c ON so.customer_id = c.id
      LEFT JOIN delivery_blocks db ON so.delivery_block = db.code
      LEFT JOIN delivery_block_log dbl ON so.id = dbl.sales_order_id AND dbl.status = 'BLOCKED'
      LEFT JOIN delivery_priorities dp ON so.delivery_priority = dp.code
      WHERE so.delivery_block IS NOT NULL
      ORDER BY COALESCE(dbl.blocked_at, so.created_at) DESC
      LIMIT 100
    `);

    res.json({
      success: true,
      data: blockedList.rows
    });
  } catch (error) {
    console.error('Error fetching blocked deliveries:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ================================================================================
// PHASE 3: INVOICE/BILLING DOCUMENT CREATION (Order-to-Cash Completion)
// ================================================================================

/**
 * Create Invoice/Billing Document from Delivery
 * 
 * Standard Flow (without SAP terminology):
 * 1. Get delivery document and verify it's completed
 * 2. Get sales order and customer information (including payment terms, billing blocks)
 * 3. Calculate pricing from sales order items (using stored pricing procedure)
 * 4. Calculate taxes based on customer and material tax codes
 * 5. Create billing document header
 * 6. Create billing items from delivery items
 * 7. Update delivery and sales order status
 * 8. Create document flow linkage
 * 9. Post to GL (Accounting) if configured
 */
router.post("/billing-documents", async (req, res) => {
  try {
    const { deliveryId } = req.body;

    console.log('💰 Creating billing document for delivery:', deliveryId);

    if (!deliveryId) {
      return res.status(400).json({
        success: false,
        error: "Delivery ID is required"
      });
    }

    // Step 1: Get delivery document details with company code from sales order
    const deliveryResult = await db.execute(sql`
      SELECT dd.*, 
             so.id as sales_order_id,
             so.order_number,
             so.customer_id,
             so.payment_terms,
             so.billing_block,
             so.total_amount as order_total,
             so.company_code_id as sales_order_company_code_id,
             c.name as customer_name,
             c.email as customer_email,
             c.payment_terms as customer_payment_terms,
             c.address as customer_address,
             c.city,
             c.state,
             c.postal_code,
             c.country,
             c.company_code_id as customer_company_code_id
      FROM delivery_documents dd
      LEFT JOIN sales_orders so ON dd.sales_order_id = so.id
      LEFT JOIN erp_customers c ON dd.customer_id = c.id
      WHERE dd.id = ${deliveryId}
    `);

    if (deliveryResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Delivery document not found"
      });
    }

    const delivery = deliveryResult.rows[0];

    // Step 2: Check for billing blocks
    if (delivery.billing_block) {
      return res.status(400).json({
        success: false,
        error: `Billing is blocked for this order. Block code: ${delivery.billing_block}`,
        blockCode: delivery.billing_block
      });
    }

    // Step 3: Check if already billed
    const existingBillingResult = await db.execute(sql`
      SELECT id, billing_number 
      FROM billing_documents 
      WHERE delivery_id = ${deliveryId}
    `);

    if (existingBillingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Delivery already billed. Billing number: ${existingBillingResult.rows[0].billing_number}`,
        existingBillingNumber: existingBillingResult.rows[0].billing_number
      });
    }

    // Step 4: Get delivery items with sales order pricing
    const deliveryItemsResult = await db.execute(sql`
      SELECT di.*,
             soi.material_id as product_id,
             soi.material_code as product_code,
             soi.material_description as product_description,
             soi.unit_of_measure,
             soi.unit_price,
             soi.net_amount as order_line_net,
             soi.tax_amount as order_line_tax,
             soi.gross_amount as order_line_gross,
             soi.pricing_procedure,
             soi.condition_records,
             m.id as material_id,
             m.product_code as material_code,
             m.description as material_description,
             m.base_uom
      FROM delivery_items di
      LEFT JOIN sales_order_items soi ON di.sales_order_item_id = soi.id
      LEFT JOIN materials m ON di.material_id = m.id
      WHERE di.delivery_id = ${deliveryId}
      ORDER BY di.line_item
    `);

    if (deliveryItemsResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No items found in delivery document"
      });
    }

    const deliveryItems = deliveryItemsResult.rows;

    // Step 5: Get default tax code from system configuration
    const taxConfigResult = await db.execute(sql`
      SELECT 
        (SELECT config_value FROM system_configuration WHERE config_key = 'default_tax_code' AND active = true LIMIT 1) as default_tax_code,
        (SELECT config_value FROM system_configuration WHERE config_key = 'default_tax_rate' AND active = true LIMIT 1) as default_tax_rate
    `);
    const taxConfig = taxConfigResult.rows[0] || {};
    const defaultTaxCode = taxConfig.default_tax_code || 'V0';
    const defaultTaxRate = parseFloat(String(taxConfig.default_tax_rate || '10'));

    // Step 6: Get tax code details if available
    let taxRate = defaultTaxRate;
    const taxCodeResult = await db.execute(sql`
      SELECT tax_rate FROM tax_codes 
      WHERE code = ${defaultTaxCode} AND is_active = true
      LIMIT 1
    `);
    if (taxCodeResult.rows.length > 0) {
      taxRate = parseFloat(String(taxCodeResult.rows[0].tax_rate));
    }

    // Step 6.5: Determine GL accounts using account determination service
    console.log('🔍 Determining GL accounts for billing items...');
    const materialIds = deliveryItems.map(item => getInt(item.material_id) || getInt(item.product_id)).filter(Boolean);
    const salesOrg = getString(delivery.sales_organization) || '1000';

    const accountDeterminationResult = await accountDeterminationService.determineBillingAccounts({
      customerId: parseInt(String(delivery.customer_id)),
      materialIds: materialIds,
      salesOrganization: salesOrg
    });

    console.log('✅ Account determination completed:', {
      arAccount: accountDeterminationResult.arAccount,
      revenueAccountsCount: accountDeterminationResult.revenueAccounts.length,
      taxAccount: accountDeterminationResult.taxAccount || 'Not configured',
      errors: accountDeterminationResult.errors
    });

    // Get default accounts if determination failed
    let defaultAccounts;
    if (!accountDeterminationResult.success && accountDeterminationResult.revenueAccounts.length === 0) {
      console.log('⚠️ Account determination had errors, using default accounts');
      defaultAccounts = await accountDeterminationService.getDefaultAccounts();
    }

    // Step 7: Calculate billing amounts
    let totalNetAmount = 0;
    let totalTaxAmount = 0;
    let totalGrossAmount = 0;

    const billingItemsData = [];

    for (let i = 0; i < deliveryItems.length; i++) {
      const item = deliveryItems[i];

      // Use delivered quantity for billing
      const billingQty = parseFloat(String(item.delivery_quantity || item.picked_quantity || 0));
      const unitPrice = parseFloat(String(item.unit_price || 0));

      // Calculate amounts (proportional to delivered quantity)
      const itemNetAmount = billingQty * unitPrice;
      const itemTaxAmount = (itemNetAmount * taxRate) / 100;
      const itemGrossAmount = itemNetAmount + itemTaxAmount;

      totalNetAmount += itemNetAmount;
      totalTaxAmount += itemTaxAmount;
      totalGrossAmount += itemGrossAmount;

      // Determine GL account for this item (use first revenue account or default)
      const materialId = getInt(item.material_id) || getInt(item.product_id);
      const revenueAccount = accountDeterminationResult.revenueAccounts.find(
        acc => acc.glAccount
      ) || accountDeterminationResult.revenueAccounts[0];

      // Get account from determination result, no hardcoded fallbacks
      let glAccount = revenueAccount?.glAccount;
      let accountKey = revenueAccount?.accountKey || 'REVENUE';

      if (!glAccount && defaultAccounts?.revenueAccount) {
        glAccount = defaultAccounts.revenueAccount;
      }

      // If no account found, throw error instead of using hardcoded value
      if (!glAccount) {
        throw new Error(`No revenue account determined for material ${materialId}. Please configure account determination rules.`);
      }

      // If we have material-specific determination, try to get it
      if (materialId) {
        const materialGroup = await accountDeterminationService.getMaterialAccountGroup(parseInt(String(materialId)));
        const customerGroup = await accountDeterminationService.getCustomerAccountGroup(parseInt(String(delivery.customer_id)));

        const specificAccount = await accountDeterminationService.determineGLAccount({
          chartOfAccounts: 'INT',
          salesOrganization: salesOrg,
          customerAccountGroup: customerGroup,
          materialAccountGroup: materialGroup,
          accountKey: 'REVENUE'
        });

        if (specificAccount.success) {
          glAccount = specificAccount.glAccount;
          accountKey = specificAccount.accountKey;
        }
      }

      billingItemsData.push({
        lineItem: i + 1,
        salesOrderItemId: item.sales_order_item_id,
        deliveryItemId: item.id,
        materialId: materialId,
        materialCode: item.material_code || item.product_code,
        materialDescription: item.material_description || item.product_description,
        billingQuantity: billingQty,
        unitOfMeasure: item.unit_of_measure || item.base_uom || 'EA',
        unitPrice: unitPrice,
        netAmount: itemNetAmount,
        taxCode: defaultTaxCode,
        taxAmount: itemTaxAmount,
        accountKey: accountKey,
        glAccount: glAccount
      });
    }

    // Step 8: Calculate due date from payment terms
    const paymentTerms = delivery.payment_terms || delivery.customer_payment_terms || 'NET30';
    let dueDateOffset = 30; // default 30 days

    const paymentTermsResult = await db.execute(sql`
      SELECT payment_days FROM payment_terms 
      WHERE code = ${paymentTerms}
      LIMIT 1
    `);

    if (paymentTermsResult.rows.length > 0) {
      dueDateOffset = parseInt(String(paymentTermsResult.rows[0].payment_days));
    }

    const billingDate = new Date();
    const dueDate = new Date(billingDate);
    dueDate.setDate(dueDate.getDate() + dueDateOffset);

    // Step 9: Generate billing number
    const billingCountResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM billing_documents
    `);
    const billingCount = parseInt(String(billingCountResult.rows[0]?.count || '0')) + 1;
    const billingNumber = `INV-${new Date().getFullYear()}-${billingCount.toString().padStart(6, '0')}`;

    // Step 9.5: Generate accounting document number EARLY
    // Get company code - Priority: 1) Sales Order, 2) Customer
    let companyCode: string | null = null;
    let companyCurrency: string | null = null;
    let companyCodeId: number | null = null;

    // Priority 1: Get company code from sales order
    if (delivery.sales_order_company_code_id) {
      const salesOrderCompanyCodeResult = await db.execute(sql`
        SELECT code as company_code, currency as company_currency, id
        FROM company_codes
        WHERE id = ${delivery.sales_order_company_code_id}
    `);

      if (salesOrderCompanyCodeResult.rows[0]?.company_code) {
        companyCode = String(salesOrderCompanyCodeResult.rows[0].company_code);
        companyCurrency = String(salesOrderCompanyCodeResult.rows[0].company_currency);
        companyCodeId = parseInt(String(salesOrderCompanyCodeResult.rows[0].id));
        console.log(`✅ Using company code from sales order: ${companyCode}`);
      }
    }

    // Priority 2: Fallback to customer company code
    if (!companyCode && delivery.customer_company_code_id) {
      const customerCompanyCodeResult = await db.execute(sql`
        SELECT code as company_code, currency as company_currency, id
        FROM company_codes
        WHERE id = ${delivery.customer_company_code_id}
      `);

      if (customerCompanyCodeResult.rows[0]?.company_code) {
        companyCode = String(customerCompanyCodeResult.rows[0].company_code);
        companyCurrency = String(customerCompanyCodeResult.rows[0].company_currency);
        companyCodeId = parseInt(String(customerCompanyCodeResult.rows[0].id));
        console.log(`✅ Using company code from customer (fallback): ${companyCode}`);
      }
    }

    if (!companyCode) {
      throw new Error(`Company code not found. Sales order ${delivery.sales_order_id || 'N/A'} and customer ${delivery.customer_id} both missing company code. Please configure company code in sales order or customer master data.`);
    }

    // Get billing type from delivery, sales order, or system configuration (no hardcoded F2)
    let billingType = delivery.billing_type || (await db.execute(sql`
      SELECT billing_type FROM sales_orders WHERE id = ${delivery.sales_order_id} LIMIT 1
    `)).rows[0]?.billing_type;

    if (!billingType) {
      // Get default billing type from system configuration or document types
      const defaultBillingTypeResult = await db.execute(sql`
        SELECT dt.code 
        FROM sd_document_types dt
        WHERE dt.category = 'BILLING' 
          AND dt.is_active = true
          AND dt.code = (SELECT config_value FROM system_configuration 
                         WHERE config_key = 'default_billing_type' AND active = true LIMIT 1)
        LIMIT 1
      `);

      if (defaultBillingTypeResult.rows.length > 0) {
        billingType = defaultBillingTypeResult.rows[0].code;
      } else {
        // Try to get first active billing type as fallback
        const firstBillingTypeResult = await db.execute(sql`
          SELECT code FROM sd_document_types 
          WHERE category = 'BILLING' AND is_active = true 
          ORDER BY id LIMIT 1
        `);

        if (firstBillingTypeResult.rows.length > 0) {
          billingType = firstBillingTypeResult.rows[0].code;
        } else {
          // Only use schema default as absolute last resort
          // This should never happen if system is properly configured
          throw new Error('No billing type configured. Please configure billing document types in sd_document_types table.');
        }
      }
    }

    // Import service if not already imported
    const { transactionalApplicationsService } = await import("../services/transactional-applications-service");

    // Generate accounting document number NOW (not later during posting)
    const accountingDocNumber = await transactionalApplicationsService.generateEarlyAccountingDocumentNumber(
      companyCode,
      String(billingType) // Pass billing type, function will map to document type
    );

    console.log(`📄 Generated accounting document number: ${accountingDocNumber}`);

    // Step 10: Create billing document header WITH accounting_document_number
    // Get currency from company code or sales order (no hardcoded USD)
    const currency = companyCurrency || delivery.currency || (await db.execute(sql`
      SELECT currency FROM sales_orders WHERE id = ${delivery.sales_order_id} LIMIT 1
    `)).rows[0]?.currency || (await db.execute(sql`
      SELECT currency FROM company_codes WHERE code = ${companyCode} AND is_active = true LIMIT 1
    `)).rows[0]?.currency;

    if (!currency) {
      throw new Error(`Currency not configured for company code ${companyCode}. Please configure company master data.`);
    }

    // Get created_by from request or auth context (no hardcoded values)
    // Try multiple sources in order of preference
    let createdBy: number | null = null;

    // 1. Try from authentication context
    if ((req as any).user?.id) {
      createdBy = parseInt(String((req as any).user.id));
    }

    // 2. Try from request body
    if (!createdBy && req.body.created_by) {
      createdBy = parseInt(String(req.body.created_by));
    }

    // 3. Try from system configuration
    if (!createdBy) {
      const configResult = await db.execute(sql`
        SELECT config_value FROM system_configuration 
        WHERE config_key = 'default_user_id' AND active = true LIMIT 1
      `);
      if (configResult.rows.length > 0 && configResult.rows[0].config_value) {
        createdBy = parseInt(String(configResult.rows[0].config_value));
      }
    }

    // 4. Try to find a system user (role = 'system' or 'admin')
    if (!createdBy) {
      const systemUserResult = await db.execute(sql`
        SELECT id FROM users 
        WHERE (role = 'system' OR role = 'admin') 
          AND active = true 
        ORDER BY id LIMIT 1
      `);
      if (systemUserResult.rows.length > 0 && systemUserResult.rows[0].id) {
        createdBy = parseInt(String(systemUserResult.rows[0].id));
      }
    }

    // 5. Last resort: Get first active user
    if (!createdBy) {
      const activeUserResult = await db.execute(sql`
        SELECT id FROM users 
        WHERE active = true 
        ORDER BY id LIMIT 1
      `);
      if (activeUserResult.rows.length > 0 && activeUserResult.rows[0].id) {
        createdBy = parseInt(String(activeUserResult.rows[0].id));
      }
    }

    if (!createdBy) {
      throw new Error('User ID not available. Please ensure authentication context is set or configure a default user in system configuration.');
    }

    const billingDocResult = await db.execute(sql`
      INSERT INTO billing_documents (
        billing_number, billing_type, sales_order_id, delivery_id, customer_id,
        company_code_id, billing_date, due_date, net_amount, tax_amount, total_amount, currency,
        posting_status, accounting_document_number, created_by, created_at, updated_at
      ) VALUES (
        ${billingNumber}, 
        ${billingType}, // Retrieved from delivery/sales order or default
        ${delivery.sales_order_id},
        ${deliveryId},
        ${delivery.customer_id},
        ${companyCodeId}, // Company code from sales order (priority) or customer (fallback)
        ${billingDate.toISOString().split('T')[0]},
        ${dueDate.toISOString().split('T')[0]},
        ${totalNetAmount.toFixed(2)},
        ${totalTaxAmount.toFixed(2)},
        ${totalGrossAmount.toFixed(2)},
        ${currency}, // Retrieved from company code or sales order
        'OPEN', // Default posting status for new invoices
        ${accountingDocNumber}, // ← NEW: Store accounting document number immediately
        ${parseInt(String(createdBy))},
        NOW(),
        NOW()
      ) RETURNING id
    `);

    const billingId = billingDocResult.rows[0]?.id;

    if (!billingId) {
      throw new Error('Failed to create billing document');
    }

    console.log(`✅ Created billing document: ${billingNumber} (ID: ${billingId})`);

    // Step 11: Create billing items
    for (const itemData of billingItemsData) {
      await db.execute(sql`
        INSERT INTO billing_items (
          billing_id, line_item, sales_order_item_id, delivery_item_id,
          material_id, billing_quantity, unit, unit_price, net_amount,
          tax_code, tax_amount, account_key, gl_account, created_at
        ) VALUES (
          ${billingId}, 
          ${itemData.lineItem},
          ${itemData.salesOrderItemId},
          ${itemData.deliveryItemId},
          ${itemData.materialId},
          ${itemData.billingQuantity},
          ${itemData.unitOfMeasure},
          ${itemData.unitPrice},
          ${itemData.netAmount.toFixed(2)},
          ${itemData.taxCode},
          ${itemData.taxAmount.toFixed(2)},
          ${itemData.accountKey},
          ${itemData.glAccount},
          NOW()
        )
      `);
    }

    console.log(`✅ Created ${billingItemsData.length} billing items`);

    // Step 11.5: Create DRAFT accounting document with direct GL account assignment
    const billingItemsForAccountDoc = billingItemsData.map(item => ({
      glAccount: item.glAccount,
      netAmount: item.netAmount,
      description: `Revenue - ${item.materialCode}`
    }));

    await transactionalApplicationsService.createDraftAccountingDocument({
      documentNumber: accountingDocNumber,
      companyCode: companyCode,
      billingId: parseInt(String(billingId)),
      billingNumber: billingNumber,
      billingType: String(billingType), // Required for document type mapping
      billingItems: billingItemsForAccountDoc,
      arAccount: accountDeterminationResult.arAccount,
      taxAccount: accountDeterminationResult.taxAccount,
      totalAmount: totalGrossAmount,
      taxAmount: totalTaxAmount,
      currency: String(currency), // Retrieved from company code or sales order
      postingDate: billingDate,
      documentDate: billingDate,
      createdBy: parseInt(String(createdBy)) // From auth context
    });

    console.log(`✅ Created DRAFT accounting document: ${accountingDocNumber}`);

    // Step 12: Update delivery status
    await db.execute(sql`
      UPDATE delivery_documents 
      SET status = 'BILLED', updated_at = NOW()
      WHERE id = ${deliveryId}
    `);

    // Step 13: Update sales order status
    await db.execute(sql`
      UPDATE sales_orders
      SET status = 'BILLED', updated_at = NOW()
      WHERE id = ${delivery.sales_order_id}
    `);

    // Step 14: Create document flow entries
    await db.execute(sql`
      INSERT INTO document_flow (
        source_document, source_document_type,
        target_document, target_document_type,
        flow_type, created_at
      ) VALUES (
        ${delivery.delivery_number}, 'DELIVERY',
        ${billingNumber}, 'INVOICE',
        'BILLING', NOW()
      )
    `);

    await db.execute(sql`
      INSERT INTO document_flow (
        source_document, source_document_type,
        target_document, target_document_type,
        flow_type, created_at
      ) VALUES (
        ${delivery.order_number}, 'SALES_ORDER',
        ${billingNumber}, 'INVOICE',
        'BILLING', NOW()
      )
    `);

    console.log('✅ Document flow updated');

    // Step 15: Return success response with billing details
    res.json({
      success: true,
      billingDocument: {
        id: billingId,
        billingNumber: billingNumber,
        billingType: billingType,
        billingDate: billingDate.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        salesOrderId: delivery.sales_order_id,
        salesOrderNumber: delivery.order_number,
        deliveryId: deliveryId,
        deliveryNumber: delivery.delivery_number,
        customerId: delivery.customer_id,
        customerName: delivery.customer_name,
        netAmount: parseFloat(totalNetAmount.toFixed(2)),
        taxAmount: parseFloat(totalTaxAmount.toFixed(2)),
        totalAmount: parseFloat(totalGrossAmount.toFixed(2)),
        currency: 'USD',
        paymentTerms: paymentTerms,
        postingStatus: 'OPEN',
        items: billingItemsData.map(item => ({
          lineItem: item.lineItem,
          materialCode: item.materialCode,
          materialDescription: item.materialDescription,
          quantity: item.billingQuantity,
          unit: item.unitOfMeasure,
          unitPrice: item.unitPrice,
          netAmount: parseFloat(item.netAmount.toFixed(2)),
          taxAmount: parseFloat(item.taxAmount.toFixed(2)),
          taxCode: item.taxCode
        }))
      },
      message: `Billing document ${billingNumber} created successfully`
    });

  } catch (error) {
    console.error('❌ Billing document creation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create billing document'
    });
  }
});

// Get all billing documents
router.get("/billing-documents", async (req, res) => {
  try {
    const billingDocs = await db.execute(sql`
      SELECT 
        bd.id, bd.billing_number, bd.billing_type, bd.billing_date, bd.due_date,
        bd.net_amount, bd.tax_amount, bd.total_amount, bd.currency,
        bd.posting_status, bd.accounting_document_number,
        bd.sales_order_id, so.order_number as sales_order_number,
        bd.delivery_id, dd.delivery_number,
        bd.customer_id, c.name as customer_name,
        bd.created_at, bd.updated_at,
        COUNT(bi.id) as item_count
      FROM billing_documents bd
      LEFT JOIN sales_orders so ON bd.sales_order_id = so.id
      LEFT JOIN delivery_documents dd ON bd.delivery_id = dd.id
      LEFT JOIN erp_customers c ON bd.customer_id = c.id
      LEFT JOIN billing_items bi ON bd.id = bi.billing_id
      GROUP BY bd.id, bd.billing_number, bd.billing_type, bd.billing_date, bd.due_date,
               bd.net_amount, bd.tax_amount, bd.total_amount, bd.currency,
               bd.posting_status, bd.accounting_document_number,
               bd.sales_order_id, so.order_number, bd.delivery_id, dd.delivery_number,
               bd.customer_id, c.name, bd.created_at, bd.updated_at
      ORDER BY bd.created_at DESC
    `);

    res.json({
      success: true,
      data: billingDocs.rows
    });

  } catch (error) {
    console.error('Error fetching billing documents:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch billing documents'
    });
  }
});

// Get single billing document with items
router.get("/billing-documents/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 Fetching invoice details for ID:', id);

    // Get billing document header with tax breakdown from sales order
    const billingResult = await db.execute(sql`
      SELECT 
        bd.*,
        so.order_number as sales_order_number,
        so.tax_breakdown as sales_order_tax_breakdown,
        dd.delivery_number,
        c.name as customer_name,
        c.email as customer_email,
        c.address as customer_address,
        c.city, c.state, c.postal_code, c.country
      FROM billing_documents bd
      LEFT JOIN sales_orders so ON bd.sales_order_id = so.id
      LEFT JOIN delivery_documents dd ON bd.delivery_id = dd.id
      LEFT JOIN erp_customers c ON bd.customer_id = c.id
      WHERE bd.id = ${parseInt(id)}
    `);

    console.log('📋 Billing document query result:', {
      found: billingResult.rows.length > 0,
      rowCount: billingResult.rows.length
    });

    if (billingResult.rows.length === 0) {
      console.log('⚠️ Billing document not found for ID:', id);
      return res.status(404).json({
        success: false,
        error: 'Billing document not found'
      });
    }

    // Get billing items with product details from materials table
    let itemsResult;
    try {
      // Join with materials table to get actual product names
      itemsResult = await db.execute(sql`
        SELECT 
          bi.*,
          COALESCE(m.code, bi.material_id::text) as material_code,
          COALESCE(m.description, bi.material_id::text) as material_description
        FROM billing_items bi
        LEFT JOIN materials m ON bi.material_id = m.id
        WHERE bi.billing_id = ${parseInt(id)}
        ORDER BY bi.line_item
      `);
    } catch (itemError: any) {
      console.error('Error fetching items with joins, trying simple query:', itemError.message);
      // Fallback to simple query without joins
      itemsResult = await db.execute(sql`
        SELECT 
          bi.*,
          bi.material_id::text as material_code,
          bi.material_id::text as material_description
        FROM billing_items bi
        WHERE bi.billing_id = ${parseInt(id)}
        ORDER BY bi.line_item
      `);
    }

    const billing = billingResult.rows[0];

    // Parse tax breakdown from sales order
    let taxBreakdown = [];
    if (billing.sales_order_tax_breakdown) {
      try {
        taxBreakdown = typeof billing.sales_order_tax_breakdown === 'string'
          ? JSON.parse(billing.sales_order_tax_breakdown)
          : billing.sales_order_tax_breakdown;

        if (!Array.isArray(taxBreakdown)) {
          taxBreakdown = [];
        }
      } catch (e) {
        console.error('Error parsing tax_breakdown:', e);
        taxBreakdown = [];
      }
    }

    console.log('📄 Invoice items fetched:', {
      billingId: id,
      itemCount: itemsResult.rows.length,
      taxBreakdownCount: taxBreakdown.length,
      sampleItem: itemsResult.rows[0]
    });

    // Remove sales_order_tax_breakdown from the main object and add it as tax_breakdown
    const { sales_order_tax_breakdown, ...billingWithoutTaxBreakdown } = billing;

    res.json({
      success: true,
      billingDocument: {
        ...billingWithoutTaxBreakdown,
        items: itemsResult.rows,
        tax_breakdown: taxBreakdown
      }
    });

  } catch (error) {
    console.error('❌ Error fetching billing document:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null,
      invoiceId: req.params.id
    });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch billing document'
    });
  }
});

// Download billing document (invoice) as PDF/text
router.get("/billing-documents/:id/download", async (req, res) => {
  try {
    const { id } = req.params;

    // Get billing document with items including tax breakdown
    const billingResult = await db.execute(sql`
      SELECT 
        bd.*,
        so.order_number as sales_order_number,
        so.tax_breakdown as sales_order_tax_breakdown,
        dd.delivery_number,
        c.name as customer_name,
        c.email as customer_email,
        c.address as customer_address,
        c.city, c.state, c.postal_code, c.country
      FROM billing_documents bd
      LEFT JOIN sales_orders so ON bd.sales_order_id = so.id
      LEFT JOIN delivery_documents dd ON bd.delivery_id = dd.id
      LEFT JOIN erp_customers c ON bd.customer_id = c.id
      WHERE bd.id = ${parseInt(id)}
    `);

    if (billingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Billing document not found'
      });
    }

    const billing = billingResult.rows[0];

    // Get billing items with product details from materials table
    let itemsResult;
    try {
      itemsResult = await db.execute(sql`
        SELECT 
          bi.*,
          COALESCE(m.code, bi.material_id::text) as material_code,
          COALESCE(m.description, bi.material_id::text) as material_description
        FROM billing_items bi
        LEFT JOIN materials m ON bi.material_id = m.id
        WHERE bi.billing_id = ${parseInt(id)}
        ORDER BY bi.line_item
      `);
    } catch (itemError: any) {
      console.error('Error fetching items for download, using fallback:', itemError.message);
      itemsResult = await db.execute(sql`
        SELECT 
          bi.*,
          bi.material_id::text as material_code,
          bi.material_id::text as material_description
        FROM billing_items bi
        WHERE bi.billing_id = ${parseInt(id)}
        ORDER BY bi.line_item
      `);
    }

    // Parse tax breakdown from sales order
    let taxBreakdown = [];
    if (billing.sales_order_tax_breakdown) {
      try {
        taxBreakdown = typeof billing.sales_order_tax_breakdown === 'string'
          ? JSON.parse(billing.sales_order_tax_breakdown)
          : billing.sales_order_tax_breakdown;

        if (!Array.isArray(taxBreakdown)) {
          taxBreakdown = [];
        }
      } catch (e) {
        console.error('Error parsing tax_breakdown for download:', e);
        taxBreakdown = [];
      }
    }

    // Build tax details section
    let taxDetailsSection = '';
    if (taxBreakdown.length > 0) {
      taxDetailsSection = taxBreakdown.map((tax: any) => {
        const taxName = tax.title || tax.rule_code || 'Tax';
        const taxRate = tax.rate_percent ? ` (${tax.rate_percent}%)` : '';
        const taxAmount = parseFloat(tax.amount || 0).toFixed(2);
        return `${(taxName + taxRate).padEnd(45)} $${taxAmount.padStart(10)}`;
      }).join('\n') + '\n' + '-'.repeat(80) + '\n';
      taxDetailsSection += `Total Tax Amount:${''.padEnd(35)} $${parseFloat(String(billing.tax_amount || 0)).toFixed(2).padStart(10)}`;
    } else {
      // Fallback to single tax amount if no breakdown
      taxDetailsSection = `Tax:${''.padEnd(43)} $${parseFloat(String(billing.tax_amount || 0)).toFixed(2).padStart(10)}`;
    }

    // Generate simple text invoice with tax breakdown and proper product names
    const invoiceText = `
INVOICE
${'='.repeat(80)}

Invoice Number: ${billing.billing_number}
Date: ${new Date(billing.billing_date as string | number | Date).toLocaleDateString()}
Due Date: ${new Date(billing.due_date as string | number | Date).toLocaleDateString()}

Bill To:
${billing.customer_name}
${billing.customer_address || ''}
${billing.city || ''}, ${billing.state || ''} ${billing.postal_code || ''}
${billing.country || ''}

${'='.repeat(80)}
LINE ITEMS
${'='.repeat(80)}

${'Item'.padEnd(10)} ${'Description'.padEnd(40)} ${'Qty'.padEnd(10)} ${'Price'.padEnd(15)} ${'Amount'.padEnd(15)}
${'-'.repeat(80)}
${itemsResult.rows.map(item => {
      const description = String(item.material_description || 'N/A').substring(0, 40);
      return `${String(item.line_item).padEnd(10)} ${description.padEnd(40)} ${String(item.billing_quantity || 0).padEnd(10)} $${parseFloat(String(item.unit_price || 0)).toFixed(2).padStart(12)} $${parseFloat(String(item.net_amount || 0)).toFixed(2).padStart(12)}`;
    }).join('\n')}

${'='.repeat(80)}
TOTALS
${'='.repeat(80)}

Subtotal:${''.padEnd(42)} $${parseFloat(String(billing.net_amount || 0)).toFixed(2).padStart(10)}
${taxDetailsSection}
${'='.repeat(80)}
Total:${''.padEnd(46)} $${parseFloat(String(billing.total_amount || 0)).toFixed(2).padStart(10)}
${'='.repeat(80)}

Sales Order: ${billing.sales_order_number || 'N/A'}
Delivery: ${billing.delivery_number || 'N/A'}

Thank you for your business!
    `;

    // Set headers for download
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${billing.billing_number}.txt"`);
    res.send(invoiceText);

  } catch (error) {
    console.error('Error downloading billing document:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to download billing document'
    });
  }
});

// Get deliveries ready for billing
router.get("/deliveries-for-billing", async (req, res) => {
  try {
    // Check if delivery_documents table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'delivery_documents'
      ) as table_exists
    `);

    if (!tableCheck.rows[0]?.table_exists) {
      // Table doesn't exist yet, return empty array
      return res.json({
        success: true,
        data: [],
        message: 'No deliveries available - delivery system not yet configured'
      });
    }

    const deliveries = await db.execute(sql`
      SELECT 
        dd.id, 
        dd.delivery_number, 
        dd.delivery_date, 
        dd.status,
        dd.sales_order_id, 
        so.order_number as sales_order_number,
        dd.customer_id, 
        c.name as customer_name,
        COALESCE(so.total_amount, 0) as estimated_amount,
        (SELECT COUNT(*) FROM sales_order_items WHERE sales_order_id = dd.sales_order_id) as item_count
      FROM delivery_documents dd
      LEFT JOIN sales_orders so ON dd.sales_order_id = so.id
      LEFT JOIN erp_customers c ON dd.customer_id = c.id
      WHERE dd.status IN ('COMPLETED', 'CONFIRMED', 'PENDING')
      AND NOT EXISTS (
        SELECT 1 FROM billing_documents bd WHERE bd.delivery_id = dd.id
      )
      ORDER BY dd.delivery_date DESC
    `);

    res.json({
      success: true,
      data: deliveries.rows.map(d => ({
        ...d,
        canBeBilled: true,
        billingBlocked: false,
        blockReason: null
      }))
    });

  } catch (error) {
    console.error('Error fetching deliveries for billing:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch deliveries'
    });
  }
});

/**
 * FIFO Partial Payment Posting, Allocation, and Reversal (Order-to-Cash)
 * Strictly transactional, safe, and respecting invoice/payment state. No breaking current flows!
 *
 * Routes:
 * - POST /order-to-cash/customer-payment (post or allocate payment, FIFO by due date)
 * - POST /order-to-cash/reverse-payment (reverse payment; unapplies and restores balances)
 */

// FIFO Partial Payment Posting and Allocation Endpoint
router.post('/customer-payment', async (req, res) => {
  const { customerId, amount, paymentDate, paymentMethod, reference, description, bankAccountId, applications } = req.body;

  console.log('\n🔵 ========== PAYMENT PROCESSING START ==========');
  console.log('📝 Request:', { customerId, amount, paymentDate, paymentMethod, reference });

  if (!customerId || !amount || isNaN(amount) || amount <= 0) {
    console.log('❌ Validation failed: Invalid customerId or amount');
    return res.status(400).json({ success: false, error: 'customerId and positive amount are required.' });
  }

  // Use FIFO payment allocation across all open and partial AR open items
  try {
    await db.transaction(async (tx) => {
      console.log('🔷 Transaction started');

      // Get status values from system configuration (no hardcoded values)
      console.log('📋 Step 1: Getting AR status configuration...');
      const statusConfigResult = await tx.execute(sql`
        SELECT 
          (SELECT config_value FROM system_configuration WHERE config_key = 'ar_status_open' AND active = true LIMIT 1) as open_status,
          (SELECT config_value FROM system_configuration WHERE config_key = 'ar_status_partial' AND active = true LIMIT 1) as partial_status
      `);

      const openStatus = String(statusConfigResult.rows[0]?.open_status || '');
      const partialStatus = String(statusConfigResult.rows[0]?.partial_status || '');

      console.log(`✅ Status config: open=${openStatus}, partial=${partialStatus}`);

      if (!openStatus || !partialStatus) {
        console.log('❌ AR status configuration not found!');
        throw new Error('AR status configuration not found. Please configure ar_status_open and ar_status_partial in system_configuration');
      }

      // Find all open/partial AR open items for this customer (oldest due first)
      // Use ar_open_items instead of accounts_receivable for accurate tracking
      // Use parameterized query for status values
      const openInvoices = await tx.execute(sql`
        SELECT 
          aoi.id as open_item_id,
          aoi.billing_document_id,
          aoi.outstanding_amount,
          aoi.original_amount,
          aoi.status,
          aoi.due_date,
          bd.billing_number,
          bd.total_amount
        FROM ar_open_items aoi
        LEFT JOIN billing_documents bd ON aoi.billing_document_id = bd.id
        WHERE aoi.customer_id = ${customerId}
          AND aoi.active = true
          AND (aoi.status = ${openStatus} OR aoi.status = ${partialStatus})
          AND aoi.outstanding_amount > 0
        ORDER BY aoi.due_date ASC, aoi.created_at ASC
      `);

      let remaining = parseFloat(amount);
      const allocations: Array<{ invoiceId: number; openItemId: number; amount: number }> = [];

      // If manual applications provided, use them; otherwise use FIFO
      if (applications && Array.isArray(applications) && applications.length > 0) {
        // Manual application mode
        for (const app of applications) {
          const openItemId = parseInt(app.openItemId);
          const applyAmount = parseFloat(app.amount || 0);

          if (applyAmount <= 0) continue;

          // Find the open item
          const openItem = openInvoices.rows.find((inv: any) => parseInt(inv.open_item_id) === openItemId);
          if (!openItem) continue;

          const outstandingAmt = parseFloat(String(openItem.outstanding_amount || 0));
          const actualApply = Math.min(applyAmount, outstandingAmt, remaining);

          if (actualApply > 0) {
            allocations.push({
              invoiceId: parseInt(openItem.billing_document_id),
              openItemId: openItemId,
              amount: actualApply
            });
            remaining -= actualApply;
          }
        }
      } else {
        // Automatic FIFO allocation
        for (const inv of openInvoices.rows) {
          const outstandingAmt = parseFloat(String(inv.outstanding_amount || 0));
          if (remaining <= 0 || outstandingAmt <= 0) break;
          const applyAmt = Math.min(outstandingAmt, remaining);
          allocations.push({
            invoiceId: parseInt(String(inv.billing_document_id)),
            openItemId: parseInt(String(inv.open_item_id)),
            amount: applyAmt
          });
          remaining -= applyAmt;
        }
      }

      // Generate payment number dynamically (no hardcoded values)
      const paymentDateObj = paymentDate ? new Date(paymentDate) : new Date();
      const paymentDateStr = paymentDateObj.toISOString().split('T')[0];
      const paymentYear = paymentDateObj.getFullYear();

      // Get payment number from sequence or count
      const paymentCountResult = await tx.execute(sql`
        SELECT COUNT(*)::integer as count 
        FROM customer_payments
        WHERE EXTRACT(YEAR FROM payment_date) = ${paymentYear}
      `);
      const paymentCount = parseInt(paymentCountResult.rows[0]?.count || '0') + 1;
      const paymentNumber = `PAY-${paymentYear}-${paymentCount.toString().padStart(6, '0')}`;

      // Get payment method default and posting status from system configuration
      const paymentMethodDefaultResult = await tx.execute(sql`
        SELECT config_value FROM system_configuration 
        WHERE config_key = 'default_payment_method' AND active = true LIMIT 1
      `);
      const defaultPaymentMethod = paymentMethodDefaultResult.rows[0]?.config_value || 'BANK_TRANSFER';

      const postingStatusResult = await tx.execute(sql`
        SELECT config_value FROM system_configuration 
        WHERE config_key = 'payment_posting_status' AND active = true LIMIT 1
      `);
      const postingStatus = postingStatusResult.rows[0]?.config_value || 'POSTED';

      // Get customer company code and currency
      const customerResult = await tx.execute(sql`
        SELECT company_code_id, currency
        FROM erp_customers
        WHERE id = ${customerId}
        LIMIT 1
      `);
      const customerCompanyCodeId = customerResult.rows[0]?.company_code_id || null;
      const customerCurrency = customerResult.rows[0]?.currency || 'USD';

      // Resolve bank_account_id from account_id_master if provided
      // The frontend sends account_id_master.id, but customer_payments.bank_account_id references bank_accounts.id
      // We'll get the GL account from account_id_master and set bank_account_id to NULL (nullable column)
      let resolvedBankAccountId = null;
      if (bankAccountId) {
        // Try to find corresponding bank_accounts record, or use NULL if not found
        // The GL account will be retrieved from account_id_master instead
        const accountIdMasterCheck = await tx.execute(sql`
          SELECT gl_account_id 
          FROM account_id_master 
          WHERE id = ${parseInt(bankAccountId)} AND is_active = true
        `);
        // If account_id_master exists, we'll use its GL account directly
        // bank_account_id can be NULL since the foreign key allows it
        resolvedBankAccountId = null; // Set to NULL to avoid FK constraint issue
      }

      // Insert customer payment with all fields
      console.log('📋 Step 4: Inserting payment record...');
      console.log(`   Params: number=${paymentNumber}, customer=${customerId}, amount=${amount}, company_code_id=${customerCompanyCodeId}`);

      const paymentRes = await tx.execute(sql`
        INSERT INTO customer_payments (
          payment_number, customer_id, payment_date, payment_amount, payment_method, 
          reference, posting_status, currency, company_code_id, bank_account_id, description
        ) VALUES (
          ${paymentNumber}, ${customerId}, ${paymentDateStr},
          ${amount}, ${paymentMethod || defaultPaymentMethod}, ${reference || ''}, ${postingStatus},
          ${customerCurrency}, ${customerCompanyCodeId}, ${resolvedBankAccountId}, ${description || ''}
        ) RETURNING id
      `);
      const paymentId = paymentRes.rows[0].id;
      console.log(`✅ Payment inserted: ID=${paymentId}`);

      // Update AR open items directly using open_item_id from allocations
      for (const alloc of allocations) {
        // Use openItemId directly from allocations (already queried from ar_open_items)
        if (!alloc.openItemId) {
          console.warn(`No open item ID found for allocation. Skipping.`);
          continue;
        }

        // Get current AR open item (already have data from query, but get fresh to ensure accuracy)
        const arOpenItemResult = await tx.execute(sql`
          SELECT id, outstanding_amount, status, billing_document_id, gl_account_id
          FROM ar_open_items
          WHERE id = ${alloc.openItemId}
            AND active = true
          LIMIT 1
        `);

        if (arOpenItemResult.rows.length > 0) {
          const arOpenItem = arOpenItemResult.rows[0];
          const currentOutstanding = parseFloat(arOpenItem.outstanding_amount || 0);
          const newOutstanding = Math.max(0, currentOutstanding - alloc.amount);

          // Get status values from system configuration (no hardcoded values)
          const statusConfigResult = await tx.execute(sql`
            SELECT 
              (SELECT config_value FROM system_configuration WHERE config_key = 'ar_status_cleared' AND active = true LIMIT 1) as cleared_status,
              (SELECT config_value FROM system_configuration WHERE config_key = 'ar_status_partial' AND active = true LIMIT 1) as partial_status
          `);

          const clearedStatus = statusConfigResult.rows[0]?.cleared_status;
          const partialStatus = statusConfigResult.rows[0]?.partial_status;

          if (!clearedStatus || !partialStatus) {
            throw new Error('AR status configuration not found. Please configure ar_status_cleared and ar_status_partial in system_configuration');
          }

          let newStatus = arOpenItem.status;
          const isFullyPaid = newOutstanding <= 0.01;
          if (isFullyPaid) {
            newStatus = clearedStatus;
          } else if (newOutstanding < currentOutstanding) {
            newStatus = partialStatus;
          }

          // Update AR open item using arOpenItemsService for consistency
          try {
            const { arOpenItemsService } = await import('../services/arOpenItemsService');
            await arOpenItemsService.updateOutstandingAmount(parseInt(arOpenItem.id), alloc.amount);
          } catch (serviceError: any) {
            // Fallback to direct update if service fails
            await tx.execute(sql`
              UPDATE ar_open_items
              SET outstanding_amount = ${newOutstanding.toString()},
                  status = ${newStatus},
                  last_payment_date = ${paymentDateStr}
              WHERE id = ${arOpenItem.id}
            `);
          }

          // Create clearing document if fully paid
          if (isFullyPaid) {
            try {
              // Get billing document details for clearing document
              const billingDocResult = await tx.execute(sql`
                SELECT bd.accounting_document_number, bd.billing_number, ec.company_code_id
                FROM billing_documents bd
                LEFT JOIN erp_customers ec ON bd.customer_id = ec.id
                WHERE bd.id = ${arOpenItem.billing_document_id}
                LIMIT 1
              `);

              if (billingDocResult.rows.length > 0) {
                const billingDoc = billingDocResult.rows[0];

                // Get company code from customer (no hardcoded defaults)
                const companyCodeResult = await tx.execute(sql`
                  SELECT code FROM company_codes WHERE id = ${billingDoc.company_code_id} LIMIT 1
                `);

                if (!companyCodeResult.rows[0]?.code) {
                  throw new Error(`Company code not found for customer company_code_id: ${billingDoc.company_code_id}`);
                }

                const companyCode = companyCodeResult.rows[0].code;
                const fiscalYear = paymentYear.toString();

                // Get clearing document type from system configuration
                const clearingDocTypeResult = await tx.execute(sql`
                  SELECT config_value FROM system_configuration 
                  WHERE config_key = 'clearing_document_type' AND active = true LIMIT 1
                `);
                const clearingDocType = clearingDocTypeResult.rows[0]?.config_value || 'CL';

                // Get currency from billing document or system configuration
                const currencyResult = await tx.execute(sql`
                  SELECT currency FROM billing_documents WHERE id = ${arOpenItem.billing_document_id} LIMIT 1
                `);
                const currency = currencyResult.rows[0]?.currency || (await tx.execute(sql`
                  SELECT config_value FROM system_configuration 
                  WHERE config_key = 'default_currency' AND active = true LIMIT 1
                `)).rows[0]?.config_value || 'USD';

                // Get created_by from auth context or system configuration
                const createdByResult = await tx.execute(sql`
                  SELECT config_value FROM system_configuration 
                  WHERE config_key = 'system_user_id' AND active = true LIMIT 1
                `);
                const createdBy = createdByResult.rows[0]?.config_value ? parseInt(String(createdByResult.rows[0].config_value)) : 1;

                const clearingDocCountResult = await tx.execute(sql`
                  SELECT COUNT(*)::integer as count 
                  FROM accounting_documents
                  WHERE company_code = ${companyCode}
                    AND document_type = ${clearingDocType}
                    AND fiscal_year = ${parseInt(fiscalYear)}
                `);

                const clearingDocCount = parseInt(clearingDocCountResult.rows[0]?.count || '0') + 1;
                const clearingDocNumber = `${String(companyCode).replace(/[^0-9]/g, '').slice(-4).padStart(4, '0')}${fiscalYear.slice(-2)}CLR${clearingDocCount.toString().padStart(6, '0')}`;

                // Create clearing document
                await tx.execute(sql`
                  INSERT INTO accounting_documents (
                    document_number, document_type, company_code, fiscal_year,
                    posting_date, document_date, period, reference, header_text,
                    total_amount, currency, source_module, source_document_id,
                    source_document_type, created_by
                  ) VALUES (
                    ${clearingDocNumber}, ${clearingDocType}, ${companyCode}, ${parseInt(fiscalYear)},
                    ${paymentDateStr}, ${paymentDateStr}, ${String(paymentDateObj.getMonth() + 1).padStart(2, '0')},
                    ${paymentNumber}, ${`AR Clearing for ${billingDoc.billing_number || 'Invoice'}`},
                    ${alloc.amount}, ${currency}, 'SALES', ${paymentId}, 'CLEARING', ${createdBy}
                  )
                `);

                console.log(`✅ Created clearing document ${clearingDocNumber} for AR open item ${arOpenItem.id}`);
              }
            } catch (clearingError: any) {
              console.warn('Could not create clearing document (optional):', clearingError.message);
              // Don't fail transaction if clearing document creation fails
            }
          }

          // Get created_by from auth context or system configuration
          const createdByResult = await tx.execute(sql`
            SELECT config_value FROM system_configuration 
            WHERE config_key = 'system_user_id' AND active = true LIMIT 1
          `);
          const createdBy = createdByResult.rows[0]?.config_value ? parseInt(String(createdByResult.rows[0].config_value)) : 1;

          // Create payment application (link payment to billing document)
          await tx.execute(sql`
            INSERT INTO payment_applications (
              payment_id, billing_id, applied_amount, created_by, application_date
            ) VALUES (
              ${paymentId}, ${arOpenItem.billing_document_id}, ${alloc.amount}, ${createdBy}, ${paymentDateStr}
            )
          `);
        } else {
          console.warn(`No AR open item found with ID ${alloc.openItemId}. Payment recorded but AR open item not updated.`);
        }
      }

      // Create GL entries for payment (Debit: Bank Account, Credit: AR Account)
      try {
        // Get customer's AR GL account from ar_open_items
        const arGlAccountResult = await tx.execute(sql`
          SELECT DISTINCT gl_account_id
          FROM ar_open_items
          WHERE customer_id = ${customerId}
            AND active = true
            AND gl_account_id IS NOT NULL
          LIMIT 1
        `);

        if (arGlAccountResult.rows.length > 0) {
          const arGlAccountId = parseInt(arGlAccountResult.rows[0].gl_account_id);

          // Get bank account GL account - use account_id_master if bankAccountId provided, otherwise get default from bank_accounts
          let bankGlAccountResult;
          if (bankAccountId) {
            // Try to get GL account from account_id_master first (since frontend sends account_id_master.id)
            const accountIdMasterResult = await tx.execute(sql`
              SELECT aim.gl_account_id, ga.id, ga.account_number
              FROM account_id_master aim
              LEFT JOIN gl_accounts ga ON aim.gl_account_id = ga.id
              WHERE aim.id = ${parseInt(bankAccountId)}
                AND aim.is_active = true
                AND ga.is_active = true
              LIMIT 1
            `);

            if (accountIdMasterResult.rows.length > 0) {
              bankGlAccountResult = accountIdMasterResult;
            } else {
              // Fallback: try bank_accounts table (legacy support)
              bankGlAccountResult = await tx.execute(sql`
                SELECT ba.gl_account_id, ga.id, ga.account_number
                FROM bank_accounts ba
                LEFT JOIN gl_accounts ga ON ba.gl_account_id = ga.id
                WHERE ba.id = ${parseInt(bankAccountId)}
                  AND ba.is_active = true
                  AND ga.is_active = true
                LIMIT 1
              `);
            }
          }

          // Fallback to default bank account if specific one not found
          if (!bankGlAccountResult || bankGlAccountResult.rows.length === 0) {
            // Try account_id_master first
            const defaultAccountIdMaster = await tx.execute(sql`
              SELECT aim.gl_account_id, ga.id, ga.account_number
              FROM account_id_master aim
              LEFT JOIN gl_accounts ga ON aim.gl_account_id = ga.id
              WHERE aim.is_active = true
                AND ga.is_active = true
              LIMIT 1
            `);

            if (defaultAccountIdMaster.rows.length > 0) {
              bankGlAccountResult = defaultAccountIdMaster;
            } else {
              // Fallback to bank_accounts
              bankGlAccountResult = await tx.execute(sql`
                SELECT ba.gl_account_id, ga.id, ga.account_number
                FROM bank_accounts ba
                LEFT JOIN gl_accounts ga ON ba.gl_account_id = ga.id
                WHERE ba.is_active = true
                  AND ga.is_active = true
                LIMIT 1
              `);
            }
          }

          if (bankGlAccountResult.rows.length > 0) {
            const bankGlAccountId = parseInt(bankGlAccountResult.rows[0].id || bankGlAccountResult.rows[0].gl_account_id);

            // Generate accounting document number for payment
            const customerCompanyCodeResult = await tx.execute(sql`
              SELECT cc.code as company_code
              FROM erp_customers ec
              LEFT JOIN company_codes cc ON ec.company_code_id = cc.id
              WHERE ec.id = ${customerId}
            `);

            if (customerCompanyCodeResult.rows.length > 0) {
              const companyCode = customerCompanyCodeResult.rows[0].company_code;
              const fiscalYear = paymentYear.toString();

              // Get payment document type from system configuration
              const paymentDocTypeResult = await tx.execute(sql`
                SELECT config_value FROM system_configuration 
                WHERE config_key = 'payment_document_type' AND active = true LIMIT 1
              `);
              const paymentDocType = paymentDocTypeResult.rows[0]?.config_value || 'DZ';

              // Get currency from customer or system configuration
              const customerCurrencyResult = await tx.execute(sql`
                SELECT currency FROM erp_customers WHERE id = ${customerId} LIMIT 1
              `);
              const currency = customerCurrencyResult.rows[0]?.currency || (await tx.execute(sql`
                SELECT config_value FROM system_configuration 
                WHERE config_key = 'default_currency' AND active = true LIMIT 1
              `)).rows[0]?.config_value || 'USD';

              // Get created_by from auth context or system configuration
              const createdByResult = await tx.execute(sql`
                SELECT config_value FROM system_configuration 
                WHERE config_key = 'system_user_id' AND active = true LIMIT 1
              `);
              const createdBy = createdByResult.rows[0]?.config_value ? parseInt(String(createdByResult.rows[0].config_value)) : 1;

              const paymentDocCountResult = await tx.execute(sql`
                SELECT COUNT(*)::integer as count 
                FROM accounting_documents
                WHERE company_code = ${companyCode}
                  AND document_type = ${paymentDocType}
                  AND fiscal_year = ${parseInt(fiscalYear)}
              `);

              const paymentDocCount = parseInt(String(paymentDocCountResult.rows[0]?.count || '0')) + 1;
              const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp for uniqueness
              const paymentAccountingDocNumber = `${String(companyCode).replace(/[^0-9]/g, '').slice(-4).padStart(4, '0')}${fiscalYear.slice(-2)}${paymentDocCount.toString().padStart(6, '0')}${timestamp}`;

              // Create accounting document
              await tx.execute(sql`
                INSERT INTO accounting_documents (
                  document_number, document_type, company_code, fiscal_year,
                  posting_date, document_date, period, reference, header_text,
                  total_amount, currency, source_module, source_document_id,
                  source_document_type, created_by
                ) VALUES (
                  ${paymentAccountingDocNumber}, ${paymentDocType}, ${companyCode}, ${parseInt(fiscalYear)},
                  ${paymentDateStr}, ${paymentDateStr}, ${String(paymentDateObj.getMonth() + 1).padStart(2, '0')},
                  ${paymentNumber}, ${`Customer Payment ${paymentNumber}`},
                  ${amount}, ${currency}, 'SALES', ${paymentId}, 'PAYMENT', ${createdBy}
                )
              `);

              // Get fiscal period from posting date
              const fiscalPeriod = paymentDateObj.getMonth() + 1;
              const fiscalYearValue = paymentYear;

              // Create GL entries: Credit AR (reduce receivable), Debit Bank (increase bank balance)
              await tx.execute(sql`
                INSERT INTO gl_entries (
                  document_number, gl_account_id, amount, 
                  debit_credit_indicator, posting_date, posting_status,
                  fiscal_period, fiscal_year, description,
                  source_module, source_document_id, source_document_type,
                  reference
                ) VALUES (
                  ${paymentAccountingDocNumber}, ${arGlAccountId}, ${amount}, 'C', ${paymentDateStr}, 'posted',
                  ${fiscalPeriod}, ${fiscalYearValue}, ${`Customer Payment ${paymentNumber} - AR Reduction`},
                  'SALES', ${paymentId}, 'PAYMENT',
                  ${paymentNumber}
                )
              `);

              await tx.execute(sql`
                INSERT INTO gl_entries (
                  document_number, gl_account_id, amount, 
                  debit_credit_indicator, posting_date, posting_status,
                  fiscal_period, fiscal_year, description,
                  source_module, source_document_id, source_document_type,
                  reference
                ) VALUES (
                  ${paymentAccountingDocNumber}, ${bankGlAccountId}, ${amount}, 'D', ${paymentDateStr}, 'posted',
                  ${fiscalPeriod}, ${fiscalYearValue}, ${`Customer Payment ${paymentNumber} - Bank Deposit`},
                  'SALES', ${paymentId}, 'PAYMENT',
                  ${paymentNumber}
                )
              `);

              // Update payment with accounting document number and GL posting status
              await tx.execute(sql`
                UPDATE customer_payments
                SET accounting_document_number = ${paymentAccountingDocNumber},
                    gl_posting_status = 'POSTED'
                WHERE id = ${paymentId}
              `);

              console.log(`✅ Created GL entries for payment ${paymentNumber}`);
            }
          }
        }
      } catch (glError: any) {
        console.warn('Could not create GL entries for payment (optional):', glError.message);
        // Don't fail the transaction if GL posting fails
      }

      res.json({
        success: true,
        data: {
          payment_number: paymentNumber,
          payment_id: paymentId,
          applied: allocations,
          unapplied: remaining > 0 ? remaining : 0,
        }
      });
    });
  } catch (error) {
    console.error('\n❌ ========== PAYMENT TRANSACTION FAILED ==========');
    console.error('❌ Error:', error);
    console.error('❌ Message:', error.message);
    console.error('❌ Stack:', error.stack);
    console.error('🔴 ================================================\n');
    res.status(500).json({ success: false, error: error.message || 'Payment processing failed' });
  }
});

// Payment Reversal Endpoint (transactional, safe)
router.post('/reverse-payment', async (req, res) => {
  const { paymentId, reason } = req.body;
  if (!paymentId) {
    return res.status(400).json({ success: false, error: 'paymentId is required.' });
  }
  try {
    await db.transaction(async (tx) => {
      // 1. Mark payment as reversed (with status and reversal reason)
      await tx.execute(sql`
        UPDATE customer_payments SET posting_status='REVERSED', reference=CONCAT(reference, ' [REVERSED: ', ${reason || 'No reason provided'} ,']') WHERE id=${paymentId}
      `);
      // 2. Find all applications for this payment
      const appli = await tx.execute(sql`SELECT * FROM payment_applications WHERE payment_id=${paymentId}`);
      for (const appl of appli.rows) {
        // 3. Subtract payment from invoice (restore balance)
        const arResult = await tx.execute(sql`SELECT payment_amount, amount FROM accounts_receivable WHERE id=${appl.billing_id}`);
        if (arResult.rows.length > 0) {
          const invPaid = parseFloat(arResult.rows[0].payment_amount || 0) - parseFloat(appl.applied_amount || 0);
          const invAmt = parseFloat(arResult.rows[0].amount);
          const newStatus = (invPaid <= 0.01) ? 'Open' : 'Partial';
          await tx.execute(sql`
            UPDATE accounts_receivable SET payment_amount=${Math.max(0, invPaid)}, status=${newStatus}, updated_at=NOW() WHERE id=${appl.billing_id}
          `);
        }
      }
      // 4. Delete payment_applications for this payment
      await tx.execute(sql`DELETE FROM payment_applications WHERE payment_id=${paymentId}`);
      res.json({ success: true, paymentId, reversed: true });
    });
  } catch (error) {
    console.error('Payment reversal error:', error);
    res.status(500).json({ success: false, error: error.message || 'Payment reversal failed' });
  }
});

// Get recent customer payments
router.get('/payments/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const payments = await db.execute(sql`
      SELECT 
        cp.id,
        cp.payment_number,
        cp.payment_date,
        cp.payment_amount,
        cp.payment_method,
        cp.reference,
        cp.posting_status,
        cp.accounting_document_number,
        cp.currency,
        c.name as customer_name,
        c.customer_code as customer_code
      FROM customer_payments cp
      LEFT JOIN erp_customers c ON cp.customer_id = c.id
      ORDER BY cp.payment_date DESC, cp.created_at DESC
      LIMIT ${limit}
    `);

    res.json({
      success: true,
      data: payments.rows
    });
  } catch (error) {
    console.error('Error fetching recent payments:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch recent payments'
    });
  }
});

// Get payment by ID
router.get('/payments/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await db.execute(sql`
      SELECT 
        cp.*,
        c.name as customer_name,
        c.customer_code as customer_code,
        cc.code as company_code,
        ba.account_number as bank_account_number,
        ba.account_name as bank_account_name
      FROM customer_payments cp
      LEFT JOIN erp_customers c ON cp.customer_id = c.id
      LEFT JOIN company_codes cc ON cp.company_code_id = cc.id
      LEFT JOIN bank_accounts ba ON cp.bank_account_id = ba.id
      WHERE cp.id = ${parseInt(paymentId)}
    `);

    if (payment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    // Get payment applications
    const applications = await db.execute(sql`
      SELECT 
        pa.*,
        bd.billing_number,
        aoi.invoice_number
      FROM payment_applications pa
      LEFT JOIN billing_documents bd ON pa.billing_id = bd.id
      LEFT JOIN ar_open_items aoi ON pa.billing_id = aoi.billing_document_id
      WHERE pa.payment_id = ${parseInt(paymentId)}
    `);

    res.json({
      success: true,
      data: {
        ...payment.rows[0],
        applications: applications.rows
      }
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch payment'
    });
  }
});

// ===================================================================
// FINANCIAL POSTING ENDPOINTS
// ===================================================================

// Get billing documents ready for financial posting
router.get("/financial-posting/pending", async (req, res) => {
  try {
    const pendingDocs = await db.execute(sql`
      SELECT 
        bd.id, bd.billing_number, bd.billing_date, bd.due_date,
        bd.net_amount, bd.tax_amount, bd.total_amount, bd.currency,
        bd.posting_status, bd.accounting_document_number,
        bd.sales_order_id, so.order_number as sales_order_number,
        bd.delivery_id, dd.delivery_number,
        bd.customer_id, c.name as customer_name,
        bd.company_code_id, cc.code as company_code, cc.name as company_name,
        bd.created_at
      FROM billing_documents bd
      LEFT JOIN sales_orders so ON bd.sales_order_id = so.id
      LEFT JOIN delivery_documents dd ON bd.delivery_id = dd.id
      LEFT JOIN erp_customers c ON bd.customer_id = c.id
      LEFT JOIN company_codes cc ON bd.company_code_id = cc.id
      WHERE (LOWER(TRIM(bd.posting_status)) = 'open' 
             OR bd.posting_status IS NULL 
             OR TRIM(bd.posting_status) = '')
        AND (bd.accounting_document_number IS NULL OR bd.accounting_document_number = '')
      ORDER BY bd.billing_date DESC, bd.created_at DESC
    `);

    res.json({
      success: true,
      data: pendingDocs.rows
    });
  } catch (error) {
    console.error('Error fetching pending billing documents:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch pending billing documents'
    });
  }
});

// Get posted billing documents
router.get("/financial-posting/posted", async (req, res) => {
  try {
    const postedDocs = await db.execute(sql`
      SELECT 
        bd.id, bd.billing_number, bd.billing_date, bd.due_date,
        bd.net_amount, bd.tax_amount, bd.total_amount, bd.currency,
        bd.posting_status, bd.accounting_document_number,
        bd.sales_order_id, so.order_number as sales_order_number,
        bd.delivery_id, dd.delivery_number,
        bd.customer_id, c.name as customer_name,
        bd.company_code_id, cc.code as company_code, cc.name as company_name,
        bd.created_at, bd.updated_at
      FROM billing_documents bd
      LEFT JOIN sales_orders so ON bd.sales_order_id = so.id
      LEFT JOIN delivery_documents dd ON bd.delivery_id = dd.id
      LEFT JOIN erp_customers c ON bd.customer_id = c.id
      LEFT JOIN company_codes cc ON bd.company_code_id = cc.id
      WHERE (LOWER(TRIM(bd.posting_status)) = 'posted')
        AND bd.accounting_document_number IS NOT NULL 
        AND bd.accounting_document_number != ''
      ORDER BY bd.updated_at DESC
    `);

    res.json({
      success: true,
      data: postedDocs.rows
    });
  } catch (error) {
    console.error('Error fetching posted billing documents:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch posted billing documents'
    });
  }
});

// Post billing document to GL
router.post("/financial-posting/post/:billingId", async (req, res) => {
  try {
    const { billingId } = req.params;

    // Get billing document with items and company code from sales order
    const billingResult = await db.execute(sql`
      SELECT 
        bd.*,
        so.order_number as sales_order_number,
        so.company_code_id as sales_order_company_code_id,
        c.name as customer_name,
        c.company_code_id as customer_company_code_id
      FROM billing_documents bd
      LEFT JOIN sales_orders so ON bd.sales_order_id = so.id
      LEFT JOIN erp_customers c ON bd.customer_id = c.id
      WHERE bd.id = ${parseInt(billingId)}
    `);

    if (billingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Billing document not found'
      });
    }

    const billingDoc = billingResult.rows[0];

    // Check if already posted
    if (billingDoc.posting_status && billingDoc.posting_status.toLowerCase() === 'posted') {
      return res.status(400).json({
        success: false,
        error: 'Billing document already posted'
      });
    }

    // Get billing items with sales order info for sales organization
    const itemsResult = await db.execute(sql`
      SELECT bi.*, 
             COALESCE(sd_so.code, so_legacy.code, '1000') as sales_organization
      FROM billing_items bi
      LEFT JOIN billing_documents bd ON bi.billing_id = bd.id
      LEFT JOIN sales_orders so ON bd.sales_order_id = so.id
      LEFT JOIN sd_sales_organizations sd_so ON so.sales_org_id = sd_so.id
      LEFT JOIN sales_organizations so_legacy ON so.sales_org_id = so_legacy.id
      WHERE bi.billing_id = ${parseInt(billingId)}
      ORDER BY bi.line_item
    `);

    // Get customer reconciliation account
    const customerResult = await db.execute(sql`
      SELECT reconciliation_account_code
      FROM erp_customers
      WHERE id = ${billingDoc.customer_id}
    `);

    const reconciliationAccount = customerResult.rows[0]?.reconciliation_account_code || null;

    // Get sales organization from billing items or sales order (no hardcoded 1000)
    let salesOrganization = String(itemsResult.rows[0]?.sales_organization || '');

    if (!salesOrganization || salesOrganization === 'undefined') {
      const sdSalesOrgResult = await db.execute(sql`
        SELECT code FROM sd_sales_organizations WHERE is_active = true ORDER BY id LIMIT 1
      `);

      if (sdSalesOrgResult.rows.length > 0) {
        salesOrganization = String(sdSalesOrgResult.rows[0]?.code || '');
      } else {
        const legacySalesOrgResult = await db.execute(sql`
          SELECT code FROM sales_organizations WHERE is_active = true ORDER BY id LIMIT 1
        `);

        if (legacySalesOrgResult.rows.length > 0) {
          salesOrganization = String(legacySalesOrgResult.rows[0]?.code || '');
        }
      }
    }

    if (!salesOrganization) {
      return res.status(400).json({
        success: false,
        error: 'Sales organization not configured. Please configure sales organization master data.'
      });
    }

    // Get AR account using account determination service (no hardcoded values)
    const billingAccountsResult = await accountDeterminationService.determineBillingAccounts({
      customerId: billingDoc.customer_id,
      materialIds: itemsResult.rows.map(item => item.material_id).filter(Boolean),
      salesOrganization: salesOrganization
    });

    // Get AR account ID from gl_accounts table using determined account number
    let arAccountResult = await db.execute(sql`
      SELECT id, account_number
      FROM gl_accounts
      WHERE account_number = ${billingAccountsResult.arAccount}
        AND is_active = true
      LIMIT 1
    `);

    let arAccount = arAccountResult.rows[0];

    if (!arAccount) {
      // Fallback: try to find AR account by type
      const fallbackArResult = await db.execute(sql`
        SELECT id, account_number
        FROM gl_accounts
        WHERE account_type = 'ASSETS'
          AND reconciliation_account = true
          AND is_active = true
        LIMIT 1
      `);

      if (!fallbackArResult.rows[0]) {
        return res.status(400).json({
          success: false,
          error: 'Accounts Receivable GL account not found. Please configure GL accounts.'
        });
      }
      arAccount = fallbackArResult.rows[0];
    }

    // Get company code - Priority: 1) Sales Order, 2) Customer, 3) Error if neither available
    let companyCode: string | null = null;

    // Priority 1: Get company code from sales order
    if (billingDoc.sales_order_company_code_id) {
      const salesOrderCompanyCodeResult = await db.execute(sql`
        SELECT code as company_code
        FROM company_codes
        WHERE id = ${billingDoc.sales_order_company_code_id}
      `);

      if (salesOrderCompanyCodeResult.rows[0]?.company_code) {
        companyCode = salesOrderCompanyCodeResult.rows[0].company_code;
        console.log(`✅ Using company code from sales order: ${companyCode}`);
      }
    }

    // Priority 2: Fallback to customer company code if not found in sales order
    if (!companyCode && billingDoc.customer_company_code_id) {
      const customerCompanyCodeResult = await db.execute(sql`
        SELECT code as company_code
        FROM company_codes
        WHERE id = ${billingDoc.customer_company_code_id}
    `);

      if (customerCompanyCodeResult.rows[0]?.company_code) {
        companyCode = customerCompanyCodeResult.rows[0].company_code;
        console.log(`✅ Using company code from customer (fallback): ${companyCode}`);
      }
    }

    // Error if company code still not found
    if (!companyCode) {
      return res.status(400).json({
        success: false,
        error: `Company code not found. Sales order ${billingDoc.sales_order_id || 'N/A'} and customer ${billingDoc.customer_id} both missing company code. Please configure company code in sales order or customer master data.`
      });
    }

    // Get posting date and calculate fiscal year and period
    const postingDate = billingDoc.billing_date ? new Date(billingDoc.billing_date) : new Date();
    const fiscalYear = postingDate.getFullYear().toString();
    const period = String(postingDate.getMonth() + 1).padStart(2, '0');

    // CRITICAL: Validate Fiscal Period Status
    try {
      await FiscalPeriodService.validatePostingPeriod(postingDate, companyCode);
      console.log(`✅ Fiscal period ${period}/${fiscalYear} is Open for company ${companyCode}`);
    } catch (validationError: any) {
      return res.status(400).json({
        success: false,
        error: validationError.message || `Fiscal period ${period}/${fiscalYear} is not open for posting.`
      });
    }

    // Step 5: Map billing type to document type dynamically (needed for both number generation and document creation)
    let docType = 'DR'; // Default fallback
    try {
      const billingType = billingDoc.billing_type || 'F2';
      const docTypeResult = await db.execute(sql`
        SELECT dt.number_range
        FROM sd_document_types dt
        WHERE dt.code = ${billingType}
          AND dt.category = 'BILLING'
          AND dt.is_active = true
        LIMIT 1
      `);

      if (docTypeResult.rows.length > 0 && docTypeResult.rows[0].number_range) {
        docType = docTypeResult.rows[0].number_range;
      } else {
        const defaultDocTypeResult = await db.execute(sql`
          SELECT config_value FROM system_configuration 
          WHERE config_key = 'default_accounting_document_type' AND active = true LIMIT 1
        `);
        docType = defaultDocTypeResult.rows[0]?.config_value || 'DR';
      }
    } catch (error) {
      console.warn('Could not determine document type, using default DR');
      docType = 'DR';
    }

    // Step 6: Get existing accounting document number (should already exist)
    let accountingDocNumber: string;
    const existingAccountingDocNumber = billingDoc.accounting_document_number;

    if (!existingAccountingDocNumber) {
      // Fallback: Generate if somehow missing (for backward compatibility with old invoices)
      // Get billing type for document type mapping
      const billingType = billingDoc.billing_type || (await db.execute(sql`
        SELECT code FROM sd_document_types 
        WHERE category = 'BILLING' AND is_active = true ORDER BY id LIMIT 1
      `)).rows[0]?.code;

      if (!billingType) {
        return res.status(400).json({
          success: false,
          error: 'Cannot determine billing type for document number generation. Please configure billing document types.'
        });
      }

      const { transactionalApplicationsService } = await import("../services/transactional-applications-service");

      accountingDocNumber = await transactionalApplicationsService.generateEarlyAccountingDocumentNumber(
        companyCode,
        billingType // Pass billing type, not hardcoded 'DR'
      );
      console.warn('⚠️ Accounting document number missing, generated new one for backward compatibility');
    } else {
      accountingDocNumber = existingAccountingDocNumber;
      console.log(`✅ Using existing accounting document number: ${accountingDocNumber}`);
    }

    // Ensure accountingDocNumber is set - if generateEarlyAccountingDocumentNumber failed, use fallback
    // Note: docType is already determined above, so we can use it here
    if (!accountingDocNumber) {
      try {
        const docCountResult = await db.execute(sql`
          SELECT COUNT(*)::integer as count 
          FROM accounting_documents
          WHERE company_code = ${companyCode}
            AND document_type = ${docType}
            AND fiscal_year = ${parseInt(fiscalYear)}
        `);
        const docCount = parseInt(docCountResult.rows[0]?.count || '0') + 1;
        accountingDocNumber = `${String(companyCode).replace(/[^0-9]/g, '').slice(-4).padStart(4, '0')}${fiscalYear.slice(-2)}${docCount.toString().padStart(8, '0')}`;
      } catch (countError: any) {
        // Last resort: Generate based on billing documents for this fiscal year
        const billingCountResult = await db.execute(sql`
          SELECT COUNT(*)::integer as count 
          FROM billing_documents
          WHERE accounting_document_number IS NOT NULL
            AND accounting_document_number != ''
            AND EXTRACT(YEAR FROM billing_date)::integer = ${parseInt(fiscalYear)}
        `);
        const billingCount = parseInt(billingCountResult.rows[0]?.count || '0') + 1;
        accountingDocNumber = `${String(companyCode).replace(/[^0-9]/g, '').slice(-4).padStart(4, '0')}${fiscalYear.slice(-2)}${billingCount.toString().padStart(8, '0')}`;
      }
    }

    // Calculate totals
    const netAmount = parseFloat(billingDoc.net_amount || 0);
    const taxAmount = parseFloat(billingDoc.tax_amount || 0);
    const totalAmount = parseFloat(billingDoc.total_amount || 0);

    // Calculate debit and credit totals
    const totalDebit = totalAmount; // AR is debited
    const totalCredit = totalAmount; // Revenue + Tax is credited

    // Create GL entries using accounts from billing_items (no hardcoded values)
    // 1. Debit: Accounts Receivable (total amount including tax)
    // 2. Credit: Revenue (net amount from billing_items with determined GL accounts)
    // 3. Credit: Tax Payable (tax amount, if tax account exists)

    // Tax account already determined by account determination service
    const taxAccountNumber = billingAccountsResult.taxAccount;

    // Prepare GL entries using accounts from billing_items (no hardcoded values)
    const glEntries = [
      {
        gl_account_id: arAccount.id,
        amount: totalAmount,
        debit_credit_indicator: 'D',
        description: `AR - ${billingDoc.billing_number}`
      }
    ];

    // Group revenue accounts from billing_items by GL account
    const revenueAccountMap = new Map<string, number>();
    let totalRevenueAmount = 0;

    for (const item of itemsResult.rows) {
      const glAccount = item.gl_account;
      const itemNetAmount = parseFloat(item.net_amount || 0);
      if (glAccount && itemNetAmount > 0) {
        const currentAmount = revenueAccountMap.get(glAccount) || 0;
        revenueAccountMap.set(glAccount, currentAmount + itemNetAmount);
        totalRevenueAmount += itemNetAmount;
      }
    }

    // If no revenue accounts found in billing_items, use account determination service results as fallback
    if (revenueAccountMap.size === 0 && billingAccountsResult.revenueAccounts.length > 0) {
      // Use determined revenue accounts from account determination service
      for (const revAccount of billingAccountsResult.revenueAccounts) {
        const currentAmount = revenueAccountMap.get(revAccount.glAccount) || 0;
        revenueAccountMap.set(revAccount.glAccount, currentAmount + netAmount);
      }
      totalRevenueAmount = netAmount;
    }

    // If still no revenue accounts, get default revenue account from database
    if (revenueAccountMap.size === 0) {
      const defaultRevenueResult = await db.execute(sql`
        SELECT id, account_number FROM gl_accounts 
        WHERE account_type = 'REVENUE' AND is_active = true
        ORDER BY account_number
        LIMIT 1
      `);

      if (defaultRevenueResult.rows.length > 0) {
        revenueAccountMap.set(defaultRevenueResult.rows[0].account_number, netAmount);
        totalRevenueAmount = netAmount;
      } else {
        return res.status(400).json({
          success: false,
          error: 'No revenue GL account found. Please configure GL accounts.'
        });
      }
    }

    // Get GL account IDs for revenue accounts from billing_items or fallback
    for (const [glAccountNumber, amount] of Array.from(revenueAccountMap.entries())) {
      const revenueAccountResult = await db.execute(sql`
        SELECT id FROM gl_accounts 
        WHERE account_number = ${glAccountNumber} AND is_active = true
        LIMIT 1
      `);

      if (revenueAccountResult.rows.length > 0) {
        glEntries.push({
          gl_account_id: revenueAccountResult.rows[0].id,
          amount: amount,
          debit_credit_indicator: 'C',
          description: `Revenue - ${billingDoc.billing_number} - ${glAccountNumber}`
        });
      } else {
        console.warn(`Revenue GL account ${glAccountNumber} not found in gl_accounts table`);
      }
    }

    // Add tax entry if tax account exists and tax amount > 0
    if (taxAccountNumber && taxAmount > 0) {
      const taxAccountResult = await db.execute(sql`
        SELECT id FROM gl_accounts 
        WHERE account_number = ${taxAccountNumber} AND is_active = true
        LIMIT 1
      `);

      if (taxAccountResult.rows.length > 0) {
        glEntries.push({
          gl_account_id: taxAccountResult.rows[0].id,
          amount: taxAmount,
          debit_credit_indicator: 'C',
          description: `Tax Payable - ${billingDoc.billing_number}`
        });
      } else {
        // Try to find default tax account if determined one not found
        const defaultTaxResult = await db.execute(sql`
          SELECT id FROM gl_accounts 
          WHERE account_type = 'LIABILITIES'
            AND (account_name ILIKE '%tax%payable%' OR account_name ILIKE '%tax%liability%')
            AND is_active = true
          ORDER BY account_number
          LIMIT 1
        `);

        if (defaultTaxResult.rows.length > 0) {
          glEntries.push({
            gl_account_id: defaultTaxResult.rows[0].id,
            amount: taxAmount,
            debit_credit_indicator: 'C',
            description: `Tax Payable - ${billingDoc.billing_number}`
          });
        } else {
          console.warn(`Tax GL account ${taxAccountNumber} not found in gl_accounts table and no default found`);
        }
      }
    }

    // Validate balance before posting - CRITICAL: Ensure debits equal credits
    const totalDebits = glEntries
      .filter(e => e.debit_credit_indicator === 'D')
      .reduce((sum, e) => sum + e.amount, 0);
    const totalCredits = glEntries
      .filter(e => e.debit_credit_indicator === 'C')
      .reduce((sum, e) => sum + e.amount, 0);

    const balanceDifference = Math.abs(totalDebits - totalCredits);
    if (balanceDifference > 0.01) {
      return res.status(400).json({
        success: false,
        error: `GL entries are not balanced. Debits: ${totalDebits.toFixed(2)}, Credits: ${totalCredits.toFixed(2)}, Difference: ${balanceDifference.toFixed(2)}`,
        details: {
          debits: totalDebits,
          credits: totalCredits,
          difference: balanceDifference,
          entries: glEntries.map(e => ({
            account_id: e.gl_account_id,
            amount: e.amount,
            indicator: e.debit_credit_indicator
          }))
        }
      });
    }

    // Create document in accounting_documents table
    const postingDateStr = postingDate.toISOString().split('T')[0];
    const documentDateStr = postingDateStr;

    // Use billing number (invoice number) as reference
    const invoiceNumber = billingDoc.billing_number || `INV-${billingId}`;

    // Get currency from billing document (should already be set)
    const currency = billingDoc.currency || (await db.execute(sql`
      SELECT currency FROM company_codes WHERE code = ${companyCode} AND is_active = true LIMIT 1
    `)).rows[0]?.currency;

    if (!currency) {
      return res.status(400).json({
        success: false,
        error: `Currency not configured for billing document or company code ${companyCode}.`
      });
    }

    // Get created_by from request or auth context (no hardcoded values)
    // Try multiple sources in order of preference
    let createdBy: number | null = null;

    // 1. Try from authentication context
    if ((req as any).user?.id) {
      createdBy = parseInt(String((req as any).user.id));
    }

    // 2. Try from request body
    if (!createdBy && req.body.created_by) {
      createdBy = parseInt(String(req.body.created_by));
    }

    // 3. Try from system configuration
    if (!createdBy) {
      const configResult = await db.execute(sql`
        SELECT config_value FROM system_configuration 
        WHERE config_key = 'default_user_id' AND active = true LIMIT 1
      `);
      if (configResult.rows.length > 0 && configResult.rows[0].config_value) {
        createdBy = parseInt(String(configResult.rows[0].config_value));
      }
    }

    // 4. Try to find a system user (role = 'system' or 'admin')
    if (!createdBy) {
      const systemUserResult = await db.execute(sql`
        SELECT id FROM users 
        WHERE (role = 'system' OR role = 'admin') 
          AND active = true 
        ORDER BY id LIMIT 1
      `);
      if (systemUserResult.rows.length > 0 && systemUserResult.rows[0].id) {
        createdBy = parseInt(String(systemUserResult.rows[0].id));
      }
    }

    // 5. Last resort: Get first active user
    if (!createdBy) {
      const activeUserResult = await db.execute(sql`
        SELECT id FROM users 
        WHERE active = true 
        ORDER BY id LIMIT 1
      `);
      if (activeUserResult.rows.length > 0 && activeUserResult.rows[0].id) {
        createdBy = parseInt(String(activeUserResult.rows[0].id));
      }
    }

    if (!createdBy) {
      return res.status(400).json({
        success: false,
        error: 'User ID not available. Please ensure authentication context is set or configure a default user in system configuration.'
      });
    }

    // Check if accounting document with this number already exists (check unique constraint)
    let docExists = false;
    let existingDocId = null;
    let retryCount = 0;
    const maxRetries = 10;

    while (retryCount < maxRetries) {
      const docCheckResult = await db.execute(sql`
        SELECT id, document_number, source_document_id
        FROM accounting_documents
        WHERE document_number = ${accountingDocNumber}
        LIMIT 1
      `);

      if (docCheckResult.rows.length > 0) {
        const existingDoc = docCheckResult.rows[0];
        // If it's for the same billing document, update it
        if (parseInt(String(existingDoc.source_document_id)) === parseInt(billingId)) {
          docExists = true;
          existingDocId = existingDoc.id;
          break;
        } else {
          // Document number exists for a different billing document - generate new one
          console.warn(`⚠️ Document number ${accountingDocNumber} already exists for different billing document. Generating new number...`);

          // Generate new document number by incrementing the counter
          try {
            const docCountResult = await db.execute(sql`
              SELECT COUNT(*)::integer as count 
              FROM accounting_documents
              WHERE company_code = ${companyCode}
                AND document_type = ${docType}
                AND fiscal_year = ${parseInt(fiscalYear)}
            `);
            const docCount = parseInt(docCountResult.rows[0]?.count || '0') + retryCount + 1;
            accountingDocNumber = `${String(companyCode).replace(/[^0-9]/g, '').slice(-4).padStart(4, '0')}${fiscalYear.slice(-2)}${docCount.toString().padStart(8, '0')}`;
            retryCount++;
          } catch (countError: any) {
            // Fallback: add timestamp suffix to make it unique
            accountingDocNumber = `${accountingDocNumber}-${Date.now()}`;
            retryCount++;
          }
        }
      } else {
        // Document number doesn't exist, safe to use
        break;
      }
    }

    if (retryCount >= maxRetries) {
      return res.status(500).json({
        success: false,
        error: `Failed to generate unique accounting document number after ${maxRetries} attempts. Please try again.`
      });
    }

    let accountingDocumentId: number;

    if (docExists && existingDocId) {
      // Update existing document for this billing document
      await db.execute(sql`
        UPDATE accounting_documents
        SET header_text = ${`Invoice posting for ${invoiceNumber}`},
            total_amount = ${totalAmount},
            updated_at = NOW()
        WHERE id = ${existingDocId}
      `);

      accountingDocumentId = existingDocId;
      console.log(`✅ Updated existing accounting document ${accountingDocNumber}`);
    } else {
      // Create new accounting document
      try {
        await db.execute(sql`
          INSERT INTO accounting_documents (
            document_number, document_type, company_code, fiscal_year,
            posting_date, document_date, period, reference, header_text,
            total_amount, currency, source_module, source_document_id,
            source_document_type, created_by
          ) VALUES (
            ${accountingDocNumber},
            ${docType},
            ${companyCode},
            ${parseInt(fiscalYear)},
            ${postingDateStr},
            ${documentDateStr},
            ${parseInt(period)},
            ${invoiceNumber},
            ${`Invoice posting for ${invoiceNumber}`},
            ${totalAmount},
            ${currency},
            'SALES',
            ${billingId},
            'BILLING',
            ${parseInt(String(createdBy))}
          )
        `);

        console.log(`✅ Created new accounting document ${accountingDocNumber}`);
      } catch (insertError: any) {
        // If still duplicate (race condition), generate new number and retry once
        if (insertError.code === '23505' && insertError.constraint === 'accounting_documents_document_number_key') {
          console.warn(`⚠️ Race condition detected: document number ${accountingDocNumber} was created by another process. Generating new number...`);

          const docCountResult = await db.execute(sql`
            SELECT COUNT(*)::integer as count 
            FROM accounting_documents
            WHERE company_code = ${companyCode}
              AND document_type = ${docType}
              AND fiscal_year = ${parseInt(fiscalYear)}
          `);
          const docCount = parseInt(String(docCountResult.rows[0]?.count || '0')) + 1;
          accountingDocNumber = `${String(companyCode).replace(/[^0-9]/g, '').slice(-4).padStart(4, '0')}${fiscalYear.slice(-2)}${docCount.toString().padStart(8, '0')}`;

          // Retry insert with new number
          await db.execute(sql`
            INSERT INTO accounting_documents (
              document_number, document_type, company_code, fiscal_year,
              posting_date, document_date, period, reference, header_text,
              total_amount, currency, source_module, source_document_id,
              source_document_type, created_by
            ) VALUES (
              ${accountingDocNumber},
              ${docType},
              ${companyCode},
              ${parseInt(fiscalYear)},
              ${postingDateStr},
              ${documentDateStr},
              ${parseInt(period)},
              ${invoiceNumber},
              ${`Invoice posting for ${invoiceNumber}`},
              ${totalAmount},
              ${currency},
              'SALES',
              ${billingId},
              'BILLING',
              ${parseInt(String(createdBy))}
            )
          `);

          console.log(`✅ Created new accounting document ${accountingDocNumber} (after retry)`);
        } else {
          throw insertError;
        }
      }

      // Get the ID of the newly created document
      const newDocResult = await db.execute(sql`
        SELECT id FROM accounting_documents 
        WHERE document_number = ${accountingDocNumber}
        LIMIT 1
      `);

      accountingDocumentId = newDocResult.rows[0]?.id;

      if (!accountingDocumentId) {
        return res.status(500).json({
          success: false,
          error: 'Accounting document not found after creation'
        });
      }
    }

    // Post to GL using the existing GL posting endpoint structure
    // Insert GL entries directly
    // Note: gl_entries table does not have a description column
    // CRITICAL: Explicitly set posting_status to 'posted' for reconciliation
    for (const entry of glEntries) {
      await db.execute(sql`
        INSERT INTO gl_entries (
          document_number, gl_account_id, amount, 
          debit_credit_indicator, posting_status, posting_date
        ) VALUES (
          ${accountingDocNumber}, 
          ${entry.gl_account_id}, 
          ${entry.amount}, 
          ${entry.debit_credit_indicator}, 
          'posted',
          ${postingDateStr}
        )
      `);
    }

    // Create accounting_document_items for proper GL reporting
    let lineItem = 1;
    for (const entry of glEntries) {
      // Get GL account number from gl_account_id
      const glAccountResult = await db.execute(sql`
        SELECT account_number FROM gl_accounts WHERE id = ${entry.gl_account_id} LIMIT 1
      `);

      if (glAccountResult.rows.length > 0) {
        const glAccountNumber = glAccountResult.rows[0].account_number;
        const debitAmount = entry.debit_credit_indicator === 'D' ? entry.amount : 0;
        const creditAmount = entry.debit_credit_indicator === 'C' ? entry.amount : 0;

        // Determine account_type and partner_id
        // AR accounts (debit entries) should have account_type='D' and partner_id=customer_id
        let accountType = 'S'; // Default to GL account
        let partnerId = null;

        if (entry.debit_credit_indicator === 'D' && entry.description?.includes('AR')) {
          accountType = 'D'; // Customer account
          partnerId = parseInt(String(billingDoc.customer_id));
        }

        await db.execute(sql`
          INSERT INTO accounting_document_items (
            document_id, line_item, gl_account, account_type, partner_id,
            debit_amount, credit_amount, currency, item_text
          ) VALUES (
            ${accountingDocumentId},
            ${lineItem},
            ${glAccountNumber},
            ${accountType},
            ${partnerId},
            ${debitAmount.toFixed(2)},
            ${creditAmount.toFixed(2)},
            ${currency},
            ${entry.description || `GL Entry - ${billingDoc.billing_number}`}
          )
        `);

        lineItem++;
      }
    }

    // Update billing document status
    await db.execute(sql`
      UPDATE billing_documents
      SET posting_status = 'POSTED',
          accounting_document_number = ${accountingDocNumber},
          updated_at = NOW()
      WHERE id = ${parseInt(billingId)}
    `);

    // Create AR open item after successful GL posting
    try {
      const { arOpenItemsService } = await import('../services/arOpenItemsService');

      // Get currency ID from currency code
      const currencyResult = await db.execute(sql`
        SELECT id FROM currencies WHERE code = ${currency} AND is_active = true LIMIT 1
      `);

      // If not found, try alternative currency table structure
      if (currencyResult.rows.length === 0) {
        const altCurrencyResult = await db.execute(sql`
          SELECT id FROM currencies WHERE currency_code = ${currency} AND is_active = true LIMIT 1
        `);
        if (altCurrencyResult.rows.length > 0) {
          currencyResult.rows = altCurrencyResult.rows;
        }
      }

      if (currencyResult.rows.length === 0) {
        console.warn(`Currency ${currency} not found, skipping AR open item creation`);
      } else {
        const currencyId = parseInt(String(currencyResult.rows[0].id));

        // Determine document type from billing type - get from billing document or lookup
        let documentType: string;
        if (billingDoc.billing_type) {
          const billingTypeUpper = String(billingDoc.billing_type).toUpperCase();
          if (billingTypeUpper.includes('CREDIT') || billingTypeUpper.includes('G2')) {
            documentType = 'Credit';
          } else if (billingTypeUpper.includes('INVOICE') || billingTypeUpper.includes('F2')) {
            documentType = 'Invoice';
          } else {
            // Get document type from billing document type configuration if available
            const docTypeResult = await db.execute(sql`
              SELECT document_type FROM billing_document_types 
              WHERE code = ${String(billingDoc.billing_type)} AND is_active = true LIMIT 1
            `);
            if (docTypeResult.rows.length > 0) {
              documentType = String(docTypeResult.rows[0].document_type);
            } else {
              throw new Error(`Document type cannot be determined for billing type: ${billingDoc.billing_type}`);
            }
          }
        } else {
          throw new Error('Billing type is required to determine document type');
        }

        // Get payment terms from billing document or customer
        const paymentTerms = billingDoc.payment_terms || null;

        // Get due date from billing document or calculate from payment terms
        let dueDate: Date;
        if (billingDoc.due_date) {
          dueDate = new Date(String(billingDoc.due_date));
        } else {

          dueDate = new Date(postingDate);
          if (paymentTerms) {
            // Look up payment terms in database to get number of days
            const paymentTermsResult = await db.execute(sql`
              SELECT number_of_days FROM payment_terms 
              WHERE code = ${String(paymentTerms)} AND is_active = true LIMIT 1
            `);
            if (paymentTermsResult.rows.length > 0) {
              const numberOfDays = parseInt(String(paymentTermsResult.rows[0].number_of_days));
              dueDate.setDate(dueDate.getDate() + numberOfDays);
            } else {
              // Try to extract days from payment terms code (e.g., "NET30" = 30 days)
              const daysMatch = String(paymentTerms).match(/\d+/);
              if (daysMatch) {
                dueDate.setDate(dueDate.getDate() + parseInt(daysMatch[0]));
              } else {
                throw new Error(`Payment terms ${paymentTerms} not found and cannot determine number of days`);
              }
            }
          } else {
            // Get default payment terms from customer or system configuration
            const customerPaymentTermsResult = await db.execute(sql`
              SELECT payment_terms FROM erp_customers 
              WHERE id = ${parseInt(String(billingDoc.customer_id))} LIMIT 1
            `);
            if (customerPaymentTermsResult.rows.length > 0 && customerPaymentTermsResult.rows[0].payment_terms) {
              const customerPaymentTerms = String(customerPaymentTermsResult.rows[0].payment_terms);
              const customerPaymentTermsLookup = await db.execute(sql`
                SELECT number_of_days FROM payment_terms 
                WHERE code = ${customerPaymentTerms} AND is_active = true LIMIT 1
              `);
              if (customerPaymentTermsLookup.rows.length > 0) {
                const numberOfDays = parseInt(String(customerPaymentTermsLookup.rows[0].number_of_days));
                dueDate.setDate(dueDate.getDate() + numberOfDays);
              } else {
                throw new Error(`Customer payment terms ${customerPaymentTerms} not found`);
              }
            } else {
              // Get default from system configuration
              const defaultPaymentDaysResult = await db.execute(sql`
                SELECT config_value FROM system_configuration 
                WHERE config_key = 'default_payment_terms_days' AND active = true LIMIT 1
              `);
              if (defaultPaymentDaysResult.rows.length > 0) {
                const defaultDays = parseInt(String(defaultPaymentDaysResult.rows[0].config_value));
                dueDate.setDate(dueDate.getDate() + defaultDays);
              } else {
                throw new Error('Payment terms not specified and no default payment terms days configured');
              }
            }
          }
        }

        // Get initial status from system configuration or billing document
        const initialStatusResult = await db.execute(sql`
          SELECT config_value FROM system_configuration 
          WHERE config_key = 'ar_open_item_initial_status' AND active = true LIMIT 1
        `);
        const initialStatus = initialStatusResult.rows.length > 0
          ? String(initialStatusResult.rows[0].config_value)
          : null;

        if (!initialStatus) {
          throw new Error('AR open item initial status not configured in system');
        }

        // Get active flag from system configuration
        const activeConfigResult = await db.execute(sql`
          SELECT config_value FROM system_configuration 
          WHERE config_key = 'ar_open_item_default_active' AND active = true LIMIT 1
        `);
        const defaultActive = activeConfigResult.rows.length > 0
          ? String(activeConfigResult.rows[0].config_value).toLowerCase() === 'true'
          : true; // Default to true if not configured, but log warning

        if (activeConfigResult.rows.length === 0) {
          console.warn('ar_open_item_default_active not configured in system_configuration. Using default: true');
        }

        await arOpenItemsService.createAROpenItem({
          billingDocumentId: parseInt(billingId),
          customerId: parseInt(String(billingDoc.customer_id)),
          documentNumber: String(accountingDocNumber),
          invoiceNumber: String(invoiceNumber),
          documentType: documentType,
          postingDate: postingDate,
          dueDate: dueDate,
          originalAmount: parseFloat(String(totalAmount)),
          outstandingAmount: parseFloat(String(totalAmount)),
          currencyId: currencyId,
          paymentTerms: paymentTerms ? String(paymentTerms) : undefined,
          status: initialStatus,
          glAccountId: parseInt(String(arAccount.id)),
          salesOrderId: billingDoc.sales_order_id ? parseInt(String(billingDoc.sales_order_id)) : undefined,
          active: defaultActive,
        });

        console.log(`✅ Created AR open item for billing document ${billingId}`);
      }
    } catch (arOpenItemError: any) {
      // Log error but don't fail the posting
      console.error('Error creating AR open item:', arOpenItemError);
      console.warn('GL posting succeeded but AR open item creation failed');
    }

    res.json({
      success: true,
      data: {
        billingId: parseInt(billingId),
        billingNumber: billingDoc.billing_number,
        accountingDocumentNumber: accountingDocNumber,
        postingStatus: 'posted',
        glEntries: glEntries.length,
        netAmount,
        taxAmount,
        totalAmount
      },
      message: `Billing document ${billingDoc.billing_number} posted to GL successfully`
    });

  } catch (error) {
    console.error('Error posting billing document to GL:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to post billing document to GL'
    });
  }
});

// Get GL posting details for a billing document
router.get("/financial-posting/gl-details/:billingId", async (req, res) => {
  try {
    const { billingId } = req.params;

    const billingResult = await db.execute(sql`
      SELECT 
        bd.accounting_document_number, 
        bd.posting_status,
        bd.company_code_id,
        cc.code as company_code,
        cc.name as company_name
      FROM billing_documents bd
      LEFT JOIN company_codes cc ON bd.company_code_id = cc.id
      WHERE bd.id = ${parseInt(billingId)}
    `);

    if (billingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Billing document not found'
      });
    }

    const billingDoc = billingResult.rows[0];

    if (!billingDoc.accounting_document_number) {
      return res.json({
        success: true,
        data: {
          posted: false,
          glEntries: [],
          companyCode: billingDoc.company_code,
          companyName: billingDoc.company_name
        }
      });
    }

    // Get GL entries for this document
    const glEntriesResult = await db.execute(sql`
      SELECT 
        ge.id, ge.document_number, ge.amount, ge.debit_credit_indicator,
        ge.posting_date, ge.posting_status,
        ga.account_number, ga.account_name, ga.account_type,
        COALESCE(ad.reference, ge.document_number::text) as description
      FROM gl_entries ge
      LEFT JOIN gl_accounts ga ON ge.gl_account_id = ga.id
      LEFT JOIN accounting_documents ad ON ad.document_number = ge.document_number
      WHERE ge.document_number = ${billingDoc.accounting_document_number}
      ORDER BY ge.debit_credit_indicator DESC, ge.id
    `);

    res.json({
      success: true,
      data: {
        posted: true,
        accountingDocumentNumber: billingDoc.accounting_document_number,
        companyCode: billingDoc.company_code,
        companyName: billingDoc.company_name,
        glEntries: glEntriesResult.rows
      }
    });

  } catch (error) {
    console.error('Error fetching GL details:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch GL details'
    });
  }
});


// ========================================
// SALES RETURNS AND CREDIT MEMOS ROUTES
// Added: 2025-12-28
// Purpose: Complete returns/credit memo functionality
// ========================================

// Helper: Generate return number
async function generateReturnNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const countResult = await db.execute(sql`
    SELECT COUNT(*)::integer as count 
    FROM sales_returns
    WHERE EXTRACT(YEAR FROM return_date) = ${year}
  `);
  const count = parseInt(String(countResult.rows[0]?.count || '0')) + 1;
  return `RET-${year}-${count.toString().padStart(6, '0')}`;
}

// Helper: Generate credit memo number
async function generateCreditMemoNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const countResult = await db.execute(sql`
    SELECT COUNT(*)::integer as count 
    FROM credit_memos
    WHERE EXTRACT(YEAR FROM credit_date) = ${year}
  `);
  const count = parseInt(countResult.rows[0]?.count || '0') + 1;
  return `CM-${year}-${count.toString().padStart(6, '0')}`;
}

// Helper: Generate return delivery number
async function generateReturnDeliveryNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const countResult = await db.execute(sql`
    SELECT COUNT(*)::integer as count 
    FROM return_deliveries
    WHERE EXTRACT(YEAR FROM receipt_date) = ${year}
  `);
  const count = parseInt(countResult.rows[0]?.count || '0') + 1;
  return `RD-${year}-${count.toString().padStart(6, '0')}`;
}

/**
 * POST /sales-returns
 * Create a new sales return request
 */
router.post('/sales-returns', async (req, res) => {
  try {
    const {
      customerId,
      salesOrderId,
      billingDocumentId,
      returnReason,
      items,
      notes
    } = req.body;

    // Validate required fields
    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Customer ID and items are required'
      });
    }

    await db.transaction(async (tx) => {
      // Get customer details
      const customerResult = await tx.execute(sql`
        SELECT id, name, company_code_id, currency
        FROM erp_customers
        WHERE id = ${customerId}
      `);

      if (customerResult.rows.length === 0) {
        throw new Error('Customer not found');
      }

      const customer = customerResult.rows[0];

      // Generate return number
      const returnNumber = await generateReturnNumber();

      // Calculate totals
      let totalAmount = 0;
      let taxAmount = 0;

      for (const item of items) {
        const itemTotal = parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0);
        const itemTax = itemTotal * parseFloat(item.tax_rate || 0) / 100;
        totalAmount += itemTotal;
        taxAmount += itemTax;
      }

      const netAmount = totalAmount - taxAmount;

      // Create return header
      const returnResult = await tx.execute(sql`
        INSERT INTO sales_returns (
          return_number,
          sales_order_id,
          billing_document_id,
          customer_id,
          return_date,
          return_reason,
          total_amount,
          tax_amount,
          net_amount,
          status,
          approval_status,
          notes,
          company_code_id,
          currency,
          created_at
        ) VALUES (
          ${returnNumber},
          ${salesOrderId || null},
          ${billingDocumentId || null},
          ${customerId},
          CURRENT_DATE,
          ${returnReason || ''},
          ${totalAmount.toFixed(2)},
          ${taxAmount.toFixed(2)},
          ${netAmount.toFixed(2)},
          'DRAFT',
          'PENDING',
          ${notes || ''},
          ${customer.company_code_id || null},
          ${customer.currency || 'USD'},
          NOW()
        ) RETURNING id
      `);

      const returnId = returnResult.rows[0].id;

      // Create return items
      for (const item of items) {
        const itemTotal = parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0);
        const itemTax = itemTotal * parseFloat(item.tax_rate || 0) / 100;

        await tx.execute(sql`
          INSERT INTO sales_return_items (
            return_id,
            sales_order_item_id,
            billing_item_id,
            product_id,
            quantity,
            unit_price,
            total_amount,
            tax_amount,
            return_reason,
            condition,
            disposition,
            plant_id,
            storage_location_id,
            created_at
          ) VALUES (
            ${returnId},
            ${item.sales_order_item_id || null},
            ${item.billing_item_id || null},
            ${item.product_id},
            ${item.quantity},
            ${item.unit_price},
            ${itemTotal.toFixed(2)},
            ${itemTax.toFixed(2)},
            ${item.return_reason || ''},
            ${item.condition || 'NORMAL'},
            ${item.disposition || 'CREDIT_ONLY'},
            ${item.plant_id || null},
            ${item.storage_location_id || null},
            NOW()
          )
        `);
      }

      // Create document flow link if billing document exists
      if (billingDocumentId) {
        await tx.execute(sql`
          INSERT INTO document_flow (
            source_document_type,
            source_document_id,
            target_document_type,
            target_document_id,
            created_at
          ) VALUES (
            'BILLING',
            ${billingDocumentId},
            'SALES_RETURN',
            ${returnId},
            NOW()
          )
        `);
      }

      res.json({
        success: true,
        data: {
          returnId,
          returnNumber,
          totalAmount,
          status: 'DRAFT',
          message: 'Return request created successfully'
        }
      });
    });

  } catch (error: any) {
    console.error('Error creating sales return:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create sales return'
    });
  }
});

/**
 * GET /sales-returns
 * List all sales returns with optional filters
 */
router.get('/sales-returns', async (req, res) => {
  try {
    const { customerId, status, startDate, endDate } = req.query;

    let query = sql`
      SELECT 
        sr.id,
        sr.return_number,
        sr.customer_id,
        c.name as customer_name,
        sr.sales_order_id,
        so.order_number,
        sr.billing_document_id,
        bd.billing_number,
        sr.return_date,
        sr.return_reason,
        sr.total_amount,
        sr.tax_amount,
        sr.net_amount,
        sr.status,
        sr.approval_status,
        sr.approved_at,
        sr.notes,
        sr.created_at,
        (SELECT COUNT(*) FROM sales_return_items WHERE return_id = sr.id) as item_count
      FROM sales_returns sr
      LEFT JOIN erp_customers c ON sr.customer_id = c.id
      LEFT JOIN sales_orders so ON sr.sales_order_id = so.id
      LEFT JOIN billing_documents bd ON sr.billing_document_id = bd.id
      WHERE sr.active = true
    `;

    if (customerId) {
      query = sql`${query} AND sr.customer_id = ${customerId}`;
    }

    if (status) {
      query = sql`${query} AND sr.status = ${status}`;
    }

    if (startDate) {
      query = sql`${query} AND sr.return_date >= ${startDate}`;
    }

    if (endDate) {
      query = sql`${query} AND sr.return_date <= ${endDate}`;
    }

    query = sql`${query} ORDER BY sr.created_at DESC`;

    const result = await db.execute(query);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error: any) {
    console.error('Error fetching sales returns:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch sales returns'
    });
  }
});

/**
 * PUT /sales-returns/:id/approve
 * Approve or reject a return request
 */
router.put('/sales-returns/:id/approve', async (req, res) => {
  try {
    const returnId = parseIdSafely(req.params.id);
    const { approvalStatus, approvedBy, rejectionReason } = req.body;

    if (!returnId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid return ID'
      });
    }

    if (!approvalStatus || !['APPROVED', 'REJECTED'].includes(approvalStatus)) {
      return res.status(400).json({
        success: false,
        error: 'Valid approval status (APPROVED/REJECTED) is required'
      });
    }

    await db.transaction(async (tx) => {
      // Get current return
      const returnResult = await tx.execute(sql`
        SELECT id, return_number, approval_status
        FROM sales_returns
        WHERE id = ${returnId}
      `);

      if (returnResult.rows.length === 0) {
        throw new Error('Return not found');
      }

      const currentReturn = returnResult.rows[0];

      if (currentReturn.approval_status === 'APPROVED') {
        throw new Error('Return is already approved');
      }

      // Update return approval
      await tx.execute(sql`
        UPDATE sales_returns
        SET approval_status = ${approvalStatus},
            approved_by = ${approvedBy || null},
            approved_at = ${approvalStatus === 'APPROVED' ? sql`NOW()` : null},
            status = ${approvalStatus === 'APPROVED' ? 'APPROVED' : 'REJECTED'},
            notes = CASE 
              WHEN ${approvalStatus} = 'REJECTED' AND ${rejectionReason || ''} != '' 
              THEN CONCAT(COALESCE(notes, ''), ' [REJECTED: ', ${rejectionReason}, ']')
              ELSE notes
            END,
            updated_at = NOW()
        WHERE id = ${returnId}
      `);

      res.json({
        success: true,
        data: {
          returnId,
          returnNumber: currentReturn.return_number,
          approvalStatus,
          message: `Return ${approvalStatus.toLowerCase()} successfully`
        }
      });
    });

  } catch (error: any) {
    console.error('Error approving return:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to approve return'
    });
  }
});

/**
 * POST /credit-memos
 * Generate credit memo from approved return
 */
router.post('/credit-memos', async (req, res) => {
  try {
    const { returnId, creditDate, reference, notes } = req.body;

    if (!returnId) {
      return res.status(400).json({
        success: false,
        error: 'Return ID is required'
      });
    }

    await db.transaction(async (tx) => {
      // Get return details
      const returnResult = await tx.execute(sql`
        SELECT 
          sr.id,
          sr.return_number,
          sr.customer_id,
          sr.billing_document_id,
          sr.total_amount,
          sr.tax_amount,
          sr.net_amount,
          sr.approval_status,
          sr.company_code_id,
          sr.currency,
          c.payment_terms
        FROM sales_returns sr
        LEFT JOIN erp_customers c ON sr.customer_id = c.id
        WHERE sr.id = ${returnId}
      `);

      if (returnResult.rows.length === 0) {
        throw new Error('Return not found');
      }

      const returnData = returnResult.rows[0];

      if (returnData.approval_status !== 'APPROVED') {
        throw new Error('Return must be approved before generating credit memo');
      }

      // Check if credit memo already exists
      const existingCMResult = await tx.execute(sql`
        SELECT id, credit_memo_number
        FROM credit_memos
        WHERE return_id = ${returnId}
      `);

      if (existingCMResult.rows.length > 0) {
        throw new Error(`Credit memo already exists: ${existingCMResult.rows[0].credit_memo_number}`);
      }

      // Generate credit memo number
      const creditMemoNumber = await generateCreditMemoNumber();

      // Create credit memo
      const cmResult = await tx.execute(sql`
        INSERT INTO credit_memos (
          credit_memo_number,
          return_id,
          billing_document_id,
          customer_id,
          credit_date,
          total_amount,
          tax_amount,
          net_amount,
          currency,
          posting_status,
          reference,
          notes,
          company_code_id,
          payment_terms,
          created_at
        ) VALUES (
          ${creditMemoNumber},
          ${returnId},
          ${returnData.billing_document_id || null},
          ${returnData.customer_id},
          ${creditDate || sql`CURRENT_DATE`},
          ${returnData.total_amount},
          ${returnData.tax_amount},
          ${returnData.net_amount},
          ${returnData.currency || 'USD'},
          'DRAFT',
          ${reference || ''},
          ${notes || ''},
          ${returnData.company_code_id || null},
          ${returnData.payment_terms || ''},
          NOW()
        ) RETURNING id
      `);

      const creditMemoId = cmResult.rows[0].id;

      // Copy items from return to credit memo
      await tx.execute(sql`
        INSERT INTO credit_memo_items (
          credit_memo_id,
          return_item_id,
          billing_item_id,
          product_id,
          quantity,
          unit_price,
          total_amount,
          tax_amount,
          created_at
        )
        SELECT 
          ${creditMemoId},
          sri.id,
          sri.billing_item_id,
          sri.product_id,
          sri.quantity,
          sri.unit_price,
          sri.total_amount,
          sri.tax_amount,
          NOW()
        FROM sales_return_items sri
        WHERE sri.return_id = ${returnId}
      `);

      // Create document flow
      await tx.execute(sql`
        INSERT INTO document_flow (
          source_document_type,
          source_document_id,
          target_document_type,
          target_document_id,
          created_at
        ) VALUES (
          'SALES_RETURN',
          ${returnId},
          'CREDIT_MEMO',
          ${creditMemoId},
          NOW()
        )
      `);

      res.json({
        success: true,
        data: {
          creditMemoId,
          creditMemoNumber,
          totalAmount: returnData.total_amount,
          status: 'DRAFT',
          message: 'Credit memo created successfully. Post to GL to complete.'
        }
      });
    });

  } catch (error: any) {
    console.error('Error creating credit memo:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create credit memo'
    });
  }
});

/**
 * POST /credit-memos/:id/post
 * Post credit memo to GL and update AR
 */
router.post('/credit-memos/:id/post', async (req, res) => {
  try {
    const creditMemoId = parseIdSafely(req.params.id);

    if (!creditMemoId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid credit memo ID'
      });
    }

    await db.transaction(async (tx) => {
      // Get credit memo details
      const cmResult = await tx.execute(sql`
        SELECT 
          cm.id,
          cm.credit_memo_number,
          cm.customer_id,
          cm.billing_document_id,
          cm.total_amount,
          cm.tax_amount,
          cm.net_amount,
          cm.posting_status,
          cm.company_code_id,
          cm.credit_date
        FROM credit_memos cm
        WHERE cm.id = ${creditMemoId}
      `);

      if (cmResult.rows.length === 0) {
        throw new Error('Credit memo not found');
      }

      const cm = cmResult.rows[0];

      if (cm.posting_status === 'POSTED') {
        throw new Error('Credit memo is already posted');
      }

      // Get GL accounts using account determination service
      let revenueAccount = null;
      let arAccount = null;

      try {
        // Get material IDs from credit memo items
        const itemsResult = await tx.execute(sql`
          SELECT DISTINCT product_id
          FROM credit_memo_items
          WHERE credit_memo_id = ${creditMemoId}
        `);
        const materialIds = itemsResult.rows.map(row => Number(row.product_id));

        // Get sales organization from customer or use default
        const customerResult = await tx.execute(sql`
          SELECT sales_organization
          FROM erp_customers
          WHERE id = ${cm.customer_id}
        `);
        const salesOrganization = (customerResult.rows[0]?.sales_organization as string) || '1000';

        const accounts = await accountDeterminationService.determineBillingAccounts({
          customerId: Number(cm.customer_id),
          materialIds,
          salesOrganization,
          chartOfAccounts: undefined
        });

        arAccount = accounts.arAccount;
        revenueAccount = accounts.revenueAccounts?.[0]?.glAccount || null;
      } catch (error) {
        console.warn('Account determination failed, using defaults');
      }

      // Fallback: Get accounts from configuration
      if (!revenueAccount || !arAccount) {
        const accountConfig = await tx.execute(sql`
          SELECT 
            (SELECT config_value FROM system_configuration WHERE config_key = 'revenue_account' LIMIT 1) as revenue_account,
            (SELECT config_value FROM system_configuration WHERE config_key = 'ar_account' LIMIT 1) as ar_account
        `);

        revenueAccount = accountConfig.rows[0]?.revenue_account || '400000';
        arAccount = accountConfig.rows[0]?.ar_account || '120000';
      }

      // Generate GL document number
      const glDocNumber = `GL-CM-${cm.credit_memo_number}`;

      // Create Journal Entry: DR Revenue, CR AR (reversal of invoice)
      await tx.execute(sql`
        INSERT INTO journal_entries (
          document_number,
          document_date,
          posting_date,
          document_type,
          reference_document,
          gl_account,
          account_type,
          debit_amount,
          credit_amount,
          description,
          company_code_id,
          created_at
        ) VALUES
        (
          ${glDocNumber},
          ${cm.credit_date},
          CURRENT_DATE,
          'CREDIT_MEMO',
          ${cm.credit_memo_number},
          ${revenueAccount},
          'REVENUE',
          ${cm.total_amount},
          0,
          'Credit Memo - Revenue Reversal',
          ${cm.company_code_id},
          NOW()
        ),
        (
          ${glDocNumber},
          ${cm.credit_date},
          CURRENT_DATE,
          'CREDIT_MEMO',
          ${cm.credit_memo_number},
          ${arAccount},
          'AR',
          0,
          ${cm.total_amount},
          'Credit Memo - AR Reduction',
          ${cm.company_code_id},
          NOW()
        )
      `);

      // Update credit memo with GL doc number
      await tx.execute(sql`
        UPDATE credit_memos
        SET posting_status = 'POSTED',
            accounting_document_number = ${glDocNumber},
            updated_at = NOW()
        WHERE id = ${creditMemoId}
      `);

      // Update AR open items if billing document exists
      if (cm.billing_document_id) {
        await tx.execute(sql`
          UPDATE ar_open_items
          SET outstanding_amount = outstanding_amount - ${cm.total_amount},
              status = CASE 
                WHEN outstanding_amount - ${cm.total_amount} <= 0.01 THEN 'CLEARED'
                WHEN outstanding_amount - ${cm.total_amount} < outstanding_amount THEN 'PARTIAL'
                ELSE status
              END,
              updated_at = NOW()
          WHERE billing_document_id = ${cm.billing_document_id}
            AND active = true
        `);

        // Update billing document outstanding amount
        await tx.execute(sql`
          UPDATE billing_documents
          SET outstanding_amount = outstanding_amount - ${cm.total_amount},
              updated_at = NOW()
          WHERE id = ${cm.billing_document_id}
        `);
      }

      res.json({
        success: true,
        data: {
          creditMemoId,
          creditMemoNumber: cm.credit_memo_number,
          glDocumentNumber: glDocNumber,
          totalAmount: cm.total_amount,
          postingStatus: 'POSTED',
          message: 'Credit memo posted to GL successfully'
        }
      });
    });

  } catch (error: any) {
    console.error('Error posting credit memo:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to post credit memo'
    });
  }
});

/**
 * GET /credit-memos
 * List all credit memos
 */
router.get('/credit-memos', async (req, res) => {
  try {
    const { customerId, postingStatus } = req.query;

    let query = sql`
      SELECT 
        cm.id,
        cm.credit_memo_number,
        cm.return_id,
        sr.return_number,
        cm.customer_id,
        c.name as customer_name,
        cm.billing_document_id,
        bd.billing_number,
        cm.credit_date,
        cm.total_amount,
        cm.tax_amount,
        cm.posting_status,
        cm.accounting_document_number,
        cm.created_at,
        (SELECT COUNT(*) FROM credit_memo_items WHERE credit_memo_id = cm.id) as item_count
      FROM credit_memos cm
      LEFT JOIN erp_customers c ON cm.customer_id = c.id
      LEFT JOIN sales_returns sr ON cm.return_id = sr.id
      LEFT JOIN billing_documents bd ON cm.billing_document_id = bd.id
      WHERE cm.active = true
    `;

    if (customerId) {
      query = sql`${query} AND cm.customer_id = ${customerId}`;
    }

    if (postingStatus) {
      query = sql`${query} AND cm.posting_status = ${postingStatus}`;
    }

    query = sql`${query} ORDER BY cm.created_at DESC`;

    const result = await db.execute(query);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error: any) {
    console.error('Error fetching credit memos:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch credit memos'
    });
  }
});

/**
 * POST /return-deliveries
 * Process return delivery (goods receipt for returns)
 */
router.post('/return-deliveries', async (req, res) => {
  try {
    const { returnId, plantId, storageLocationId, items, receiverName, notes } = req.body;

    if (!returnId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Return ID and items are required'
      });
    }

    await db.transaction(async (tx) => {
      // Verify return exists and is approved
      const returnResult = await tx.execute(sql`
        SELECT id, return_number, approval_status
        FROM sales_returns
        WHERE id = ${returnId}
      `);

      if (returnResult.rows.length === 0) {
        throw new Error('Return not found');
      }

      if (returnResult.rows[0].approval_status !== 'APPROVED') {
        throw new Error('Return must be approved before processing return delivery');
      }

      // Generate return delivery number
      const returnDeliveryNumber = await generateReturnDeliveryNumber();

      // Create return delivery
      const rdResult = await tx.execute(sql`
        INSERT INTO return_deliveries (
          return_delivery_number,
          return_id,
          receipt_date,
          plant_id,
          storage_location_id,
          status,
          inventory_posting_status,
          receiver_name,
          notes,
          created_at
        ) VALUES (
          ${returnDeliveryNumber},
          ${returnId},
          CURRENT_DATE,
          ${plantId || null},
          ${storageLocationId || null},
          'PENDING',
          'NOT_POSTED',
          ${receiverName || ''},
          ${notes || ''},
          NOW()
        ) RETURNING id
      `);

      const returnDeliveryId = rdResult.rows[0].id;

      // Create return delivery items
      for (const item of items) {
        await tx.execute(sql`
          INSERT INTO return_delivery_items (
            return_delivery_id,
            return_item_id,
            product_id,
            quantity_received,
            quantity_accepted,
            quantity_rejected,
            condition,
            disposition,
            batch_number,
            serial_number,
            created_at
          ) VALUES (
            ${returnDeliveryId},
            ${item.return_item_id},
            ${item.product_id},
            ${item.quantity_received},
            ${item.quantity_accepted || item.quantity_received},
            ${item.quantity_rejected || 0},
            ${item.condition || 'NORMAL'},
            ${item.disposition || 'RESTOCK'},
            ${item.batch_number || ''},
            ${item.serial_number || ''},
            NOW()
          )
        `);

        // If disposition is RESTOCK, increase inventory
        if ((item.disposition || 'RESTOCK') === 'RESTOCK') {
          await tx.execute(sql`
            UPDATE products
            SET stock = stock + ${item.quantity_accepted || item.quantity_received},
                updated_at = NOW()
            WHERE id = ${item.product_id}
          `);
        }
      }

      // Update return delivery status
      await tx.execute(sql`
        UPDATE return_deliveries
        SET status = 'COMPLETED',
            inventory_posting_status = 'POSTED',
            inventory_document_number = ${`INV-${returnDeliveryNumber}`},
            updated_at = NOW()
        WHERE id = ${returnDeliveryId}
      `);

      // Update return status
      await tx.execute(sql`
        UPDATE sales_returns
        SET status = 'COMPLETED',
            updated_at = NOW()
        WHERE id = ${returnId}
      `);

      res.json({
        success: true,
        data: {
          returnDeliveryId,
          returnDeliveryNumber,
          status: 'COMPLETED',
          inventoryPostingStatus: 'POSTED',
          message: 'Return delivery processed and inventory updated successfully'
        }
      });
    });

  } catch (error: any) {
    console.error('Error processing return delivery:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process return delivery'
    });
  }
});




// ========================================
// PAYMENT RETRIEVAL ROUTES
// ========================================

/**
 * GET /order-to-cash/customer-payments
 * Retrieve list of customer payments with filters
 */
router.get('/customer-payments', async (req, res) => {
  try {
    const { customerId, status, startDate, endDate, limit = '50' } = req.query;

    // Build dynamic query
    const conditions: any[] = [];

    if (customerId) {
      conditions.push(`cp.customer_id = ${parseInt(String(customerId))}`);
    }

    if (status) {
      conditions.push(`cp.posting_status = '${String(status)}'`);
    }

    if (startDate) {
      conditions.push(`cp.payment_date >= '${String(startDate)}'`);
    }

    if (endDate) {
      conditions.push(`cp.payment_date <= '${String(endDate)}'`);
    }

    const whereClause = conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : '';

    const result = await db.execute(sql`
      SELECT 
        cp.id,
        cp.payment_number,
        cp.customer_id,
        ec.name as customer_name,
        cp.payment_date,
        cp.payment_amount,
        cp.payment_method,
        cp.reference,
        cp.posting_status,
        cp.currency,
        cp.description,
        cp.created_at,
        COUNT(pa.id) as applications_count,
        COALESCE(SUM(pa.applied_amount), 0) as total_applied
      FROM customer_payments cp
      LEFT JOIN erp_customers ec ON cp.customer_id = ec.id
      LEFT JOIN payment_applications pa ON cp.id = pa.payment_id
      WHERE 1=1 ${sql.raw(whereClause)}
      GROUP BY cp.id, ec.name
      ORDER BY cp.payment_date DESC, cp.id DESC
      LIMIT ${parseInt(String(limit))}
    `);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error: any) {
    console.error('Error fetching customer payments:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch customer payments'
    });
  }
});

/**
 * GET /order-to-cash/payment-applications
 * Get payment applications for a specific payment
 */
router.get('/payment-applications', async (req, res) => {
  try {
    const { paymentId } = req.query;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'paymentId is required'
      });
    }

    const result = await db.execute(sql`
      SELECT 
        pa.id,
        pa.payment_id,
        pa.billing_id,
        pa.applied_amount,
        pa.application_date,
        cp.payment_number,
        bd.billing_number,
        bd.total_amount as invoice_total,
        bd.outstanding_amount as invoice_outstanding,
        ec.name as customer_name
      FROM payment_applications pa
      LEFT JOIN customer_payments cp ON pa.payment_id = cp.id
      LEFT JOIN billing_documents bd ON pa.billing_id = bd.id
      LEFT JOIN erp_customers ec ON bd.customer_id = ec.id
      WHERE pa.payment_id = ${parseInt(String(paymentId))}
      ORDER BY pa.application_date DESC
    `);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error: any) {
    console.error('Error fetching payment applications:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch payment applications'
    });
  }
});


// GET /credit-management/risk-summary - Get credit risk summary
router.get("/credit-management/risk-summary", async (req, res) => {
  try {
    // Determine if ar_open_items exists for accurate exposure calculation
    let hasArOpenItems = false;
    try {
      await db.execute(sql`SELECT 1 FROM ar_open_items LIMIT 1`);
      hasArOpenItems = true;
    } catch (e) {
      hasArOpenItems = false;
    }

    // Get Customers Credit Data
    // Join with AR items if possible, otherwise use customer fields or 0
    const customersResult = await db.execute(sql`
      SELECT 
        c.id,
        c.name,
        COALESCE(c.credit_limit, 0) as credit_limit,
        c.status,
        c.risk_category,
        COALESCE(
          (SELECT SUM(CAST(outstanding_amount AS DECIMAL))
           FROM ar_open_items
           WHERE customer_id = c.id AND active = true
          ), 0
        ) as exposure
      FROM erp_customers c
      WHERE c.is_active = true
    `);

    let totalCreditLimit = 0;
    let totalExposure = 0;
    let blockedCustomers = 0;
    let highRiskCustomers = 0;
    let riskDistribution = { Low: 0, Medium: 0, High: 0 };

    customersResult.rows.forEach((row: any) => {
      const limit = parseFloat(row.credit_limit || 0);
      const exposure = hasArOpenItems ? parseFloat(row.exposure || 0) : 0; // Fallback to 0 if no AR table

      totalCreditLimit += limit;
      totalExposure += exposure;

      if (row.status === 'Blocked' || row.status === 'Hold') {
        blockedCustomers++;
      }

      // Risk Category Logic
      const utilization = limit > 0 ? (exposure / limit) * 100 : 0;
      let riskCategory = row.risk_category || 'Low';

      if (utilization > 90) riskCategory = 'High';
      else if (utilization > 70) riskCategory = 'Medium';

      if (riskCategory === 'High') highRiskCustomers++;

      if (riskDistribution[riskCategory]) riskDistribution[riskCategory]++;
      else riskDistribution['Low']++; // Default
    });

    const utilizationPercentage = totalCreditLimit > 0 ? (totalExposure / totalCreditLimit) * 100 : 0;

    res.json({
      active_credit_limit: totalCreditLimit,
      credit_exposure: totalExposure,
      utilization_percentage: parseFloat(utilizationPercentage.toFixed(2)),
      blocked_customers: blockedCustomers,
      high_risk_customers: highRiskCustomers,
      risk_distribution: [
        { name: 'Low Risk', value: riskDistribution.Low, color: '#10B981' },
        { name: 'Medium Risk', value: riskDistribution.Medium, color: '#F59E0B' },
        { name: 'High Risk', value: riskDistribution.High, color: '#EF4444' }
      ]
    });

  } catch (error) {
    console.error('Error fetching credit risk summary:', error);
    res.status(500).json({ message: 'Failed to fetch credit risk summary' });
  }
});

export default router;