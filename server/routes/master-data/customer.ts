import { Router, Request, Response } from "express";
import { pool } from "../../db";
import { z } from "zod";

const router = Router();

// Zod schema for validation
const customerSchema = z.object({
    code: z.string().optional(),
    name: z.string().min(1, "Name is required"),
    type: z.string().optional(),
    description: z.string().optional(),
    tax_id: z.string().optional(),
    industry: z.string().optional(),
    segment: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postal_code: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    currency: z.string().optional(),
    payment_terms: z.string().optional(),
    credit_limit: z.number().optional(),
    company_code_id: z.number().optional(),
    sales_org_code: z.string().optional(),
    distribution_channel_code: z.string().optional(),
    division_code: z.string().optional(),
    credit_control_area: z.string().optional(),
    is_b2b: z.boolean().optional(),
    is_vip: z.boolean().optional(),
    status: z.string().optional(),
    // New pricing procedure field
    customer_pricing_procedure: z.string().optional(),
    // Additional fields from schema
    sales_district: z.string().optional(),
    sales_office_code: z.string().optional(),
    sales_group_code: z.string().optional(),
    account_group_id: z.number().optional(),
    customer_assignment_group_id: z.number().optional(),
});

// GET /api/master-data/customer
router.get("/", async (req: Request, res: Response) => {
    try {
        const { includeInactive } = req.query;

        // Build query
        let query = `
      SELECT * FROM erp_customers 
      WHERE 1=1 
    `;

        // Filter inactive unless requested
        if (includeInactive !== 'true') {
            query += ` AND (is_active = true OR is_active IS NULL)`;
        }

        query += ` AND "_deletedAt" IS NULL ORDER BY name ASC LIMIT 1000`;

        const result = await pool.query(query);

        // Transform to match frontend expectations if necessary
        // Most fields map 1:1, but we ensure consistency
        const customers = result.rows.map(row => ({
            ...row,
            // Ensure specific fields are present even if null
            customer_pricing_procedure: row.customer_pricing_procedure,
            // Map 'code' to 'customer_number' if frontend expects it, or keep both
            customer_number: row.customer_code,
            customer_name: row.name,
            isActive: row.is_active,
            createdBy: row.created_by,
            updatedBy: row.updated_by,
            _tenantId: row._tenantId,
            _deletedAt: row._deletedAt
        }));

        return res.json(customers);
    } catch (error: any) {
        console.error("Error fetching customers:", error);
        return res.status(500).json({ message: "Failed to fetch customers", error: error.message });
    }
});

