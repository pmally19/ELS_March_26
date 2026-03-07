/**
 * Production-Ready Master Data Routes
 * Matches exact database schema to ensure all creation operations work
 */

import { Express, Request, Response } from "express";
import { pool } from "../../db";

export function registerProductionMasterDataRoutes(app: Express) {
  // Utility: check if columns exist on a table
  const checkColumnsExist = async (tableName: string, columns: string[]) => {
    const { rows } = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
      [tableName]
    );
    const existing = new Set(rows.map((r: any) => r.column_name));
    const result: Record<string, boolean> = {};
    for (const col of columns) result[col] = existing.has(col);
    return result;
  };

  // Utility: get or create a UOM in the canonical `uom` table (FK target for materials.uom_id)
  const getOrCreateUomId = async (client: any, code: string, category: string): Promise<number> => {
    const cleanCode = (code || "").trim() || "PC";
    const cleanCategory = category || "Quantity";

    const result = await client.query(
      `INSERT INTO uom (code, name, description, category, is_base, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, false, true, NOW(), NOW())
       ON CONFLICT (code) DO UPDATE
       SET name = EXCLUDED.name,
           description = EXCLUDED.description,
           category = EXCLUDED.category
       RETURNING id`,
      [cleanCode, cleanCode, `${cleanCode} (auto-created)`, cleanCategory]
    );

    return result.rows[0].id;
  };

  // Materials - using exact database columns with uom_id and weight_uom_id
  /* 
  // CONFLICT: This route conflicts with `server/routes/master-data/material.ts` which provides better validation
  // and schema compliance. Disabling this to allow the modular router to take precedence.
  app.post("/api/master-data/material", async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      console.log('🚀 CREATE Material Route (Production-Ready) - Fixes Active (Fields + Auto-Inc)');
      console.log('Production-ready route received:', req.body);
      
      // ... (rest of the conflicting handler)
      
      return res.status(201).json(transformedMaterial);
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error("Error creating material:", error);
      return res.status(500).json({ message: "Failed to create material", error: error.message });
    } finally {
      client.release();
    }
  });
  */
  /* CONFLICT: This route conflicts with customer.ts modular router
   * The customer.ts router provides better structure and validation
   * Disabling this to allow the modular router to take precedence.
   */
  // Customers - GET endpoint (plural) for dropdowns and lists
  /* app.get("/api/master-data/customers", async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT 
          id,
          customer_code as code,
          name,
          type,
          currency,
          company_code_id,
          is_active,
          status
        FROM erp_customers
        ORDER BY name ASC
        LIMIT 1000
      `);

      const customers = result.rows.map((row: any) => ({
        id: row.id,
        code: row.code || row.customer_code || `CUST-${row.id}`,
        name: row.name || 'Unnamed Customer',
        type: row.type,
        currency: row.currency,
        company_code_id: row.company_code_id,
        is_active: row.is_active,
        status: row.status
      }));

      console.log(`[Customers API - Plural] Returning ${customers.length} customers`);
      return res.status(200).json(customers);
    } catch (error: any) {
      console.error("[Customers API - Plural] Error:", error.message);
      return res.status(500).json({
        error: "Failed to fetch customers",
        message: error.message
      });
    }
  }); */

  /* CONFLICT: This route conflicts with customer.ts modular router (GET /)
   * Disabling to allow customer.ts to handle all customer queries
   */
  // Customers - GET endpoint aligned with UI shape from erp_customers
  /* app.get("/api/master-data/customer", async (req: Request, res: Response) => {
    try {
      // Check if we should include inactive customers (default: only active)
      const includeInactive = req.query.includeInactive === 'true' || req.query.showInactive === 'true';

      let whereClause = '';
      if (!includeInactive) {
        // Only show active customers (is_active = true, excluding NULL and false)
        whereClause = 'WHERE ec.is_active = true';
      }
      // If includeInactive is true, show all customers (no WHERE clause)

      console.log(`[GET /api/master-data/customer] includeInactive: ${includeInactive}, whereClause: ${whereClause || 'none (showing all)'}`);

      const result = await pool.query(`
        SELECT 
          ec.*,
          ct.id as customer_type_id,
          ct.code as customer_type_code,
          ct.name as customer_type_name
        FROM erp_customers ec
        LEFT JOIN customer_types ct ON ec.customer_type_id = ct.id
        ${whereClause}
        ORDER BY ec.name ASC
      `);

      const activeCount = result.rows.filter((r: any) => r.is_active === true).length;
      const inactiveCount = result.rows.filter((r: any) => r.is_active === false || r.is_active === null).length;
      console.log(`[GET /api/master-data/customer] Found ${result.rows.length} total customers (${activeCount} active, ${inactiveCount} inactive)`);

      // Fetch customer addresses for each customer
      const customerAddresses = await pool.query(`
        SELECT 
          ca.id,
          ca.customer_id,
          ca.address_number,
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
          ca.region,
          ca.phone,
          ca.email,
          ca.is_primary,
          ca.is_active,
          ca.notes
        FROM customer_addresses ca
        WHERE ca.is_active = true
        ORDER BY ca.customer_id, ca.address_type, ca.is_primary DESC
      `);

      // Fetch customer address relationships
      const customerRelationships = await pool.query(`
        SELECT 
          car.customer_id,
          car.relationship_name,
          car.sold_to_address_id,
          car.bill_to_address_id,
          car.ship_to_address_id,
          car.payer_to_address_id,
          car.is_default,
          car.is_active
        FROM customer_address_relationships car
        WHERE car.is_active = true
        ORDER BY car.customer_id, car.is_default DESC
      `);

      // Group addresses by customer_id and address_type
      const addressesByCustomer = customerAddresses.rows.reduce((acc, addr) => {
        try {
          if (!acc[addr.customer_id]) {
            acc[addr.customer_id] = {
              sold_to_addresses: [],
              bill_to_addresses: [],
              ship_to_addresses: [],
              payer_to_addresses: []
            };
          }

          const addressData = {
            id: addr.id,
            address_number: addr.address_number || null, // Auto-generated unique address number (null if not yet generated)
            address_name: addr.address_name,
            contact_person: addr.contact_person,
            company_name: addr.company_name,
            address_line_1: addr.address_line_1,
            address_line_2: addr.address_line_2,
            city: addr.city,
            state: addr.state,
            country: addr.country,
            postal_code: addr.postal_code,
            region: addr.region,
            phone: addr.phone,
            email: addr.email,
            is_primary: addr.is_primary,
            notes: addr.notes
          };

          switch (addr.address_type) {
            case 'sold_to':
              acc[addr.customer_id].sold_to_addresses.push(addressData);
              break;
            case 'bill_to':
              acc[addr.customer_id].bill_to_addresses.push(addressData);
              break;
            case 'ship_to':
              acc[addr.customer_id].ship_to_addresses.push(addressData);
              break;
            case 'payer_to':
              acc[addr.customer_id].payer_to_addresses.push(addressData);
              break;
            default:
              console.log('Unknown address type:', addr.address_type);
          }
        } catch (error) {
          console.error('Error processing address:', error, addr);
        }

        return acc;
      }, {});

      // Group relationships by customer_id
      const relationshipsByCustomer = customerRelationships.rows.reduce((acc, rel) => {
        acc[rel.customer_id] = {
          relationship_name: rel.relationship_name,
          sold_to_address_id: rel.sold_to_address_id,
          bill_to_address_id: rel.bill_to_address_id,
          ship_to_address_id: rel.ship_to_address_id,
          payer_to_address_id: rel.payer_to_address_id,
          is_default: rel.is_default
        };
        return acc;
      }, {});

      // Transform to frontend expected fields - COMPLETE INTEGRATION
      const transformedData = result.rows.map(row => {
        const customerAddressData = addressesByCustomer[row.id] || {
          sold_to_addresses: [],
          bill_to_addresses: [],
          ship_to_addresses: [],
          payer_to_addresses: []
        };

        const customerRelationship = relationshipsByCustomer[row.id] || {
          relationship_name: "Standard Setup",
          is_default: true
        };

        return {
          // Basic customer information
          id: row.id,
          code: row.customer_code,
          name: row.name,
          type: row.type,
          customer_type_id: row.customer_type_id || null,
          customer_type_name: row.customer_type_name || null,
          description: row.description,
          industry: row.industry,
          segment: row.segment,
          address: row.address,
          city: row.city,
          state: row.state,
          country: row.country,
          postalCode: row.postal_code,
          region: row.region,
          email: row.email,
          phone: row.phone,
          alt_phone: row.alt_phone,
          website: row.website,
          taxId: row.tax_id,
          status: row.status,
          notes: row.notes,
          isActive: row.is_active,

          // Sales and relationship information
          salesRepresentative: row.sales_rep_id ? `Sales Rep ${row.sales_rep_id}` : null,
          sales_rep_id: row.sales_rep_id,
          parent_customer_id: row.parent_customer_id,

          // Business type flags
          is_b2b: row.is_b2b,
          is_b2c: row.is_b2c,
          is_vip: row.is_vip,
          tags: row.tags,

          // Payment and credit information
          paymentTerms: row.payment_terms,
          payment_method: row.payment_method,
          creditLimit: row.credit_limit,
          credit_limit: row.credit_limit, // Alternative field name for compatibility
          current_exposure: row.credit_exposure, // Map credit_exposure to current_exposure
          credit_rating: row.credit_rating,
          credit_limit_group: row.credit_limit_group,
          credit_limit_group_id: row.credit_limit_group_id,
          account_group_id: row.account_group_id,
          currency: row.currency,

          // Pricing and terms
          discount_group: row.discount_group,
          price_group: row.price_group,
          incoterms: row.incoterms,
          shipping_method: row.shipping_method,
          delivery_terms: row.delivery_terms,
          delivery_route: row.delivery_route,

          // Company and versioning
          companyCodeId: row.company_code_id,
          version: row.version,
          created_by: row.created_by,
          updated_by: row.updated_by,
          created_at: row.created_at,
          updated_at: row.updated_at,

          // === CRITICAL FINANCIAL FIELDS ===
          // Reconciliation Account
          reconciliation_account_code: row.reconciliation_account_code,

          // Dunning and Payment Controls
          dunning_procedure: row.dunning_procedure,
          dunning_block: row.dunning_block,
          payment_block: row.payment_block,

          // Credit Management
          credit_control_area: row.credit_control_area,
          risk_category: row.risk_category,
          credit_limit_currency: row.credit_limit_currency,
          credit_exposure: row.credit_exposure,
          credit_check_procedure: row.credit_check_procedure,

          // Tax and Compliance
          tax_classification_code: row.tax_classification_code,
          tax_exemption_certificate: row.tax_exemption_certificate,
          withholding_tax_code: row.withholding_tax_code,
          tax_jurisdiction: row.tax_jurisdiction,

          // Banking Information
          bank_account_number: row.bank_account_number,
          bank_routing_number: row.bank_routing_number,
          bank_name: row.bank_name,
          electronic_payment_method: row.electronic_payment_method,

          // Financial Posting Controls
          deletion_flag: row.deletion_flag,
          authorization_group: row.authorization_group,

          // Tax Profile and Rule IDs
          tax_profile_id: row.tax_profile_id,
          tax_rule_id: row.tax_rule_id,

          // Language and Sales Area Fields
          language_code: row.language_code,
          sales_org_code: row.sales_org_code,
          distribution_channel_code: row.distribution_channel_code,
          division_code: row.division_code,
          shipping_condition_key: row.shipping_condition_key,
          delivery_priority: row.delivery_priority,
          sales_district: row.sales_district,
          sales_office_code: row.sales_office_code,
          sales_group_code: row.sales_group_code,
          price_list: row.price_list,

          // === ADDRESS MANAGEMENT INTEGRATION ===
          // Multiple address arrays for each type
          sold_to_addresses: customerAddressData.sold_to_addresses,
          bill_to_addresses: customerAddressData.bill_to_addresses,
          ship_to_addresses: customerAddressData.ship_to_addresses,
          payer_to_addresses: customerAddressData.payer_to_addresses,

          // Address configuration
          default_address_setup: customerRelationship.relationship_name,
          address_notes: customerRelationship.relationship_name
        };
      });

      console.log(`✅ Customers fetched from erp_customers: ${transformedData.length} records with address integration`);
      return res.status(200).json(transformedData);
    } catch (error) {
      console.error("Error fetching customers:", error);
      return res.status(500).json({ message: "Failed to fetch customers" });
    }
  }); */

  /* CONFLICT: This route conflicts with customer.ts modular router (POST /)
   * Disabling to allow customer.ts to handle customer creation
   */
  // Customers - Create aligned with erp_customers and UI shape
  /* app.post("/api/master-data/customer", async (req: Request, res: Response) => {
    try {
      const {
        code, name, type, customer_type_id, description, industry, segment, address, city, state, country,
        postalCode, postal_code, region, email, phone, alt_phone, website, taxId, tax_id, status, notes, isActive,
        paymentTerms, payment_terms, payment_method, creditLimit, credit_limit, creditLimitGroupId, credit_rating, currency, companyCodeId, company_code_id,
        discount_group, price_group, incoterms, shipping_method, delivery_terms, delivery_route,
        tax_profile_id, tax_rule_id,
        reconciliation_account_code,
        language_code,
        sales_org_code, distribution_channel_code, division_code,
        shipping_condition_key, delivery_priority, sales_district,
        sales_office_code, sales_group_code, price_list,
        // Financial fields
        dunning_procedure, dunning_block, payment_block,
        credit_control_area, risk_category, credit_limit_currency, credit_exposure, credit_check_procedure,
        tax_classification_code, tax_exemption_certificate, withholding_tax_code, tax_jurisdiction,
        bank_account_number, bank_routing_number, bank_name, electronic_payment_method,
        deletion_flag, authorization_group,
        // Account Group - REQUIRED
        account_group_id, accountGroupId
      } = req.body;

      // Validate required fields
      if (!name) {
        return res.status(400).json({
          message: "Customer name is required",
          error: "VALIDATION_ERROR"
        });
      }

      if (!companyCodeId && !company_code_id) {
        return res.status(400).json({
          message: "Company Code is required",
          error: "VALIDATION_ERROR"
        });
      }

      if (!reconciliation_account_code) {
        return res.status(400).json({
          message: "Reconciliation Account Code is required",
          error: "VALIDATION_ERROR"
        });
      }

      // Validate Account Group - REQUIRED
      const finalAccountGroupId = account_group_id || accountGroupId;
      if (!finalAccountGroupId) {
        return res.status(400).json({
          message: "Account Group is required",
          error: "VALIDATION_ERROR",
          field: "account_group_id"
        });
      }

      // Validate that account_group_id exists and is of type CUSTOMER
      const accountGroupCheck = await pool.query(
        'SELECT id, code, name, account_type, is_active FROM account_groups WHERE id = $1',
        [finalAccountGroupId]
      );

      if (accountGroupCheck.rows.length === 0) {
        return res.status(400).json({
          message: `Account Group with ID ${finalAccountGroupId} does not exist`,
          error: "VALIDATION_ERROR",
          field: "account_group_id"
        });
      }

      const accountGroup = accountGroupCheck.rows[0];
      if (accountGroup.account_type !== 'CUSTOMER') {
        return res.status(400).json({
          message: `Account Group "${accountGroup.code}" is not of type CUSTOMER. Found: ${accountGroup.account_type}`,
          error: "VALIDATION_ERROR",
          field: "account_group_id"
        });
      }

      if (!accountGroup.is_active) {
        return res.status(400).json({
          message: `Account Group "${accountGroup.code}" is not active`,
          error: "VALIDATION_ERROR",
          field: "account_group_id"
        });
      }

      // Auto-generate customer code based on account group number range
      let customerCode = code?.trim(); // Use provided code if exists and not empty

      // If code is empty, null, or undefined, generate it
      if (!customerCode || customerCode === '') {
        // Fetch account group details to get number range for code generation
        const accountGroupWithRange = await pool.query(`
          SELECT 
            ag.id,
            ag.code as account_group_code,
            ag.number_range_from,
            ag.number_range_to,
            ag.number_range_id,
            nr.current_number,
            nr.range_from,
            nr.range_to
          FROM account_groups ag
          LEFT JOIN number_ranges nr ON ag.number_range_id = nr.id
          WHERE ag.id = $1 AND ag.account_type = 'CUSTOMER' AND ag.is_active = true
        `, [finalAccountGroupId]);

        if (accountGroupWithRange.rows.length > 0) {
          const accountGroupData = accountGroupWithRange.rows[0];
          const numberRangeFrom = accountGroupData.number_range_from || accountGroupData.range_from;
          const numberRangeTo = accountGroupData.number_range_to || accountGroupData.range_to;
          const currentNumber = accountGroupData.current_number || 0;

          if (numberRangeFrom && numberRangeTo) {
            // Check existing customers to find the highest number in range
            const existingCustomersResult = await pool.query(`
              SELECT customer_code 
              FROM erp_customers 
              WHERE customer_code ~ '^[0-9]+$' 
                AND CAST(customer_code AS INTEGER) >= $1 
                AND CAST(customer_code AS INTEGER) <= $2
              ORDER BY CAST(customer_code AS INTEGER) DESC
              LIMIT 1
            `, [parseInt(numberRangeFrom), parseInt(numberRangeTo)]);

            let nextNumber: number;
            if (existingCustomersResult.rows.length > 0) {
              // Use the highest existing code + 1
              const highestCode = parseInt(existingCustomersResult.rows[0].customer_code);
              nextNumber = Math.max(highestCode + 1, parseInt(numberRangeFrom));
            } else {
              // Start from range_from
              nextNumber = Math.max(parseInt(currentNumber) || 0, parseInt(numberRangeFrom) || 0) + 1;
            }

            // Ensure it's within range
            if (nextNumber > parseInt(numberRangeTo)) {
              return res.status(400).json({
                message: "Number Range Exceeded",
                error: `Customer code range ${numberRangeFrom}-${numberRangeTo} is full`
              });
            }

            // Format customer code (pad with zeros based on range length)
            const rangeLength = numberRangeFrom.length;
            customerCode = String(nextNumber).padStart(rangeLength, '0');

            console.log(`[Customer Creation] Auto-generated customer code: ${customerCode} from range ${numberRangeFrom}-${numberRangeTo}`);
          } else {
            // Fallback: generate timestamp-based code
            customerCode = `CUST${Date.now().toString().slice(-8)}`;
            console.log(`[Customer Creation] Generated fallback customer code: ${customerCode}`);
          }
        } else {
          // Fallback: generate timestamp-based code
          customerCode = `CUST${Date.now().toString().slice(-8)}`;
          console.log(`[Customer Creation] Generated fallback customer code: ${customerCode}`);
        }
      }

      // Validate customer number against account group number range (only if range is configured and code was provided)
      const accountGroupWithRange = await pool.query(
        'SELECT number_range_from, number_range_to FROM account_groups WHERE id = $1',
        [finalAccountGroupId]
      );

      if (accountGroupWithRange.rows.length > 0) {
        const range = accountGroupWithRange.rows[0];
        console.log(`[Customer Creation] Account Group ${finalAccountGroupId} number range:`, {
          from: range.number_range_from,
          to: range.number_range_to,
          customerNumber: customerCode
        });

        // Only validate if both range boundaries are set (not null/empty)
        if (range.number_range_from && range.number_range_to && customerCode) {
          const customerNum = parseInt(customerCode);
          const rangeFrom = parseInt(range.number_range_from);
          const rangeTo = parseInt(range.number_range_to);

          // Only validate if customer number is numeric AND range boundaries are numeric
          // This allows alphanumeric customer numbers when range is not strictly numeric
          if (!isNaN(customerNum) && !isNaN(rangeFrom) && !isNaN(rangeTo)) {
            console.log(`[Customer Creation] Validating number range: ${customerNum} between ${rangeFrom} and ${rangeTo}`);
            if (customerNum < rangeFrom || customerNum > rangeTo) {
              const errorMessage = `Customer number "${customerCode}" must be between ${range.number_range_from} and ${range.number_range_to} for account group "${accountGroup.name || accountGroup.code}". Current value: ${customerCode}`;
              console.log(`[Customer Creation] Validation failed:`, errorMessage);
              return res.status(400).json({
                message: errorMessage,
                error: "VALIDATION_ERROR",
                field: "code",
                allowedRange: {
                  from: range.number_range_from,
                  to: range.number_range_to
                },
                accountGroupId: finalAccountGroupId,
                accountGroupName: accountGroup.name || accountGroup.code
              });
            }
            console.log(`[Customer Creation] Number range validation passed`);
          } else {
            console.log(`[Customer Creation] Skipping numeric validation - customer number or range is not numeric`);
          }
          // If customer number is not numeric but range is numeric, allow it (external numbering)
          // This handles cases where external numbering is used
        } else {
          console.log(`[Customer Creation] No number range configured for account group ${finalAccountGroupId}, skipping validation`);
        }
        // If no range is configured, allow any customer number
      }

      // Get customer type name and default values if customer_type_id is provided
      let customerTypeName = type || null;
      let defaultPaymentTerms = paymentTerms || null;
      let defaultCurrency = currency || null;

      if (customer_type_id) {
        const typeResult = await pool.query(
          'SELECT name, default_payment_terms, default_currency FROM customer_types WHERE id = $1',
          [customer_type_id]
        );
        if (typeResult.rows.length > 0) {
          const customerType = typeResult.rows[0];
          customerTypeName = customerType.name;

          // Auto-fill payment terms from customer type if not provided
          if (!defaultPaymentTerms && customerType.default_payment_terms) {
            defaultPaymentTerms = customerType.default_payment_terms;
          }

          // Auto-fill currency from customer type if not provided
          if (!defaultCurrency && customerType.default_currency) {
            defaultCurrency = customerType.default_currency;
          }
        }
      }

      // Get credit limit group code/name if creditLimitGroupId is provided (for backward compatibility)
      // Handle both ID (integer) and code (string) formats
      let creditLimitGroupName = null;
      let creditLimitGroupIdValue = null;
      if (creditLimitGroupId) {
        // Check if creditLimitGroupId is a number (ID) or string (code)
        const isNumeric = /^\d+$/.test(String(creditLimitGroupId));
        let groupResult;

        if (isNumeric) {
          // It's an ID, query by ID
          groupResult = await pool.query('SELECT id, code, name FROM credit_limit_groups WHERE id = $1', [parseInt(creditLimitGroupId)]);
        } else {
          // It's a code, query by code and get the ID
          groupResult = await pool.query('SELECT id, code, name FROM credit_limit_groups WHERE code = $1', [String(creditLimitGroupId)]);
        }

        if (groupResult.rows.length > 0) {
          creditLimitGroupName = groupResult.rows[0].code || groupResult.rows[0].name;
          creditLimitGroupIdValue = groupResult.rows[0].id; // Use the actual ID from database
        }
      }

      const result = await pool.query(`
        INSERT INTO erp_customers (
          customer_code, name, type, customer_type_id, description, industry, segment, address, city, state, 
          country, postal_code, region, email, phone, alt_phone, website, tax_id, status, notes, 
          is_active, payment_terms, payment_method, credit_limit, credit_limit_group, credit_limit_group_id, credit_rating, currency, company_code_id,
          discount_group, price_group, incoterms, shipping_method, delivery_terms, delivery_route,
          tax_profile_id, tax_rule_id,
          reconciliation_account_code,
          language_code,
          sales_org_code, distribution_channel_code, division_code,
          shipping_condition_key, delivery_priority, sales_district,
          sales_office_code, sales_group_code, price_list,
          dunning_procedure, dunning_block, payment_block,
          credit_control_area, risk_category, credit_limit_currency, credit_exposure, credit_check_procedure,
          tax_classification_code, tax_exemption_certificate, withholding_tax_code, tax_jurisdiction,
        bank_account_number, bank_routing_number, bank_name, electronic_payment_method,
        deletion_flag, authorization_group, account_group_id, version
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68)
        RETURNING *
      `, [
        customerCode, name, customerTypeName, customer_type_id || null, description || notes || null, industry, segment, address, city, state,
        country, postalCode || postal_code || null, region || null, email, phone, alt_phone || null, website, taxId || tax_id || null, status || 'active', notes,
        isActive !== undefined ? isActive : true, defaultPaymentTerms || paymentTerms || payment_terms || null, payment_method || null, creditLimit || credit_limit || null, creditLimitGroupName, creditLimitGroupIdValue || null, credit_rating || null, defaultCurrency || currency || null, companyCodeId || company_code_id || null,
        discount_group || null, price_group || null, incoterms || null, shipping_method || null, delivery_terms || null, delivery_route || null,
        tax_profile_id || null, tax_rule_id || null,
        reconciliation_account_code || null,
        language_code || null,
        sales_org_code || null, distribution_channel_code || null, division_code || null,
        shipping_condition_key || null, delivery_priority || null, sales_district || null,
        sales_office_code || null, sales_group_code || null, price_list || null,
        dunning_procedure || null, dunning_block || false, payment_block || false,
        credit_control_area || null, risk_category || null, credit_limit_currency || null, credit_exposure || null, credit_check_procedure || null,
        tax_classification_code || null, tax_exemption_certificate || null, withholding_tax_code || null, tax_jurisdiction || null,
        bank_account_number || null, bank_routing_number || null, bank_name || null, electronic_payment_method || null,
        deletion_flag || false, authorization_group || null,
        finalAccountGroupId, // account_group_id - REQUIRED
        1 // version - default to 1 for new customers
      ]);

      const c = result.rows[0];
      const transformed = {
        id: c.id,
        code: c.customer_code,
        name: c.name,
        type: c.type,
        customer_type_id: c.customer_type_id || null,
        description: c.description,
        industry: c.industry,
        segment: c.segment,
        address: c.address,
        city: c.city,
        state: c.state,
        country: c.country,
        postalCode: c.postal_code,
        region: c.region,
        email: c.email,
        phone: c.phone,
        alt_phone: c.alt_phone,
        website: c.website,
        taxId: c.tax_id,
        status: c.status,
        notes: c.notes,
        isActive: c.is_active,
        salesRepresentative: c.sales_rep_id ? `Sales Rep ${c.sales_rep_id}` : null,
        paymentTerms: c.payment_terms,
        payment_method: c.payment_method,
        creditLimit: c.credit_limit,
        credit_rating: c.credit_rating,
        credit_limit_group: c.credit_limit_group,
        credit_limit_group_id: c.credit_limit_group_id,
        currency: c.currency,
        discount_group: c.discount_group,
        price_group: c.price_group,
        incoterms: c.incoterms,
        shipping_method: c.shipping_method,
        delivery_terms: c.delivery_terms,
        delivery_route: c.delivery_route,
        companyCodeId: c.company_code_id,
        tax_profile_id: c.tax_profile_id,
        tax_rule_id: c.tax_rule_id,
        reconciliation_account_code: c.reconciliation_account_code,
        language_code: c.language_code,
        sales_org_code: c.sales_org_code,
        distribution_channel_code: c.distribution_channel_code,
        division_code: c.division_code,
        shipping_condition_key: c.shipping_condition_key,
        delivery_priority: c.delivery_priority,
        sales_district: c.sales_district,
        sales_office_code: c.sales_office_code,
        sales_group_code: c.sales_group_code,
        price_list: c.price_list,
        dunning_procedure: c.dunning_procedure,
        dunning_block: c.dunning_block,
        payment_block: c.payment_block,
        credit_control_area: c.credit_control_area,
        risk_category: c.risk_category,
        credit_limit_currency: c.credit_limit_currency,
        credit_exposure: c.credit_exposure,
        credit_check_procedure: c.credit_check_procedure,
        tax_classification_code: c.tax_classification_code,
        tax_exemption_certificate: c.tax_exemption_certificate,
        withholding_tax_code: c.withholding_tax_code,
        bank_account_number: c.bank_account_number,
        bank_routing_number: c.bank_routing_number,
        bank_name: c.bank_name,
        electronic_payment_method: c.electronic_payment_method,
        deletion_flag: c.deletion_flag,
        authorization_group: c.authorization_group,
        created_at: c.created_at,
        updated_at: c.updated_at
      };
      return res.status(201).json(transformed);
    } catch (error: any) {
      console.error("Error creating customer:", error);
      return res.status(500).json({ message: "Failed to create customer", error: error.message });
    }
  }); */

  /* CONFLICT: This PATCH endpoint conflicts with customer.ts and has a bug
   * Bug: Line 870-871 only updates if value !== null, which skips all fields
   * sent as `null` from frontend (e.g., email || null, phone || null)
   * Solution: Disabled to allow customer.ts PATCH endpoint to handle updates correctly
   * 
  // PATCH - Update customer in erp_customers aligned to UI
  app.patch("/api/master-data/customer/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        code, name, type, customer_type_id, description, industry, segment, address, city, state, country,
        postalCode, postal_code, email, phone, alt_phone, website, taxId, tax_id, status, notes, isActive, is_active,
        paymentTerms, payment_terms, creditLimit, credit_limit, creditLimitGroupId, currency, companyCodeId, company_code_id,
        tax_profile_id, tax_rule_id,
        reconciliation_account_code,
        language_code,
        sales_org_code, distribution_channel_code, division_code,
        shipping_condition_key, delivery_priority, sales_district,
        sales_office_code, sales_group_code, price_list,
        // Additional financial fields
        payment_method, credit_rating, discount_group, price_group, incoterms,
        shipping_method, delivery_terms, delivery_route,
        dunning_procedure, dunning_block, payment_block,
        credit_control_area, risk_category, credit_limit_currency, credit_exposure, credit_check_procedure,
        tax_classification_code, tax_exemption_certificate, withholding_tax_code, tax_jurisdiction,
        bank_account_number, bank_routing_number, bank_name, electronic_payment_method,
        deletion_flag, authorization_group, region,
        // Account Group - REQUIRED
        account_group_id, accountGroupId
      } = req.body;

      // ... [rest of endpoint code - commented out]
      
      return res.status(200).json(transformed);
    } catch (error: any) {
      console.error("Error updating customer:", error);
      return res.status(500).json({ message: "Failed to update customer", error: error.message });
    }
  });
  */

  // DELETE - Delete customer from erp_customers
  app.delete("/api/master-data/customer/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(`
        DELETE FROM erp_customers WHERE id = $1 RETURNING *
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Customer not found" });
      }

      return res.status(200).json({ message: "Customer deleted successfully" });
    } catch (error) {
      console.error("Error deleting customer:", error);
      return res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  // === RAW customer master endpoints (exact database columns) ===
  // These endpoints expose erp_customers as-is without field renaming

  // GET raw
  app.get("/api/master-data/customer-db", async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT * FROM erp_customers ORDER BY name ASC
      `);
      return res.status(200).json(result.rows);
    } catch (error: any) {
      console.error("Error fetching raw customers:", error);
      return res.status(500).json({ message: "Failed to fetch customers", error: error.message });
    }
  });

  // POST raw (expects database columns in body)
  app.post("/api/master-data/customer-db", async (req: Request, res: Response) => {
    try {
      const {
        customer_code, name, type, industry, segment, address, city, state, country,
        postal_code, email, phone, website, tax_id, status, notes, is_active,
        payment_terms, credit_limit, currency, company_code_id,
        language_code,
        sales_org_code, distribution_channel_code, division_code,
        shipping_condition_key, delivery_priority, sales_district,
        sales_office_code, sales_group_code, price_list
      } = req.body;

      const result = await pool.query(`
        INSERT INTO erp_customers (
        customer_code, name, type, industry, segment, address, city, state, country,
        postal_code, email, phone, website, tax_id, status, notes, is_active,
        payment_terms, credit_limit, currency, company_code_id,
        language_code,
        sales_org_code, distribution_channel_code, division_code,
        shipping_condition_key, delivery_priority, sales_district,
        sales_office_code, sales_group_code, price_list,
        created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
          $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31,
          NOW(), NOW()
        ) RETURNING *
      `, [
        customer_code, name, type, industry, segment, address, city, state, country,
        postal_code, email, phone, website, tax_id, status, notes,
        is_active, payment_terms, credit_limit, currency, company_code_id,
        language_code || null,
        sales_org_code || null, distribution_channel_code || null, division_code || null,
        shipping_condition_key || null, delivery_priority || null, sales_district || null,
        sales_office_code || null, sales_group_code || null, price_list || null
      ]);

      return res.status(201).json(result.rows[0]);
    } catch (error: any) {
      console.error("Error creating raw customer:", error);
      return res.status(500).json({ message: "Failed to create customer", error: error.message });
    }
  });

  // PATCH raw
  app.patch("/api/master-data/customer-db/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const update = req.body || {};

      // Build dynamic update using DB column names directly
      const fields = Object.keys(update).filter(k => !['id', 'created_at', 'updated_at'].includes(k));
      if (fields.length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }
      const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
      const values = [id, ...fields.map(f => update[f])];

      const result = await pool.query(`
        UPDATE erp_customers SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *
      `, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Customer not found" });
      }
      return res.status(200).json(result.rows[0]);
    } catch (error: any) {
      console.error("Error updating raw customer:", error);
      return res.status(500).json({ message: "Failed to update customer", error: error.message });
    }
  });

  // DELETE raw
  app.delete("/api/master-data/customer-db/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await pool.query(`DELETE FROM erp_customers WHERE id = $1 RETURNING *`, [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Customer not found" });
      }
      return res.status(200).json({ message: "Customer deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting raw customer:", error);
      return res.status(500).json({ message: "Failed to delete customer", error: error.message });
    }
  });

  // Vendors - GET endpoint for all vendors
  app.get("/api/master-data/vendor", async (req: Request, res: Response) => {
    try {
      // Query the database for actual vendor data (show all vendors, not just active ones)
      const result = await pool.query(`
        SELECT 
          id, code, name, type, tax_id, industry,
          address, city, state, country, postal_code, region,
          phone, alt_phone, email, website,
          currency, payment_terms, payment_method, lead_time,
          evaluation_score, status, company_code_id, purchasing_group_id,
          purchase_organization_id,
          blacklisted, blacklist_reason, notes,
          is_active, created_at, updated_at
        FROM vendors 
        ORDER BY name ASC
      `);

      // Map database columns (snake_case) to frontend expected fields (camelCase)
      const mappedVendors = result.rows.map(vendor => ({
        id: vendor.id,
        code: vendor.code || null,
        name: vendor.name,
        type: vendor.type,
        industry: vendor.industry || null,
        taxId: vendor.tax_id || null,
        address: vendor.address || null,
        city: vendor.city || null,
        state: vendor.state || null,
        country: vendor.country || null,
        postalCode: vendor.postal_code || null,
        region: vendor.region || null,
        phone: vendor.phone || null,
        altPhone: vendor.alt_phone || null,
        email: vendor.email || null,
        website: vendor.website || null,
        currency: vendor.currency || null,
        paymentTerms: vendor.payment_terms || null,
        paymentMethod: vendor.payment_method || null,
        leadTime: vendor.lead_time || null,
        evaluationScore: vendor.evaluation_score || null,
        status: vendor.status || 'active',
        companyCodeId: vendor.company_code_id || null,
        purchasingGroupId: vendor.purchasing_group_id || null,
        purchaseOrganizationId: vendor.purchase_organization_id || null,
        blacklisted: vendor.blacklisted || false,
        blacklistReason: vendor.blacklist_reason || null,
        notes: vendor.notes || null,
        isActive: vendor.is_active === true,
        createdAt: vendor.created_at,
        updatedAt: vendor.updated_at
      }));

      console.log(`✅ Vendors fetched from database: ${mappedVendors.length} records`);
      return res.status(200).json(mappedVendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      return res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  // Vendors - GET endpoint for individual vendor by ID
  app.get("/api/master-data/vendor/:id", async (req: Request, res: Response) => {
    try {
      const id = req.params.id;

      const result = await pool.query(`
        SELECT 
          id, code, name, type, tax_id, industry,
          address, city, state, country, postal_code, region,
          phone, alt_phone, email, website,
          currency, payment_terms, payment_method, lead_time,
          evaluation_score, status, company_code_id, purchasing_group_id, 
          blacklisted, blacklist_reason, notes,
          is_active, created_at, updated_at
        FROM vendors 
        WHERE id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      // Map database columns (snake_case) to frontend expected fields (camelCase)
      const vendor = result.rows[0];
      const mappedVendor = {
        id: vendor.id,
        code: vendor.code || null,
        name: vendor.name,
        type: vendor.type,
        industry: vendor.industry || null,
        taxId: vendor.tax_id || null,
        address: vendor.address || null,
        city: vendor.city || null,
        state: vendor.state || null,
        country: vendor.country || null,
        postalCode: vendor.postal_code || null,
        region: vendor.region || null,
        phone: vendor.phone || null,
        altPhone: vendor.alt_phone || null,
        email: vendor.email || null,
        website: vendor.website || null,
        currency: vendor.currency || null,
        paymentTerms: vendor.payment_terms || null,
        paymentMethod: vendor.payment_method || null,
        leadTime: vendor.lead_time || null,
        evaluationScore: vendor.evaluation_score || null,
        status: vendor.status || 'active',
        companyCodeId: vendor.company_code_id || null,
        purchasingGroupId: vendor.purchasing_group_id || null,
        blacklisted: vendor.blacklisted || false,
        blacklistReason: vendor.blacklist_reason || null,
        notes: vendor.notes || null,
        isActive: vendor.is_active === true,
        createdAt: vendor.created_at,
        updatedAt: vendor.updated_at
      };

      console.log(`✅ Vendor fetched by ID ${id}:`, mappedVendor.name);
      return res.status(200).json(mappedVendor);
    } catch (error) {
      console.error("Error fetching vendor by ID:", error);
      return res.status(500).json({ message: "Failed to fetch vendor" });
    }
  });

  // Vendors - DEPRECATED: This route is overridden by the main vendor route in index.ts
  // Keeping for backward compatibility but should not be used
  // The main route handles account group-based code generation

  // Helper function to convert camelCase to snake_case
  const camelToSnake = (str: string): string => {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  };

  // Mapping from camelCase (frontend) to snake_case (database)
  const fieldMapping: Record<string, string> = {
    code: 'code',
    name: 'name',
    legalName: 'legal_name',
    name2: 'name_2',
    name3: 'name_3',
    name4: 'name_4',
    sortField: 'sort_field',
    title: 'title',
    type: 'type',
    categoryId: 'category_id',
    accountGroup: 'account_group',
    industry: 'industry',
    industryKey: 'industry_key',
    industryClassification: 'industry_classification',
    taxId: 'tax_id',
    taxId2: 'tax_id_2',
    taxId3: 'tax_id_3',
    taxOffice: 'tax_office',
    vatNumber: 'vat_number',
    fiscalAddress: 'fiscal_address',
    registrationNumber: 'registration_number',
    address: 'address',
    address2: 'address_2',
    address3: 'address_3',
    address4: 'address_4',
    address5: 'address_5',
    district: 'district',
    city: 'city',
    state: 'state',
    country: 'country',
    postalCode: 'postal_code',
    poBox: 'po_box',
    poBoxPostalCode: 'po_box_postal_code',
    region: 'region',
    county: 'county',
    timeZone: 'time_zone',
    taxJurisdiction: 'tax_jurisdiction',
    phone: 'phone',
    altPhone: 'alt_phone',
    email: 'email',
    website: 'website',
    currency: 'currency',
    paymentTerms: 'payment_terms',
    paymentMethod: 'payment_method',
    paymentBlock: 'payment_block',
    houseBank: 'house_bank',
    checkDoubleInvoice: 'check_double_invoice',
    bankName: 'bank_name',
    bankAccount: 'bank_account',
    bankRoutingNumber: 'bank_routing_number',
    swiftCode: 'swift_code',
    iban: 'iban',
    bankCountry: 'bank_country',
    bankKey: 'bank_key',
    accountType: 'account_type',
    bankTypeKey: 'bank_type_key',
    incoterms: 'incoterms',
    minimumOrderValue: 'minimum_order_value',
    evaluationScore: 'evaluation_score',
    leadTime: 'lead_time',
    purchasingGroupId: 'purchasing_group_id',
    authorizationGroup: 'authorization_group',
    corporateGroup: 'corporate_group',
    withholdingTaxCountry: 'withholding_tax_country',
    withholdingTaxType: 'withholding_tax_type',
    withholdingTaxCode: 'withholding_tax_code',
    withholdingTaxLiable: 'withholding_tax_liable',
    exemptionNumber: 'exemption_number',
    exemptionPercentage: 'exemption_percentage',
    exemptionReason: 'exemption_reason',
    exemptionFrom: 'exemption_from',
    exemptionTo: 'exemption_to',
    status: 'status',
    centralPostingBlock: 'central_posting_block',
    centralDeletionFlag: 'central_deletion_flag',
    postingBlockCompanyCode: 'posting_block_company_code',
    deletionFlagCompanyCode: 'deletion_flag_company_code',
    postingBlockPurchasingOrg: 'posting_block_purchasing_org',
    deletionFlagPurchasingOrg: 'deletion_flag_purchasing_org',
    blacklisted: 'blacklisted',
    blacklistReason: 'blacklist_reason',
    notes: 'notes',
    tags: 'tags',
    companyCodeId: 'company_code_id',
    isActive: 'is_active',
    createdBy: 'created_by',
    updatedBy: 'updated_by',
    version: 'version'
  };

  // Vendors - PATCH endpoint for updates
  app.patch("/api/master-data/vendor/:id", async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const updateData = req.body;

      console.log(`🔍 PATCH /api/master-data/vendor/${id} - Update data:`, JSON.stringify(updateData, null, 2));

      // Build update fields with proper mapping and handle empty strings
      const updates: string[] = [];
      const values: any[] = [id];
      let paramIndex = 2;
      const processedFields: string[] = [];
      const skippedFields: string[] = [];

      for (const [camelKey, value] of Object.entries(updateData)) {
        // Skip system fields
        if (camelKey === 'id' || camelKey === 'created_at' || camelKey === 'updated_at' ||
          camelKey === 'createdAt' || camelKey === 'updatedAt') {
          skippedFields.push(`${camelKey} (system field)`);
          continue;
        }

        // Get database column name
        const dbColumn = fieldMapping[camelKey] || camelToSnake(camelKey);

        // Handle different field types
        const isBooleanField = ['isActive', 'blacklisted', 'checkDoubleInvoice', 'withholdingTaxLiable',
          'centralPostingBlock', 'centralDeletionFlag', 'postingBlockCompanyCode',
          'deletionFlagCompanyCode', 'postingBlockPurchasingOrg', 'deletionFlagPurchasingOrg'].includes(camelKey);
        const isArrayField = camelKey === 'tags';
        const isNumericField = ['minimumOrderValue', 'evaluationScore', 'leadTime', 'purchasingGroupId',
          'companyCodeId', 'categoryId', 'exemptionPercentage', 'version'].includes(camelKey);

        // Foreign key fields that should convert 0 to NULL to avoid constraint violations
        const isForeignKeyField = ['purchaseOrganizationId', 'purchasingGroupId', 'companyCodeId', 'categoryId'].includes(camelKey);

        // For foreign key fields, convert 0 to NULL before processing
        if (isForeignKeyField && value === 0) {
          updates.push(`${dbColumn} = $${paramIndex}`);
          values.push(null);
          processedFields.push(`${camelKey} -> ${dbColumn} (foreign key, 0 converted to NULL)`);
          paramIndex++;
          continue;
        }

        // For boolean fields, false is a valid value, so only skip if undefined
        if (isBooleanField) {
          if (value === undefined) {
            skippedFields.push(`${camelKey} (boolean, undefined)`);
            continue; // Skip undefined boolean values
          }
          // Convert to proper boolean (handle boolean, string, and number)
          let boolValue: boolean;
          if (typeof value === 'boolean') {
            boolValue = value;
          } else if (typeof value === 'string') {
            boolValue = value.toLowerCase() === 'true' || value === '1';
          } else if (typeof value === 'number') {
            boolValue = value !== 0;
          } else {
            boolValue = Boolean(value);
          }
          updates.push(`${dbColumn} = $${paramIndex}`);
          values.push(boolValue);
          processedFields.push(`${camelKey} -> ${dbColumn} (boolean: ${boolValue})`);
          paramIndex++;
          continue;
        }

        // For array fields (tags), handle properly
        if (isArrayField) {
          if (value === undefined || value === null) {
            updates.push(`${dbColumn} = $${paramIndex}`);
            values.push(null);
            processedFields.push(`${camelKey} -> ${dbColumn} (array, set to NULL)`);
            paramIndex++;
            continue;
          }
          // Ensure it's an array
          const arrayValue = Array.isArray(value) ? value : (value ? [value] : []);
          updates.push(`${dbColumn} = $${paramIndex}`);
          values.push(arrayValue);
          processedFields.push(`${camelKey} -> ${dbColumn} (array: ${JSON.stringify(arrayValue)})`);
          paramIndex++;
          continue;
        }

        // For numeric fields, 0 is a valid value
        if (isNumericField) {
          if (value === undefined || value === null || value === '') {
            // For optional numeric fields, set to NULL
            updates.push(`${dbColumn} = $${paramIndex}`);
            values.push(null);
            processedFields.push(`${camelKey} -> ${dbColumn} (number, set to NULL)`);
            paramIndex++;
            continue;
          }
          // Convert to number
          const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
          if (isNaN(numValue)) {
            skippedFields.push(`${camelKey} (invalid number: ${value})`);
            continue; // Skip invalid numbers
          }
          updates.push(`${dbColumn} = $${paramIndex}`);
          values.push(numValue);
          processedFields.push(`${camelKey} -> ${dbColumn} (number: ${numValue})`);
          paramIndex++;
          continue;
        }

        // For string fields, handle empty strings
        if (value === '' || value === null || value === undefined) {
          // For required fields, skip if empty (don't update)
          if (camelKey === 'code' || camelKey === 'name' || camelKey === 'type') {
            skippedFields.push(`${camelKey} (required field, empty)`);
            continue;
          }
          // For optional string fields, set to NULL
          updates.push(`${dbColumn} = $${paramIndex}`);
          values.push(null);
          processedFields.push(`${camelKey} -> ${dbColumn} (string, set to NULL)`);
          paramIndex++;
          continue;
        }

        // Add to update clause with parameterized value
        updates.push(`${dbColumn} = $${paramIndex}`);
        values.push(value);
        processedFields.push(`${camelKey} -> ${dbColumn}`);
        paramIndex++;
      }

      if (updates.length === 0) {
        console.warn(`⚠️ No valid fields to update for vendor ${id}. Skipped fields:`, skippedFields);
        return res.status(400).json({ message: "No valid fields to update" });
      }

      const setClause = updates.join(', ');
      console.log(`🔍 Processed fields:`, processedFields);
      if (skippedFields.length > 0) {
        console.log(`🔍 Skipped fields:`, skippedFields);
      }
      console.log(`🔍 SQL UPDATE query: UPDATE vendors SET ${setClause}, updated_at = NOW() WHERE id = $1`);
      console.log(`🔍 Values:`, values);

      const result = await pool.query(`
        UPDATE vendors 
        SET ${setClause}, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      // Map response back to camelCase
      const vendor = result.rows[0];
      const mappedVendor = {
        id: vendor.id,
        code: vendor.code,
        name: vendor.name,
        legalName: vendor.legal_name,
        type: vendor.type,
        industry: vendor.industry,
        taxId: vendor.tax_id,
        address: vendor.address,
        city: vendor.city,
        state: vendor.state,
        country: vendor.country,
        postalCode: vendor.postal_code,
        region: vendor.region,
        phone: vendor.phone,
        altPhone: vendor.alt_phone,
        email: vendor.email,
        website: vendor.website,
        currency: vendor.currency,
        paymentTerms: vendor.payment_terms,
        paymentMethod: vendor.payment_method,
        status: vendor.status,
        blacklisted: vendor.blacklisted,
        blacklistReason: vendor.blacklist_reason,
        notes: vendor.notes,
        companyCodeId: vendor.company_code_id,
        isActive: vendor.is_active,
        createdAt: vendor.created_at,
        updatedAt: vendor.updated_at
      };

      console.log('✅ Vendor updated successfully:', mappedVendor);
      res.json(mappedVendor);
    } catch (error: any) {
      console.error("Error updating vendor:", error);
      console.error("Error details:", error.stack);
      res.status(500).json({ message: "Failed to update vendor", error: error.message });
    }
  });

  // Vendors - DELETE endpoint for soft delete
  app.delete("/api/master-data/vendor/:id", async (req: Request, res: Response) => {
    console.log('🔍 DELETE /api/master-data/vendor/:id called with ID:', req.params.id);
    console.log('🔍 Request headers:', req.headers);
    console.log('🔍 Request body:', req.body);

    try {
      const id = req.params.id;

      // Soft delete by setting is_active to false
      const result = await pool.query(`
        UPDATE vendors 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [id]);

      if (result.rows.length === 0) {
        console.log('❌ Vendor not found with ID:', id);
        return res.status(404).json({ message: "Vendor not found" });
      }

      console.log('✅ Vendor deactivated successfully:', result.rows[0]);
      res.json({ message: "Vendor deactivated successfully" });
    } catch (error: any) {
      console.error("Error deactivating vendor:", error);
      res.status(500).json({ message: "Failed to deactivate vendor", error: error.message });
    }
  });

  // Plants - using exact database columns with proper defaults
  app.post("/api/master-data/plant", async (req: Request, res: Response) => {
    try {
      const { code, name, company_code_id, companyCodeId, type, status, isActive } = req.body;

      // Validate required fields
      if (!code || !name) {
        return res.status(400).json({ message: "Code and name are required" });
      }

      // Handle both field name formats from frontend
      const companyCode = company_code_id || companyCodeId;

      // Detect optional columns
      const cols = await checkColumnsExist('plants', ['created_by', 'updated_by', 'version', 'active']);
      const includeAudit = cols['created_by'] && cols['updated_by'] && cols['version'];
      const includeActive = !!cols['active'];

      const baseCols = ['code', 'name', 'company_code_id', 'type', 'status', 'is_active'];
      const baseVals = [code, name, companyCode || null, type || null, status || 'active', isActive !== false];
      const dynamicCols = [...baseCols];
      const dynamicParams: any[] = [...baseVals];

      if (includeAudit) {
        dynamicCols.push('created_by', 'updated_by', 'version');
        dynamicParams.push(1, 1, 1);
      }
      if (includeActive) {
        dynamicCols.push('active');
        dynamicParams.push(true);
      }

      const placeholders = dynamicParams.map((_, i) => `$${i + 1}`).join(', ');
      const sql = `INSERT INTO plants (${dynamicCols.join(', ')}) VALUES (${placeholders}) RETURNING *`;
      const result = await pool.query(sql, dynamicParams);
      return res.status(201).json(result.rows[0]);
    } catch (error: any) {
      console.error("Error creating plant:", error);
      return res.status(500).json({ message: "Failed to create plant", error: error.message });
    }
  });

  // Company Codes - handle duplicates and character limits
  // Company code creation route - COMMENTED OUT to use the proper route in company-code.ts
  // The proper route includes fiscal year variant handling
  // app.post("/api/master-data/company-code", async (req: Request, res: Response) => {
  //   try {
  //     const { code, name, currency, country } = req.body;
  //     
  //     // Validate required fields
  //     if (!code || !name) {
  //       return res.status(400).json({ message: "Code and name are required" });
  //     }
  //     
  //     // Ensure code fits varchar(10) limit
  //     const shortCode = code.substring(0, 10);
  //     
  //     // Check if code already exists
  //     const existing = await pool.query('SELECT id FROM company_codes WHERE code = $1', [shortCode]);
  //     if (existing.rows.length > 0) {
  //       return res.status(409).json({ message: "Company code already exists" });
  //     }
  //     
  //     const result = await pool.query(`
  //       INSERT INTO company_codes (code, name, currency, country, created_at, updated_at)
  //       VALUES ($1, $2, $3, $4, NOW(), NOW())
  //       RETURNING *
  //     `, [shortCode, name, currency, country]);
  //     
  //     return res.status(201).json(result.rows[0]);
  //   } catch (error: any) {
  //     console.error("Error creating company code:", error);
  //     return res.status(500).json({ message: "Failed to create company code", error: error.message });
  //   }
  // });

  // ===================================================================
  // VENDOR-MATERIAL ASSIGNMENT ENDPOINTS
  // ===================================================================

  // GET: Get all raw materials (for dropdown)
  app.get("/api/master-data/vendor-materials/raw-materials", async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT 
          id,
          code,
          name,
          type,
          description,
          base_uom,
          base_unit_price,
          is_active
        FROM materials 
        WHERE is_active = true 
          AND (
            LOWER(type) LIKE '%raw%' 
            OR LOWER(type) = 'roh'
            OR LOWER(type) = 'raw material'
            OR LOWER(type) = 'raw_material'
            OR type = 'RAW'
          )
        ORDER BY name ASC
      `);

      const mappedMaterials = result.rows.map((material: any) => ({
        id: material.id,
        code: material.code,
        name: material.name,
        type: material.type,
        description: material.description || null,
        baseUom: material.base_uom || null,
        baseUnitPrice: material.base_unit_price || null,
        isActive: material.is_active
      }));

      console.log(`✅ Raw materials fetched: ${mappedMaterials.length} records`);
      return res.status(200).json(mappedMaterials);
    } catch (error: any) {
      console.error("Error fetching raw materials:", error);
      return res.status(500).json({ message: "Failed to fetch raw materials", error: error.message });
    }
  });

  // GET: Get all vendors that have materials assigned (for purchase order creation)
  app.get("/api/master-data/vendor-materials/vendors", async (req: Request, res: Response) => {
    try {
      // First, let's check how many vendor_materials records exist
      const countResult = await pool.query(`
        SELECT COUNT(*) as total, 
               COUNT(DISTINCT vendor_id) as unique_vendors
        FROM vendor_materials 
        WHERE is_active = true
      `);
      console.log(`📊 vendor_materials stats:`, countResult.rows[0]);

      const result = await pool.query(`
        SELECT DISTINCT
          v.id,
          v.code,
          v.name,
          v.code as vendor_number,
          v.purchase_organization_id,
          v.company_code_id,
          v.currency
        FROM vendor_materials vm
        INNER JOIN vendors v ON vm.vendor_id = v.id
        WHERE vm.is_active = true AND v.is_active = true
        ORDER BY v.name ASC
      `);

      console.log(`🔍 Raw query result: ${result.rows.length} rows`);
      console.log(`🔍 Vendor IDs returned:`, result.rows.map((r: any) => r.id));

      const vendors = result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        vendor_number: row.vendor_number || row.code || '',
        code: row.code || '',
        purchaseOrganizationId: row.purchase_organization_id || null,
        companyCodeId: row.company_code_id || null,
        currency: row.currency || null
      }));

      console.log(`✅ Vendors with materials fetched: ${vendors.length} vendors`);
      console.log(`✅ Vendor names:`, vendors.map((v: any) => v.name));
      return res.status(200).json(vendors);
    } catch (error: any) {
      console.error("Error fetching vendors with materials:", error);
      return res.status(500).json({ message: "Failed to fetch vendors", error: error.message });
    }
  });

  // GET: Get materials assigned to a vendor
  app.get("/api/master-data/vendor-materials/vendor/:vendorId", async (req: Request, res: Response) => {
    try {
      const vendorId = req.params.vendorId;

      const result = await pool.query(`
        SELECT 
          vm.id,
          vm.vendor_id,
          vm.material_id,
          vm.vendor_material_code,
          vm.unit_price,
          vm.currency,
          vm.minimum_order_quantity,
          vm.lead_time_days,
          vm.is_preferred,
          vm.is_active,
          vm.valid_from,
          vm.valid_to,
          vm.notes,
          vm.created_at,
          vm.updated_at,
          m.code as material_code,
          m.name as material_name,
          m.type as material_type,
          m.description as material_description,
          m.base_uom as material_base_uom,
          m.base_unit_price as material_base_unit_price,
          v.code as vendor_code,
          v.name as vendor_name
        FROM vendor_materials vm
        INNER JOIN materials m ON vm.material_id = m.id
        INNER JOIN vendors v ON vm.vendor_id = v.id
        WHERE vm.vendor_id = $1 AND vm.is_active = true
        ORDER BY m.name ASC
      `, [vendorId]);

      const mappedAssignments = result.rows.map((row: any) => ({
        id: row.id,
        vendorId: row.vendor_id,
        materialId: row.material_id,
        vendorMaterialCode: row.vendor_material_code || null,
        unitPrice: row.unit_price ? parseFloat(row.unit_price) : null,
        currency: row.currency || null,
        minimumOrderQuantity: row.minimum_order_quantity ? parseFloat(row.minimum_order_quantity) : null,
        leadTimeDays: row.lead_time_days || null,
        isPreferred: row.is_preferred || false,
        isActive: row.is_active,
        validFrom: row.valid_from || null,
        validTo: row.valid_to || null,
        notes: row.notes || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        material: {
          id: row.material_id,
          code: row.material_code,
          name: row.material_name,
          type: row.material_type,
          description: row.material_description,
          baseUom: row.material_base_uom,
          baseUnitPrice: row.material_base_unit_price ? parseFloat(row.material_base_unit_price) : null
        },
        vendor: {
          id: row.vendor_id,
          code: row.vendor_code,
          name: row.vendor_name
        }
      }));

      console.log(`✅ Vendor materials fetched for vendor ${vendorId}: ${mappedAssignments.length} records`);
      return res.status(200).json(mappedAssignments);
    } catch (error: any) {
      console.error("Error fetching vendor materials:", error);
      return res.status(500).json({ message: "Failed to fetch vendor materials", error: error.message });
    }
  });

  // POST: Assign materials to a vendor (bulk)
  app.post("/api/master-data/vendor-materials", async (req: Request, res: Response) => {
    try {
      const { vendorId, materialIds, vendorMaterialCode, unitPrice, currency, minimumOrderQuantity, leadTimeDays, isPreferred, validFrom, validTo, notes } = req.body;

      if (!vendorId || !materialIds || !Array.isArray(materialIds) || materialIds.length === 0) {
        return res.status(400).json({ message: "Vendor ID and material IDs array are required" });
      }

      // Verify vendor exists
      const vendorCheck = await pool.query('SELECT id, code, name FROM vendors WHERE id = $1', [vendorId]);
      if (vendorCheck.rows.length === 0) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      const results = [];
      const errors = [];

      // Insert each material assignment
      for (const materialId of materialIds) {
        try {
          // Verify material exists and is active
          const materialCheck = await pool.query(`
            SELECT id, code, name, type 
            FROM materials 
            WHERE id = $1 
              AND is_active = true
          `, [materialId]);

          if (materialCheck.rows.length === 0) {
            errors.push({ materialId, error: "Material not found or inactive" });
            continue;
          }

          // Check if relationship already exists
          const existing = await pool.query(
            'SELECT id FROM vendor_materials WHERE vendor_id = $1 AND material_id = $2',
            [vendorId, materialId]
          );

          if (existing.rows.length > 0) {
            // Update existing relationship
            const updateResult = await pool.query(`
              UPDATE vendor_materials 
              SET 
                vendor_material_code = COALESCE($3, vendor_material_code),
                unit_price = COALESCE($4, unit_price),
                currency = COALESCE($5, currency),
                minimum_order_quantity = COALESCE($6, minimum_order_quantity),
                lead_time_days = COALESCE($7, lead_time_days),
                is_preferred = COALESCE($8, is_preferred),
                valid_from = COALESCE($9, valid_from),
                valid_to = COALESCE($10, valid_to),
                notes = COALESCE($11, notes),
                is_active = true,
                updated_at = NOW()
              WHERE vendor_id = $1 AND material_id = $2
              RETURNING *
            `, [
              vendorId,
              materialId,
              vendorMaterialCode || null,
              unitPrice || null,
              currency || null,
              minimumOrderQuantity || null,
              leadTimeDays || null,
              isPreferred || false,
              validFrom ? new Date(validFrom) : null,
              validTo ? new Date(validTo) : null,
              notes || null
            ]);

            results.push(updateResult.rows[0]);
          } else {
            // Insert new relationship
            const insertResult = await pool.query(`
              INSERT INTO vendor_materials (
                vendor_id, 
                material_id, 
                vendor_material_code,
                unit_price,
                currency,
                minimum_order_quantity,
                lead_time_days,
                is_preferred,
                valid_from,
                valid_to,
                notes,
                is_active,
                created_at,
                updated_at
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW(), NOW())
              RETURNING *
            `, [
              vendorId,
              materialId,
              vendorMaterialCode || null,
              unitPrice || null,
              currency || null,
              minimumOrderQuantity || null,
              leadTimeDays || null,
              isPreferred || false,
              validFrom ? new Date(validFrom) : null,
              validTo ? new Date(validTo) : null,
              notes || null
            ]);

            results.push(insertResult.rows[0]);
          }
        } catch (error: any) {
          errors.push({ materialId, error: error.message });
        }
      }

      if (results.length === 0) {
        return res.status(400).json({
          message: "No materials were assigned",
          errors
        });
      }

      console.log(`✅ Vendor materials assigned: ${results.length} successful, ${errors.length} errors`);
      return res.status(201).json({
        message: `Successfully assigned ${results.length} material(s) to vendor`,
        assigned: results.length,
        errors: errors.length > 0 ? errors : undefined,
        data: results
      });
    } catch (error: any) {
      console.error("Error assigning vendor materials:", error);
      return res.status(500).json({ message: "Failed to assign vendor materials", error: error.message });
    }
  });

  // DELETE: Remove material assignment from vendor
  app.delete("/api/master-data/vendor-materials/:id", async (req: Request, res: Response) => {
    try {
      const id = req.params.id;

      // Soft delete by setting is_active to false
      const result = await pool.query(`
        UPDATE vendor_materials 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Vendor-material assignment not found" });
      }

      console.log(`✅ Vendor-material assignment deleted: ${id}`);
      return res.status(200).json({ message: "Vendor-material assignment removed successfully" });
    } catch (error: any) {
      console.error("Error deleting vendor-material assignment:", error);
      return res.status(500).json({ message: "Failed to delete vendor-material assignment", error: error.message });
    }
  });

  // PATCH: Update vendor-material assignment
  app.patch("/api/master-data/vendor-materials/:id", async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const { vendorMaterialCode, unitPrice, currency, minimumOrderQuantity, leadTimeDays, isPreferred, validFrom, validTo, notes, isActive } = req.body;

      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (vendorMaterialCode !== undefined) {
        updates.push(`vendor_material_code = $${paramIndex++}`);
        values.push(vendorMaterialCode || null);
      }
      if (unitPrice !== undefined) {
        updates.push(`unit_price = $${paramIndex++}`);
        values.push(unitPrice || null);
      }
      if (currency !== undefined) {
        updates.push(`currency = $${paramIndex++}`);
        values.push(currency || null);
      }
      if (minimumOrderQuantity !== undefined) {
        updates.push(`minimum_order_quantity = $${paramIndex++}`);
        values.push(minimumOrderQuantity || null);
      }
      if (leadTimeDays !== undefined) {
        updates.push(`lead_time_days = $${paramIndex++}`);
        values.push(leadTimeDays || null);
      }
      if (isPreferred !== undefined) {
        updates.push(`is_preferred = $${paramIndex++}`);
        values.push(isPreferred);
      }
      if (validFrom !== undefined) {
        updates.push(`valid_from = $${paramIndex++}`);
        values.push(validFrom ? new Date(validFrom) : null);
      }
      if (validTo !== undefined) {
        updates.push(`valid_to = $${paramIndex++}`);
        values.push(validTo ? new Date(validTo) : null);
      }
      if (notes !== undefined) {
        updates.push(`notes = $${paramIndex++}`);
        values.push(notes || null);
      }
      if (isActive !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(isActive);
      }

      if (updates.length === 0) {
        return res.status(400).json({ message: "No fields to update" });
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const result = await pool.query(`
        UPDATE vendor_materials 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Vendor-material assignment not found" });
      }

      console.log(`✅ Vendor-material assignment updated: ${id}`);
      return res.status(200).json(result.rows[0]);
    } catch (error: any) {
      console.error("Error updating vendor-material assignment:", error);
      return res.status(500).json({ message: "Failed to update vendor-material assignment", error: error.message });
    }
  });
}