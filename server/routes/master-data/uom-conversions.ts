import { Request, Response } from "express";
import { db } from "../../db";
import { uom, uomConversions } from "../../../shared/phase1-schema";
import { eq, and, not, sql } from "drizzle-orm";
import { z } from "zod";

// UoM Conversion validation schema
const uomConversionSchema = z.object({
  fromUomId: z.number().positive("From UoM ID is required"),
  toUomId: z.number().positive("To UoM ID is required"),
  conversionFactor: z.number().positive("Conversion factor must be positive"),
  isActive: z.boolean().default(true),
}).refine(data => data.fromUomId !== data.toUomId, {
  message: "From and To UoM cannot be the same",
  path: ["toUomId"],
});

// GET /api/master-data/uom-conversions
export const getAllConversions = async (req: Request, res: Response) => {
  try {
    // Get all conversions and UoMs
    const rawConversions = await db.select().from(uomConversions);
    const uomMap = new Map();
    
    const allUoms = await db.select().from(uom);
    allUoms.forEach(u => {
      uomMap.set(u.id, u);
    });
    
    const formattedConversions = rawConversions.map(conv => ({
      id: conv.id,
      fromUomId: conv.fromUomId,
      fromUomCode: uomMap.get(conv.fromUomId)?.code || '',
      fromUomName: uomMap.get(conv.fromUomId)?.name || '',
      toUomId: conv.toUomId,
      toUomCode: uomMap.get(conv.toUomId)?.code || '',
      toUomName: uomMap.get(conv.toUomId)?.name || '',
      conversionFactor: conv.conversionFactor,
      isActive: conv.isActive,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    }));
    
    res.json(formattedConversions);
  } catch (error) {
    console.error("Error fetching UoM conversions:", error);
    res.status(500).json({ message: "Failed to fetch UoM conversions" });
  }
};

// GET /api/master-data/uom-conversions/:id
export const getConversionById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [conversion] = await db.select().from(uomConversions).where(eq(uomConversions.id, id));
    
    if (!conversion) {
      return res.status(404).json({ message: "Conversion not found" });
    }
    
    // Get UoM details
    const [fromUom] = await db.select().from(uom).where(eq(uom.id, conversion.fromUomId));
    const [toUom] = await db.select().from(uom).where(eq(uom.id, conversion.toUomId));
    
    const formattedConversion = {
      ...conversion,
      fromUomCode: fromUom?.code || '',
      fromUomName: fromUom?.name || '',
      toUomCode: toUom?.code || '',
      toUomName: toUom?.name || '',
    };
    
    res.json(formattedConversion);
  } catch (error) {
    console.error("Error fetching UoM conversion:", error);
    res.status(500).json({ message: "Failed to fetch UoM conversion" });
  }
};

// POST /api/master-data/uom-conversions
export const createConversion = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = uomConversionSchema.parse(req.body);
    
    // Check if both UoMs exist
    const [fromUom] = await db.select().from(uom).where(eq(uom.id, validatedData.fromUomId));
    const [toUom] = await db.select().from(uom).where(eq(uom.id, validatedData.toUomId));
    
    if (!fromUom || !toUom) {
      return res.status(404).json({ message: "One or both UoMs not found" });
    }
    
    // Check if this conversion already exists
    const [existingConversion] = await db
      .select()
      .from(uomConversions)
      .where(
        and(
          eq(uomConversions.fromUomId, validatedData.fromUomId),
          eq(uomConversions.toUomId, validatedData.toUomId),
          eq(uomConversions.isActive, true)
        )
      );
    
    if (existingConversion) {
      return res.status(409).json({ 
        message: "This conversion already exists", 
        conversionId: existingConversion.id 
      });
    }
    
    // Create the conversion
    const userId = 1; // Default to admin user ID for now
    const [newConversion] = await db.insert(uomConversions)
      .values({
        fromUomId: validatedData.fromUomId,
        toUomId: validatedData.toUomId,
        conversionFactor: validatedData.conversionFactor,
        isActive: validatedData.isActive,
        createdBy: userId,
        updatedBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      })
      .returning();
    
    // Format the response
    const result = {
      ...newConversion,
      fromUomCode: fromUom.code,
      fromUomName: fromUom.name,
      toUomCode: toUom.code,
      toUomName: toUom.name,
    };
    
    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating UoM conversion:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: "Failed to create UoM conversion" });
  }
};

