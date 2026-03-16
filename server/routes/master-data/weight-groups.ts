import { Router } from "express";
import { db } from "../../db";
import { weightGroups } from "../../../shared/sales-distribution-schema";
import { eq, desc, like, or } from "drizzle-orm";

const router = Router();

// GET /api/master-data/weight-groups - List all weight groups
router.get("/", async (req, res) => {
    try {
        const { search } = req.query;
        let query = db.select().from(weightGroups).orderBy(desc(weightGroups.createdAt));

        if (search && typeof search === "string") {
            query = query.where(
                or(
                    like(weightGroups.code, `%${search}%`),
                    like(weightGroups.description, `%${search}%`)
                )
            ) as any;
        }

        const results = await query;
        res.json(results);
    } catch (error) {
        console.error("Error fetching weight groups:", error);
        res.status(500).json({ error: "Failed to fetch weight groups" });
    }
});

// POST /api/master-data/weight-groups - Create new weight group
router.post("/", async (req, res) => {
    try {
        const { code, description, is_active = true } = req.body;

        // Validation
        if (!code || !description) {
            return res.status(400).json({ error: "Code and description are required" });
        }

        if (code.length > 4) {
            return res.status(400).json({ error: "Code must be maximum 4 characters" });
        }

        if (description.length > 20) {
            return res.status(400).json({ error: "Description must be maximum 20 characters" });
        }

        // Check for duplicate
        const existing = await db
            .select()
            .from(weightGroups)
            .where(eq(weightGroups.code, code.toUpperCase()))
            .limit(1);

        if (existing.length > 0) {
            return res.status(409).json({ error: `Code "${code}" already exists` });
        }

        const [newGroup] = await db
            .insert(weightGroups)
            .values({
                code: code.toUpperCase(),
                description,
                isActive: is_active,
            })
            .returning();

        res.status(201).json(newGroup);
    } catch (error) {
        console.error("Error creating weight group:", error);
        res.status(500).json({ error: "Failed to create weight group" });
    }
});

// PUT /api/master-data/weight-groups/:id - Update weight group
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { description, is_active } = req.body;

        if (!description) {
            return res.status(400).json({ error: "Description is required" });
        }

        if (description.length > 20) {
            return res.status(400).json({ error: "Description must be maximum 20 characters" });
        }

        const [updated] = await db
            .update(weightGroups)
            .set({
                description,
                isActive: is_active,
                updatedAt: new Date(),
            })
            .where(eq(weightGroups.id, parseInt(id)))
            .returning();

        if (!updated) {
            return res.status(404).json({ error: "Weight group not found" });
        }

        res.json(updated);
    } catch (error) {
        console.error("Error updating weight group:", error);
        res.status(500).json({ error: "Failed to update weight group" });
    }
});

// DELETE /api/master-data/weight-groups/:id - Delete weight group
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [deleted] = await db
            .delete(weightGroups)
            .where(eq(weightGroups.id, parseInt(id)))
            .returning();

        if (!deleted) {
            return res.status(404).json({ error: "Weight group not found" });
        }

        res.json({ message: "Weight group deleted successfully" });
    } catch (error) {
        console.error("Error deleting weight group:", error);
        res.status(500).json({ error: "Failed to delete weight group" });
    }
});

export default router;