// GET /api/master-data/customer/generate-code - Generate next customer code based on account group
// IMPORTANT: This route must be BEFORE /:id to avoid collision
router.get("/generate-code", async (req: Request, res: Response) => {
    try {
        const { accountGroupId } = req.query;

        if (!accountGroupId) {
            return res.status(400).json({
                message: "Account group ID is required",
                code: null
            });
        }

        console.log('📥 Generating customer code for account group:', accountGroupId);

        // Fetch account group with number range information
        const accountGroupResult = await pool.query(`
            SELECT 
                ag.id,
                ag.code,
                ag.name,
                ag.account_range_from as number_range_from,
                ag.account_range_to as number_range_to,
                ag.number_range_id,
                nr.current_number as nr_current_number,
                nr.range_from as nr_range_from,
                nr.range_to as nr_range_to
            FROM account_groups ag
            LEFT JOIN number_ranges nr ON ag.number_range_id = nr.id
            WHERE ag.id = $1
        `, [accountGroupId]);

        if (accountGroupResult.rows.length === 0) {
            return res.status(404).json({
                message: "Account group not found",
                code: null
            });
        }

        const accountGroup = accountGroupResult.rows[0];
        console.log('📥 Account group details:', accountGroup);

        // Determine the number range (from account_group or linked number_range)
        const rangeFrom = accountGroup.number_range_from || accountGroup.nr_range_from;
        const rangeTo = accountGroup.number_range_to || accountGroup.nr_range_to;

        if (!rangeFrom) {
            console.log('❌ No number range configured for this account group');
            return res.status(400).json({
                message: "No number range configured for this account group",
                code: null
            });
        }

        console.log('📥 Number range:', { rangeFrom, rangeTo, currentNumber: accountGroup.nr_current_number });

        // Find the highest existing customer code within this range
        const highestCodeResult = await pool.query(`
            SELECT customer_code
            FROM erp_customers
            WHERE customer_code ~ '^[0-9]+$'
              AND CAST(customer_code AS BIGINT) >= $1
              AND CAST(customer_code AS BIGINT) <= $2
            ORDER BY CAST(customer_code AS BIGINT) DESC
            LIMIT 1
        `, [rangeFrom, rangeTo || rangeFrom]);

        let nextCode: string;

        // Determine the starting point: use the HIGHER of:
        // 1. current_number from number_ranges (allows manual adjustment)
        // 2. highest existing customer code in database
        // 3. rangeFrom (if no existing codes and no current_number)

        const currentNumberFromRange = accountGroup.nr_current_number ? BigInt(accountGroup.nr_current_number) : null;
        const highestCodeFromDB = highestCodeResult.rows.length > 0 ? BigInt(highestCodeResult.rows[0].customer_code) : null;

        let baseNumber: bigint;

        if (currentNumberFromRange && highestCodeFromDB) {
            // Use whichever is higher
            baseNumber = currentNumberFromRange > highestCodeFromDB ? currentNumberFromRange : highestCodeFromDB;
            console.log('📥 Using higher of current_number and DB code:', baseNumber.toString());
        } else if (currentNumberFromRange) {
            baseNumber = currentNumberFromRange;
            console.log('📥 Using current_number from number_ranges:', baseNumber.toString());
        } else if (highestCodeFromDB) {
            baseNumber = highestCodeFromDB;
            console.log('📥 Using highest code from database:', baseNumber.toString());
        } else {
            // Start from beginning of range
            baseNumber = BigInt(rangeFrom);
            console.log('📥 Starting from range beginning:', baseNumber.toString());
        }

        // Calculate next code: baseNumber + 1
        const nextNumber = baseNumber + BigInt(1);

        // Check if we've exceeded the range
        if (rangeTo && nextNumber > BigInt(rangeTo)) {
            return res.status(400).json({
                message: `Number range exhausted. Range: ${rangeFrom} - ${rangeTo}`,
                code: null
            });
        }

        nextCode = nextNumber.toString();

        console.log('✅ Generated customer code:', nextCode);

        return res.json({
            code: nextCode,
            accountGroup: {
                id: accountGroup.id,
                code: accountGroup.code,
                name: accountGroup.name,
                rangeFrom,
                rangeTo
            }
        });

    } catch (error: any) {
        console.error("Error generating customer code:", error);
        return res.status(500).json({
            message: "Failed to generate customer code",
            error: error.message,
            code: null
        });
    }
});

// GET /api/master-data/customer/:id
router.get("/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`SELECT * FROM erp_customers WHERE id = $1`, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Customer not found" });
        }

        const row = result.rows[0];
        const customer = {
            ...row,
            customer_pricing_procedure: row.customer_pricing_procedure || null,
            customer_number: row.customer_code,
            customer_name: row.name,
            isActive: row.is_active,
            createdBy: row.created_by,
            updatedBy: row.updated_by,
            _tenantId: row._tenantId,
            _deletedAt: row._deletedAt
        };

        return res.json(customer);
    } catch (error: any) {
        console.error(`Error fetching customer ${req.params.id}:`, error);
        return res.status(500).json({ message: "Failed to fetch customer", error: error.message });
    }
});

