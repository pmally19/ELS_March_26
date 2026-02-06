import { Router } from "express";
import { pool } from "../../db";

const router = Router();

// GET /api/master-data/bank-master - Get all bank master records
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        bm.id,
        bm.bank_key,
        bm.bank_name,
        bm.bank_number,
        bm.swift_code,
        bm.country_code,
        bm.region,
        bm.city,
        bm.address,
        bm.api_endpoint,
        bm.company_code_id,
        cc.code as company_code,
        cc.name as company_name,
        bm.is_active,
        bm.created_at,
        bm.updated_at
      FROM bank_master bm
      LEFT JOIN company_codes cc ON bm.company_code_id = cc.id
      ORDER BY bm.bank_key, bm.bank_name
    `);
    
    res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching bank master:", error);
    return res.status(500).json({ 
      message: "Failed to fetch bank master records",
      error: error.message 
    });
  }
});

// GET /api/master-data/bank-master/:id - Get a single bank master record
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        bm.id,
        bm.bank_key,
        bm.bank_name,
        bm.bank_number,
        bm.swift_code,
        bm.country_code,
        bm.region,
        bm.city,
        bm.address,
        bm.api_endpoint,
        bm.company_code_id,
        cc.code as company_code,
        cc.name as company_name,
        bm.is_active,
        bm.created_at,
        bm.updated_at
      FROM bank_master bm
      LEFT JOIN company_codes cc ON bm.company_code_id = cc.id
      WHERE bm.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Bank master record not found" });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching bank master:", error);
    return res.status(500).json({ 
      message: "Failed to fetch bank master record",
      error: error.message 
    });
  }
});

// POST /api/master-data/bank-master - Create a new bank master record
router.post("/", async (req, res) => {
  try {
    const {
      bankKey,
      bankName,
      bankNumber,
      swiftCode,
      countryCode,
      region,
      city,
      address,
      apiEndpoint,
      companyCodeId,
      isActive = true
    } = req.body;

    // Validate required fields
    if (!bankKey || !bankName || !bankNumber) {
      return res.status(400).json({ 
        message: "Bank key, bank name, and bank number are required" 
      });
    }

    // Check if bank key already exists
    const existingCheck = await pool.query(
      `SELECT id FROM bank_master WHERE bank_key = $1`,
      [bankKey]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(409).json({ 
        message: "Bank key already exists" 
      });
    }

    const result = await pool.query(`
      INSERT INTO bank_master (
        bank_key,
        bank_name,
        bank_number,
        swift_code,
        country_code,
        region,
        city,
        address,
        api_endpoint,
        company_code_id,
        is_active,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *
    `, [
      bankKey,
      bankName,
      bankNumber,
      swiftCode || null,
      countryCode || null,
      region || null,
      city || null,
      address || null,
      apiEndpoint || null,
      companyCodeId || null,
      isActive
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error creating bank master:", error);
    return res.status(500).json({ 
      message: "Failed to create bank master record",
      error: error.message 
    });
  }
});

// PATCH /api/master-data/bank-master/:id - Update a bank master record
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      bankKey,
      bankName,
      bankNumber,
      swiftCode,
      countryCode,
      region,
      city,
      address,
      apiEndpoint,
      companyCodeId,
      isActive
    } = req.body;

    // Check if record exists
    const existingCheck = await pool.query(
      `SELECT id FROM bank_master WHERE id = $1`,
      [id]
    );

    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ message: "Bank master record not found" });
    }

    // If bank key is being updated, check for duplicates
    if (bankKey) {
      const duplicateCheck = await pool.query(
        `SELECT id FROM bank_master WHERE bank_key = $1 AND id != $2`,
        [bankKey, id]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(409).json({ 
          message: "Bank key already exists" 
        });
      }
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (bankKey !== undefined) {
      updates.push(`bank_key = $${paramCount++}`);
      values.push(bankKey);
    }
    if (bankName !== undefined) {
      updates.push(`bank_name = $${paramCount++}`);
      values.push(bankName);
    }
    if (bankNumber !== undefined) {
      updates.push(`bank_number = $${paramCount++}`);
      values.push(bankNumber);
    }
    if (swiftCode !== undefined) {
      updates.push(`swift_code = $${paramCount++}`);
      values.push(swiftCode || null);
    }
    if (countryCode !== undefined) {
      updates.push(`country_code = $${paramCount++}`);
      values.push(countryCode || null);
    }
    if (region !== undefined) {
      updates.push(`region = $${paramCount++}`);
      values.push(region || null);
    }
    if (city !== undefined) {
      updates.push(`city = $${paramCount++}`);
      values.push(city || null);
    }
    if (address !== undefined) {
      updates.push(`address = $${paramCount++}`);
      values.push(address || null);
    }
    if (apiEndpoint !== undefined) {
      updates.push(`api_endpoint = $${paramCount++}`);
      values.push(apiEndpoint || null);
    }
    if (companyCodeId !== undefined) {
      updates.push(`company_code_id = $${paramCount++}`);
      values.push(companyCodeId || null);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE bank_master
      SET ${updates.join(", ")}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating bank master:", error);
    return res.status(500).json({ 
      message: "Failed to update bank master record",
      error: error.message 
    });
  }
});

// DELETE /api/master-data/bank-master/:id - Delete a bank master record
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Check if record exists
    const existingCheck = await pool.query(
      `SELECT id FROM bank_master WHERE id = $1`,
      [id]
    );

    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ message: "Bank master record not found" });
    }

    // Check if bank is referenced in bank_accounts
    const referenceCheck = await pool.query(
      `SELECT COUNT(*) as count FROM bank_accounts WHERE bank_id = $1`,
      [id]
    );

    if (parseInt(referenceCheck.rows[0].count) > 0) {
      return res.status(409).json({ 
        message: "Cannot delete bank master record. It is referenced by bank accounts." 
      });
    }

    await pool.query(`DELETE FROM bank_master WHERE id = $1`, [id]);

    res.json({ message: "Bank master record deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting bank master:", error);
    return res.status(500).json({ 
      message: "Failed to delete bank master record",
      error: error.message 
    });
  }
});

export default router;

