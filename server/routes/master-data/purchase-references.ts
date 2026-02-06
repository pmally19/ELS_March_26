import { Request, Response } from "express";
import { db } from "../../db";
import { 
  purchaseGroups, 
  supplyTypes, 
  approvalLevels,
  insertPurchaseGroupSchema, 
  insertSupplyTypeSchema,
  insertApprovalLevelSchema 
} from "../../../shared/purchase-references-schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

// Purchase Groups API
export async function getPurchaseGroups(req: Request, res: Response) {
  try {
    const results = await db.select().from(purchaseGroups);
    return res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching purchase groups:", error);
    return res.status(500).json({ message: "Failed to fetch purchase groups", error });
  }
}

export async function getPurchaseGroupById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    
    const results = await db.select().from(purchaseGroups).where(eq(purchaseGroups.id, id));
    
    if (results.length === 0) {
      return res.status(404).json({ message: "Purchase group not found" });
    }
    
    return res.status(200).json(results[0]);
  } catch (error) {
    console.error("Error fetching purchase group:", error);
    return res.status(500).json({ message: "Failed to fetch purchase group", error });
  }
}

export async function createPurchaseGroup(req: Request, res: Response) {
  try {
    const validatedData = insertPurchaseGroupSchema.parse(req.body);
    
    // Convert code to uppercase
    const data = {
      ...validatedData,
      code: validatedData.code.toUpperCase(),
    };
    
    // Check if code already exists
    const existingByCode = await db.select({ id: purchaseGroups.id })
      .from(purchaseGroups)
      .where(eq(purchaseGroups.code, data.code));
    
    if (existingByCode.length > 0) {
      return res.status(409).json({ message: `Purchase group with code ${data.code} already exists` });
    }
    
    const [newPurchaseGroup] = await db.insert(purchaseGroups)
      .values({
        ...data
      })
      .returning();
    
    return res.status(201).json(newPurchaseGroup);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error creating purchase group:", error);
    return res.status(500).json({ message: "Failed to create purchase group", error });
  }
}

export async function updatePurchaseGroup(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    
    // Check if purchase group exists
    const existingGroup = await db.select().from(purchaseGroups).where(eq(purchaseGroups.id, id));
    if (existingGroup.length === 0) {
      return res.status(404).json({ message: "Purchase group not found" });
    }
    
    // Parse and validate the update data
    const validatedData = insertPurchaseGroupSchema.partial().parse(req.body);
    
    // Convert code to uppercase if provided
    const data = {
      ...validatedData,
      code: validatedData.code ? validatedData.code.toUpperCase() : validatedData.code,
    };
    
    // If code is changed, check for uniqueness
    if (data.code && data.code !== existingGroup[0].code) {
      const existingByCode = await db.select({ id: purchaseGroups.id })
        .from(purchaseGroups)
        .where(eq(purchaseGroups.code, data.code));
      
      if (existingByCode.length > 0) {
        return res.status(409).json({ message: `Purchase group with code ${data.code} already exists` });
      }
    }
    
    // Update the purchase group
    const [updatedPurchaseGroup] = await db.update(purchaseGroups)
      .set({
        ...data,
        updatedAt: new Date(),
        version: existingGroup[0].version + 1,
      })
      .where(eq(purchaseGroups.id, id))
      .returning();
    
    return res.status(200).json(updatedPurchaseGroup);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error updating purchase group:", error);
    return res.status(500).json({ message: "Failed to update purchase group", error });
  }
}

export async function deletePurchaseGroup(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    
    // Check if purchase group exists
    const existingGroup = await db.select().from(purchaseGroups).where(eq(purchaseGroups.id, id));
    if (existingGroup.length === 0) {
      return res.status(404).json({ message: "Purchase group not found" });
    }
    
    // Soft delete by setting isActive to false
    await db.update(purchaseGroups)
      .set({
        isActive: false,
        updatedAt: new Date(),
        version: existingGroup[0].version + 1,
      })
      .where(eq(purchaseGroups.id, id));
    
    return res.status(200).json({ message: "Purchase group deleted successfully" });
  } catch (error) {
    console.error("Error deleting purchase group:", error);
    return res.status(500).json({ message: "Failed to delete purchase group", error });
  }
}

