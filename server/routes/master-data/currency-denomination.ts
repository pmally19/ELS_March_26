import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { currencyDenomination, insertCurrencyDenominationSchema } from "@shared/schema";

const router = Router();

// Get all currency denominations
router.get("/", async (req, res) => {
  try {
    const denominations = await db.select().from(currencyDenomination).orderBy(currencyDenomination.code);
    res.json(denominations);
  } catch (error) {
    console.error("Error fetching currency denominations:", error);
    res.status(500).json({ error: "Failed to fetch currency denominations" });
  }
});

// Get currency denomination by ID
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [denomination] = await db
      .select()
      .from(currencyDenomination)
      .where(eq(currencyDenomination.id, id));
    
    if (!denomination) {
      return res.status(404).json({ error: "Currency denomination not found" });
    }
    
    res.json(denomination);
  } catch (error) {
    console.error("Error fetching currency denomination:", error);
    res.status(500).json({ error: "Failed to fetch currency denomination" });
  }
});

// Create new currency denomination
router.post("/", async (req, res) => {
  try {
    const validatedData = insertCurrencyDenominationSchema.parse(req.body);
    const [denomination] = await db
      .insert(currencyDenomination)
      .values(validatedData)
      .returning();
    
    res.status(201).json(denomination);
  } catch (error) {
    console.error("Error creating currency denomination:", error);
    res.status(500).json({ error: "Failed to create currency denomination" });
  }
});

// Update currency denomination
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertCurrencyDenominationSchema.parse(req.body);
    
    const [denomination] = await db
      .update(currencyDenomination)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(currencyDenomination.id, id))
      .returning();
    
    if (!denomination) {
      return res.status(404).json({ error: "Currency denomination not found" });
    }
    
    res.json(denomination);
  } catch (error) {
    console.error("Error updating currency denomination:", error);
    res.status(500).json({ error: "Failed to update currency denomination" });
  }
});

// Delete currency denomination
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [denomination] = await db
      .delete(currencyDenomination)
      .where(eq(currencyDenomination.id, id))
      .returning();
    
    if (!denomination) {
      return res.status(404).json({ error: "Currency denomination not found" });
    }
    
    res.json({ message: "Currency denomination deleted successfully" });
  } catch (error) {
    console.error("Error deleting currency denomination:", error);
    res.status(500).json({ error: "Failed to delete currency denomination" });
  }
});

// Bulk import currency denominations
router.post("/bulk-import", async (req, res) => {
  try {
    const { denominations } = req.body;
    
    if (!Array.isArray(denominations) || denominations.length === 0) {
      return res.status(400).json({ error: "Invalid denominations data" });
    }

    const validatedDenominations = denominations.map(denomination => 
      insertCurrencyDenominationSchema.parse(denomination)
    );

    const insertedDenominations = await db
      .insert(currencyDenomination)
      .values(validatedDenominations)
      .returning();

    res.status(201).json({
      message: `Successfully imported ${insertedDenominations.length} currency denominations`,
      denominations: insertedDenominations
    });
  } catch (error) {
    console.error("Error bulk importing currency denominations:", error);
    res.status(500).json({ error: "Failed to bulk import currency denominations" });
  }
});

export default router;