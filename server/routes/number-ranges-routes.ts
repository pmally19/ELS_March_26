import { Router } from 'express';
import { ensureActivePool } from '../database';
import { z } from 'zod';

const router = Router();

// Schema for number ranges (coerce numbers to handle string inputs from client)
const numberRangeSchema = z.object({
  number_range_code: z.string(),
  description: z.string(),
  number_range_object: z.string(),
  fiscal_year: z.string().optional(),
  range_from: z.string(),
  range_to: z.string(),
  current_number: z.string().optional(),
  external_numbering: z.coerce.boolean().default(false),
  buffer_size: z.coerce.number().default(100),
  warning_percentage: z.coerce.number().default(90),
  company_code_id: z.coerce.number().default(1)
});

// Helper: accept camelCase from client and map to snake_case expected by DB/schema
function normalizeNumberRangePayload(input: any) {
  if (!input || typeof input !== 'object') return input;
  // If already snake_case, return as is
  if (input.number_range_code || input.number_range_object) return input;
  return {
    number_range_code: input.numberRangeCode,
    description: input.description,
    number_range_object: input.numberRangeObject,
    fiscal_year: input.fiscalYear,
    range_from: input.rangeFrom,
    range_to: input.rangeTo,
    current_number: input.currentNumber,
    external_numbering: input.externalNumbering,
    buffer_size: input.bufferSize,
    warning_percentage: input.warningPercentage,
    company_code_id: input.companyCodeId
  };
}

// Get all number ranges
router.get('/', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const numberRanges = await pool.query(`
      SELECT nr.*, cc.code as company_code, cc.name as company_name
      FROM number_ranges nr
      LEFT JOIN company_codes cc ON nr.company_code_id = cc.id
      ORDER BY nr.number_range_code ASC
    `);
    
    res.json({
      success: true,
      records: numberRanges.rows
    });
  } catch (error) {
    console.error('Error fetching number ranges:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch number ranges'
    });
  }
});

