import { Router } from "express";
import { db } from "../../db";
import { loadingGroups } from "../../../shared/sales-distribution-schema";
import { eq, desc, like, or, sql } from "drizzle-orm";

const router = Router();

// GET /api/master-data/loading-groups - List all loading groups
router.get("/", async (req, res) => {
    try {
        const { search } = req.query;

        let query = db
            .select()
            .from(loadingGroups)
            .orderBy(desc(loadingGroups.createdAt));

        if (search && typeof search === "string") {
            query = query.where(
                or(
                    like(loadingGroups.code, `%${search}%`),
                    like(loadingGroups.description, `%${search}%`)
                )
            );
        }

        const results = await query;
        res.json(results);
    } catch (error) {
        console.error("Error fetching loading groups:", error);
        res.status(500).json({ error: "Failed to fetch loading groups" });
    }
});

// POST /api/master-data/loading-groups - Create new loading group
router.post("/", async (req, res) => {
    try {
        const { code, description, is_active = true } = req.body;

        // Validate required fields
        if (!code || !description) {
            return res.status(400).json({
                error: "Code and description are required",
            });
        }

        // Validate field lengths (SAP standard)
        if (code.length > 2) {
            return res.status(400).json({
                error: "Code must be maximum 2 characters",
            });
        }

        if (description.length > 20) {
            return res.status(400).json({
                error: "Description must be maximum 20 characters",
            });
        }

        // Check for duplicate code
        const existing = await db
            .select()
            .from(loadingGroups)
            .where(eq(loadingGroups.code, code))
            .limit(1);

        if (existing.length > 0) {
            return res.status(409).json({
                error: `Loading group with code "${code}" already exists`,
            });
        }

        const [newGroup] = await db
            .insert(loadingGroups)
            .values({
                code: code.toUpperCase(),
                description,
                isActive: is_active,
            })
            .returning();

        res.status(201).json(newGroup);
    } catch (error) {
        console.error("Error creating loading group:", error);
        res.status(500).json({ error: "Failed to create loading group" });
    }
});

// PUT /api/master-data/loading-groups/:id - Update loading group
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { description, is_active } = req.body;

        if (!description) {
            return res.status(400).json({
                error: "Description is required",
            });
        }

        if (description.length > 20) {
            return res.status(400).json({
                error: "Description must be maximum 20 characters",
            });
        }

        const [updated] = await db
            .update(loadingGroups)
            .set({
                description,
                isActive: is_active,
                updatedAt: new Date(),
            })
            .where(eq(loadingGroups.id, parseInt(id)))
            .returning();

        if (!updated) {
            return res.status(404).json({ error: "Loading group not found" });
        }

        res.json(updated);
    } catch (error) {
        console.error("Error updating loading group:", error);
        res.status(500).json({ error: "Failed to update loading group" });
    }
});

// DELETE /api/master-data/loading-groups/:id - Delete loading group
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [deleted] = await db
            .delete(loadingGroups)
            .where(eq(loadingGroups.id, parseInt(id)))
            .returning();

        if (!deleted) {
            return res.status(404).json({ error: "Loading group not found" });
        }

        res.json({ message: "Loading group deleted successfully" });
    } catch (error) {
        console.error("Error deleting loading group:", error);
        res.status(500).json({ error: "Failed to delete loading group" });
    }
});

// GET /api/master-data/loading-groups/generate-code - Auto-generate next code
router.get("/generate-code", async (req, res) => {
    try {
        const result = await db
            .select({ code: loadingGroups.code })
            .from(loadingGroups)
            .orderBy(desc(loadingGroups.code))
            .limit(1);

        let nextCode = "01";
        if (result.length > 0 && result[0].code) {
            const currentCode = parseInt(result[0].code);
            if (!isNaN(currentCode)) {
                nextCode = String(currentCode + 1).padStart(2, "0");
            }
        }

        res.json({ code: nextCode });
    } catch (error) {
        console.error("Error generating code:", error);
        res.status(500).json({ error: "Failed to generate code" });
    }
});

export default router;
