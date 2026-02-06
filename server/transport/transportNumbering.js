/**
 * Transport Request Numbering System
 * 
 * This module manages the generation of transport request numbers with configurable ranges:
 * - A1XXXXXX to A9999999: Standard Enterprise Objects
 * - Y1XXXXXX to Y9999999: Custom Development Objects 
 * - Z1XXXXXX to Z9999999: Customer Customization Objects
 * 
 * When a range reaches its limit (999999), it automatically increments to the next level
 * (e.g., A1 -> A2 -> A3 ... -> A9)
 */

import { pool } from '../db.ts';

/**
 * Initialize transport numbering system tables
 */
export async function initializeTransportNumbering() {
  try {
    // Check if transport_number_ranges table exists first
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'transport_number_ranges'
      );
    `);

    if (!tableExists.rows[0].exists) {
      // Create transport_number_ranges table
      await pool.query(`
        CREATE TABLE transport_number_ranges (
          id SERIAL PRIMARY KEY,
          range_prefix VARCHAR(2) NOT NULL UNIQUE,
          range_type VARCHAR(50) NOT NULL,
          description TEXT,
          current_number INTEGER DEFAULT 100000,
          max_number INTEGER DEFAULT 999999,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    // Insert default ranges if they don't exist
    const defaultRanges = [
      {
        prefix: 'A1',
        type: 'STANDARD',
        description: 'Standard ERP Objects - Level 1',
        current: 100000,
        max: 999999
      },
      {
        prefix: 'Y1',
        type: 'CUSTOM_DEV',
        description: 'Custom Development Objects - Level 1',
        current: 100000,
        max: 999999
      },
      {
        prefix: 'Z1',
        type: 'CUSTOMER',
        description: 'Customer Customization Objects - Level 1',
        current: 100000,
        max: 999999
      }
    ];

    for (const range of defaultRanges) {
      await pool.query(`
        INSERT INTO transport_number_ranges (range_prefix, range_type, description, current_number, max_number)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (range_prefix) DO NOTHING
      `, [range.prefix, range.type, range.description, range.current, range.max]);
    }

    console.log('Transport numbering system initialized successfully');
  } catch (error) {
    console.error('Error initializing transport numbering system:', error);
    throw error;
  }
}

/**
 * Generate next transport request number based on object type
 */
export async function generateTransportNumber(objectType = 'STANDARD') {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Determine which range to use based on object type
    let rangeType = 'STANDARD';
    if (objectType === 'CUSTOM_DEV' || objectType === 'DEVELOPMENT') {
      rangeType = 'CUSTOM_DEV';
    } else if (objectType === 'CUSTOMER' || objectType === 'CUSTOMIZATION') {
      rangeType = 'CUSTOMER';
    }

    // Get current active range for the type
    const rangeResult = await client.query(`
      SELECT * FROM transport_number_ranges 
      WHERE range_type = $1 AND is_active = true 
      ORDER BY range_prefix ASC 
      LIMIT 1
    `, [rangeType]);

    if (rangeResult.rows.length === 0) {
      throw new Error(`No active number range found for type: ${rangeType}`);
    }

    let currentRange = rangeResult.rows[0];

    // Check if current range is exhausted
    if (currentRange.current_number >= currentRange.max_number) {
      // Try to move to next level (A1 -> A2, Y1 -> Y2, etc.)
      const nextLevel = await getNextRangeLevel(client, currentRange);
      if (nextLevel) {
        currentRange = nextLevel;
      } else {
        throw new Error(`Number range ${currentRange.range_prefix} exhausted and no next level available`);
      }
    }

    // Increment the current number
    const nextNumber = currentRange.current_number + 1;
    
    // Update the range
    await client.query(`
      UPDATE transport_number_ranges 
      SET current_number = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `, [nextNumber, currentRange.id]);

    // Format the transport number
    const transportNumber = `${currentRange.range_prefix}${nextNumber.toString().padStart(6, '0')}`;

    await client.query('COMMIT');
    
    return {
      number: transportNumber,
      range_prefix: currentRange.range_prefix,
      range_type: currentRange.range_type,
      sequence: nextNumber
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error generating transport number:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get next available range level (A1 -> A2, Y1 -> Y2, etc.)
 */
async function getNextRangeLevel(client, currentRange) {
  const basePrefix = currentRange.range_prefix.charAt(0); // A, Y, or Z
  const currentLevel = parseInt(currentRange.range_prefix.charAt(1)); // 1, 2, etc.
  
  if (currentLevel >= 9) {
    return null; // Maximum level reached
  }

  const nextLevel = currentLevel + 1;
  const nextPrefix = `${basePrefix}${nextLevel}`;

  // Check if next level range already exists
  const existingRange = await client.query(`
    SELECT * FROM transport_number_ranges WHERE range_prefix = $1
  `, [nextPrefix]);

  if (existingRange.rows.length > 0) {
    // Activate existing range
    await client.query(`
      UPDATE transport_number_ranges 
      SET is_active = true, updated_at = CURRENT_TIMESTAMP 
      WHERE range_prefix = $1
    `, [nextPrefix]);
    
    // Deactivate current range
    await client.query(`
      UPDATE transport_number_ranges 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1
    `, [currentRange.id]);

    return existingRange.rows[0];
  } else {
    // Create new range
    const description = `${currentRange.range_type === 'STANDARD' ? 'Standard ERP Objects' : 
                         currentRange.range_type === 'CUSTOM_DEV' ? 'Custom Development Objects' : 
                         'Customer Customization Objects'} - Level ${nextLevel}`;

    const newRange = await client.query(`
      INSERT INTO transport_number_ranges 
      (range_prefix, range_type, description, current_number, max_number, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [nextPrefix, currentRange.range_type, description, 100000, 999999, true]);

    // Deactivate current range
    await client.query(`
      UPDATE transport_number_ranges 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1
    `, [currentRange.id]);

    return newRange.rows[0];
  }
}

/**
 * Get all number ranges for administration
 */
export async function getAllNumberRanges() {
  try {
    const result = await pool.query(`
      SELECT * FROM transport_number_ranges 
      ORDER BY range_type, range_prefix
    `);
    return result.rows;
  } catch (error) {
    console.error('Error fetching number ranges:', error);
    throw error;
  }
}

/**
 * Update number range configuration (Admin function)
 */
export async function updateNumberRange(rangeId, updates) {
  try {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const values = [rangeId, ...Object.values(updates)];
    
    const result = await pool.query(`
      UPDATE transport_number_ranges 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1 
      RETURNING *
    `, values);

    return result.rows[0];
  } catch (error) {
    console.error('Error updating number range:', error);
    throw error;
  }
}

/**
 * Create custom number range (Admin function)
 */
export async function createCustomNumberRange(rangeData) {
  try {
    const result = await pool.query(`
      INSERT INTO transport_number_ranges 
      (range_prefix, range_type, description, current_number, max_number, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      rangeData.range_prefix,
      rangeData.range_type,
      rangeData.description,
      rangeData.current_number || 100000,
      rangeData.max_number || 999999,
      rangeData.is_active !== false
    ]);

    return result.rows[0];
  } catch (error) {
    console.error('Error creating custom number range:', error);
    throw error;
  }
}