// Create new number range
router.post('/', async (req, res) => {
  // Declare variables outside try block so they're accessible in catch
  let validatedData: any;
  let initialCurrent: string;
  let wasAdjusted = false;
  
  try {
    const pool = ensureActivePool();
    const normalized = normalizeNumberRangePayload(req.body);
    validatedData = numberRangeSchema.parse(normalized);

    // Validate numeric ranges and ordering
    // Use BigInt for very large numbers to avoid precision issues
    let fromNum: bigint;
    let toNum: bigint;
    try {
      fromNum = BigInt(validatedData.range_from);
      toNum = BigInt(validatedData.range_to);
    } catch (e) {
      return res.status(400).json({ 
        success: false, 
        error: 'range_from and range_to must be valid numeric strings' 
      });
    }
    
    if (fromNum > toNum) {
      return res.status(400).json({ 
        success: false, 
        error: `range_from (${validatedData.range_from}) cannot be greater than range_to (${validatedData.range_to})` 
      });
    }
    
    // Determine initial current number
    wasAdjusted = false;
    
    if (validatedData.current_number && validatedData.current_number.trim() !== '') {
      let initialCurrentNum: bigint;
      try {
        initialCurrentNum = BigInt(validatedData.current_number);
      } catch (e) {
        return res.status(400).json({ 
          success: false, 
          error: 'current_number must be a valid numeric string' 
        });
      }
      
      // Auto-adjust if current_number is less than range_from
      if (initialCurrentNum < fromNum) {
        initialCurrent = validatedData.range_from;
        wasAdjusted = true;
      } 
      // Reject if current_number is greater than range_to
      else if (initialCurrentNum > toNum) {
        return res.status(400).json({ 
          success: false, 
          error: `current_number (${validatedData.current_number}) cannot be greater than range_to (${validatedData.range_to})` 
        });
      } else {
        initialCurrent = validatedData.current_number;
      }
    } else {
      // Default to range_from if not provided
      initialCurrent = validatedData.range_from;
    }
    
    // Check if number range code already exists
    const existingRange = await pool.query(`
      SELECT id FROM number_ranges 
      WHERE number_range_code = $1 AND company_code_id = $2
    `, [validatedData.number_range_code, validatedData.company_code_id]);
    
    if (existingRange.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Number range code already exists for this company'
      });
    }
    
    const result = await pool.query(`
      INSERT INTO number_ranges (
        number_range_code, description, number_range_object, 
        fiscal_year, range_from, range_to, current_number,
        external_numbering, buffer_size, warning_percentage, 
        company_code_id, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
      ) RETURNING *
    `, [
      validatedData.number_range_code,
      validatedData.description,
      validatedData.number_range_object,
      validatedData.fiscal_year || '2025',
      validatedData.range_from,
      validatedData.range_to,
      initialCurrent,
      validatedData.external_numbering,
      validatedData.buffer_size,
      validatedData.warning_percentage,
      validatedData.company_code_id
    ]);
    
    const response: any = {
      success: true,
      record: result.rows[0]
    };
    
    // Include warning if current_number was adjusted
    if (wasAdjusted) {
      response.warning = `current_number was adjusted from ${validatedData.current_number} to ${initialCurrent} to be within the valid range`;
    }
    
    res.json(response);
  } catch (error: any) {
    console.error('Error creating number range:', error);
    
    // Handle sequence out-of-sync error
    if (error?.code === '23505' && error?.constraint?.includes('pkey')) {
      // Try to fix the sequence and retry
      try {
        const pool = ensureActivePool();
        const maxIdResult = await pool.query(`SELECT MAX(id) as max_id FROM number_ranges`);
        const currentMax = parseInt(maxIdResult.rows[0]?.max_id || '0');
        const newSeqValue = currentMax + 1;
        
        // Fix the sequence (try both possible sequence names)
        try {
          await pool.query(`SELECT setval('number_ranges_id_seq1', $1, false)`, [newSeqValue]);
        } catch (seqError) {
          // Try alternative sequence name
          await pool.query(`SELECT setval('number_ranges_id_seq', $1, false)`, [newSeqValue]);
        }
        
        // Only retry if we have validatedData (from the outer scope)
        if (validatedData && initialCurrent !== undefined) {
          // Retry the insert
          const retryResult = await pool.query(`
            INSERT INTO number_ranges (
              number_range_code, description, number_range_object, 
              fiscal_year, range_from, range_to, current_number,
              external_numbering, buffer_size, warning_percentage, 
              company_code_id, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
            ) RETURNING *
          `, [
            validatedData.number_range_code,
            validatedData.description,
            validatedData.number_range_object,
            validatedData.fiscal_year || '2025',
            validatedData.range_from,
            validatedData.range_to,
            initialCurrent,
            validatedData.external_numbering,
            validatedData.buffer_size,
            validatedData.warning_percentage,
            validatedData.company_code_id
          ]);
          
          const response: any = {
            success: true,
            record: retryResult.rows[0],
            warning: 'Sequence was automatically fixed and the record was created'
          };
          
          if (wasAdjusted) {
            response.warning += `; current_number was adjusted from ${validatedData.current_number} to ${initialCurrent}`;
          }
          
          return res.json(response);
        }
      } catch (retryError: any) {
        console.error('Error on retry after sequence fix:', retryError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create number range',
      details: error?.message || String(error),
      code: error?.code,
      constraint: error?.constraint
    });
  }
});