// POST /api/master-data/customer
router.post("/", async (req: Request, res: Response) => {
    try {
        // Basic validation
        // Map frontend fields (customer_number -> code, customer_name -> name) if needed
        const data = {
            ...req.body,
            code: req.body.code || req.body.customer_number,
            name: req.body.name || req.body.customer_name,
        };
        const userId = (req as any).user?.id || 1;
        const tenantId = (req as any).user?.tenantId || '001';

        // Sanitize
        if (!data.code) data.code = `CUST-${Date.now()}`;

        const fields = [
            'customer_code', 'name', 'type', 'description', 'tax_id', 'industry', 'segment',
            'address', 'city', 'state', 'country', 'postal_code', 'phone', 'email',
            'currency', 'payment_terms', 'credit_limit', 'company_code_id', 'account_group_id',
            'sales_org_code', 'distribution_channel_code', 'division_code',
            'credit_control_area', 'is_b2b', 'is_vip',
            'status', 'is_active', 'customer_pricing_procedure',
            'sales_district', 'sales_office_code', 'sales_group_code', 'customer_assignment_group_id',
            'shipping_condition_key', 'delivery_priority', 'price_list',
            'reconciliation_account_code', 'language_code',
            'created_by', 'updated_by', '"_tenantId"'
        ];

        const values = [
            data.code, data.name, data.type, data.description, data.tax_id, data.industry, data.segment,
            data.address, data.city, data.state, data.country, data.postal_code, data.phone, data.email,
            data.currency, data.payment_terms, data.credit_limit || 0, data.company_code_id, data.account_group_id,
            data.sales_org_code, data.distribution_channel_code, data.division_code,
            data.credit_control_area, data.is_b2b || false, data.is_vip || false,
            data.status || 'active', true, data.customer_pricing_procedure || null,
            data.sales_district, data.sales_office_code, data.sales_group_code, data.customer_assignment_group_id,
            data.shipping_condition_key || null, data.delivery_priority, data.price_list,
            data.reconciliation_account_code, data.language_code,
            userId, userId, tenantId
        ];

        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        const columns = fields.join(', ');

        const query = `
      INSERT INTO erp_customers (${columns}, created_at, updated_at)
      VALUES (${placeholders}, NOW(), NOW())
      RETURNING *
    `;

        const result = await pool.query(query, values);
        const createdCustomer = result.rows[0];

        // Update number_ranges.current_number if customer was created with account_group_id
        // This keeps the number range synchronized with the last used code
        if (data.account_group_id && createdCustomer.customer_code) {
            try {
                console.log('📥 Updating number_ranges current_number for customer:', createdCustomer.customer_code);

                // Get the account group's number_range_id
                const accountGroupResult = await pool.query(`
                    SELECT number_range_id 
                    FROM account_groups 
                    WHERE id = $1 AND number_range_id IS NOT NULL
                `, [data.account_group_id]);

                if (accountGroupResult.rows.length > 0 && accountGroupResult.rows[0].number_range_id) {
                    const numberRangeId = accountGroupResult.rows[0].number_range_id;

                    // Update current_number in number_ranges
                    await pool.query(`
                        UPDATE number_ranges 
                        SET current_number = $1,
                            updated_at = NOW()
                        WHERE id = $2
                    `, [createdCustomer.customer_code, numberRangeId]);

                    console.log('✅ Updated number_ranges current_number to:', createdCustomer.customer_code);
                }
            } catch (updateError: any) {
                // Log but don't fail the customer creation
                console.error('⚠️ Failed to update number_ranges current_number:', updateError.message);
            }
        }

        return res.status(201).json(createdCustomer);

    } catch (error: any) {
        console.error("Error creating customer:", error);
        return res.status(500).json({ message: "Failed to create customer", error: error.message });
    }
});

