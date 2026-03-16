import express from 'express';
import { z } from 'zod';
import { pool } from '../../db';

const router = express.Router();

// Validation schema for document pricing procedure
const pricingProcedureSchema = z.object({
    procedure_code: z.string()
        .min(1, "Procedure code is required")
        .max(10, "Procedure code must be at most 10 characters")
        .regex(/^[A-Z0-9]+$/, "Procedure code must contain only uppercase letters and numbers"),
    procedure_name: z.string()
        .min(1, "Procedure name is required")
        .max(100, "Procedure name must be at most 100 characters"),
    description: z.string().optional(),
    pricing_control: z.enum(['Normal', 'No Pricing', 'Redetermine'], {
        errorMap: () => ({ message: "Pricing control must be Normal, No Pricing, or Redetermine" })
    }),
    manual_price_allowed: z.boolean().default(false),
    is_active: z.boolean().default(true),
});

// GET all document pricing procedures
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        id,
        procedure_code,
        procedure_name,
        description,
        pricing_control,
        manual_price_allowed,
        is_active,
        created_at,
        updated_at,
        created_by,
        updated_by,
        "_deletedAt",
        "_tenantId" as tenant_id
      FROM document_pricing_procedures
      WHERE "_deletedAt" IS NULL
      ORDER BY procedure_code ASC
    `);

        return res.status(200).json(result.rows);
    } catch (error: any) {
        console.error('Error fetching document pricing procedures:', error);
        return res.status(500).json({
            error: "Internal server error",
            message: error.message
        });
    }
});

// GET single document pricing procedure by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      SELECT 
        id,
        procedure_code,
        procedure_name,
        description,
        pricing_control,
        manual_price_allowed,
        is_active,
        created_at,
        updated_at,
        created_by,
        updated_by,
        "_deletedAt",
        "_tenantId" as tenant_id
      FROM document_pricing_procedures
      WHERE id = $1 AND "_deletedAt" IS NULL
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Pricing procedure not found" });
        }

        return res.status(200).json(result.rows[0]);
    } catch (error: any) {
        console.error('Error fetching document pricing procedure:', error);
        return res.status(500).json({
            error: "Internal server error",
            message: error.message
        });
    }
});

// POST create new document pricing procedure
router.post('/', async (req, res) => {
    try {
        const validation = pricingProcedureSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: validation.error.errors
            });
        }

        const data = validation.data;

        // Convert code to uppercase
        const procedureCode = data.procedure_code.toUpperCase();

        // Check if procedure code already exists
        const existingResult = await pool.query(`
      SELECT id FROM document_pricing_procedures 
      WHERE procedure_code = $1 AND "_deletedAt" IS NULL
    `, [procedureCode]);

        if (existingResult.rows.length > 0) {
            return res.status(400).json({
                error: "Procedure code already exists",
                message: `Pricing procedure with code '${procedureCode}' already exists`
            });
        }

        // Insert new pricing procedure
        const insertResult = await pool.query(`
      INSERT INTO document_pricing_procedures (
        procedure_code, 
        procedure_name, 
        description, 
        pricing_control,
        manual_price_allowed,
        is_active,
        created_at,
        updated_at,
        created_by,
        updated_by,
        "_tenantId"
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), $7, $8, $9)
      RETURNING *
    `, [
            procedureCode,
            data.procedure_name,
            data.description || null,
            data.pricing_control,
            data.manual_price_allowed,
            data.is_active,
            (req as any).user?.id || 1,
            (req as any).user?.id || 1,
            (req as any).user?.tenantId || '001'
        ]);

        return res.status(201).json(insertResult.rows[0]);
    } catch (error: any) {
        console.error('Error creating document pricing procedure:', error);
        return res.status(500).json({
            error: "Internal server error",
            message: error.message
        });
    }
});

// PUT update document pricing procedure
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // For updates, procedure_code should not be modified
        const updateSchema = pricingProcedureSchema.omit({ procedure_code: true });
        const validation = updateSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: validation.error.errors
            });
        }

        const data = validation.data;

        // Check if pricing procedure exists
        const existingResult = await pool.query(`
      SELECT id FROM document_pricing_procedures WHERE id = $1 AND "_deletedAt" IS NULL
            `, [id]);

        if (existingResult.rows.length === 0) {
            return res.status(404).json({ error: "Pricing procedure not found" });
        }

        // Update pricing procedure (excluding procedure_code)
        const updateResult = await pool.query(`
      UPDATE document_pricing_procedures 
      SET 
        procedure_name = $1,
            description = $2,
            pricing_control = $3,
            manual_price_allowed = $4,
            is_active = $5,
            updated_at = NOW(),
            updated_by = $6
      WHERE id = $7
      RETURNING *
    `, [
            data.procedure_name,
            data.description || null,
            data.pricing_control,
            data.manual_price_allowed,
            data.is_active,
            (req as any).user?.id || 1,
            id
        ]);

        return res.status(200).json(updateResult.rows[0]);
    } catch (error: any) {
        console.error('Error updating document pricing procedure:', error);
        return res.status(500).json({
            error: "Internal server error",
            message: error.message
        });
    }
});

// DELETE document pricing procedure
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if pricing procedure exists and is not already deleted
        const existingResult = await pool.query(`
      SELECT id FROM document_pricing_procedures WHERE id = $1 AND "_deletedAt" IS NULL
    `, [id]);

        if (existingResult.rows.length === 0) {
            return res.status(404).json({ error: "Pricing procedure not found or already deleted" });
        }

        // Soft delete the pricing procedure
        await pool.query(`
      UPDATE document_pricing_procedures 
      SET 
        is_active = false,
        "_deletedAt" = NOW(),
        updated_by = $2
      WHERE id = $1
    `, [id, (req as any).user?.id || 1]);

        return res.status(200).json({
            message: "Pricing procedure deleted successfully"
        });
    } catch (error: any) {
        console.error('Error deleting document pricing procedure:', error);

        // Check if it's a foreign key constraint error
        if (error.message && error.message.includes('foreign key')) {
            return res.status(400).json({
                error: "Cannot delete pricing procedure",
                message: "This pricing procedure is referenced by other records and cannot be deleted."
            });
        }

        return res.status(500).json({
            error: "Internal server error",
            message: error.message
        });
    }
});

export default router;
