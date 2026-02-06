import { Router } from "express";
import { z } from "zod";
import { db } from "../../db";
import { regions } from "@shared/schema";
import { eq } from "drizzle-orm";
import * as xlsx from "xlsx";

const router = Router();

// Validation schemas
const regionSchema = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  isActive: z.boolean().default(true)
});

// GET /api/master-data/regions
router.get("/", async (req, res) => {
  try {
    const allRegions = await db.select().from(regions).orderBy(regions.name);
    res.json(allRegions);
  } catch (error) {
    console.error("Error fetching regions:", error);
    res.status(500).json({ error: "Failed to fetch regions" });
  }
});

// GET /api/master-data/regions/:id
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [region] = await db.select().from(regions).where(eq(regions.id, id));
    
    if (!region) {
      return res.status(404).json({ error: "Region not found" });
    }
    
    res.json(region);
  } catch (error) {
    console.error("Error fetching region:", error);
    res.status(500).json({ error: "Failed to fetch region" });
  }
});

// POST /api/master-data/regions
router.post("/", async (req, res) => {
  try {
    const validatedData = regionSchema.parse(req.body);
    
    const [newRegion] = await db
      .insert(regions)
      .values({
        ...validatedData,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    res.status(201).json(newRegion);
  } catch (error) {
    console.error("Error creating region:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: error.errors });
    } else {
      res.status(500).json({ error: "Failed to create region" });
    }
  }
});

// PUT /api/master-data/regions/:id
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = regionSchema.partial().parse(req.body);

    const [updatedRegion] = await db
      .update(regions)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(regions.id, id))
      .returning();

    if (!updatedRegion) {
      return res.status(404).json({ error: "Region not found" });
    }

    res.json(updatedRegion);
  } catch (error) {
    console.error("Error updating region:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: error.errors });
    } else {
      res.status(500).json({ error: "Failed to update region" });
    }
  }
});

// DELETE /api/master-data/regions/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const [deletedRegion] = await db
      .delete(regions)
      .where(eq(regions.id, id))
      .returning();

    if (!deletedRegion) {
      return res.status(404).json({ error: "Region not found" });
    }

    res.json({ message: "Region deleted successfully" });
  } catch (error) {
    console.error("Error deleting region:", error);
    res.status(500).json({ error: "Failed to delete region" });
  }
});

// POST /api/master-data/regions/import
router.post("/import", async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.files.file as any;
    const workbook = xlsx.read(file.data, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    let imported = 0;
    const errors: string[] = [];

    for (const row of data) {
      try {
        const regionData = {
          code: (row as any).Code || (row as any).code,
          name: (row as any).Name || (row as any).name,
          description: (row as any).Description || (row as any).description,
          isActive: (row as any).Active !== "No" && (row as any).isActive !== false
        };

        const validatedData = regionSchema.parse(regionData);
        
        await db.insert(regions).values({
          ...validatedData,
          createdAt: new Date(),
          updatedAt: new Date()
        }).onConflictDoNothing();

        imported++;
      } catch (error) {
        errors.push(`Row ${imported + errors.length + 1}: ${error instanceof Error ? error.message : 'Invalid data'}`);
      }
    }

    res.json({ imported, errors });
  } catch (error) {
    console.error("Error importing regions:", error);
    res.status(500).json({ error: "Failed to import regions" });
  }
});

export default router;