// PATCH /api/master-data/customer/:id
router.patch("/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = {
            ...req.body,
            // Map frontend aliases if provided
            code: req.body.code ?? req.body.customer_number,
            name: req.body.name ?? req.body.customer_name,
        };
        const userId = (req as any).user?.id || 1;

        // List of allowed update fields - EXPANDED to match frontend schema
        const fieldMap: Record<string, any> = {
            // Basic Information
            customer_code: data.code,
            name: data.name,
            type: data.type,
            description: data.description,
            tax_id: data.tax_id || data.taxId,
            industry: data.industry,
            segment: data.segment,

            // Contact Information
            address: data.address,
            city: data.city,
            state: data.state,
            country: data.country,
            postal_code: data.postal_code || data.postalCode,
            region: data.region,
            phone: data.phone,
            alt_phone: data.alt_phone,
            email: data.email,
            website: data.website,

            // Financial & Payment
            currency: data.currency,
            payment_terms: data.payment_terms || data.paymentTerms,
            payment_method: data.payment_method,
            credit_limit: data.credit_limit || data.creditLimit,
            credit_limit_group_id: data.credit_limit_group_id || data.creditLimitGroupId,
            credit_rating: data.credit_rating,

            // Account Assignments
            company_code_id: data.company_code_id || data.companyCodeId,
            account_group_id: data.account_group_id,
            reconciliation_account_code: data.reconciliation_account_code,

            // Sales & Distribution
            discount_group: data.discount_group,
            price_group: data.price_group,
            incoterms: data.incoterms,
            shipping_method: data.shipping_method,
            shipping_condition_key: data.shipping_condition_key,
            delivery_terms: data.delivery_terms,
            delivery_route: data.delivery_route,
            delivery_priority: data.delivery_priority,
            sales_org_code: data.sales_org_code,
            distribution_channel_code: data.distribution_channel_code,
            division_code: data.division_code,
            sales_district: data.sales_district,
            sales_office_code: data.sales_office_code,
            sales_group_code: data.sales_group_code,
            price_list: data.price_list,
            customer_pricing_procedure: data.customer_pricing_procedure,

            // Tax & Compliance
            tax_profile_id: data.tax_profile_id,
            tax_rule_id: data.tax_rule_id,
            tax_classification_code: data.tax_classification_code,
            tax_exemption_certificate: data.tax_exemption_certificate,
            withholding_tax_code: data.withholding_tax_code,

            // Dunning & Credit Control
            dunning_procedure: data.dunning_procedure,
            dunning_block: data.dunning_block,
            payment_block: data.payment_block,
            credit_control_area: data.credit_control_area,
            risk_category: data.risk_category,
            credit_limit_currency: data.credit_limit_currency,
            credit_exposure: data.credit_exposure,
            credit_check_procedure: data.credit_check_procedure,

            // Banking Information
            bank_account_number: data.bank_account_number,
            bank_routing_number: data.bank_routing_number,
            bank_name: data.bank_name,
            electronic_payment_method: data.electronic_payment_method,

            // Administrative & Control
            is_b2b: data.is_b2b,
            is_vip: data.is_vip,
            status: data.status,
            is_active: data.is_active || data.isActive,
            deletion_flag: data.deletion_flag,
            authorization_group: data.authorization_group,
            language_code: data.language_code,
            customer_group: data.customer_group,
            customer_type_id: data.customer_type_id,
            customer_assignment_group_id: data.customer_assignment_group_id,
            updated_by: userId
        };

        // Debug logging to track update issues
        console.log('📝 Customer PATCH request received:');
        console.log('  Customer ID:', id);
        console.log('  Request body keys:', Object.keys(req.body));
        console.log('  Sample request body values:', {
            name: req.body.name,
            email: req.body.email,
            customer_assignment_group_id: req.body.customer_assignment_group_id,
            city: req.body.city,
            country: req.body.country
        });
        console.log('  Non-undefined fields in fieldMap:', Object.entries(fieldMap).filter(([k, v]) => v !== undefined).length);

        const updates: string[] = [];
        const values: any[] = [];
        let idx = 1;

        for (const [col, val] of Object.entries(fieldMap)) {
            if (val !== undefined) {
                updates.push(`${col} = $${idx++}`);
                values.push(val);
            }
        }

        if (updates.length === 0) {
            console.error('❌ No fields to update - all values are undefined');
            console.error('  fieldMap entries:', Object.entries(fieldMap).slice(0, 10));
            return res.status(400).json({ message: "No valid fields to update" });
        }

        console.log('✅ Updating fields:', updates.slice(0, 10).join(', '), '...', `(${updates.length} total)`);

        updates.push(`updated_at = NOW()`);
        values.push(id);

        const query = `
      UPDATE erp_customers 
      SET ${updates.join(', ')} 
      WHERE id = $${idx} 
      RETURNING *
    `;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Customer not found" });
        }

        console.log('✅ Customer updated successfully:', result.rows[0].customer_code);

        // Note: Addresses are managed separately through /api/customers/:customerId/addresses endpoint
        return res.json(result.rows[0]);

    } catch (error: any) {
        console.error("Error updating customer:", error);
        return res.status(500).json({ message: "Failed to update customer", error: error.message });
    }
});

// DELETE /api/master-data/customer/:id
router.delete("/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.id || 1;

        // Soft delete
        const result = await pool.query(`
      UPDATE erp_customers 
      SET is_active = false, "_deletedAt" = NOW(), updated_by = $2, updated_at = NOW() 
      WHERE id = $1 
      RETURNING id
    `, [id, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Customer not found" });
        }

        return res.status(200).json({ message: "Customer deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting customer:", error);
        return res.status(500).json({ message: "Failed to delete customer", error: error.message });
    }
});

export default router;
