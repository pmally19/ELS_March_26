import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { exchangeRateType, insertExchangeRateTypeSchema } from "@shared/schema";

const router = Router();

// Get all exchange rate types
router.get("/", async (req, res) => {
  try {
    const rateTypes = await db.select().from(exchangeRateType).orderBy(exchangeRateType.code);
    res.json(rateTypes);
  } catch (error) {
    console.error("Error fetching exchange rate types:", error);
    res.status(500).json({ error: "Failed to fetch exchange rate types" });
  }
});

// Get exchange rate type by ID
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [rateType] = await db
      .select()
      .from(exchangeRateType)
      .where(eq(exchangeRateType.id, id));
    
    if (!rateType) {
      return res.status(404).json({ error: "Exchange rate type not found" });
    }
    
    res.json(rateType);
  } catch (error) {
    console.error("Error fetching exchange rate type:", error);
    res.status(500).json({ error: "Failed to fetch exchange rate type" });
  }
});

// Create new exchange rate type
router.post("/", async (req, res) => {
  try {
    const validatedData = insertExchangeRateTypeSchema.parse(req.body);
    const [rateType] = await db
      .insert(exchangeRateType)
      .values(validatedData)
      .returning();
    
    res.status(201).json(rateType);
  } catch (error) {
    console.error("Error creating exchange rate type:", error);
    res.status(500).json({ error: "Failed to create exchange rate type" });
  }
});

// Update exchange rate type
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertExchangeRateTypeSchema.parse(req.body);
    
    const [rateType] = await db
      .update(exchangeRateType)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(exchangeRateType.id, id))
      .returning();
    
    if (!rateType) {
      return res.status(404).json({ error: "Exchange rate type not found" });
    }
    
    res.json(rateType);
  } catch (error) {
    console.error("Error updating exchange rate type:", error);
    res.status(500).json({ error: "Failed to update exchange rate type" });
  }
});

// Delete exchange rate type
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [rateType] = await db
      .delete(exchangeRateType)
      .where(eq(exchangeRateType.id, id))
      .returning();
    
    if (!rateType) {
      return res.status(404).json({ error: "Exchange rate type not found" });
    }
    
    res.json({ message: "Exchange rate type deleted successfully" });
  } catch (error) {
    console.error("Error deleting exchange rate type:", error);
    res.status(500).json({ error: "Failed to delete exchange rate type" });
  }
});

// Bulk import exchange rate types
router.post("/bulk-import", async (req, res) => {
  try {
    const { rateTypes } = req.body;
    
    if (!Array.isArray(rateTypes) || rateTypes.length === 0) {
      return res.status(400).json({ error: "Invalid rate types data" });
    }

    const validatedRateTypes = rateTypes.map(rateType => 
      insertExchangeRateTypeSchema.parse(rateType)
    );

    const insertedRateTypes = await db
      .insert(exchangeRateType)
      .values(validatedRateTypes)
      .returning();

    res.status(201).json({
      message: `Successfully imported ${insertedRateTypes.length} exchange rate types`,
      rateTypes: insertedRateTypes
    });
  } catch (error) {
    console.error("Error bulk importing exchange rate types:", error);
    res.status(500).json({ error: "Failed to bulk import exchange rate types" });
  }
});

export default router;