/**
 * Number Generation Service
 * Generates sequential numbers for various document types using number ranges
 */

import { pool } from '../db';

interface NumberRange {
    id: number;
    range_from: string;
    range_to: string;
    current_number: string;
    fiscal_year: string;
    external_numbering: boolean;
}

/**
 * Generate next PR number based on document type's number range
 * Uses transaction with row-level locking to prevent race conditions
 */
export async function generatePRNumber(documentTypeId: number): Promise<string> {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Get document type's number range
        const docTypeResult = await client.query(
            'SELECT number_range_id FROM pr_document_types WHERE id = $1',
            [documentTypeId]
        );

        if (docTypeResult.rows.length === 0) {
            await client.query('ROLLBACK');
            throw new Error(`PR Document Type with ID ${documentTypeId} not found`);
        }

        const numberRangeId = docTypeResult.rows[0].number_range_id;

        // If no number range assigned, use fallback
        if (!numberRangeId) {
            await client.query('ROLLBACK');
            const fallbackNumber = `PR-${Date.now()}`;
            console.log(`⚠️  No number range assigned for doc type ${documentTypeId}, using fallback: ${fallbackNumber}`);
            return fallbackNumber;
        }

        // Lock the number range row for update (prevents concurrent access issues)
        const numberRangeResult = await client.query<NumberRange>(
            `SELECT id, range_from, range_to, current_number, fiscal_year, external_numbering
       FROM number_ranges
       WHERE id = $1 AND is_active = true
       FOR UPDATE`,
            [numberRangeId]
        );

        if (numberRangeResult.rows.length === 0) {
            await client.query('ROLLBACK');
            throw new Error(`Active number range with ID ${numberRangeId} not found`);
        }

        const numberRange = numberRangeResult.rows[0];

        // Parse current number as integer
        const currentNum = parseInt(numberRange.current_number);
        const rangeFrom = parseInt(numberRange.range_from);
        const rangeTo = parseInt(numberRange.range_to);

        // Check if we've exhausted the range
        if (currentNum >= rangeTo) {
            await client.query('ROLLBACK');
            throw new Error(
                `Number range ${numberRangeId} exhausted! Current: ${currentNum}, Max: ${rangeTo}`
            );
        }

        // Generate the next number
        const nextNumber = currentNum + 1;
        const formattedNumber = nextNumber.toString().padStart(numberRange.range_from.length, '0');

        // Update the current_number in the database
        await client.query(
            `UPDATE number_ranges 
       SET current_number = $1, updated_at = NOW()
       WHERE id = $2`,
            [formattedNumber, numberRangeId]
        );

        await client.query('COMMIT');

        console.log(`✅ Generated PR number: ${formattedNumber} (range ${numberRangeId})`);
        return formattedNumber;

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error generating PR number:', error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Preview next PR number without consuming it
 * Useful for displaying what the next number will be
 */
export async function previewNextPRNumber(documentTypeId: number): Promise<string> {
    try {
        const docTypeResult = await pool.query(
            'SELECT number_range_id FROM pr_document_types WHERE id = $1',
            [documentTypeId]
        );

        if (docTypeResult.rows.length === 0 || !docTypeResult.rows[0].number_range_id) {
            return 'AUTO';
        }

        const numberRangeId = docTypeResult.rows[0].number_range_id;

        const numberRangeResult = await pool.query<NumberRange>(
            'SELECT current_number, range_from FROM number_ranges WHERE id = $1',
            [numberRangeId]
        );

        if (numberRangeResult.rows.length === 0) {
            return 'AUTO';
        }

        const numberRange = numberRangeResult.rows[0];
        const nextNumber = parseInt(numberRange.current_number) + 1;
        const formattedNumber = nextNumber.toString().padStart(numberRange.range_from.length, '0');

        return formattedNumber;
    } catch (error) {
        console.error('Error previewing PR number:', error);
        return 'AUTO';
    }
}
