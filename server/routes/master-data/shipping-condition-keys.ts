import { Router } from "express";
import { db } from "../../db";
import { shippingConditionKeys } from "../../../shared/sales-distribution-schema";
import { eq, desc, like, or } from "drizzle-orm";

const router = Router();

// GET /api/master-data/shipping-condition-keys - List all shipping condition keys
router.get("/", async (req, res) => {
    try {
        const { search } = req.query;
        let query = db.select().from(shippingConditionKeys).orderBy(desc(shippingConditionKeys.createdAt));

        if (search && typeof search === "string") {
            query = query.where(
                or(
                    like(shippingConditionKeys.keyCode, `%${search}%`),
                    like(shippingConditionKeys.description, `%${search}%`)
                )
            ) as any;
        }

        const results = await query;
        res.json(results);
    } catch (error) {
        console.error("Error fetching shipping condition keys:", error);
        res.status(500).json({ error: "Failed to fetch shipping condition keys" });
    }
});

// POST /api/master-data/shipping-condition-keys - Create new shipping condition key
router.post("/", async (req, res) => {
    try {
        const { key_code, description, is_active = true } = req.body;

        // Validation
        if (!key_code || !description) {
            return res.status(400).json({ error: "Key code and description are required" });
        }

        if (key_code.length > 3) {
            return res.status(400).json({ error: "Key code must be maximum 3 characters" });
        }

        if (description.length > 20) {
            return res.status(400).json({ error: "Description must be maximum 20 characters" });
        }

        // Check for duplicate
        const existing = await db
            .select()
            .from(shippingConditionKeys)
            .where(eq(shippingConditionKeys.keyCode, key_code.toUpperCase()))
            .limit(1);

        if (existing.length > 0) {
            return res.status(409).json({ error: `Key "${key_code}" already exists` });
        }

        const [newKey] = await db
            .insert(shippingConditionKeys)
            .values({
                keyCode: key_code.toUpperCase(),
                description,
                isActive: is_active,
            })
            .returning();

        res.status(201).json(newKey);
    } catch (error) {
        console.error("Error creating shipping condition key:", error);
        res.status(500).json({ error: "Failed to create shipping condition key" });
    }
});

// PUT /api/master-data/shipping-condition-keys/:id - Update shipping condition key
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
            .update(shippingConditionKeys)
            .set({
                description,
                isActive: is_active,
                updatedAt: new Date(),
            })
            .where(eq(shippingConditionKeys.id, parseInt(id)))
            .returning();

        if (!updated) {
            return res.status(404).json({ error: "Shipping condition key not found" });
        }

        res.json(updated);
    } catch (error) {
        console.error("Error updating shipping condition key:", error);
        res.status(500).json({ error: "Failed to update shipping condition key" });
    }
});

// DELETE /api/master-data/shipping-condition-keys/:id - Delete shipping condition key
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [deleted] = await db
            .delete(shippingConditionKeys)
            .where(eq(shippingConditionKeys.id, parseInt(id)))
            .returning();

        if (!deleted) {
            return res.status(404).json({ error: "Shipping condition key not found" });
        }

        res.json({ message: "Shipping condition key deleted successfully" });
    } catch (error) {
        console.error("Error deleting shipping condition key:", error);
        res.status(500).json({ error: "Failed to delete shipping condition key" });
    }
});

export default router;
