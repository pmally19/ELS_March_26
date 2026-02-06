import { Router, Request, Response } from "express";
import { db } from "../../db";
import { poDocumentTypes } from "@shared/po-document-type-schema";
import { numberRanges } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/master-data/po-document-types/number-ranges - Get active number ranges for dropdown
router.get("/number-ranges", async (req: Request, res: Response) => {
    try {
        const ranges = await db
            .select({
                id: numberRanges.id,
                code: numberRanges.numberRangeCode,
                name: numberRanges.description,
                description: numberRanges.description,
            })
            .from(numberRanges)
            .where(eq(numberRanges.isActive, true))
            .orderBy(numberRanges.numberRangeCode);

        res.json(ranges);
    } catch (error: any) {
        console.error("Error fetching number ranges:", error);
        res.status(500).json({
            message: `Failed to fetch number ranges: ${error.message}`,
        });
    }
});

// GET /api/master-data/po-document-types - Get all PO document types with number range details
router.get("/", async (req: Request, res: Response) => {
    try {
        const types = await db
            .select({
                id: poDocumentTypes.id,
                code: poDocumentTypes.code,
                name: poDocumentTypes.name,
                description: poDocumentTypes.description,
                numberRangeId: poDocumentTypes.numberRangeId,
                itemInterval: poDocumentTypes.itemInterval,
                fieldSelectionKey: poDocumentTypes.fieldSelectionKey,
                itemCategoriesAllowed: poDocumentTypes.itemCategoriesAllowed,
                accountAssignmentCategories: poDocumentTypes.accountAssignmentCategories,
                partnerDeterminationSchema: poDocumentTypes.partnerDeterminationSchema,
                messageSchema: poDocumentTypes.messageSchema,
                releaseProcedureRequired: poDocumentTypes.releaseProcedureRequired,
                isActive: poDocumentTypes.isActive,
                createdAt: poDocumentTypes.createdAt,
                updatedAt: poDocumentTypes.updatedAt,
                numberRangeCode: numberRanges.numberRangeCode,
                numberRangeName: numberRanges.description,
            })
            .from(poDocumentTypes)
            .leftJoin(numberRanges, eq(poDocumentTypes.numberRangeId, numberRanges.id))
            .orderBy(poDocumentTypes.code);

        res.json(types);
    } catch (error: any) {
        console.error("Error fetching PO document types:", error);
        res.status(500).json({
            message: `Failed to fetch PO document types: ${error.message}`,
        });
    }
});

// POST /api/master-data/po-document-types - Create new PO document type
router.post("/", async (req: Request, res: Response) => {
    try {
        const {
            code,
            name,
            description,
            numberRangeId,
            itemInterval,
            fieldSelectionKey,
            itemCategoriesAllowed,
            accountAssignmentCategories,
            partnerDeterminationSchema,
            messageSchema,
            releaseProcedureRequired,
            isActive,
        } = req.body;

        // Validate required fields
        if (!code || !name) {
            return res.status(400).json({
                message: "Code and name are required",
            });
        }

        if (!fieldSelectionKey) {
            return res.status(400).json({
                message: "Field selection key is required",
            });
        }

        if (!itemCategoriesAllowed || !Array.isArray(itemCategoriesAllowed) || itemCategoriesAllowed.length === 0) {
            return res.status(400).json({
                message: "At least one item category must be allowed",
            });
        }

        if (!accountAssignmentCategories || !Array.isArray(accountAssignmentCategories) || accountAssignmentCategories.length === 0) {
            return res.status(400).json({
                message: "At least one account assignment category must be allowed",
            });
        }

        if (!partnerDeterminationSchema) {
            return res.status(400).json({
                message: "Partner determination schema is required",
            });
        }

        if (!messageSchema) {
            return res.status(400).json({
                message: "Message schema is required",
            });
        }

        const [newType] = await db
            .insert(poDocumentTypes)
            .values({
                code,
                name,
                description,
                numberRangeId: numberRangeId || null,
                itemInterval: itemInterval || 10,
                fieldSelectionKey,
                itemCategoriesAllowed,
                accountAssignmentCategories,
                partnerDeterminationSchema,
                messageSchema,
                releaseProcedureRequired: releaseProcedureRequired || false,
                isActive: isActive !== undefined ? isActive : true,
            })
            .returning();

        res.status(201).json(newType);
    } catch (error: any) {
        console.error("Error creating PO document type:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                message: "A document type with this code already exists",
            });
        }

        res.status(500).json({
            message: `Failed to create PO document type: ${error.message}`,
        });
    }
});

// PUT /api/master-data/po-document-types/:id - Update PO document type
router.put("/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const {
            code,
            name,
            description,
            numberRangeId,
            itemInterval,
            fieldSelectionKey,
            itemCategoriesAllowed,
            accountAssignmentCategories,
            partnerDeterminationSchema,
            messageSchema,
            releaseProcedureRequired,
            isActive,
        } = req.body;

        const [updated] = await db
            .update(poDocumentTypes)
            .set({
                code,
                name,
                description,
                numberRangeId,
                itemInterval,
                fieldSelectionKey,
                itemCategoriesAllowed,
                accountAssignmentCategories,
                partnerDeterminationSchema,
                messageSchema,
                releaseProcedureRequired,
                isActive,
                updatedAt: new Date(),
            })
            .where(eq(poDocumentTypes.id, id))
            .returning();

        if (!updated) {
            return res.status(404).json({
                message: "PO document type not found",
            });
        }

        res.json(updated);
    } catch (error: any) {
        console.error("Error updating PO document type:", error);
        res.status(500).json({
            message: `Failed to update PO document type: ${error.message}`,
        });
    }
});

// DELETE /api/master-data/po-document-types/:id - Delete PO document type
router.delete("/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);

        const [deleted] = await db
            .delete(poDocumentTypes)
            .where(eq(poDocumentTypes.id, id))
            .returning();

        if (!deleted) {
            return res.status(404).json({
                message: "PO document type not found",
            });
        }

        res.json({
            message: "PO document type deleted successfully",
            data: deleted,
        });
    } catch (error: any) {
        console.error("Error deleting PO document type:", error);
        res.status(500).json({
            message: `Failed to delete PO document type: ${error.message}`,
        });
    }
});

export default router;
