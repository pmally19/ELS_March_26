import { Router, Request, Response } from "express";
import { db } from "../../db";
import { interestCalculators } from "@shared/interest-calculator-schema";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/master-data/interest-calculators - Get all interest calculators
router.get("/", async (req: Request, res: Response) => {
    try {
        const calculators = await db
            .select()
            .from(interestCalculators)
            .orderBy(interestCalculators.calculatorCode);

        res.json(calculators);
    } catch (error: any) {
        console.error("Error fetching interest calculators:", error);
        res.status(500).json({
            message: `Failed to fetch interest calculators: ${error.message}`,
        });
    }
});

// GET /api/master-data/interest-calculators/:id - Get one interest calculator
router.get("/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);

        const [calculator] = await db
            .select()
            .from(interestCalculators)
            .where(eq(interestCalculators.id, id));

        if (!calculator) {
            return res.status(404).json({
                message: "Interest calculator not found",
            });
        }

        res.json(calculator);
    } catch (error: any) {
        console.error("Error fetching interest calculator:", error);
        res.status(500).json({
            message: `Failed to fetch interest calculator: ${error.message}`,
        });
    }
});

// POST /api/master-data/interest-calculators - Create new interest calculator
router.post("/", async (req: Request, res: Response) => {
    try {
        const {
            calculatorCode,
            calculatorName,
            interestType,
            calculationBasis,
            frequency,
            formula,
            defaultRate,
            roundingMethod,
            roundingPrecision,
            description,
            isActive,
        } = req.body;

        // Validate required fields
        if (!calculatorCode || !calculatorName) {
            return res.status(400).json({
                message: "Calculator code and name are required",
            });
        }

        if (!interestType) {
            return res.status(400).json({
                message: "Interest type is required",
            });
        }

        if (!calculationBasis) {
            return res.status(400).json({
                message: "Calculation basis is required",
            });
        }

        if (!frequency) {
            return res.status(400).json({
                message: "Frequency is required",
            });
        }

        // Validate enums
        const validBases = ['365', '360', 'actual'];
        if (!validBases.includes(calculationBasis)) {
            return res.status(400).json({
                message: `Calculation basis must be one of: ${validBases.join(', ')}`,
            });
        }

        const validFrequencies = ['daily', 'monthly', 'quarterly', 'annually'];
        if (!validFrequencies.includes(frequency)) {
            return res.status(400).json({
                message: `Frequency must be one of: ${validFrequencies.join(', ')}`,
            });
        }

        const [newCalculator] = await db
            .insert(interestCalculators)
            .values({
                calculatorCode: calculatorCode.toUpperCase(),
                calculatorName,
                interestType,
                calculationBasis,
                frequency,
                formula: formula || null,
                defaultRate: defaultRate ? String(defaultRate) : null,
                roundingMethod: roundingMethod || 'round_nearest',
                roundingPrecision: roundingPrecision !== undefined ? roundingPrecision : 2,
                description: description || null,
                isActive: isActive !== undefined ? isActive : true,
            })
            .returning();

        res.status(201).json(newCalculator);
    } catch (error: any) {
        console.error("Error creating interest calculator:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                message: "An interest calculator with this code already exists",
            });
        }

        res.status(500).json({
            message: `Failed to create interest calculator: ${error.message}`,
        });
    }
});

// PUT /api/master-data/interest-calculators/:id - Update interest calculator
router.put("/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const {
            calculatorCode,
            calculatorName,
            interestType,
            calculationBasis,
            frequency,
            formula,
            defaultRate,
            roundingMethod,
            roundingPrecision,
            description,
            isActive,
        } = req.body;

        // Validate enums if provided
        if (calculationBasis) {
            const validBases = ['365', '360', 'actual'];
            if (!validBases.includes(calculationBasis)) {
                return res.status(400).json({
                    message: `Calculation basis must be one of: ${validBases.join(', ')}`,
                });
            }
        }

        if (frequency) {
            const validFrequencies = ['daily', 'monthly', 'quarterly', 'annually'];
            if (!validFrequencies.includes(frequency)) {
                return res.status(400).json({
                    message: `Frequency must be one of: ${validFrequencies.join(', ')}`,
                });
            }
        }

        const [updated] = await db
            .update(interestCalculators)
            .set({
                calculatorCode: calculatorCode ? calculatorCode.toUpperCase() : undefined,
                calculatorName,
                interestType,
                calculationBasis,
                frequency,
                formula,
                defaultRate: defaultRate ? String(defaultRate) : undefined,
                roundingMethod,
                roundingPrecision,
                description,
                isActive,
                updatedAt: new Date(),
            })
            .where(eq(interestCalculators.id, id))
            .returning();

        if (!updated) {
            return res.status(404).json({
                message: "Interest calculator not found",
            });
        }

        res.json(updated);
    } catch (error: any) {
        console.error("Error updating interest calculator:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                message: "An interest calculator with this code already exists",
            });
        }

        res.status(500).json({
            message: `Failed to update interest calculator: ${error.message}`,
        });
    }
});

// DELETE /api/master-data/interest-calculators/:id - Delete interest calculator
router.delete("/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);

        const [deleted] = await db
            .delete(interestCalculators)
            .where(eq(interestCalculators.id, id))
            .returning();

        if (!deleted) {
            return res.status(404).json({
                message: "Interest calculator not found",
            });
        }

        res.json({
            message: "Interest calculator deleted successfully",
            data: deleted,
        });
    } catch (error: any) {
        console.error("Error deleting interest calculator:", error);
        res.status(500).json({
            message: `Failed to delete interest calculator: ${error.message}`,
        });
    }
});

export default router;