// Update number range
router.put('/:id', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { id } = req.params;
    const normalized = normalizeNumberRangePayload(req.body);
    const validatedData = numberRangeSchema.parse(normalized);

    // Validate numeric ranges and ordering
    // Use BigInt for very large numbers to avoid precision issues
    let fromNum: bigint;
    let toNum: bigint;
    try {
      fromNum = BigInt(validatedData.range_from);
      toNum = BigInt(validatedData.range_to);
    } catch (e) {
      return res.status(400).json({ 
        success: false, 
        error: 'range_from and range_to must be valid numeric strings' 
      });
    }
    
    if (fromNum > toNum) {
      return res.status(400).json({ 
        success: false, 
        error: `range_from (${validatedData.range_from}) cannot be greater than range_to (${validatedData.range_to})` 
      });
    }
    
    // Determine current number
    let currentNumber: string;
    let wasAdjusted = false;
    
    if (validatedData.current_number && validatedData.current_number.trim() !== '') {
      let currentNum: bigint;
      try {
        currentNum = BigInt(validatedData.current_number);
      } catch (e) {
        return res.status(400).json({ 
          success: false, 
          error: 'current_number must be a valid numeric string' 
        });
      }
      
      // Auto-adjust if current_number is less than range_from
      if (currentNum < fromNum) {
        currentNumber = validatedData.range_from;
        wasAdjusted = true;
      } 
      // Reject if current_number is greater than range_to
      else if (currentNum > toNum) {
        return res.status(400).json({ 
          success: false, 
          error: `current_number (${validatedData.current_number}) cannot be greater than range_to (${validatedData.range_to})` 
        });
      } else {
        currentNumber = validatedData.current_number;
      }
    } else {
      // Default to range_from if not provided
      currentNumber = validatedData.range_from;
    }
    
    const result = await pool.query(`
      UPDATE number_ranges 
      SET number_range_code = $1, description = $2, number_range_object = $3,
          fiscal_year = $4, range_from = $5, range_to = $6, 
          current_number = $7, external_numbering = $8, 
          buffer_size = $9, warning_percentage = $10, 
          company_code_id = $11, updated_at = NOW()
      WHERE id = $12
      RETURNING *
    `, [
      validatedData.number_range_code,
      validatedData.description,
      validatedData.number_range_object,
      validatedData.fiscal_year,
      validatedData.range_from,
      validatedData.range_to,
      currentNumber,
      validatedData.external_numbering,
      validatedData.buffer_size,
      validatedData.warning_percentage,
      validatedData.company_code_id,
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Number range not found'
      });
    }
    
    const response: any = {
      success: true,
      record: result.rows[0]
    };
    
    // Include warning if current_number was adjusted
    if (wasAdjusted) {
      response.warning = `current_number was adjusted from ${validatedData.current_number} to ${currentNumber} to be within the valid range`;
    }
    
    res.json(response);
  } catch (error: any) {
    console.error('Error updating number range:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update number range',
      details: error?.message || String(error),
      code: error?.code,
      constraint: error?.constraint
    });
  }
});

// Delete number range
router.delete('/:id', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { id } = req.params;
    
    const result = await pool.query(`
      DELETE FROM number_ranges 
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Number range not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Number range deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting number range:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete number range'
    });
  }
});

// Get next number for a specific range
router.post('/:code/next-number', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { code } = req.params;
    const { company_code_id = 1 } = req.body;
    
    const result = await pool.query(`
      UPDATE number_ranges 
      SET current_number = (CAST(current_number AS INTEGER) + 1)::TEXT,
          updated_at = NOW()
      WHERE number_range_code = $1 AND company_code_id = $2
      RETURNING current_number, range_to
    `, [code, company_code_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Number range not found'
      });
    }
    
    const { current_number, range_to } = result.rows[0];
    
    // Check if we're approaching the end of the range
    const currentNum = parseInt(current_number);
    const endNum = parseInt(range_to);
    const warningThreshold = Math.floor(endNum * 0.9); // 90% threshold
    
    res.json({
      success: true,
      next_number: current_number,
      warning: currentNum > warningThreshold,
      remaining: endNum - currentNum
    });
  } catch (error) {
    console.error('Error getting next number:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get next number'
    });
  }
});

export default router;