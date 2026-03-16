import { Router } from "express";
import { z } from "zod";
import { db } from "../../db";
import { states, countries, taxJurisdictions } from "@shared/schema";
import { eq } from "drizzle-orm";
import * as xlsx from "xlsx";

const router = Router();

// Validation schemas
const stateSchema = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  countryId: z.number().optional(),
  region: z.string().max(50).optional(),
  taxJurisdictionId: z.number().optional(),
  isActive: z.boolean().default(true)
});

// GET /api/master-data/states
router.get("/", async (req, res) => {
  try {
    const allStates = await db
      .select({
        id: states.id,
        code: states.code,
        name: states.name,
        description: states.description,
        countryId: states.countryId,
        region: states.region,
        taxJurisdictionId: states.taxJurisdictionId,
        isActive: states.isActive,
        createdAt: states.createdAt,
        updatedAt: states.updatedAt,
        countryCode: countries.code,
        countryName: countries.name,
        taxJurisdictionCode: taxJurisdictions.jurisdictionCode,
        taxJurisdictionName: taxJurisdictions.jurisdictionName,
      })
      .from(states)
      .leftJoin(countries, eq(states.countryId, countries.id))
      .leftJoin(taxJurisdictions, eq(states.taxJurisdictionId, taxJurisdictions.id))
      .orderBy(states.code);
    
    // Map to include country and tax jurisdiction information
    const mappedStates = allStates.map((s: any) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      description: s.description,
      countryId: s.countryId,
      region: s.region,
      taxJurisdictionId: s.taxJurisdictionId,
      isActive: s.isActive,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      countryCode: s.countryCode,
      countryName: s.countryName,
      taxJurisdictionCode: s.taxJurisdictionCode,
      taxJurisdictionName: s.taxJurisdictionName,
    }));
    
    res.json(mappedStates);
  } catch (error) {
    console.error("Error fetching states:", error);
    res.status(500).json({ error: "Failed to fetch states" });
  }
});

// GET /api/master-data/states/country/:countryId
router.get("/country/:countryId", async (req, res) => {
  try {
    const countryId = parseInt(req.params.countryId);
    
    if (isNaN(countryId)) {
      return res.status(400).json({ error: "Invalid country ID" });
    }
    
    const countryStates = await db
      .select({
        id: states.id,
        code: states.code,
        name: states.name,
        description: states.description,
        countryId: states.countryId,
        region: states.region,
        taxJurisdictionId: states.taxJurisdictionId,
        isActive: states.isActive,
        createdAt: states.createdAt,
        updatedAt: states.updatedAt,
        countryCode: countries.code,
        countryName: countries.name,
      })
      .from(states)
      .leftJoin(countries, eq(states.countryId, countries.id))
      .where(eq(states.countryId, countryId))
      .orderBy(states.name);
    
    const mappedStates = countryStates.map((s: any) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      description: s.description,
      countryId: s.countryId,
      region: s.region,
      taxJurisdictionId: s.taxJurisdictionId,
      isActive: s.isActive,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      countryCode: s.countryCode,
      countryName: s.countryName,
    }));
    
    res.json(mappedStates);
  } catch (error) {
    console.error("Error fetching states by country:", error);
    res.status(500).json({ error: "Failed to fetch states by country" });
  }
});

// GET /api/master-data/states/:id
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [state] = await db.select().from(states).where(eq(states.id, id));
    
    if (!state) {
      return res.status(404).json({ error: "State not found" });
    }
    
    res.json(state);
  } catch (error) {
    console.error("Error fetching state:", error);
    res.status(500).json({ error: "Failed to fetch state" });
  }
});

// POST /api/master-data/states
router.post("/", async (req, res) => {
  try {
    const validatedData = stateSchema.parse(req.body);
    
    const [newState] = await db
      .insert(states)
      .values(validatedData)
      .returning();

    res.status(201).json(newState);
  } catch (error) {
    console.error("Error creating state:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: error.errors });
    } else {
      res.status(500).json({ error: "Failed to create state" });
    }
  }
});

// PUT /api/master-data/states/:id
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = stateSchema.partial().parse(req.body);

    const [updatedState] = await db
      .update(states)
      .set(validatedData)
      .where(eq(states.id, id))
      .returning();

    if (!updatedState) {
      return res.status(404).json({ error: "State not found" });
    }

    res.json(updatedState);
  } catch (error) {
    console.error("Error updating state:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: error.errors });
    } else {
      res.status(500).json({ error: "Failed to update state" });
    }
  }
});

// DELETE /api/master-data/states/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const [deletedState] = await db
      .delete(states)
      .where(eq(states.id, id))
      .returning();

    if (!deletedState) {
      return res.status(404).json({ error: "State not found" });
    }

    res.json({ message: "State deleted successfully" });
  } catch (error) {
    console.error("Error deleting state:", error);
    res.status(500).json({ error: "Failed to delete state" });
  }
});

// POST /api/master-data/states/import
router.post("/import", async (req, res) => {
  try {
    if (!req.files || (Array.isArray(req.files) ? !req.files[0] : !(req.files as any).file)) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = Array.isArray(req.files) ? req.files[0] : (req.files as any).file;
    const workbook = xlsx.read(file.data, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    let imported = 0;
    const errors: string[] = [];

    for (const row of data) {
      try {
        const stateData = {
          code: (row as any).Code || (row as any).code,
          name: (row as any).Name || (row as any).name,
          description: (row as any).Description || (row as any).description,
          countryId: (row as any)["Country ID"] || (row as any).countryId || (row as any).country_id,
          region: (row as any).Region || (row as any).region,
          isActive: (row as any).Active !== "No" && (row as any).isActive !== false
        };

        const validatedData = stateSchema.parse(stateData);
        
        await db.insert(states).values(validatedData).onConflictDoNothing();

        imported++;
      } catch (error) {
        errors.push(`Row ${imported + errors.length + 1}: ${error instanceof Error ? error.message : 'Invalid data'}`);
      }
    }

    res.json({ imported, errors });
  } catch (error) {
    console.error("Error importing states:", error);
    res.status(500).json({ error: "Failed to import states" });
  }
});

export default router;