// Supply Types API
export async function getSupplyTypes(req: Request, res: Response) {
  try {
    const results = await db.select().from(supplyTypes);
    return res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching supply types:", error);
    return res.status(500).json({ message: "Failed to fetch supply types", error });
  }
}

export async function getSupplyTypeById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    
    const results = await db.select().from(supplyTypes).where(eq(supplyTypes.id, id));
    
    if (results.length === 0) {
      return res.status(404).json({ message: "Supply type not found" });
    }
    
    return res.status(200).json(results[0]);
  } catch (error) {
    console.error("Error fetching supply type:", error);
    return res.status(500).json({ message: "Failed to fetch supply type", error });
  }
}

export async function createSupplyType(req: Request, res: Response) {
  try {
    // Extract only the fields that exist in the schema
    const { code, name, description, isActive } = req.body;
    
    // Create a clean data object with only valid fields
    const cleanData = {
      code,
      name,
      description,
      isActive: isActive !== false // Default to true if not provided
    };
    
    const validatedData = insertSupplyTypeSchema.parse(cleanData);
    
    // Convert code to uppercase
    const data = {
      ...validatedData,
      code: validatedData.code.toUpperCase(),
    };
    
    // Check if code already exists
    const existingByCode = await db.select({ id: supplyTypes.id })
      .from(supplyTypes)
      .where(eq(supplyTypes.code, data.code));
    
    if (existingByCode.length > 0) {
      return res.status(409).json({ message: `Supply type with code ${data.code} already exists` });
    }
    
    const [newSupplyType] = await db.insert(supplyTypes)
      .values({
        ...data
      })
      .returning();
    
    return res.status(201).json(newSupplyType);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error creating supply type:", error);
    return res.status(500).json({ message: "Failed to create supply type", error });
  }
}

export async function updateSupplyType(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    
    // Check if supply type exists
    const existingType = await db.select().from(supplyTypes).where(eq(supplyTypes.id, id));
    if (existingType.length === 0) {
      return res.status(404).json({ message: "Supply type not found" });
    }
    
    // Parse and validate the update data
    const validatedData = insertSupplyTypeSchema.partial().parse(req.body);
    
    // Convert code to uppercase if provided
    const data = {
      ...validatedData,
      code: validatedData.code ? validatedData.code.toUpperCase() : validatedData.code,
    };
    
    // If code is changed, check for uniqueness
    if (data.code && data.code !== existingType[0].code) {
      const existingByCode = await db.select({ id: supplyTypes.id })
        .from(supplyTypes)
        .where(eq(supplyTypes.code, data.code));
      
      if (existingByCode.length > 0) {
        return res.status(409).json({ message: `Supply type with code ${data.code} already exists` });
      }
    }
    
    // Update the supply type
    const [updatedSupplyType] = await db.update(supplyTypes)
      .set({
        ...data,
        updatedAt: new Date(),
        version: existingType[0].version + 1,
      })
      .where(eq(supplyTypes.id, id))
      .returning();
    
    return res.status(200).json(updatedSupplyType);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error updating supply type:", error);
    return res.status(500).json({ message: "Failed to update supply type", error });
  }
}

export async function deleteSupplyType(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    
    // Check if supply type exists
    const existingType = await db.select().from(supplyTypes).where(eq(supplyTypes.id, id));
    if (existingType.length === 0) {
      return res.status(404).json({ message: "Supply type not found" });
    }
    
    // Soft delete by setting isActive to false
    await db.update(supplyTypes)
      .set({
        isActive: false,
        updatedAt: new Date(),
        version: existingType[0].version + 1,
      })
      .where(eq(supplyTypes.id, id));
    
    return res.status(200).json({ message: "Supply type deleted successfully" });
  } catch (error) {
    console.error("Error deleting supply type:", error);
    return res.status(500).json({ message: "Failed to delete supply type", error });
  }
}