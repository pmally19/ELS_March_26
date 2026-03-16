import { Router, Request, Response } from "express";
import { pool } from "../../db";

const router = Router();

/**
 * SAP-Standard Pricing Procedure Determination
 * Determines the document pricing procedure based on:
 * - Sales Organization CODE
 * - Distribution Channel CODE
 * - Division CODE
 * - Customer Pricing Procedure CODE
 * 
 * NOTE: Frontend sends CODEs, but table stores IDs.
 * We need to JOIN with master tables to match CODEs to IDs.
 */
router.post("/determine-procedure", async (req: Request, res: Response) => {
    try {
        const {
            sales_org_code,
            distribution_channel_code,
            division_code,
            customer_pricing_procedure,
            document_pricing_procedure
        } = req.body;

        console.log('[Pricing Determination API] Input:', {
            sales_org_code,
            distribution_channel_code,
            division_code,
            customer_pricing_procedure,
            document_pricing_procedure
        });

        // Validate required fields (SAP standard requires all 5 inputs)
        if (!sales_org_code || !distribution_channel_code || !division_code ||
            !customer_pricing_procedure || !document_pricing_procedure) {
            return res.status(400).json({
                matched: false,
                error: "Missing required fields",
                message: "sales_org_code, distribution_channel_code, division_code, customer_pricing_procedure, and document_pricing_procedure are required"
            });
        }

        // Query determination table by JOINing with master tables on CODES
        // Returns the TARGET PRICING PROCEDURE (not document pricing procedure)
        const result = await pool.query(`
      SELECT 
        ppd.id as determination_id,
        pp.procedure_code as pricing_procedure,
        pp.procedure_name as pricing_procedure_name,
        pp.description
      FROM pricing_procedure_determinations ppd
      JOIN sd_sales_organizations so ON ppd.sales_organization_id = so.id
      JOIN sd_distribution_channels dc ON ppd.distribution_channel_id = dc.id
      JOIN sd_divisions dv ON ppd.division_id = dv.id
      JOIN customer_pricing_procedures cpp ON ppd.customer_pricing_procedure_id = cpp.id
      JOIN document_pricing_procedures dpp ON ppd.document_pricing_procedure_id = dpp.id
      JOIN pricing_procedures pp ON ppd.pricing_procedure_id = pp.id
      WHERE so.code = $1
        AND dc.code = $2
        AND dv.code = $3
        AND cpp.procedure_code = $4
        AND dpp.procedure_code = $5
        AND ppd."_deletedAt" IS NULL
      LIMIT 1
    `, [sales_org_code, distribution_channel_code, division_code, customer_pricing_procedure, document_pricing_procedure]);

        if (result.rows.length === 0) {
            console.log('[Pricing Determination API] ❌ No match found');
            return res.json({
                matched: false,
                pricing_procedure: null,
                message: "No pricing procedure determination found for the given combination"
            });
        }

        const determination = result.rows[0];
        console.log('[Pricing Determination API] ✅ Match found:', determination.pricing_procedure);

        return res.json({
            matched: true,
            pricing_procedure: determination.pricing_procedure,
            pricing_procedure_name: determination.pricing_procedure_name,
            determination_id: determination.determination_id,
            description: determination.description
        });

    } catch (error: any) {
        console.error('[Pricing Determination API] Error:', error);
        return res.status(500).json({
            matched: false,
            error: "Internal server error",
            message: error.message
        });
    }
});

/**
 * Get pricing procedure dropdown options for sales orders
 */
router.get("/procedures", async (req: Request, res: Response) => {
    try {
        const result = await pool.query(`
      SELECT 
        id,
        procedure_code,
        procedure_name,
        description,
        is_active
      FROM document_pricing_procedures
      WHERE is_active = true
      ORDER BY procedure_code ASC
    `);

        return res.json(result.rows);
    } catch (error: any) {
        console.error('[Pricing Procedures] Error:', error);
        return res.status(500).json({
            error: "Failed to fetch pricing procedures",
            message: error.message
        });
    }
});

export default router;
