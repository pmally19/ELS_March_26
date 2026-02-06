import { Router } from "express";
import { db } from "../../db";
import { taxConfiguration } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/master-data/tax-configuration - Get all tax configurations
router.get("/", async (req, res) => {
  try {
    const configs = await db.select().from(taxConfiguration);
    res.json(configs);
  } catch (error) {
    console.error("Error fetching tax configurations:", error);
    res.status(500).json({ error: "Failed to fetch tax configurations" });
  }
});

// POST /api/master-data/tax-configuration - Create new tax configuration
router.post("/", async (req, res) => {
  try {
    const { 
      code, 
      description, 
      taxType,
      taxRate,
      jurisdiction,
      glAccount,
      effectiveFrom,
      effectiveTo,
      isActive = true 
    } = req.body;

    if (!code || !description || !taxType || !taxRate || !jurisdiction || !glAccount || !effectiveFrom) {
      return res.status(400).json({ 
        error: "Code, description, tax type, tax rate, jurisdiction, GL account, and effective from date are required" 
      });
    }

    const [newConfig] = await db
      .insert(taxConfiguration)
      .values({
        code,
        description,
        taxType,
        taxRate,
        jurisdiction,
        glAccount,
        effectiveFrom,
        effectiveTo,
        isActive,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    res.status(201).json(newConfig);
  } catch (error) {
    console.error("Error creating tax configuration:", error);
    res.status(500).json({ error: "Failed to create tax configuration" });
  }
});

// PUT /api/master-data/tax-configuration/:id - Update tax configuration
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      code, 
      description, 
      taxType,
      taxRate,
      jurisdiction,
      glAccount,
      effectiveFrom,
      effectiveTo,
      isActive 
    } = req.body;

    const [updatedConfig] = await db
      .update(taxConfiguration)
      .set({
        code,
        description,
        taxType,
        taxRate,
        jurisdiction,
        glAccount,
        effectiveFrom,
        effectiveTo,
        isActive,
        updatedAt: new Date()
      })
      .where(eq(taxConfiguration.id, parseInt(id)))
      .returning();

    if (!updatedConfig) {
      return res.status(404).json({ error: "Tax configuration not found" });
    }

    res.json(updatedConfig);
  } catch (error) {
    console.error("Error updating tax configuration:", error);
    res.status(500).json({ error: "Failed to update tax configuration" });
  }
});

// DELETE /api/master-data/tax-configuration/:id - Delete tax configuration
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const [deletedConfig] = await db
      .delete(taxConfiguration)
      .where(eq(taxConfiguration.id, parseInt(id)))
      .returning();

    if (!deletedConfig) {
      return res.status(404).json({ error: "Tax configuration not found" });
    }

    res.json({ message: "Tax configuration deleted successfully" });
  } catch (error) {
    console.error("Error deleting tax configuration:", error);
    res.status(500).json({ error: "Failed to delete tax configuration" });
  }
});

// POST /api/master-data/tax-configuration/bulk-import - Bulk import tax configurations
router.post("/bulk-import", async (req, res) => {
  try {
    const { configs } = req.body;

    if (!Array.isArray(configs) || configs.length === 0) {
      return res.status(400).json({ error: "No configurations provided for import" });
    }

    const validConfigs = configs.filter(config => 
      config.code && 
      config.description && 
      config.taxType && 
      config.taxRate && 
      config.jurisdiction && 
      config.glAccount && 
      config.effectiveFrom
    );

    if (validConfigs.length === 0) {
      return res.status(400).json({ error: "No valid configurations found for import" });
    }

    const formattedConfigs = validConfigs.map(config => ({
      code: config.code,
      description: config.description,
      taxType: config.taxType,
      taxRate: config.taxRate,
      jurisdiction: config.jurisdiction,
      glAccount: config.glAccount,
      effectiveFrom: config.effectiveFrom,
      effectiveTo: config.effectiveTo || null,
      isActive: config.isActive !== undefined ? config.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const importedConfigs = await db
      .insert(taxConfiguration)
      .values(formattedConfigs)
      .returning();

    res.status(201).json({
      message: `Successfully imported ${importedConfigs.length} tax configurations`,
      imported: importedConfigs
    });
  } catch (error) {
    console.error("Error bulk importing tax configurations:", error);
    res.status(500).json({ error: "Failed to import tax configurations" });
  }
});

export { router as taxConfigurationRouter };