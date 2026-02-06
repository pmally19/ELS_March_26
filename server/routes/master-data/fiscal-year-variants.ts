/**
 * Fiscal Year Variants API Routes
 * Handles CRUD operations for fiscal year variants
 */

import { Request, Response, Router } from "express";
import { db } from "../../db";
import { fiscalYearVariants } from "@shared/schema";
import { eq } from "drizzle-orm";
import { insertFiscalYearVariantSchema, updateFiscalYearVariantSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// GET /api/master-data/fiscal-year-variants - Get all fiscal year variants
router.get("/", async (req: Request, res: Response) => {
  try {
    const variants = await db.select().from(fiscalYearVariants).orderBy(fiscalYearVariants.variant_id);
    res.json(variants);
  } catch (error: any) {
    console.error("Error fetching fiscal year variants:", error);
    res.status(500).json({
      message: "Failed to fetch fiscal year variants",
      error: error.message
    });
  }
});

// GET /api/master-data/fiscal-year-variants/:id - Get fiscal year variant by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const [variant] = await db.select().from(fiscalYearVariants).where(eq(fiscalYearVariants.id, id));

    if (!variant) {
      return res.status(404).json({ error: "Fiscal year variant not found" });
    }

    res.json(variant);
  } catch (error: any) {
    console.error("Error fetching fiscal year variant:", error);
    res.status(500).json({ error: "Failed to fetch fiscal year variant" });
  }
});

// POST /api/master-data/fiscal-year-variants - Create new fiscal year variant
router.post("/", async (req: Request, res: Response) => {
  try {
    // Validate request body
    // Validate request body
    let requestBody = req.body;
    if (typeof requestBody === 'string') {
      try {
        requestBody = JSON.parse(requestBody);
      } catch (e) {
        console.error("Failed to parse request body:", e);
      }
    }

    const validatedData = insertFiscalYearVariantSchema.parse(requestBody);

    // Check if variant_id already exists
    const existingVariant = await db
      .select()
      .from(fiscalYearVariants)
      .where(eq(fiscalYearVariants.variant_id, validatedData.variant_id))
      .limit(1);

    if (existingVariant.length > 0) {
      return res.status(409).json({
        error: "Fiscal year variant with this ID already exists"
      });
    }

    // Insert new variant
    const [variant] = await db
      .insert(fiscalYearVariants)
      .values(validatedData)
      .returning();

    res.status(201).json(variant);
  } catch (error: any) {
    console.error("Error creating fiscal year variant:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation error",
        details: error.errors
      });
    }

    if (error.code === "23505") {
      return res.status(409).json({
        error: "Fiscal year variant with this ID already exists"
      });
    }

    res.status(500).json({ error: "Failed to create fiscal year variant" });
  }
});

// PUT /api/master-data/fiscal-year-variants/:id - Update fiscal year variant
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Check if variant exists
    const [existingVariant] = await db
      .select()
      .from(fiscalYearVariants)
      .where(eq(fiscalYearVariants.id, id));

    if (!existingVariant) {
      return res.status(404).json({ error: "Fiscal year variant not found" });
    }

    // Validate request body
    // Validate request body
    let requestBody = req.body;
    if (typeof requestBody === 'string') {
      try {
        requestBody = JSON.parse(requestBody);
      } catch (e) {
        console.error("Failed to parse request body:", e);
      }
    }

    const validatedData = updateFiscalYearVariantSchema.parse(requestBody);

    // Check if variant_id is being changed and if new one already exists
    if (validatedData.variant_id && validatedData.variant_id !== existingVariant.variant_id) {
      const existingWithNewId = await db
        .select()
        .from(fiscalYearVariants)
        .where(eq(fiscalYearVariants.variant_id, validatedData.variant_id))
        .limit(1);

      if (existingWithNewId.length > 0) {
        return res.status(409).json({
          error: "Fiscal year variant with this ID already exists"
        });
      }
    }

    // Update variant
    const [updatedVariant] = await db
      .update(fiscalYearVariants)
      .set({
        ...validatedData,
        updated_at: new Date()
      })
      .where(eq(fiscalYearVariants.id, id))
      .returning();

    res.json(updatedVariant);
  } catch (error: any) {
    console.error("Error updating fiscal year variant:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation error",
        details: error.errors
      });
    }

    if (error.code === "23505") {
      return res.status(409).json({
        error: "Fiscal year variant with this ID already exists"
      });
    }

    res.status(500).json({ error: "Failed to update fiscal year variant" });
  }
});

// DELETE /api/master-data/fiscal-year-variants/:id - Delete fiscal year variant
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Check if variant exists
    const [existingVariant] = await db
      .select()
      .from(fiscalYearVariants)
      .where(eq(fiscalYearVariants.id, id));

    if (!existingVariant) {
      return res.status(404).json({ error: "Fiscal year variant not found" });
    }

    // Check for referential integrity (check if used in other tables)
    // This is a soft check - actual foreign key constraints would prevent deletion
    // For now, we'll allow deletion and let the database handle constraints

    // Delete variant
    await db
      .delete(fiscalYearVariants)
      .where(eq(fiscalYearVariants.id, id));

    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting fiscal year variant:", error);

    if (error.code === "23503") {
      return res.status(409).json({
        error: "Cannot delete fiscal year variant: it is referenced by other records"
      });
    }

    res.status(500).json({ error: "Failed to delete fiscal year variant" });
  }
});

export default router;

