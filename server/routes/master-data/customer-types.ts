import { Router } from "express";
import { z } from "zod";
import { db } from "../../db";
import { customerTypes } from "@shared/schema";
import { eq } from "drizzle-orm";
import * as xlsx from "xlsx";

const router = Router();

// Validation schemas
const customerTypeSchema = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  category: z.string().max(50).optional(),
  requiresTaxId: z.boolean().default(false),
  requiresRegistration: z.boolean().default(false),
  defaultPaymentTerms: z.string().max(10).optional(),
  defaultCreditLimit: z.string().optional(),
  defaultCurrency: z.string().max(3).optional(),
  businessRules: z.any().optional(),
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true)
});

// GET /api/master-data/customer-types
router.get("/", async (req, res) => {
  try {
    const allCustomerTypes = await db.select().from(customerTypes).orderBy(customerTypes.sortOrder, customerTypes.name);
    res.json(allCustomerTypes);
  } catch (error) {
    console.error("Error fetching customer types:", error);
    res.status(500).json({ error: "Failed to fetch customer types" });
  }
});

// GET /api/master-data/customer-types/:id
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [customerType] = await db.select().from(customerTypes).where(eq(customerTypes.id, id));
    
    if (!customerType) {
      return res.status(404).json({ error: "Customer type not found" });
    }
    
    res.json(customerType);
  } catch (error) {
    console.error("Error fetching customer type:", error);
    res.status(500).json({ error: "Failed to fetch customer type" });
  }
});

// POST /api/master-data/customer-types
router.post("/", async (req, res) => {
  try {
    const validatedData = customerTypeSchema.parse(req.body);
    
    const [newCustomerType] = await db
      .insert(customerTypes)
      .values({
        ...validatedData,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    res.status(201).json(newCustomerType);
  } catch (error) {
    console.error("Error creating customer type:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: error.errors });
    } else {
      res.status(500).json({ error: "Failed to create customer type" });
    }
  }
});

// PUT /api/master-data/customer-types/:id
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = customerTypeSchema.partial().parse(req.body);

    const [updatedCustomerType] = await db
      .update(customerTypes)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(customerTypes.id, id))
      .returning();

    if (!updatedCustomerType) {
      return res.status(404).json({ error: "Customer type not found" });
    }

    res.json(updatedCustomerType);
  } catch (error) {
    console.error("Error updating customer type:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: error.errors });
    } else {
      res.status(500).json({ error: "Failed to update customer type" });
    }
  }
});

// DELETE /api/master-data/customer-types/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const [deletedCustomerType] = await db
      .delete(customerTypes)
      .where(eq(customerTypes.id, id))
      .returning();

    if (!deletedCustomerType) {
      return res.status(404).json({ error: "Customer type not found" });
    }

    res.json({ message: "Customer type deleted successfully" });
  } catch (error) {
    console.error("Error deleting customer type:", error);
    res.status(500).json({ error: "Failed to delete customer type" });
  }
});

// POST /api/master-data/customer-types/import
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
        const customerTypeData = {
          code: (row as any).Code || (row as any).code,
          name: (row as any).Name || (row as any).name,
          description: (row as any).Description || (row as any).description,
          category: (row as any).Category || (row as any).category,
          requiresTaxId: (row as any)["Requires Tax ID"] === "Yes" || (row as any).requiresTaxId === true,
          requiresRegistration: (row as any)["Requires Registration"] === "Yes" || (row as any).requiresRegistration === true,
          defaultPaymentTerms: (row as any)["Default Payment Terms"] || (row as any).defaultPaymentTerms,
          defaultCreditLimit: (row as any)["Default Credit Limit"] || (row as any).defaultCreditLimit,
          defaultCurrency: (row as any)["Default Currency"] || (row as any).defaultCurrency,
          sortOrder: (row as any)["Sort Order"] || (row as any).sortOrder || 0,
          isActive: (row as any).Active !== "No" && (row as any).isActive !== false
        };

        const validatedData = customerTypeSchema.parse(customerTypeData);
        
        await db.insert(customerTypes).values({
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
    console.error("Error importing customer types:", error);
    res.status(500).json({ error: "Failed to import customer types" });
  }
});

export default router;

