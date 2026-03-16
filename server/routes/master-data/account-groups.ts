import { Router } from "express";
import { db, pool } from "../../db";
import { accountGroups } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

const router = Router();

// GET /api/master-data/account-groups/number-ranges - Get available number ranges
// Optional query params: accountType (CUSTOMER, VENDOR, MATERIAL)
// Note: Returns all ranges by default since account groups can use any range
// Uses the number_ranges table (not sd_number_ranges which is empty)
router.get("/number-ranges", async (req, res) => {
  try {
    const { accountType } = req.query;
    console.log('📥 Fetching available number ranges for account groups', { accountType });

    // Build query using number_ranges table (the actual table with data)
    // Show ALL ranges by default, account type filter is optional and non-restrictive
    let query = `
      SELECT 
        nr.id,
        nr.number_range_code as code,
        nr.number_range_code as name,
        COALESCE(
          nr.description,
          CONCAT(nr.number_range_object, ' - ', nr.number_range_code)
        ) as description,
        nr.number_range_object as object_type,
        nr.range_from as number_from,
        nr.range_to as number_to,
        nr.current_number,
        COALESCE(nr.is_active, true) as is_active
      FROM number_ranges nr
      WHERE COALESCE(nr.is_active, true) = true
    `;

    const params: any[] = [];

    // Optional non-restrictive filter - tries to match but doesn't exclude everything
    // This allows showing all ranges if no specific match, but prioritizes relevant ones
    if (accountType) {
      const typeFilter = String(accountType).toUpperCase();
      // Add ordering to prioritize matching ranges, but still show all
      if (typeFilter === 'CUSTOMER') {
        query += ` ORDER BY 
          CASE 
            WHEN nr.number_range_object ILIKE '%customer%' OR nr.number_range_object ILIKE '%cust%' THEN 0
            WHEN nr.description ILIKE '%customer%' OR nr.description ILIKE '%cust%' THEN 1
            ELSE 2
          END,
          nr.number_range_code`;
      } else if (typeFilter === 'VENDOR') {
        query += ` ORDER BY 
          CASE 
            WHEN nr.number_range_object ILIKE '%vendor%' OR nr.number_range_object ILIKE '%vend%' THEN 0
            WHEN nr.description ILIKE '%vendor%' OR nr.description ILIKE '%vend%' THEN 1
            ELSE 2
          END,
          nr.number_range_code`;
      } else if (typeFilter === 'MATERIAL') {
        query += ` ORDER BY 
          CASE 
            WHEN nr.number_range_object ILIKE '%material%' OR nr.number_range_object ILIKE '%mat%' THEN 0
            WHEN nr.description ILIKE '%material%' OR nr.description ILIKE '%mat%' THEN 1
            ELSE 2
          END,
          nr.number_range_code`;
      } else {
        query += ` ORDER BY nr.number_range_code`;
      }
    } else {
      query += ` ORDER BY nr.number_range_code`;
    }

    const result = await pool.query(query, params);

    const numberRanges = result.rows.map((row: any) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description || `${row.code} - ${row.object_type}`,
      objectType: row.object_type,
      numberFrom: row.number_from,
      numberTo: row.number_to,
      currentNumber: row.current_number,
      isActive: row.is_active
    }));

    console.log('📥 Found number ranges:', numberRanges.length);
    res.json(numberRanges);
  } catch (error) {
    console.error("Error fetching number ranges:", error);
    res.status(500).json({ message: "Failed to fetch number ranges" });
  }
});

