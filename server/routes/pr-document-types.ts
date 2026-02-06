import { Router } from "express";
import { db } from "../db";
import { prDocumentTypes, insertPRDocumentTypeSchema } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// GET all PR document types
router.get("/", async (req, res) => {
    try {
        const types = await db.select().from(prDocumentTypes).orderBy(prDocumentTypes.code);
        res.json(types);
    } catch (error: any) {
        console.error("Error fetching PR document types:", error);
        res.status(500).json({ error: "Failed to fetch PR document types" });
    }
});

// GET single PR document type by ID
router.get("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [type] = await db.select().from(prDocumentTypes).where(eq(prDocumentTypes.id, id));

        if (!type) {
            return res.status(404).json({ error: "PR document type not found" });
        }

        res.json(type);
    } catch (error: any) {
        console.error("Error fetching PR document type:", error);
        res.status(500).json({ error: "Failed to fetch PR document type" });
    }
});

// POST create new PR document type
router.post("/", async (req, res) => {
    try {
        const validatedData = insertPRDocumentTypeSchema.parse(req.body);

        const [newType] = await db
            .insert(prDocumentTypes)
            .values(validatedData)
            .returning();

        res.status(201).json(newType);
    } catch (error: any) {
        console.error("Error creating PR document type:", error);
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: "Document type code already exists" });
        }
        res.status(400).json({ error: error.message || "Failed to create PR document type" });
    }
});

// PUT update PR document type
router.put("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const validatedData = insertPRDocumentTypeSchema.parse(req.body);

        const [updatedType] = await db
            .update(prDocumentTypes)
            .set({ ...validatedData, updatedAt: new Date() })
            .where(eq(prDocumentTypes.id, id))
            .returning();

        if (!updatedType) {
            return res.status(404).json({ error: "PR document type not found" });
        }

        res.json(updatedType);
    } catch (error: any) {
        console.error("Error updating PR document type:", error);
        if (error.code === '23505') {
            return res.status(409).json({ error: "Document type code already exists" });
        }
        res.status(400).json({ error: error.message || "Failed to update PR document type" });
    }
});

// DELETE PR document type
router.delete("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const [deletedType] = await db
            .delete(prDocumentTypes)
            .where(eq(prDocumentTypes.id, id))
            .returning();

        if (!deletedType) {
            return res.status(404).json({ error: "PR document type not found" });
        }

        res.json({ message: "PR document type deleted successfully", deletedType });
    } catch (error: any) {
        console.error("Error deleting PR document type:", error);
        res.status(500).json({ error: "Failed to delete PR document type" });
    }
});

export default router;
