import { Router } from "express";
import { z } from "zod";
import { db } from "../../db";
import { countries, regions } from "@shared/schema";
import { eq } from "drizzle-orm";
import * as xlsx from "xlsx";

const router = Router();

// Validation schemas
const countrySchema = z.object({
  code: z.string().min(2).max(2),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  regionId: z.number().optional(),
  region: z.string().max(50).optional(), // Keep for backward compatibility
  currencyCode: z.string().max(3).optional(),
  languageCode: z.string().max(5).optional(),
  isActive: z.boolean().default(true)
});

// GET /api/master-data/countries
router.get("/", async (req, res) => {
  try {
    const allCountries = await db
      .select({
        id: countries.id,
        code: countries.code,
        name: countries.name,
        description: countries.description,
        regionId: countries.regionId,
        region: countries.region,
        regionName: regions.name,
        currencyCode: countries.currencyCode,
        languageCode: countries.languageCode,
        isActive: countries.isActive,
        createdAt: countries.createdAt,
        updatedAt: countries.updatedAt,
      })
      .from(countries)
      .leftJoin(regions, eq(countries.regionId, regions.id))
      .orderBy(countries.code);
    
    // Map to include region name
    const mappedCountries = allCountries.map((c: any) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      description: c.description,
      regionId: c.regionId,
      region: c.regionName || c.region || null, // Use region name from join, fallback to old region field
      currencyCode: c.currencyCode,
      languageCode: c.languageCode,
      isActive: c.isActive,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
    
    res.json(mappedCountries);
  } catch (error) {
    console.error("Error fetching countries:", error);
    res.status(500).json({ error: "Failed to fetch countries" });
  }
});

// GET /api/master-data/countries/:id
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [country] = await db
      .select({
        id: countries.id,
        code: countries.code,
        name: countries.name,
        description: countries.description,
        regionId: countries.regionId,
        region: countries.region,
        regionName: regions.name,
        currencyCode: countries.currencyCode,
        languageCode: countries.languageCode,
        isActive: countries.isActive,
        createdAt: countries.createdAt,
        updatedAt: countries.updatedAt,
      })
      .from(countries)
      .leftJoin(regions, eq(countries.regionId, regions.id))
      .where(eq(countries.id, id));
    
    if (!country) {
      return res.status(404).json({ error: "Country not found" });
    }
    
    const mappedCountry = {
      id: country.id,
      code: country.code,
      name: country.name,
      description: country.description,
      regionId: country.regionId,
      region: country.regionName || country.region || null,
      currencyCode: country.currencyCode,
      languageCode: country.languageCode,
      isActive: country.isActive,
      createdAt: country.createdAt,
      updatedAt: country.updatedAt,
    };
    
    res.json(mappedCountry);
  } catch (error) {
    console.error("Error fetching country:", error);
    res.status(500).json({ error: "Failed to fetch country" });
  }
});

// POST /api/master-data/countries
router.post("/", async (req, res) => {
  try {
    const validatedData = countrySchema.parse(req.body);
    
    const [newCountry] = await db
      .insert(countries)
      .values({
        ...validatedData,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    res.status(201).json(newCountry);
  } catch (error) {
    console.error("Error creating country:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: error.errors });
    } else {
      res.status(500).json({ error: "Failed to create country" });
    }
  }
});

// PUT /api/master-data/countries/:id
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = countrySchema.partial().parse(req.body);

    const [updatedCountry] = await db
      .update(countries)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(countries.id, id))
      .returning();

    if (!updatedCountry) {
      return res.status(404).json({ error: "Country not found" });
    }

    res.json(updatedCountry);
  } catch (error) {
    console.error("Error updating country:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: error.errors });
    } else {
      res.status(500).json({ error: "Failed to update country" });
    }
  }
});

// DELETE /api/master-data/countries/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const [deletedCountry] = await db
      .delete(countries)
      .where(eq(countries.id, id))
      .returning();

    if (!deletedCountry) {
      return res.status(404).json({ error: "Country not found" });
    }

    res.json({ message: "Country deleted successfully" });
  } catch (error) {
    console.error("Error deleting country:", error);
    res.status(500).json({ error: "Failed to delete country" });
  }
});

// POST /api/master-data/countries/import
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
        const countryData = {
          code: (row as any).Code || (row as any).code,
          name: (row as any).Name || (row as any).name,
          description: (row as any).Description || (row as any).description,
          region: (row as any).Region || (row as any).region,
          currencyCode: (row as any)["Currency Code"] || (row as any).currencyCode || (row as any).currency_code,
          languageCode: (row as any)["Language Code"] || (row as any).languageCode || (row as any).language_code,
          isActive: (row as any).Active !== "No" && (row as any).isActive !== false
        };

        const validatedData = countrySchema.parse(countryData);
        
        await db.insert(countries).values({
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
    console.error("Error importing countries:", error);
    res.status(500).json({ error: "Failed to import countries" });
  }
});

export default router;