// GET /api/master-data/account-groups - Get all account groups with number range info
// Optional query param: accountType (CUSTOMER, VENDOR, etc.) to filter by account type
router.get("/", async (req, res) => {
  try {
    const { accountType } = req.query;

    // Build WHERE clause with optional account type filter
    let whereClause = "WHERE COALESCE(ag.is_active, ag.active, true) = true";
    const params: any[] = [];
    let paramCount = 1;

    if (accountType) {
      whereClause += ` AND COALESCE(ag.account_type, '') = $${paramCount++}`;
      params.push(accountType);
    }

    // Use raw SQL query to match the actual database schema with number range join
    const result = await pool.query(`
      SELECT 
        ag.id,
        COALESCE(ag.code, ag.chart_id) as code,
        COALESCE(ag.name, ag.group_name) as name,
        COALESCE(ag.description, ag.group_name, ag.name) as description,
        COALESCE(ag.account_type, '') as account_type,
        COALESCE(ag.number_range_from, ag.account_range_from, nr.range_from) as number_range_from,
        COALESCE(ag.number_range_to, ag.account_range_to, nr.range_to) as number_range_to,
        COALESCE(ag.is_active, ag.active, true) as is_active,
        ag.number_range_id,
        ag.field_status_group,
        ag.one_time_account_indicator,
        ag.authorization_group,
        ag.sort_key,
        ag.block_indicator,
        ag.reconciliation_account_indicator,
        ag.account_number_format,
        ag.account_number_length,
        ag.screen_layout,
        ag.payment_terms,
        ag.dunning_area,
        nr.id as number_range_id_from_table,
        nr.number_range_code as number_range_code,
        nr.number_range_object as number_range_object_code,
        nr.current_number as number_range_current,
        ag.created_at,
        ag.updated_at
      FROM account_groups ag
      LEFT JOIN number_ranges nr ON ag.number_range_id = nr.id
      ${whereClause}
      ORDER BY ag.code, COALESCE(ag.name, ag.group_name)
    `, params);

    // Map DB columns to UI shape
    const rows = result.rows.map((r: any) => ({
      id: r.id,
      code: r.code || '',
      name: r.name || '',
      description: r.description || r.name || '',
      accountType: r.account_type || '',
      numberRange: r.number_range_from || undefined,
      numberRangeTo: r.number_range_to || undefined,
      numberRangeId: r.number_range_id || r.number_range_id_from_table || undefined,
      numberRangeCode: r.number_range_code || undefined,
      numberRangeObjectCode: r.number_range_object_code || undefined,
      numberRangeCurrent: r.number_range_current || undefined,
      fieldStatusGroup: r.field_status_group || undefined,
      oneTimeAccountIndicator: r.one_time_account_indicator || false,
      authorizationGroup: r.authorization_group || undefined,
      sortKey: r.sort_key || undefined,
      blockIndicator: r.block_indicator || false,
      reconciliationAccountIndicator: r.reconciliation_account_indicator || false,
      accountNumberFormat: r.account_number_format || undefined,
      accountNumberLength: r.account_number_length || undefined,
      screenLayout: r.screen_layout || undefined,
      paymentTerms: r.payment_terms || undefined,
      dunningArea: r.dunning_area || undefined,
      isActive: r.is_active !== false,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    res.json(rows);
  } catch (error: any) {
    console.error("Error fetching account groups:", error);
    console.error("Error details:", error.message, error.stack);
    return res.status(500).json({
      message: "Failed to fetch account groups",
      error: error.message
    });
  }
});

// GET /api/master-data/account-groups/:id - Get account group by ID
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pool.query(`
      SELECT 
        ag.id,
        COALESCE(ag.code, ag.chart_id) as code,
        COALESCE(ag.name, ag.group_name) as name,
        COALESCE(ag.description, ag.group_name, ag.name) as description,
        COALESCE(ag.account_type, '') as account_type,
        COALESCE(ag.number_range_from, ag.account_range_from, nr.range_from) as number_range_from,
        COALESCE(ag.number_range_to, ag.account_range_to, nr.range_to) as number_range_to,
        COALESCE(ag.is_active, ag.active, true) as is_active,
        ag.number_range_id,
        ag.field_status_group,
        ag.one_time_account_indicator,
        ag.authorization_group,
        ag.sort_key,
        ag.block_indicator,
        ag.reconciliation_account_indicator,
        ag.account_number_format,
        ag.account_number_length,
        ag.screen_layout,
        ag.payment_terms,
        ag.dunning_area,
        nr.id as number_range_id_from_table,
        nr.number_range_code as number_range_code,
        nr.number_range_object as number_range_object_code,
        nr.current_number as number_range_current,
        ag.created_at,
        ag.updated_at
      FROM account_groups ag
      LEFT JOIN number_ranges nr ON ag.number_range_id = nr.id
      WHERE ag.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Account group not found" });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      code: row.code || '',
      name: row.name || '',
      description: row.description || row.name || '',
      accountType: row.account_type || '',
      numberRange: row.number_range_from || undefined,
      numberRangeTo: row.number_range_to || undefined,
      numberRangeId: row.number_range_id || row.number_range_id_from_table || undefined,
      numberRangeCode: row.number_range_code || undefined,
      numberRangeObjectCode: row.number_range_object_code || undefined,
      numberRangeCurrent: row.number_range_current || undefined,
      fieldStatusGroup: row.field_status_group || undefined,
      oneTimeAccountIndicator: row.one_time_account_indicator || false,
      authorizationGroup: row.authorization_group || undefined,
      sortKey: row.sort_key || undefined,
      blockIndicator: row.block_indicator || false,
      reconciliationAccountIndicator: row.reconciliation_account_indicator || false,
      accountNumberFormat: row.account_number_format || undefined,
      accountNumberLength: row.account_number_length || undefined,
      screenLayout: row.screen_layout || undefined,
      paymentTerms: row.payment_terms || undefined,
      dunningArea: row.dunning_area || undefined,
      isActive: row.is_active !== false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (error) {
    console.error("Error fetching account group:", error);
    res.status(500).json({ message: "Failed to fetch account group" });
  }
});

// POST /api/master-data/account-groups - Create new account group
router.post("/", async (req, res) => {
  try {
    console.log('📥 Account Group POST request body:', req.body);

    let {
      code, name, description, accountType, numberRange, numberRangeTo, numberRangeId, isActive,
      fieldStatusGroup, oneTimeAccountIndicator, authorizationGroup, sortKey, blockIndicator,
      reconciliationAccountIndicator, accountNumberFormat, accountNumberLength, screenLayout,
      paymentTerms, dunningArea
    } = req.body;

    // Normalize inputs
    code = (code ?? '').toString().trim();
    name = (name ?? description ?? '').toString().trim();
    description = (description ?? '').toString().trim();
    // Normalize account type to uppercase (no default, must be provided)
    accountType = accountType ? accountType.toString().trim().toUpperCase() : '';
    numberRange = numberRange ? numberRange.toString().trim() : null;
    numberRangeTo = numberRangeTo ? numberRangeTo.toString().trim() : null;
    numberRangeId = numberRangeId ? parseInt(numberRangeId) : null;
    isActive = isActive !== undefined ? Boolean(isActive) : true;
    // Standard fields
    fieldStatusGroup = fieldStatusGroup ? fieldStatusGroup.toString().trim().substring(0, 4) : null;
    oneTimeAccountIndicator = oneTimeAccountIndicator !== undefined ? Boolean(oneTimeAccountIndicator) : false;
    authorizationGroup = authorizationGroup ? authorizationGroup.toString().trim().substring(0, 4) : null;
    sortKey = sortKey ? sortKey.toString().trim().substring(0, 2) : null;
    blockIndicator = blockIndicator !== undefined ? Boolean(blockIndicator) : false;
    reconciliationAccountIndicator = reconciliationAccountIndicator !== undefined ? Boolean(reconciliationAccountIndicator) : false;
    accountNumberFormat = accountNumberFormat ? accountNumberFormat.toString().trim().substring(0, 20) : null;
    accountNumberLength = accountNumberLength ? parseInt(accountNumberLength) : null;
    screenLayout = screenLayout ? screenLayout.toString().trim().substring(0, 4) : null;
    paymentTerms = paymentTerms ? paymentTerms.toString().trim().substring(0, 4) : null;
    dunningArea = dunningArea ? dunningArea.toString().trim().substring(0, 2) : null;

    console.log('📥 Account Group CREATE payload (normalized):', {
      code, description, accountType, numberRange, numberRangeTo, numberRangeId, isActive
    });

    // Validation
    if (!name) {
      return res.status(400).json({
        message: "Name is required",
        received: { code, name, description, accountType, numberRange, numberRangeTo, numberRangeId, isActive }
      });
    }
    if (!accountType) {
      return res.status(400).json({
        message: "Account type is required",
        received: { code, name, description, accountType, numberRange, numberRangeTo, numberRangeId, isActive }
      });
    }

    // Validate number range if provided
    let selectedNumberRange = null;
    let validatedNumberRangeId = null;
    if (numberRangeId) {
      // Ensure numberRangeId is parsed as integer
      const rangeId = parseInt(String(numberRangeId), 10);
      if (isNaN(rangeId)) {
        return res.status(400).json({
          message: "Invalid number range ID format",
          numberRangeId: numberRangeId
        });
      }

      console.log('📥 Validating number range ID:', rangeId);

      // First check sd_number_ranges (the table the FK references)
      let numberRangeResult = null;
      try {
        numberRangeResult = await pool.query(`
          SELECT id, number_range_code as code, number_range_code as name, range_from as number_from, range_to as number_to, current_number, is_active
          FROM sd_number_ranges 
          WHERE id = $1
        `, [rangeId]);
      } catch (e: any) {
        console.log('📥 sd_number_ranges table check failed, trying number_ranges:', e.message);
      }

      // If not found in sd_number_ranges, check number_ranges (for data retrieval)
      if (!numberRangeResult || numberRangeResult.rows.length === 0) {
        try {
          numberRangeResult = await pool.query(`
            SELECT id, number_range_code as code, number_range_code as name, range_from as number_from, range_to as number_to, current_number, is_active
            FROM number_ranges 
            WHERE id = $1
          `, [rangeId]);
        } catch (e: any) {
          console.log('📥 number_ranges table check failed:', e.message);
        }
      }

      console.log('📥 Number range query result:', {
        rows: numberRangeResult?.rows.length || 0,
        data: numberRangeResult?.rows[0]
      });

      if (!numberRangeResult || numberRangeResult.rows.length === 0) {
        // If number range doesn't exist, don't set number_range_id (set to null)
        console.log('📥 Number range not found, setting number_range_id to null');
        validatedNumberRangeId = null;
      } else {
        const range = numberRangeResult.rows[0];
        // Check if active (if is_active is null, consider it active)
        if (range.is_active === false) {
          return res.status(400).json({
            message: "Number range is inactive",
            numberRangeId: rangeId
          });
        }

        selectedNumberRange = range;

        // Check if it exists in sd_number_ranges (the FK table)
        try {
          const sdCheck = await pool.query(`
            SELECT id FROM sd_number_ranges WHERE id = $1
          `, [rangeId]);

          if (sdCheck.rows.length > 0) {
            validatedNumberRangeId = rangeId;
            console.log('📥 Number range exists in sd_number_ranges, will use FK reference');
          } else {
            console.log('📥 Number range not in sd_number_ranges (FK table), setting number_range_id to null');
            validatedNumberRangeId = null;
          }
        } catch (e: any) {
          console.log('📥 Could not check sd_number_ranges, setting number_range_id to null:', e.message);
          validatedNumberRangeId = null;
        }

        console.log('📥 Selected number range:', selectedNumberRange);
      }
    }

    if (!code) {
      // Generate safe fallback code if frontend omitted or sent null
      const base = (description || 'AG').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6) || 'AG';
      const unique = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      code = `${base}${unique}`;
      console.log('📥 Generated fallback code:', code);
    }

    // Check if code already exists (check both code and chart_id for compatibility)
    const existingCheck = await pool.query(
      'SELECT id FROM account_groups WHERE code = $1 OR chart_id = $1',
      [code]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(409).json({
        message: "Account group code already exists",
        code: code
      });
    }

    // Use number range information if available
    const accountRangeFrom = selectedNumberRange ? selectedNumberRange.number_from : (numberRange || null);
    const accountRangeTo = selectedNumberRange ? selectedNumberRange.number_to : (numberRangeTo || numberRange || null);

    console.log('📥 Inserting account group with values:', {
      chart_id: code,
      group_name: description,
      account_range_from: accountRangeFrom,
      account_range_to: accountRangeTo,
      active: isActive,
      number_range_id: validatedNumberRangeId
    });

    // Insert with validated number_range_id (only if it exists in sd_number_ranges)
    const result = await pool.query(`
      INSERT INTO account_groups (
        code, chart_id, name, group_name, description, account_type, 
        account_range_from, account_range_to, 
        number_range_from, number_range_to,
        number_range_id, active, is_active,
        field_status_group, one_time_account_indicator, authorization_group, sort_key,
        block_indicator, reconciliation_account_indicator, account_number_format,
        account_number_length, screen_layout, payment_terms, dunning_area
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING id, code, name, group_name, description, account_type, 
        account_range_from, account_range_to, 
        number_range_from, number_range_to,
        number_range_id, active, is_active,
        field_status_group, one_time_account_indicator, authorization_group, sort_key,
        block_indicator, reconciliation_account_indicator, account_number_format,
        account_number_length, screen_layout, payment_terms, dunning_area,
        created_at, updated_at
    `, [
      code, code, name, name, description, accountType,
      accountRangeFrom, accountRangeTo,
      accountRangeFrom, accountRangeTo,
      validatedNumberRangeId, isActive, isActive,
      fieldStatusGroup, oneTimeAccountIndicator, authorizationGroup, sortKey,
      blockIndicator, reconciliationAccountIndicator, accountNumberFormat,
      accountNumberLength, screenLayout, paymentTerms, dunningArea
    ]);

    if (!result.rows || result.rows.length === 0) {
      throw new Error('Insert operation did not return any rows');
    }

    const created = result.rows[0];
    console.log('📥 Created account group:', created);

    // Fetch the created record with number range info if linked
    const fullRecord = await pool.query(`
      SELECT 
        ag.*,
        nr.number_range_code as number_range_code,
        nr.number_range_object as number_range_object_code,
        nr.current_number as number_range_current
      FROM account_groups ag
      LEFT JOIN number_ranges nr ON ag.number_range_id = nr.id
      WHERE ag.id = $1
    `, [created.id]);

    const fullRow = fullRecord.rows[0];

    const row = {
      id: fullRow.id,
      code: fullRow.code,
      name: fullRow.name || fullRow.group_name || '',
      description: fullRow.description || fullRow.group_name || '',
      accountType: fullRow.account_type || accountType || '',
      numberRange: fullRow.number_range_from || fullRow.account_range_from || undefined,
      numberRangeTo: fullRow.number_range_to || fullRow.account_range_to || undefined,
      numberRangeId: fullRow.number_range_id || undefined,
      numberRangeCode: fullRow.number_range_code || undefined,
      numberRangeObjectCode: fullRow.number_range_object_code || undefined,
      numberRangeCurrent: fullRow.number_range_current || undefined,
      fieldStatusGroup: fullRow.field_status_group || undefined,
      oneTimeAccountIndicator: fullRow.one_time_account_indicator || false,
      authorizationGroup: fullRow.authorization_group || undefined,
      sortKey: fullRow.sort_key || undefined,
      blockIndicator: fullRow.block_indicator || false,
      reconciliationAccountIndicator: fullRow.reconciliation_account_indicator || false,
      accountNumberFormat: fullRow.account_number_format || undefined,
      accountNumberLength: fullRow.account_number_length || undefined,
      screenLayout: fullRow.screen_layout || undefined,
      paymentTerms: fullRow.payment_terms || undefined,
      dunningArea: fullRow.dunning_area || undefined,
      isActive: (fullRow.is_active !== undefined ? fullRow.is_active : fullRow.active) !== false,
      createdAt: fullRow.created_at,
      updatedAt: fullRow.updated_at,
    };

    console.log('📥 Returning response:', row);
    res.status(201).json(row);
  } catch (error: any) {
    console.error("❌ Error creating account group:", error);
    console.error("❌ Error details:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });

    if (error.code === '23505') {
      return res.status(409).json({
        message: "Account group code already exists",
        error: error.detail
      });
    } else if (error.code === '23502') {
      return res.status(400).json({
        message: "Missing required field for account group",
        error: error.detail
      });
    } else if (error.code === '23514') {
      return res.status(400).json({
        message: "Invalid data provided for account group",
        error: error.detail
      });
    }

    return res.status(500).json({
      message: "Failed to create account group",
      error: error.message,
      details: error.detail
    });
  }
});

// PATCH /api/master-data/account-groups/:id - Update account group
router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      code, name, description, accountType, numberRange, numberRangeId, numberRangeTo, isActive,
      fieldStatusGroup, oneTimeAccountIndicator, authorizationGroup, sortKey, blockIndicator,
      reconciliationAccountIndicator, accountNumberFormat, accountNumberLength, screenLayout,
      paymentTerms, dunningArea
    } = req.body;

    // If numberRangeId is provided, fetch the number range details  
    let selectedNumberRange = null;
    let validatedNumberRangeId = null;
    if (numberRangeId) {
      // Ensure numberRangeId is parsed as integer
      const rangeId = parseInt(String(numberRangeId), 10);
      if (isNaN(rangeId)) {
        return res.status(400).json({
          message: "Invalid number range ID format",
          numberRangeId: numberRangeId
        });
      }

      console.log('📥 Validating number range ID (PATCH):', rangeId);

      // Check number_ranges table for display data
      const numberRangeResult = await pool.query(`
        SELECT id, range_from as from_number, range_to as to_number, current_number, number_range_code as range_number, number_range_object as object_code, is_active
        FROM number_ranges 
        WHERE id = $1
      `, [rangeId]);

      console.log('📥 Number range query result (PATCH):', {
        rows: numberRangeResult.rows.length,
        data: numberRangeResult.rows[0]
      });

      if (numberRangeResult.rows.length === 0) {
        return res.status(400).json({
          message: "Number range not found",
          numberRangeId: rangeId
        });
      }

      const range = numberRangeResult.rows[0];
      // Check if active (if is_active is null, consider it active)
      if (range.is_active === false) {
        return res.status(400).json({
          message: "Number range is inactive",
          numberRangeId: rangeId
        });
      }

      selectedNumberRange = range;

      // CRITICAL: Check if it exists in sd_number_ranges (the FK table)
      // If not, set number_range_id to null to avoid FK constraint violation
      try {
        const sdCheck = await pool.query(`
          SELECT id FROM sd_number_ranges WHERE id = $1
        `, [rangeId]);

        if (sdCheck.rows.length > 0) {
          validatedNumberRangeId = rangeId;
          console.log('📥 Number range exists in sd_number_ranges, will use FK reference');
        } else {
          validatedNumberRangeId = null;
          console.log('⚠️ Number range NOT in sd_number_ranges (FK table), setting number_range_id to null to avoid FK violation');
        }
      } catch (e: any) {
        console.log('❌ Could not check sd_number_ranges, setting number_range_id to null:', e.message);
        validatedNumberRangeId = null;
      }
    }

    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (code !== undefined) {
      updateFields.push(`code = $${paramCount}`);
      values.push(code);
      updateFields.push(`chart_id = $${paramCount}`);
      paramCount++;
    }
    if (name !== undefined) {
      updateFields.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
      updateFields.push(`group_name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }
    if (accountType !== undefined) {
      updateFields.push(`account_type = $${paramCount}`);
      values.push(accountType);
      paramCount++;
    }

    // Handle number range updates
    if (numberRangeId !== undefined) {
      // Use validatedNumberRangeId (null if not in sd_number_ranges)
      updateFields.push(`number_range_id = $${paramCount}`);
      values.push(validatedNumberRangeId);
      paramCount++;

      // Auto-populate from/to from linked number range
      if (selectedNumberRange) {
        updateFields.push(`account_range_from = $${paramCount}`);
        values.push(selectedNumberRange.from_number);
        paramCount++;
        updateFields.push(`account_range_to = $${paramCount}`);
        values.push(selectedNumberRange.to_number);
        paramCount++;
        updateFields.push(`number_range_from = $${paramCount}`);
        values.push(selectedNumberRange.from_number);
        paramCount++;
        updateFields.push(`number_range_to = $${paramCount}`);
        values.push(selectedNumberRange.to_number);
        paramCount++;
      }
    } else if (numberRange !== undefined) {
      // Manual number range entry
      updateFields.push(`account_range_from = $${paramCount}`);
      values.push(numberRange || null);
      paramCount++;
      updateFields.push(`number_range_from = $${paramCount}`);
      values.push(numberRange || null);
      paramCount++;

      if (numberRangeTo !== undefined) {
        updateFields.push(`account_range_to = $${paramCount}`);
        values.push(numberRangeTo || null);
        paramCount++;
        updateFields.push(`number_range_to = $${paramCount}`);
        values.push(numberRangeTo || null);
        paramCount++;
      } else {
        updateFields.push(`account_range_to = $${paramCount}`);
        values.push(numberRange || null);
        paramCount++;
        updateFields.push(`number_range_to = $${paramCount}`);
        values.push(numberRange || null);
        paramCount++;
      }
    }

    if (isActive !== undefined) {
      updateFields.push(`active = $${paramCount}`);
      values.push(isActive);
      updateFields.push(`is_active = $${paramCount}`);
      paramCount++;
    }

    // Standard fields
    if (fieldStatusGroup !== undefined) {
      updateFields.push(`field_status_group = $${paramCount}`);
      values.push(fieldStatusGroup || null);
      paramCount++;
    }
    if (oneTimeAccountIndicator !== undefined) {
      updateFields.push(`one_time_account_indicator = $${paramCount}`);
      values.push(oneTimeAccountIndicator);
      paramCount++;
    }
    if (authorizationGroup !== undefined) {
      updateFields.push(`authorization_group = $${paramCount}`);
      values.push(authorizationGroup || null);
      paramCount++;
    }
    if (sortKey !== undefined) {
      updateFields.push(`sort_key = $${paramCount}`);
      values.push(sortKey || null);
      paramCount++;
    }
    if (blockIndicator !== undefined) {
      updateFields.push(`block_indicator = $${paramCount}`);
      values.push(blockIndicator);
      paramCount++;
    }
    if (reconciliationAccountIndicator !== undefined) {
      updateFields.push(`reconciliation_account_indicator = $${paramCount}`);
      values.push(reconciliationAccountIndicator);
      paramCount++;
    }
    if (accountNumberFormat !== undefined) {
      updateFields.push(`account_number_format = $${paramCount}`);
      values.push(accountNumberFormat || null);
      paramCount++;
    }
    if (accountNumberLength !== undefined) {
      updateFields.push(`account_number_length = $${paramCount}`);
      values.push(accountNumberLength || null);
      paramCount++;
    }
    if (screenLayout !== undefined) {
      updateFields.push(`screen_layout = $${paramCount}`);
      values.push(screenLayout || null);
      paramCount++;
    }
    if (paymentTerms !== undefined) {
      updateFields.push(`payment_terms = $${paramCount}`);
      values.push(paymentTerms || null);
      paramCount++;
    }
    if (dunningArea !== undefined) {
      updateFields.push(`dunning_area = $${paramCount}`);
      values.push(dunningArea || null);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE account_groups 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, code, group_name, description, account_type, 
        account_range_from, account_range_to, 
        number_range_from, number_range_to,
        number_range_id, active, is_active, created_at, updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Account group not found" });
    }

    const updated = result.rows[0];

    // Fetch updated record with number range info
    const fullRecord = await pool.query(`
      SELECT 
        ag.*,
        nr.number_range_code as number_range_code,
        nr.number_range_object as number_range_object_code,
        nr.current_number as number_range_current
      FROM account_groups ag
      LEFT JOIN number_ranges nr ON ag.number_range_id = nr.id
      WHERE ag.id = $1
    `, [id]);

    const fullRow = fullRecord.rows[0] || updated;

    const row = {
      id: fullRow.id,
      code: fullRow.code,
      name: fullRow.name || fullRow.group_name || '',
      description: fullRow.description || fullRow.group_name || '',
      accountType: fullRow.account_type || '',
      numberRange: fullRow.number_range_from || fullRow.account_range_from || undefined,
      numberRangeTo: fullRow.number_range_to || fullRow.account_range_to || undefined,
      numberRangeId: fullRow.number_range_id || undefined,
      numberRangeCode: fullRow.number_range_code || undefined,
      numberRangeObjectCode: fullRow.number_range_object_code || undefined,
      numberRangeCurrent: fullRow.number_range_current || undefined,
      fieldStatusGroup: fullRow.field_status_group || undefined,
      oneTimeAccountIndicator: fullRow.one_time_account_indicator || false,
      authorizationGroup: fullRow.authorization_group || undefined,
      sortKey: fullRow.sort_key || undefined,
      blockIndicator: fullRow.block_indicator || false,
      reconciliationAccountIndicator: fullRow.reconciliation_account_indicator || false,
      accountNumberFormat: fullRow.account_number_format || undefined,
      accountNumberLength: fullRow.account_number_length || undefined,
      screenLayout: fullRow.screen_layout || undefined,
      paymentTerms: fullRow.payment_terms || undefined,
      dunningArea: fullRow.dunning_area || undefined,
      isActive: (fullRow.is_active !== undefined ? fullRow.is_active : fullRow.active) !== false,
      createdAt: fullRow.created_at,
      updatedAt: fullRow.updated_at,
    };
    res.json(row);
  } catch (error: any) {
    console.error("Error updating account group:", error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({ message: "Account group code already exists" });
    } else {
      res.status(500).json({ message: "Failed to update account group" });
    }
  }
});

// DELETE /api/master-data/account-groups/:id - Delete account group
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const result = await pool.query(`
      DELETE FROM account_groups 
      WHERE id = $1 
      RETURNING id, chart_id, group_name
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Account group not found" });
    }

    res.json({
      message: "Account group deleted successfully",
      deletedId: result.rows[0].id,
      code: result.rows[0].chart_id,
      description: result.rows[0].group_name
    });
  } catch (error: any) {
    console.error("Error deleting account group:", error);
    if (error.code === '23503') {
      return res.status(400).json({
        message: "Cannot delete account group. It is referenced by other records."
      });
    }
    res.status(500).json({ message: "Failed to delete account group" });
  }
});

// POST /api/master-data/account-groups/bulk-import - Bulk import account groups
router.post("/bulk-import", async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items array is required" });
    }

    const validItems = items.filter((item: any) => item.code && item.description);

    if (validItems.length === 0) {
      return res.status(400).json({ message: "No valid items to import" });
    }

    // Use raw SQL for bulk insert
    const values = validItems.map((item: any, index: number) => {
      const baseIndex = index * 8;
      return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8})`;
    }).join(', ');

    const params = validItems.flatMap((item: any) => [
      item.code,
      item.description,
      item.description, // description field
      item.accountType || 'GL', // account_type field
      item.numberRange || null,
      item.numberRange || null,
      item.fieldStatusGroup || null, // field_status_group field
      item.isActive !== undefined ? item.isActive : true
    ]);

    const query = `
      INSERT INTO account_groups (code, group_name, description, account_type, account_range_from, account_range_to, field_status_group, active)
      VALUES ${values}
      RETURNING id, code, group_name, description, account_type, account_range_from, account_range_to, field_status_group, active, created_at, updated_at
    `;

    const result = await pool.query(query, params);

    const mapped = result.rows.map((r: any) => ({
      id: r.id,
      code: r.code,
      description: r.description || r.group_name,
      accountType: r.account_type || 'GL',
      numberRange: r.account_range_from || undefined,
      numberRangeTo: r.account_range_to || undefined,
      fieldStatusGroup: r.field_status_group || undefined,
      isActive: r.active,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    res.status(201).json({
      message: "Bulk import completed successfully",
      imported: mapped.length,
      items: mapped
    });
  } catch (error: any) {
    console.error("Error bulk importing account groups:", error);
    if (error.code === '23505') {
      return res.status(409).json({ message: "One or more account group codes already exist" });
    }
    return res.status(500).json({ message: error?.message || "Failed to import account groups" });
  }
});

export default router;