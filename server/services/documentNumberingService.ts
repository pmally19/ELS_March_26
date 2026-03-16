import { ensureActivePool } from '../database';

/**
 * Service to automatically determine and generate document numbers based on 
 * standard SAP FI/MM logic linked through Movement Types and Document Types.
 */
export class DocumentNumberingService {

    /**
     * Derives the required Document Type from the Movement Type,
     * finds its corresponding Number Range, and atomically grabs
     * the next serial number.
     * 
     * @param movementTypeCode The SAP Movement Type (e.g., '101')
     * @param fallbackType Fallback Document Type code (e.g., 'WE' for GR)
     * @param companyCodeId Company enforcing the sequence
     */
    static async getNextDocumentNumber(
        movementTypeCode: string,
        fallbackType: string = 'WE',
        companyCodeId: number = 1,
        overrideDocumentTypeId?: number
    ): Promise<{ documentNumber: string; documentTypeId: number; documentTypeCode: string }> {
        const pool = ensureActivePool();

        let docTypeCheck;
        // 0. If override ID is provided, use it explicitly
        if (overrideDocumentTypeId) {
            docTypeCheck = await pool.query(`
                SELECT id, document_type_code, number_range 
                FROM document_types 
                WHERE id = $1
            `, [overrideDocumentTypeId]);
        }
        else {
            // 1. Attempt to resolve the configured Document Type via the Movement Type
            docTypeCheck = await pool.query(`
            SELECT dt.id, dt.document_type_code, dt.number_range 
            FROM movement_types mt
            INNER JOIN document_types dt ON mt.document_type_id = dt.id
            WHERE mt.movement_type_code = $1
          `, [movementTypeCode]);

            // 2. If no Document Type is configured on the Movement Type, use the standard fallback (e.g. 'WE' or 'KR')
            if (docTypeCheck.rows.length === 0) {
                docTypeCheck = await pool.query(`
              SELECT id, document_type_code, number_range 
              FROM document_types 
              WHERE document_type_code = $1 AND (company_code_id = $2 OR company_code_id IS NULL)
              LIMIT 1
            `, [fallbackType, companyCodeId]);

                if (docTypeCheck.rows.length === 0) {
                    throw new Error(`Critical Error: Document Type ${fallbackType} does not exist in the database and Movement Type ${movementTypeCode} has no default assigned.`);
                }
            }
        }

        const docType = docTypeCheck.rows[0];

        if (!docType.number_range) {
            throw new Error(`Critical Error: Document Type ${docType.document_type_code} is not connected to any Number Range.`);
        }

        // 3. Atomically grab the next number from the `number_ranges` table
        // This replicates the existing endpoint logic `/api/master-data/number-ranges/:code/next-number` directly internally
        const generationResult = await pool.query(`
        UPDATE number_ranges 
        SET current_number = (CAST(current_number AS BIGINT) + 1)::TEXT,
            updated_at = NOW()
        WHERE number_range_code = $1 AND (company_code_id = $2 OR company_code_id = 0)
        RETURNING current_number, range_to
      `, [docType.number_range, companyCodeId]);

        if (generationResult.rows.length === 0) {
            throw new Error(`Critical Error: Number Range ${docType.number_range} mapped to Document Type ${docType.document_type_code} does not exist.`);
        }

        const nextNumber = generationResult.rows[0].current_number;

        return {
            documentNumber: nextNumber,
            documentTypeId: docType.id,
            documentTypeCode: docType.document_type_code
        };
    }

    /**
     * For Financial Documents like Invoices that don't pass through a movement type.
     */
    static async getNextDocumentNumberForDirectType(
        documentTypeCode: string,
        companyCodeId: number = 1,
        overrideDocumentTypeId?: number
    ): Promise<{ documentNumber: string; documentTypeId: number }> {
        const pool = ensureActivePool();

        let docTypeCheck;
        if (overrideDocumentTypeId) {
            docTypeCheck = await pool.query(`
                SELECT id, number_range 
                FROM document_types 
                WHERE id = $1
            `, [overrideDocumentTypeId]);
        } else {
            docTypeCheck = await pool.query(`
            SELECT id, number_range 
            FROM document_types 
            WHERE document_type_code = $1 AND (company_code_id = $2 OR company_code_id = 0)
            LIMIT 1
        `, [documentTypeCode, companyCodeId]);
        }

        if (docTypeCheck.rows.length === 0) {
            throw new Error(`Critical Error: Document Type ${documentTypeCode} does not exist.`);
        }

        const docType = docTypeCheck.rows[0];

        const generationResult = await pool.query(`
        UPDATE number_ranges 
        SET current_number = (CAST(current_number AS BIGINT) + 1)::TEXT,
            updated_at = NOW()
        WHERE number_range_code = $1 AND (company_code_id = $2 OR company_code_id = 0)
        RETURNING current_number
      `, [docType.number_range, companyCodeId]);

        if (generationResult.rows.length === 0) {
            throw new Error(`Critical Error: Number Range ${docType.number_range} mapped to Document Type ${documentTypeCode} does not exist.`);
        }

        return {
            documentNumber: generationResult.rows[0].current_number,
            documentTypeId: docType.id
        }
    }

}
