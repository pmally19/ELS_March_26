
import { Router } from "express";
import { db } from "../../db";
import { shippingPointDetermination } from "@shared/sales-distribution-schema";
import { insertShippingPointDeterminationSchema } from "@shared/sales-distribution-schema";
import { eq, and, ilike, desc, or } from "drizzle-orm";

const router = Router();

// GET all rules
router.get("/", async (req, res) => {
    try {
        const { search, limit = "100", offset = "0", sort_by = "createdAt", sort_order = "desc" } = req.query;

        let query = db.select().from(shippingPointDetermination);
        const conditions = [];

        if (search && typeof search === 'string') {
            conditions.push(or(
                ilike(shippingPointDetermination.shippingConditionKey, `%${search}%`),
                ilike(shippingPointDetermination.loadingGroupCode, `%${search}%`),
                ilike(shippingPointDetermination.plantCode, `%${search}%`),
                ilike(shippingPointDetermination.proposedShippingPoint, `%${search}%`)
            ));
        }

        if (conditions.length > 0) {
            query.where(and(...conditions));
        }

        const data = await query
            .limit(parseInt(limit as string))
            .offset(parseInt(offset as string))
            .orderBy(sort_order === "asc" ? shippingPointDetermination[sort_by as keyof typeof shippingPointDetermination] : desc(shippingPointDetermination[sort_by as keyof typeof shippingPointDetermination]));

        res.json(data);
    } catch (error: any) {
        console.error("Error fetching shipping point determination rules:", error);
        res.status(500).json({ message: "Failed to fetch rules", error: error.message });
    }
});

// GET single rule
router.get("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await db.select().from(shippingPointDetermination).where(eq(shippingPointDetermination.id, id));

        if (result.length === 0) {
            return res.status(404).json({ message: "Rule not found" });
        }
        res.json(result[0]);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch rule", error: error.message });
    }
});

// POST create rule
router.post("/", async (req, res) => {
    try {
        const data = insertShippingPointDeterminationSchema.parse(req.body);

        // Check for duplicates
        const existing = await db.select().from(shippingPointDetermination).where(and(
            eq(shippingPointDetermination.shippingConditionKey, data.shippingConditionKey),
            eq(shippingPointDetermination.loadingGroupCode, data.loadingGroupCode),
            eq(shippingPointDetermination.plantCode, data.plantCode)
        ));

        if (existing.length > 0) {
            return res.status(400).json({ message: "Rule already exists for this combination" });
        }

        const result = await db.insert(shippingPointDetermination).values(data).returning();
        res.status(201).json(result[0]);
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ message: "Validation error", errors: error.errors });
        }
        res.status(500).json({ message: "Failed to create rule", error: error.message });
    }
});

// PUT update rule
router.put("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const data = insertShippingPointDeterminationSchema.parse(req.body);

        // Check for duplicates (excluding current record)
        const existing = await db.select().from(shippingPointDetermination).where(and(
            eq(shippingPointDetermination.shippingConditionKey, data.shippingConditionKey),
            eq(shippingPointDetermination.loadingGroupCode, data.loadingGroupCode),
            eq(shippingPointDetermination.plantCode, data.plantCode)
        ));

        if (existing.length > 0 && existing[0].id !== id) {
            return res.status(400).json({ message: "Rule already exists for this combination" });
        }

        const result = await db.update(shippingPointDetermination)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(shippingPointDetermination.id, id))
            .returning();

        if (result.length === 0) {
            return res.status(404).json({ message: "Rule not found" });
        }

        res.json(result[0]);
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ message: "Validation error", errors: error.errors });
        }
        res.status(500).json({ message: "Failed to update rule", error: error.message });
    }
});

// DELETE rule
router.delete("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await db.delete(shippingPointDetermination).where(eq(shippingPointDetermination.id, id)).returning();

        if (result.length === 0) {
            return res.status(404).json({ message: "Rule not found" });
        }

        res.json({ message: "Rule deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to delete rule", error: error.message });
    }
});

export default router;
