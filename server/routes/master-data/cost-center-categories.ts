import { Router, Request, Response } from "express";
import { db } from "../../db";
import { costCenterCategories, insertCostCenterCategorySchema } from "@shared/cost-center-categories-schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// GET all cost center categories
router.get("/", async (_req: Request, res: Response) => {
    try {
        const allCategories = await db
            .select()
            .from(costCenterCategories)
            .orderBy(desc(costCenterCategories.created_at));
        return res.json(allCategories);
    } catch (error: any) {
        console.error("Error fetching cost center categories:", error);
        return res.status(500).json({ error: "Failed to fetch cost center categories" });
    }
});

// POST new cost center category
router.post("/", async (req: Request, res: Response) => {
    try {
        const validation = insertCostCenterCategorySchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: "Validation error", details: validation.error.format() });
        }

        const { code, name, description } = validation.data;
        const existing = await db
            .select()
            .from(costCenterCategories)
            .where(eq(costCenterCategories.code, code));

        if (existing.length > 0) {
            return res.status(409).json({ error: `Category with code '${code}' already exists` });
        }

        const newCategory = await db
            .insert(costCenterCategories)
            .values({ code, name, description })
            .returning();

        return res.status(201).json(newCategory[0]);
    } catch (error: any) {
        console.error("Error creating cost center category:", error);
        return res.status(500).json({ error: "Failed to create cost center category" });
    }
});

// PUT update cost center category
router.put("/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

        const validation = insertCostCenterCategorySchema.partial().safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: "Validation error", details: validation.error.format() });
        }

        const { code, name, description } = validation.data;
        const updateData: any = {};
        if (code !== undefined) updateData.code = code;
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        updateData.updated_at = new Date();

        const updatedCategory = await db
            .update(costCenterCategories)
            .set(updateData)
            .where(eq(costCenterCategories.id, id))
            .returning();

        if (updatedCategory.length === 0) {
            return res.status(404).json({ error: "Category not found" });
        }

        return res.json(updatedCategory[0]);
    } catch (error: any) {
        console.error("Error updating cost center category:", error);
        return res.status(500).json({ error: "Failed to update cost center category" });
    }
});

// Bulk Import cost center categories
router.post("/bulk-import", async (req: Request, res: Response) => {
    try {
        const { categories } = req.body;
        if (!Array.isArray(categories)) {
            return res.status(400).json({ error: "Invalid data format. Expected 'categories' array." });
        }

        const stats = {
            created: [] as any[],
            errors: [] as string[]
        };

        for (const category of categories) {
            try {
                // Validation (manual or reuse schema)
                const validation = insertCostCenterCategorySchema.safeParse(category);
                if (!validation.success) {
                    stats.errors.push(`Validation failed for category '${category.code || 'unknown'}': ${validation.error.issues.map(i => i.message).join(', ')}`);
                    continue;
                }

                const { code, name, description } = validation.data;
                const existing = await db
                    .select()
                    .from(costCenterCategories)
                    .where(eq(costCenterCategories.code, code));

                if (existing.length > 0) {
                    // Update existing if exists (or skip? usually skip or update, let's update for now or error)
                    // For bulk import, usually we want to be safe. If it exists, let's skip/error for now to avoid accidental overwrites unless explicit.
                    // But user might expect "Upsert". Let's stick to simple "Create if new" for now to match other patterns, or "Upsert" if robust.
                    // The other import seems to return "failed" messages. Let's just try to insert and catch duplicates.
                    stats.errors.push(`Category with code '${code}' already exists`);
                    continue;
                }

                const newCategory = await db
                    .insert(costCenterCategories)
                    .values({ code, name, description })
                    .returning();

                stats.created.push(newCategory[0]);

            } catch (error: any) {
                stats.errors.push(`Failed to process category '${category.code}': ${error.message}`);
            }
        }

        return res.json(stats);

    } catch (error: any) {
        console.error("Error processing bulk import:", error);
        return res.status(500).json({ error: "Failed to process bulk import" });
    }
});

// DELETE cost center category
router.delete("/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

        const deletedCategory = await db
            .delete(costCenterCategories)
            .where(eq(costCenterCategories.id, id))
            .returning();

        if (deletedCategory.length === 0) {
            return res.status(404).json({ error: "Category not found" });
        }

        return res.status(204).send();
    } catch (error: any) {
        console.error("Error deleting cost center category:", error);
        return res.status(500).json({ error: "Failed to delete cost center category" });
    }
});

export default router;