// PUT /api/master-data/uom-conversions/:id
export const updateConversion = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    // Validate request body - partial update allowed
    const validatedData = uomConversionSchema.partial().parse(req.body);
    
    // Check if the conversion exists
    const [existingConversion] = await db
      .select()
      .from(uomConversions)
      .where(eq(uomConversions.id, id));
    
    if (!existingConversion) {
      return res.status(404).json({ message: "Conversion not found" });
    }
    
    // If fromUomId or toUomId is changing, verify the UoMs exist
    if (validatedData.fromUomId) {
      const [fromUom] = await db.select().from(uom).where(eq(uom.id, validatedData.fromUomId));
      if (!fromUom) {
        return res.status(404).json({ message: "From UoM not found" });
      }
    }
    
    if (validatedData.toUomId) {
      const [toUom] = await db.select().from(uom).where(eq(uom.id, validatedData.toUomId));
      if (!toUom) {
        return res.status(404).json({ message: "To UoM not found" });
      }
    }
    
    // If both fromUomId and toUomId are provided, check they're not the same
    if (validatedData.fromUomId && validatedData.toUomId && 
        validatedData.fromUomId === validatedData.toUomId) {
      return res.status(400).json({ message: "From and To UoM cannot be the same" });
    }
    
    // Update the conversion
    const userId = 1; // Default to admin user ID for now
    const [updatedConversion] = await db.update(uomConversions)
      .set({
        ...validatedData,
        updatedBy: userId,
        updatedAt: new Date(),
        version: existingConversion.version + 1,
      })
      .where(eq(uomConversions.id, id))
      .returning();
    
    // Get UoM details for the response
    const [fromUom] = await db.select().from(uom).where(eq(uom.id, updatedConversion.fromUomId));
    const [toUom] = await db.select().from(uom).where(eq(uom.id, updatedConversion.toUomId));
    
    // Format the response
    const result = {
      ...updatedConversion,
      fromUomCode: fromUom?.code || '',
      fromUomName: fromUom?.name || '',
      toUomCode: toUom?.code || '',
      toUomName: toUom?.name || '',
    };
    
    res.json(result);
  } catch (error) {
    console.error("Error updating UoM conversion:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: "Failed to update UoM conversion" });
  }
};

// DELETE /api/master-data/uom-conversions/:id
export const deleteConversion = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    // Check if the conversion exists
    const [existingConversion] = await db
      .select()
      .from(uomConversions)
      .where(eq(uomConversions.id, id));
    
    if (!existingConversion) {
      return res.status(404).json({ message: "Conversion not found" });
    }
    
    // Instead of actually deleting, we'll deactivate the conversion
    const userId = 1; // Default to admin user ID for now
    const [updatedConversion] = await db.update(uomConversions)
      .set({
        isActive: false,
        updatedBy: userId,
        updatedAt: new Date(),
        version: existingConversion.version + 1,
      })
      .where(eq(uomConversions.id, id))
      .returning();
    
    // Get UoM details for the response
    const [fromUom] = await db.select().from(uom).where(eq(uom.id, updatedConversion.fromUomId));
    const [toUom] = await db.select().from(uom).where(eq(uom.id, updatedConversion.toUomId));
    
    // Format the response
    const result = {
      ...updatedConversion,
      fromUomCode: fromUom?.code || '',
      fromUomName: fromUom?.name || '',
      toUomCode: toUom?.code || '',
      toUomName: toUom?.name || '',
    };
    
    res.json(result);
  } catch (error) {
    console.error("Error deleting UoM conversion:", error);
    res.status(500).json({ message: "Failed to delete UoM conversion" });
  }
};