import { db } from "../db";
import { documentNumberSequences } from "@shared/document-number-schema";
import { eq, sql } from "drizzle-orm";

/**
 * Document Number Service
 * Generates sequential document numbers without hardcoded values
 */
export class DocumentNumberService {
    /**
     * Get the next document number for a given document type
     * This method is atomic and thread-safe
     * 
     * @param documentType - The type of document (e.g., 'QUOTATION', 'SALES_ORDER')
     * @returns Formatted document number (e.g., 'QUOT-20260119-0001')
     */
    async getNextNumber(documentType: string): Promise<string> {
        return await db.transaction(async (tx) => {
            // Get current sequence with FOR UPDATE lock to prevent race conditions
            const sequence = await tx
                .select()
                .from(documentNumberSequences)
                .where(eq(documentNumberSequences.documentType, documentType))
                .for("update")
                .limit(1);

            if (!sequence || sequence.length === 0) {
                throw new Error(`Document number sequence not found for type: ${documentType}`);
            }

            const currentSeq = sequence[0];

            // Check if we need to reset based on reset frequency
            const shouldReset = this.shouldResetSequence(currentSeq);
            const nextNumber = shouldReset ? 1 : currentSeq.currentNumber + 1;

            // Update the sequence atomically
            await tx
                .update(documentNumberSequences)
                .set({
                    currentNumber: nextNumber,
                    lastResetDate: shouldReset ? new Date() : currentSeq.lastResetDate,
                    updatedAt: new Date(),
                })
                .where(eq(documentNumberSequences.documentType, documentType));

            // Format the document number
            return this.formatDocumentNumber(currentSeq.prefix, nextNumber);
        });
    }

    /**
     * Check if sequence should be reset based on reset frequency
     */
    private shouldResetSequence(sequence: any): boolean {
        if (sequence.resetFrequency === "NEVER" || !sequence.lastResetDate) {
            return false;
        }

        const now = new Date();
        const lastReset = new Date(sequence.lastResetDate);

        switch (sequence.resetFrequency) {
            case "DAILY":
                return now.toDateString() !== lastReset.toDateString();
            case "MONTHLY":
                return (
                    now.getMonth() !== lastReset.getMonth() ||
                    now.getFullYear() !== lastReset.getFullYear()
                );
            case "YEARLY":
                return now.getFullYear() !== lastReset.getFullYear();
            default:
                return false;
        }
    }

    /**
     * Format document number with date and sequence
     * Format: PREFIX-YYYYMMDD-XXXX
     * Example: QUOT-20260119-0001
     */
    private formatDocumentNumber(prefix: string, sequenceNumber: number): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const sequence = String(sequenceNumber).padStart(4, "0");

        return `${prefix}-${year}${month}${day}-${sequence}`;
    }

    /**
     * Initialize a new document type sequence
     */
    async initializeSequence(
        documentType: string,
        prefix: string,
        resetFrequency: "NEVER" | "DAILY" | "MONTHLY" | "YEARLY" = "NEVER"
    ): Promise<void> {
        await db.insert(documentNumberSequences).values({
            documentType,
            prefix,
            currentNumber: 0,
            resetFrequency,
        }).onConflictDoNothing();
    }

    /**
     * Get current sequence information (for debugging/admin purposes)
     */
    async getSequenceInfo(documentType: string) {
        const result = await db
            .select()
            .from(documentNumberSequences)
            .where(eq(documentNumberSequences.documentType, documentType))
            .limit(1);

        return result[0] || null;
    }
}

export const documentNumberService = new DocumentNumberService();
