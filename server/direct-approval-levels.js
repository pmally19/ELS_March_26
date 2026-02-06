// Direct implementation for approval levels that will work regardless of ORM issues
const { Pool } = require('pg');
const connectionString = process.env.DATABASE_URL;

// Simple function to run a query
async function runQuery(query, params = []) {
  const client = new Pool({ connectionString });
  try {
    return await client.query(query, params);
  } finally {
    client.end();
  }
}

// Ensure the table exists
async function ensureTable() {
  try {
    await runQuery(`
      CREATE TABLE IF NOT EXISTS approval_levels (
        id SERIAL PRIMARY KEY,
        level INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        value_limit NUMERIC NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Approval levels table ensured");
    return true;
  } catch (error) {
    console.error("Error ensuring approval levels table:", error);
    return false;
  }
}

// Get all approval levels
async function getApprovalLevels() {
  try {
    await ensureTable();
    const result = await runQuery(`
      SELECT id, level, name, description, value_limit, created_at, updated_at
      FROM approval_levels
      ORDER BY level ASC
    `);
    return { success: true, data: result.rows };
  } catch (error) {
    console.error("Error fetching approval levels:", error);
    return { success: false, error: error.message };
  }
}

// Get approval level by ID
async function getApprovalLevelById(id) {
  try {
    const result = await runQuery(`
      SELECT id, level, name, description, value_limit, created_at, updated_at
      FROM approval_levels
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return { success: false, error: `Approval level with ID ${id} not found` };
    }
    
    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error("Error fetching approval level by ID:", error);
    return { success: false, error: error.message };
  }
}

// Create approval level
async function createApprovalLevel(data) {
  try {
    await ensureTable();
    
    const { level, name, description, value_limit } = data;
    
    if (!level || !name) {
      return { success: false, error: "Level and name are required fields" };
    }
    
    const result = await runQuery(`
      INSERT INTO approval_levels (level, name, description, value_limit)
      VALUES ($1, $2, $3, $4)
      RETURNING id, level, name, description, value_limit, created_at, updated_at
    `, [level, name, description || null, value_limit || null]);
    
    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error("Error creating approval level:", error);
    return { success: false, error: error.message };
  }
}

// Update approval level
async function updateApprovalLevel(id, data) {
  try {
    const { level, name, description, value_limit } = data;
    
    if (!level || !name) {
      return { success: false, error: "Level and name are required fields" };
    }
    
    const result = await runQuery(`
      UPDATE approval_levels
      SET level = $1, 
          name = $2, 
          description = $3, 
          value_limit = $4, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING id, level, name, description, value_limit, created_at, updated_at
    `, [level, name, description || null, value_limit || null, id]);
    
    if (result.rows.length === 0) {
      return { success: false, error: `Approval level with ID ${id} not found` };
    }
    
    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error("Error updating approval level:", error);
    return { success: false, error: error.message };
  }
}

// Delete approval level
async function deleteApprovalLevel(id) {
  try {
    const result = await runQuery(`
      DELETE FROM approval_levels
      WHERE id = $1
      RETURNING id
    `, [id]);
    
    if (result.rows.length === 0) {
      return { success: false, error: `Approval level with ID ${id} not found` };
    }
    
    return { success: true, message: `Approval level with ID ${id} successfully deleted` };
  } catch (error) {
    console.error("Error deleting approval level:", error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  getApprovalLevels,
  getApprovalLevelById,
  createApprovalLevel,
  updateApprovalLevel,
  deleteApprovalLevel
};