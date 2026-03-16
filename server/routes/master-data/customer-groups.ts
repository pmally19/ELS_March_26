import { Router } from "express";
import { z } from "zod";
import { db } from "../../db";
import { customerGroups } from "@shared/schema";
import { eq } from "drizzle-orm";
import * as xlsx from "xlsx";
const router = Router();

// Validation schemas
const customerGroupSchema = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  accountGroupId: z.number().optional(),
  reconciliationAccountId: z.number().optional(),
  creditLimitGroupId: z.number().optional(),
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true)
});

// GET /api/master-data/customer-groups
router.get("/", async (req, res) => {
  try {
    const allCustomerGroups = await db
      .select()
      .from(customerGroups)
      .orderBy(customerGroups.sortOrder, customerGroups.name);
    
    res.json(allCustomerGroups);
  } catch (error) {
    console.error("Error fetching customer groups:", error);
    res.status(500).json({ error: "Failed to fetch customer groups" });
  }
});

// POST /api/master-data/customer-groups
router.post("/", async (req, res) => {
  try {
    const validatedData = customerGroupSchema.parse(req.body);
    
    const [newCustomerGroup] = await db
      .insert(customerGroups)
      .values(validatedData)
      .returning();

    res.status(201).json(newCustomerGroup);
  } catch (error) {
    console.error("Error creating customer group:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: error.errors });
    } else {
      res.status(500).json({ error: "Failed to create customer group" });
    }
  }
});

// PUT /api/master-data/customer-groups/:id
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = customerGroupSchema.partial().parse(req.body);

    const [updatedCustomerGroup] = await db
      .update(customerGroups)
      .set(validatedData)
      .where(eq(customerGroups.id, id))
      .returning();

    if (!updatedCustomerGroup) {
      return res.status(404).json({ error: "Customer group not found" });
    }

    res.json(updatedCustomerGroup);
  } catch (error) {
    console.error("Error updating customer group:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: error.errors });
    } else {
      res.status(500).json({ error: "Failed to update customer group" });
    }
  }
});

// DELETE /api/master-data/customer-groups/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const [deletedCustomerGroup] = await db
      .delete(customerGroups)
      .where(eq(customerGroups.id, id))
      .returning();

    if (!deletedCustomerGroup) {
      return res.status(404).json({ error: "Customer group not found" });
    }

    res.json({ message: "Customer group deleted successfully" });
  } catch (error) {
    console.error("Error deleting customer group:", error);
    res.status(500).json({ error: "Failed to delete customer group" });
  }
});

// POST /api/master-data/customer-groups/import
router.post("/import", async (req, res) => {
  try {
    if (!req.files || (Array.isArray(req.files) ? !req.files[0] : !(req.files as any).file)) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = Array.isArray(req.files) ? req.files[0] : (req.files as any).file;
    if (!file || !file.data) {
      return res.status(400).json({ error: "Invalid file format" });
    }
    const workbook = xlsx.read(file.data, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    let imported = 0;
    const errors: string[] = [];

    for (const row of data) {
      try {
        const customerGroupData = {
          code: (row as any).Code || (row as any).code,
          name: (row as any).Name || (row as any).name || (row as any).Description || (row as any).description,
          description: (row as any).Description || (row as any).description,
          accountGroupId: (row as any)["Account Group ID"] || (row as any).accountGroupId ? parseInt((row as any)["Account Group ID"] || (row as any).accountGroupId) : undefined,
          reconciliationAccountId: (row as any)["Reconciliation Account ID"] || (row as any).reconciliationAccountId ? parseInt((row as any)["Reconciliation Account ID"] || (row as any).reconciliationAccountId) : undefined,
          creditLimitGroupId: (row as any)["Credit Limit Group ID"] || (row as any).creditLimitGroupId ? parseInt((row as any)["Credit Limit Group ID"] || (row as any).creditLimitGroupId) : undefined,
          sortOrder: (row as any)["Sort Order"] || (row as any).sortOrder || 0,
          isActive: (row as any).Active !== "No" && (row as any).isActive !== false
        };

        const validatedData = customerGroupSchema.parse(customerGroupData);
        
        await db.insert(customerGroups).values(validatedData);

        imported++;
      } catch (error) {
        errors.push(`Row ${imported + errors.length + 1}: ${error instanceof Error ? error.message : 'Invalid data'}`);
      }
    }

    res.json({ imported, errors });
  } catch (error) {
    console.error("Error importing customer groups:", error);
    res.status(500).json({ error: "Failed to import customer groups" });
  }
});

export default router;