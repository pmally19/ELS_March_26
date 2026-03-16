import express, { Request, Response } from "express";
import { pool } from "../../db";
import { ensureActivePool } from "../../database";

const router = express.Router();

async function ensureEmployeesTable(): Promise<void> {
  await pool.query(`
    -- Ensure employees table exists with all required columns
    CREATE TABLE IF NOT EXISTS employees (
      id SERIAL PRIMARY KEY,
      employee_id VARCHAR(20),
      first_name VARCHAR(50) NOT NULL,
      last_name VARCHAR(50) NOT NULL,
      email VARCHAR(100),
      phone VARCHAR(20),
      department VARCHAR(100),
      position VARCHAR(100),
      company_code_id INTEGER,
      cost_center_id INTEGER,
      join_date DATE,
      manager_id INTEGER,
      is_active BOOLEAN DEFAULT true,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "_tenantId" CHAR(3) DEFAULT '001',
      created_by INTEGER,
      updated_by INTEGER,
      "_deletedAt" TIMESTAMPTZ
    );
    
    -- Ensure sequence is synced with table to prevent duplicate key errors
    DO $$ 
    DECLARE
      max_id INTEGER;
      seq_val INTEGER;
    BEGIN
      SELECT COALESCE(MAX(id), 0) INTO max_id FROM employees;
      IF max_id > 0 THEN
        SELECT last_value INTO seq_val FROM employees_id_seq;
        IF seq_val <= max_id THEN
          PERFORM setval('employees_id_seq', max_id + 1, false);
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Sequence might not exist yet, that's okay
      NULL;
    END $$;
  `);
}

