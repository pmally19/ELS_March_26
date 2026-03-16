import { Router } from "express";
import { z } from "zod";
import { db } from "../../db";
import { vendorGroups } from "@shared/schema";
import { eq } from "drizzle-orm";
import * as xlsx from "xlsx";

const router = Router();

// Validation schemas
const vendorGroupSchema = z.object({
  code: z.string().min(1),
  description: z.string().min(1),
  accountGroup: z.string().optional(),
  reconciliationAccount: z.string().optional(),
  isActive: z.boolean().default(true)
});

// GET /api/master-data/vendor-groups
router.get("/", async (req, res) => {
  try {
    const allVendorGroups = await db.select().from(vendorGroups);
    res.json(allVendorGroups);
  } catch (error) {
    console.error("Error fetching vendor groups:", error);
    res.status(500).json({ error: "Failed to fetch vendor groups" });
  }
});

// POST /api/master-data/vendor-groups
router.post("/", async (req, res) => {
  try {
    const validatedData = vendorGroupSchema.parse(req.body);
    
    const [newVendorGroup] = await db
      .insert(vendorGroups)
      .values({
        ...validatedData,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    res.status(201).json(newVendorGroup);
  } catch (error) {
    console.error("Error creating vendor group:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: error.errors });
    } else {
      res.status(500).json({ error: "Failed to create vendor group" });
    }
  }
});

// PUT /api/master-data/vendor-groups/:id
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = vendorGroupSchema.partial().parse(req.body);

    const [updatedVendorGroup] = await db
      .update(vendorGroups)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(vendorGroups.id, id))
      .returning();

    if (!updatedVendorGroup) {
      return res.status(404).json({ error: "Vendor group not found" });
    }

    res.json(updatedVendorGroup);
  } catch (error) {
    console.error("Error updating vendor group:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: error.errors });
    } else {
      res.status(500).json({ error: "Failed to update vendor group" });
    }
  }
});

// DELETE /api/master-data/vendor-groups/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const [deletedVendorGroup] = await db
      .delete(vendorGroups)
      .where(eq(vendorGroups.id, id))
      .returning();

    if (!deletedVendorGroup) {
      return res.status(404).json({ error: "Vendor group not found" });
    }

    res.json({ message: "Vendor group deleted successfully" });
  } catch (error) {
    console.error("Error deleting vendor group:", error);
    res.status(500).json({ error: "Failed to delete vendor group" });
  }
});

// POST /api/master-data/vendor-groups/import
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
        const vendorGroupData = {
          code: (row as any).Code || (row as any).code,
          description: (row as any).Description || (row as any).description,
          accountGroup: (row as any)["Account Group"] || (row as any).accountGroup,
          reconciliationAccount: (row as any)["Reconciliation Account"] || (row as any).reconciliationAccount,
          isActive: (row as any).Active !== "No" && (row as any).isActive !== false
        };

        const validatedData = vendorGroupSchema.parse(vendorGroupData);
        
        await db.insert(vendorGroups).values({
          ...validatedData,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        imported++;
      } catch (error) {
        errors.push(`Row ${imported + errors.length + 1}: ${error instanceof Error ? error.message : 'Invalid data'}`);
      }
    }

    res.json({ imported, errors });
  } catch (error) {
    console.error("Error importing vendor groups:", error);
    res.status(500).json({ error: "Failed to import vendor groups" });
  }
});

export default router;