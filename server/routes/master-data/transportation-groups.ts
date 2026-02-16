
import { Router } from "express";
import { db } from "../../db";
import { transportationGroups, insertTransportationGroupSchema } from "../../../shared/sales-distribution-schema";
import { eq, desc, ilike, or } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// Get all transportation groups
router.get("/", async (req, res) => {
    try {
        const search = req.query.search as string;

        let query = db.select().from(transportationGroups);

        if (search) {
            query.where(
                or(
                    ilike(transportationGroups.code, `%${search}%`),
                    ilike(transportationGroups.description, `%${search}%`)
                )
            );
        }

        query.orderBy(desc(transportationGroups.createdAt));

        const results = await query;
        res.json(results);
    } catch (error) {
        console.error("Error fetching transportation groups:", error);
        res.status(500).json({ message: "Failed to fetch transportation groups" });
    }
});

// Create new transportation group
router.post("/", async (req, res) => {
    try {
        const data = insertTransportationGroupSchema.parse(req.body);

        // Check for duplicate code
        const existing = await db
            .select()
            .from(transportationGroups)
            .where(eq(transportationGroups.code, data.code))
            .limit(1);

        if (existing.length > 0) {
            return res.status(400).json({ message: "Transportation Group Code already exists" });
        }

        const result = await db.insert(transportationGroups).values(data).returning();
        res.status(201).json(result[0]);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: "Validation error", errors: error.errors });
        }
        console.error("Error creating transportation group:", error);
        res.status(500).json({ message: "Failed to create transportation group" });
    }
});

// Update transportation group
router.put("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

        const data = insertTransportationGroupSchema.partial().parse(req.body);

        const result = await db
            .update(transportationGroups)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(transportationGroups.id, id))
            .returning();

        if (result.length === 0) {
            return res.status(404).json({ message: "Transportation Group not found" });
        }

        res.json(result[0]);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: "Validation error", errors: error.errors });
        }
        console.error("Error updating transportation group:", error);
        res.status(500).json({ message: "Failed to update transportation group" });
    }
});

// Delete transportation group
router.delete("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

        const result = await db
            .delete(transportationGroups)
            .where(eq(transportationGroups.id, id))
            .returning();

        if (result.length === 0) {
            return res.status(404).json({ message: "Transportation Group not found" });
        }

        res.json({ message: "Transportation Group deleted successfully" });
    } catch (error) {
        console.error("Error deleting transportation group:", error);
        res.status(500).json({ message: "Failed to delete transportation group" });
    }
});

export default router;