router.get("/", async (req: Request, res: Response) => {
  try {
    ensureActivePool();
    await ensureEmployeesTable();

    const { search, department, position, status, limit = '100', offset = '0' } = req.query;

    let conditions: string[] = ['"_deletedAt" IS NULL'];
    let params: any[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(
        first_name ILIKE $${paramIndex} OR 
        last_name ILIKE $${paramIndex} OR 
        email ILIKE $${paramIndex} OR 
        employee_id ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (department) {
      conditions.push(`department = $${paramIndex}`);
      params.push(department);
      paramIndex++;
    }

    if (position) {
      conditions.push(`position = $${paramIndex}`);
      params.push(position);
      paramIndex++;
    }

    if (status) {
      if (status === 'active') {
        conditions.push(`(is_active = true AND active = true)`);
      } else if (status === 'inactive') {
        conditions.push(`(is_active = false OR active = false)`);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT 
        id,
        employee_id,
        first_name,
        last_name,
        email,
        phone,
        department,
        position,
        company_code_id,
        cost_center_id,
        join_date,
        manager_id,
        is_active,
        active,
        created_at,
        updated_at,
        created_by,
        updated_by,
        "_deletedAt" as deleted_at,
        "_tenantId" as tenant_id
      FROM employees
      ${whereClause}
      ORDER BY last_name, first_name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, parseInt(limit as string), parseInt(offset as string)]);

    // Get total count
    const countResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM employees
      ${whereClause}
    `, params);

    return res.status(200).json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count)
    });
  } catch (error: any) {
    console.error("Error fetching employees:", error);
    return res.status(500).json({ error: "Failed to fetch employees", message: error.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    ensureActivePool();
    await ensureEmployeesTable();

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const result = await pool.query(`
      SELECT 
        id,
        employee_id,
        first_name,
        last_name,
        email,
        phone,
        department,
        position,
        company_code_id,
        cost_center_id,
        join_date,
        manager_id,
        is_active,
        active,
        created_at,
        updated_at,
        created_by,
        updated_by,
        "_deletedAt" as deleted_at,
        "_tenantId" as tenant_id
      FROM employees
      WHERE id = $1 AND "_deletedAt" IS NULL
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching employee:", error);
    return res.status(500).json({ error: "Failed to fetch employee", message: error.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    ensureActivePool();
    await ensureEmployeesTable();

    const {
      employee_id,
      first_name,
      last_name,
      email,
      phone,
      department,
      position,
      company_code_id,
      cost_center_id,
      join_date,
      manager_id,
      is_active,
      active
    } = req.body;

    // Validate required fields
    if (!first_name || !last_name) {
      return res.status(400).json({ error: "First name and last name are required" });
    }

    // Sync sequence before insert
    const maxIdResult = await pool.query('SELECT COALESCE(MAX(id), 0) as max_id FROM employees');
    const maxId = parseInt(maxIdResult.rows[0].max_id) || 0;
    if (maxId > 0) {
      await pool.query(`SELECT setval('employees_id_seq', $1, false)`, [maxId + 1]);
    }

    const result = await pool.query(`
      INSERT INTO employees (
        employee_id,
        first_name,
        last_name,
        email,
        phone,
        department,
        position,
        company_code_id,
        cost_center_id,
        join_date,
        manager_id,
        is_active,
        active,
        created_at,
        updated_at,
        created_by,
        updated_by,
        "_tenantId"
      ) VALUES (
        NULLIF($1, ''),
        $2,
        $3,
        NULLIF($4, ''),
        NULLIF($5, ''),
        NULLIF($6, ''),
        NULLIF($7, ''),
        NULLIF($8::integer, 0),
        NULLIF($9::integer, 0),
        CASE WHEN $10 = '' OR $10 IS NULL THEN NULL ELSE $10::date END,
        NULLIF($11::integer, 0),
        COALESCE($12, true),
        COALESCE($13, true),
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        $14,
        $15,
        $16
      )
      RETURNING *
    `, [
      employee_id && employee_id.trim() !== '' ? employee_id : null,
      first_name,
      last_name,
      email && email.trim() !== '' ? email : null,
      phone && phone.trim() !== '' ? phone : null,
      department && department.trim() !== '' ? department : null,
      position && position.trim() !== '' ? position : null,
      company_code_id || null,
      cost_center_id || null,
      join_date && join_date.trim() !== '' ? join_date : null,
      manager_id || null,
      is_active !== undefined ? is_active : true,
      active !== undefined ? active : true,
      (req as any).user?.id || 1,
      (req as any).user?.id || 1,
      (req as any).user?.tenantId || '001'
    ]);

    return res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error creating employee:", error);
    return res.status(500).json({ error: "Failed to create employee", message: error.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    ensureActivePool();
    await ensureEmployeesTable();

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const {
      employee_id,
      first_name,
      last_name,
      email,
      phone,
      department,
      position,
      company_code_id,
      cost_center_id,
      join_date,
      manager_id,
      is_active,
      active
    } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (employee_id !== undefined) {
      updates.push(`employee_id = $${paramIndex}`);
      values.push(employee_id || null);
      paramIndex++;
    }
    if (first_name !== undefined) {
      updates.push(`first_name = $${paramIndex}`);
      values.push(first_name);
      paramIndex++;
    }
    if (last_name !== undefined) {
      updates.push(`last_name = $${paramIndex}`);
      values.push(last_name);
      paramIndex++;
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex}`);
      values.push(email || null);
      paramIndex++;
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex}`);
      values.push(phone || null);
      paramIndex++;
    }
    if (department !== undefined) {
      updates.push(`department = $${paramIndex}`);
      values.push(department || null);
      paramIndex++;
    }
    if (position !== undefined) {
      updates.push(`position = $${paramIndex}`);
      values.push(position || null);
      paramIndex++;
    }
    if (company_code_id !== undefined) {
      updates.push(`company_code_id = $${paramIndex}`);
      values.push(company_code_id || null);
      paramIndex++;
    }
    if (cost_center_id !== undefined) {
      updates.push(`cost_center_id = $${paramIndex}`);
      values.push(cost_center_id || null);
      paramIndex++;
    }
    if (join_date !== undefined) {
      updates.push(`join_date = CASE WHEN $${paramIndex} = '' OR $${paramIndex} IS NULL THEN NULL ELSE $${paramIndex}::date END`);
      const dateValue = join_date && join_date.trim() !== '' ? join_date : null;
      values.push(dateValue);
      paramIndex++;
    }
    if (manager_id !== undefined) {
      updates.push(`manager_id = $${paramIndex}`);
      values.push(manager_id || null);
      paramIndex++;
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(is_active);
      paramIndex++;
    }
    if (active !== undefined) {
      updates.push(`active = $${paramIndex}`);
      values.push(active);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    updates.push(`updated_by = $${paramIndex}`);
    values.push((req as any).user?.id || 1);
    paramIndex++;

    values.push(id);

    const result = await pool.query(`
      UPDATE employees
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating employee:", error);
    return res.status(500).json({ error: "Failed to update employee", message: error.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    ensureActivePool();
    await ensureEmployeesTable();

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const result = await pool.query(`
      UPDATE employees
      SET "_deletedAt" = NOW(), updated_by = $2
      WHERE id = $1 AND "_deletedAt" IS NULL
      RETURNING id
    `, [id, (req as any).user?.id || 1]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    return res.status(200).json({ message: "Employee deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting employee:", error);
    return res.status(500).json({ error: "Failed to delete employee", message: error.message });
  }
});

export default router;

