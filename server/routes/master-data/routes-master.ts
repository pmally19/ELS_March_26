import { Router } from "express";
import { db } from "../../db";
import { routes } from "../../../shared/sales-distribution-schema";
import { eq, desc, like, or } from "drizzle-orm";

const router = Router();

// GET all routes
router.get("/", async (req, res) => {
    try {
        const { search } = req.query;
        let query = db.select().from(routes).orderBy(desc(routes.createdAt));

        if (search && typeof search === "string") {
            query = query.where(
                or(
                    like(routes.routeCode, `%${search}%`),
                    like(routes.description, `%${search}%`)
                )
            ) as any;
        }

        const results = await query;
        res.json(results);
    } catch (error) {
        console.error("Error fetching routes:", error);
        res.status(500).json({ error: "Failed to fetch routes" });
    }
});

// POST create new route
router.post("/", async (req, res) => {
    try {
        const { routeCode, description, isActive } = req.body;

        if (!routeCode || !description) {
            return res.status(400).json({ error: "Route Code and Description are required" });
        }

        const existing = await db.select().from(routes).where(eq(routes.routeCode, routeCode)).limit(1);
        if (existing.length > 0) {
            return res.status(400).json({ error: "Route Code already exists" });
        }

        const [newRoute] = await db.insert(routes).values({
            routeCode,
            description,
            isActive: isActive !== undefined ? isActive : true
        }).returning();

        res.status(201).json(newRoute);
    } catch (error) {
        console.error("Error creating route:", error);
        res.status(500).json({ error: "Failed to create route" });
    }
});

// PUT update route
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { description, isActive } = req.body;

        const [updatedRoute] = await db
            .update(routes)
            .set({
                description,
                isActive,
                updatedAt: new Date()
            })
            .where(eq(routes.id, parseInt(id)))
            .returning();

        if (!updatedRoute) {
            return res.status(404).json({ error: "Route not found" });
        }

        res.json(updatedRoute);
    } catch (error) {
        console.error("Error updating route:", error);
        res.status(500).json({ error: "Failed to update route" });
    }
});

// DELETE route
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        await db.delete(routes).where(eq(routes.id, parseInt(id)));

        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting route:", error);
        res.status(500).json({ error: "Failed to delete route" });
    }
});

export default router;
