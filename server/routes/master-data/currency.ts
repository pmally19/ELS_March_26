/**
 * API Routes for Currency Master Data
 */

import { Request, Response } from "express";
import { db } from "../../db";
import { ensureActivePool } from "../../database";
import { sql } from "drizzle-orm";
import { z } from "zod";

// Validation schema for currency
const currencySchema = z.object({
  code: z.string().min(2, "Code is required").max(10, "Code must be at most 10 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  symbol: z.string().min(1, "Symbol is required").max(10, "Symbol must be at most 10 characters"),
  decimalPlaces: z.coerce.number().min(0).max(4).default(2),
  conversionRate: z.coerce.number().min(0).default(1.0),
  baseCurrency: z.coerce.boolean().default(false),
  isActive: z.coerce.boolean().default(true),
  notes: z.string().transform(val => val === "" ? null : val).nullable().optional(),
});

// GET /api/master-data/currency - List all currencies
export async function getCurrencies(req: Request, res: Response) {
  try {
    const pool = ensureActivePool();
    // Debug: log that list was hit
    console.log('[Currency] GET list called');
    // Log current DB and schema context
    try {
      const ctx = await pool.query(`SELECT current_database() as db, current_schema() as schema, session_user as user`);
      console.log('[Currency] DB Context:', ctx.rows[0]);
    } catch (e) {
      console.log('[Currency] DB Context read failed:', (e as any).message);
    }

    // Detect actual table (currencies vs currenices)
    const td = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('currencies','currenices')
      ORDER BY CASE table_name WHEN 'currencies' THEN 0 ELSE 1 END
      LIMIT 1`);
    const tableName = td.rows?.[0]?.table_name || 'currencies';

    // Detect columns present
    const cols = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`,
      [tableName]
    );
    const cset = new Set(cols.rows.map((r: any) => r.column_name));

    const sel: string[] = [];
    sel.push('id');
    sel.push(`${cset.has('code') ? 'code' : (cset.has('currency_code') ? 'currency_code' : "''")} AS code`);
    sel.push(`${cset.has('name') ? 'name' : (cset.has('currency_name') ? 'currency_name' : "''")} AS name`);
    sel.push(`${cset.has('symbol') ? 'symbol' : (cset.has('currency_symbol') ? 'currency_symbol' : "''")} AS symbol`);
    const decimalExpr = cset.has('decimal_places')
      ? `COALESCE(NULLIF(decimal_places, '')::text, '2')`
      : (cset.has('decimalPlaces') ? `COALESCE(NULLIF("decimalPlaces", '')::text, '2')` : `'2'`);
    sel.push(`${decimalExpr} AS decimal_places`);
    const convExpr = cset.has('conversion_rate') ? `COALESCE(conversion_rate::text, '1.0')` : `'1.0'`;
    sel.push(`${convExpr} AS conversion_rate`);
    const baseExpr = cset.has('base_currency') ? 'base_currency' : (cset.has('is_base_currency') ? 'is_base_currency' : 'false');
    sel.push(`${baseExpr} AS base_currency`);
    const activeExpr = cset.has('is_active') ? 'is_active' : (cset.has('active') ? 'active' : 'true');
    sel.push(`${activeExpr} AS is_active`);
    sel.push(cset.has('notes') ? 'notes' : 'NULL as notes');
    sel.push(cset.has('created_at') ? 'created_at' : 'NULL::timestamp as created_at');
    sel.push(cset.has('updated_at') ? 'updated_at' : 'NULL::timestamp as updated_at');
    sel.push(cset.has('created_by') ? 'created_by' : 'NULL::integer as created_by');
    sel.push(cset.has('updated_by') ? 'updated_by' : 'NULL::integer as updated_by');
    sel.push(cset.has('_tenantId') ? '"_tenantId"' : "'001' as \"_tenantId\"");

    const result = await pool.query(`
      SELECT 
        ${sel.join(',\n        ')}
      FROM public.${tableName}
      ORDER BY 2
    `);
    console.log(`[Currency] GET list returning ${result.rows.length} rows`);
    // Map DB snake_case fields to frontend camelCase expectations
    const mapped = result.rows.map((row: any) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      symbol: row.symbol,
      decimalPlaces: String(row.decimal_places ?? 2),
      conversionRate: String(row.conversion_rate ?? 1.0),
      baseCurrency: Boolean(row.base_currency),
      isActive: row.is_active !== false,
      notes: row.notes ?? undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      tenantId: row['_tenantId'],
    }));
    return res.status(200).json(mapped);
  } catch (error: any) {
    console.error("Error fetching currencies:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// GET /api/master-data/currency/:id - Get a specific currency by ID
export async function getCurrencyById(req: Request, res: Response) {
  try {
    const pool = ensureActivePool();
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const result = await pool.query(`SELECT * FROM public.currencies WHERE id = $1`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Currency not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching currency:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// POST /api/master-data/currency - Create a new currency
export async function createCurrency(req: Request, res: Response) {
  try {
    const pool = ensureActivePool();
    console.log('[Currency] POST create called with body:', req.body);
    // Ensure table exists (self-heal for fresh environments)
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.currencies (
          id SERIAL PRIMARY KEY,
          code VARCHAR(10) UNIQUE,
          currency_code VARCHAR(10),
          name VARCHAR(100),
          currency_name VARCHAR(100),
          symbol VARCHAR(10),
          currency_symbol VARCHAR(10),
          decimal_places TEXT,
          "decimalPlaces" TEXT,
          conversion_rate TEXT,
          base_currency BOOLEAN DEFAULT false,
          is_base_currency BOOLEAN DEFAULT false,
          is_active BOOLEAN DEFAULT true,
          active BOOLEAN,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
    } catch (ensureErr) {
      console.warn('[Currency] ensure table failed (continuing):', (ensureErr as any)?.message || ensureErr);
    }
    const validation = currencySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: "Validation error",
        message: validation.error.errors.map(e => e.message).join(", ")
      });
    }

    const data = validation.data;

    // Determine actual column names present in the currencies table FIRST
    const colsResult = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'currencies' AND table_schema = 'public'`
    );
    const colSet = new Set(colsResult.rows.map(r => r.column_name));
    const col = {
      code: colSet.has('code') ? 'code' : 'currency_code',
      name: colSet.has('name') ? 'name' : 'currency_name',
      symbol: colSet.has('symbol') ? 'symbol' : 'currency_symbol',
      decimalPlaces: colSet.has('decimal_places') ? 'decimal_places' : (colSet.has('decimalPlaces') ? 'decimalPlaces' : 'decimal_places'),
      conversionRate: colSet.has('conversion_rate') ? 'conversion_rate' : 'conversion_rate',
      baseCurrency: colSet.has('base_currency') ? 'base_currency' : (colSet.has('is_base_currency') ? 'is_base_currency' : 'base_currency'),
      isActive: colSet.has('is_active') ? 'is_active' : (colSet.has('active') ? 'active' : 'is_active'),
      notes: 'notes',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    };

    // Check if currency code already exists using detected code column
    const existingResult = await pool.query(`SELECT id FROM public.currencies WHERE ${col.code} = $1`, [data.code]);
    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: "Conflict", message: "Currency code already exists" });
    }

    const insertSql = `
      INSERT INTO public.currencies (
        ${col.code}, ${col.name}, ${col.symbol}, ${col.decimalPlaces}, ${col.conversionRate},
        ${col.baseCurrency}, ${col.isActive}, ${col.notes}, ${col.createdAt}, ${col.updatedAt},
        created_by, updated_by, "_tenantId"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), $9, $10, $11)
      RETURNING *
    `;

    const userId = (req as any).user?.id || 1;
    const tenantId = (req as any).user?.tenantId || '001';

    const insertResult = await pool.query(insertSql, [
      data.code,
      data.name,
      data.symbol,
      data.decimalPlaces,
      data.conversionRate,
      data.baseCurrency,
      data.isActive,
      data.notes || null,
      userId,
      userId,
      tenantId,
    ]);

    if (insertResult.rows && insertResult.rows.length > 0) {
      const row: any = insertResult.rows[0];
      console.log('[Currency] Inserted row:', row);
      // Verify visibility immediately after insert
      try {
        const verify = await pool.query(`SELECT id, ${col.code} as code FROM public.currencies WHERE ${col.code} = $1`, [data.code]);
        console.log(`[Currency] Verify after insert count=${verify.rows.length}`, verify.rows);
        if (verify.rows.length === 0) {
          console.error('[Currency] Insert verification failed: row not visible after insert');
        }
      } catch (vErr) {
        console.log('[Currency] Verify after insert error:', (vErr as any).message);
      }
      // Also upsert into global_currencies so Finance view stays in sync
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS global_currencies (
            id SERIAL PRIMARY KEY,
            currency_code VARCHAR(3) UNIQUE NOT NULL,
            currency_name VARCHAR(100) NOT NULL,
            currency_symbol VARCHAR(10) NOT NULL,
            decimal_places INTEGER DEFAULT 2,
            is_active BOOLEAN DEFAULT true,
            is_hard_currency BOOLEAN DEFAULT false,
            iso_country_code VARCHAR(2),
            central_bank_rate_source VARCHAR(50) DEFAULT 'manual',
            current_usd_rate DECIMAL(15,6) DEFAULT 1.0,
            last_rate_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await pool.query(`
          INSERT INTO global_currencies (
            currency_code, currency_name, currency_symbol, decimal_places,
            is_active, is_hard_currency, iso_country_code, central_bank_rate_source,
            current_usd_rate, last_rate_update, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (currency_code)
          DO UPDATE SET
            currency_name = EXCLUDED.currency_name,
            currency_symbol = EXCLUDED.currency_symbol,
            decimal_places = EXCLUDED.decimal_places,
            is_active = EXCLUDED.is_active,
            is_hard_currency = EXCLUDED.is_hard_currency,
            iso_country_code = EXCLUDED.iso_country_code,
            central_bank_rate_source = EXCLUDED.central_bank_rate_source,
            current_usd_rate = EXCLUDED.current_usd_rate,
            last_rate_update = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        `, [
          String(row.code || data.code).toUpperCase(),
          row.name || data.name,
          row.symbol || data.symbol,
          Number(row.decimal_places ?? data.decimalPlaces ?? 2),
          row.is_active !== false,
          Boolean(row.base_currency ?? data.baseCurrency ?? false),
          null,
          'manual',
          Number(row.conversion_rate ?? data.conversionRate ?? 1.0)
        ]);
      } catch (syncErr) {
        console.log('global_currencies sync after create failed:', (syncErr as any).message);
      }
      // Return in camelCase format expected by the frontend
      return res.status(201).json({
        id: row.id,
        code: row.code,
        name: row.name,
        symbol: row.symbol,
        decimalPlaces: String(row.decimal_places ?? data.decimalPlaces),
        conversionRate: String(row.conversion_rate ?? data.conversionRate),
        baseCurrency: Boolean(row.base_currency ?? data.baseCurrency),
        isActive: row.is_active !== false,
        notes: row.notes ?? undefined,
        created_at: row.created_at,
        updated_at: row.updated_at,
        createdBy: row.created_by,
        updatedBy: row.updated_by,
        tenantId: row['_tenantId'],
      });
    } else {
      return res.status(500).json({ error: "Failed to create currency" });
    }
  } catch (error: any) {
    console.error("Error creating currency:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message, code: error.code, detail: error.detail, constraint: error.constraint });
  }
}

// PUT /api/master-data/currency/:id - Update a currency
export async function updateCurrency(req: Request, res: Response) {
  try {
    const pool = ensureActivePool();
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const validation = currencySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: "Validation error",
        message: validation.error.errors.map(e => e.message).join(", ")
      });
    }

    const data = validation.data;

    // Check if currency exists
    const existingResult = await pool.query(`SELECT * FROM public.currencies WHERE id = $1`, [id]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Currency not found" });
    }

    // Determine actual column names present
    const colsResult = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'currencies' AND table_schema = 'public'`
    );
    const colSet = new Set(colsResult.rows.map(r => r.column_name));
    const col = {
      code: colSet.has('code') ? 'code' : 'currency_code',
      name: colSet.has('name') ? 'name' : 'currency_name',
      symbol: colSet.has('symbol') ? 'symbol' : 'currency_symbol',
      decimalPlaces: colSet.has('decimal_places') ? 'decimal_places' : (colSet.has('decimalPlaces') ? 'decimalPlaces' : 'decimal_places'),
      conversionRate: colSet.has('conversion_rate') ? 'conversion_rate' : 'conversion_rate',
      baseCurrency: colSet.has('base_currency') ? 'base_currency' : (colSet.has('is_base_currency') ? 'is_base_currency' : 'base_currency'),
      isActive: colSet.has('is_active') ? 'is_active' : (colSet.has('active') ? 'active' : 'is_active'),
      notes: 'notes',
      updatedAt: 'updated_at',
    };

    const updateSql = `
      UPDATE public.currencies
      SET ${col.code} = $1, ${col.name} = $2, ${col.symbol} = $3,
          ${col.decimalPlaces} = $4, ${col.conversionRate} = $5,
          ${col.baseCurrency} = $6, ${col.isActive} = $7,
          ${col.notes} = $8, updated_by = $9, ${col.updatedAt} = NOW()
      WHERE id = $10
      RETURNING *
    `;

    const userId = (req as any).user?.id || 1;

    const updateResult = await pool.query(updateSql, [
      data.code,
      data.name,
      data.symbol,
      data.decimalPlaces,
      data.conversionRate,
      data.baseCurrency,
      data.isActive,
      data.notes || null,
      userId,
      id
    ]);

    const row: any = updateResult.rows[0];
    // Also upsert into global_currencies to keep Finance view in sync
    try {
      await pool.query(`
        INSERT INTO global_currencies (
          currency_code, currency_name, currency_symbol, decimal_places,
          is_active, is_hard_currency, iso_country_code, central_bank_rate_source,
          current_usd_rate, last_rate_update, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (currency_code)
        DO UPDATE SET
          currency_name = EXCLUDED.currency_name,
          currency_symbol = EXCLUDED.currency_symbol,
          decimal_places = EXCLUDED.decimal_places,
          is_active = EXCLUDED.is_active,
          is_hard_currency = EXCLUDED.is_hard_currency,
          iso_country_code = EXCLUDED.iso_country_code,
          central_bank_rate_source = EXCLUDED.central_bank_rate_source,
          current_usd_rate = EXCLUDED.current_usd_rate,
          last_rate_update = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `, [
        String(row.code || data.code).toUpperCase(),
        row.name || data.name,
        row.symbol || data.symbol,
        Number(row.decimal_places ?? data.decimalPlaces ?? 2),
        row.is_active !== false,
        Boolean(row.base_currency ?? data.baseCurrency ?? false),
        null,
        'manual',
        Number(row.conversion_rate ?? data.conversionRate ?? 1.0)
      ]);
    } catch (syncErr) {
      console.log('global_currencies sync after update failed:', (syncErr as any).message);
    }
    return res.status(200).json({
      id: row.id,
      code: row.code,
      name: row.name,
      symbol: row.symbol,
      decimalPlaces: String(row.decimal_places ?? data.decimalPlaces),
      conversionRate: String(row.conversion_rate ?? data.conversionRate),
      baseCurrency: Boolean(row.base_currency ?? data.baseCurrency),
      isActive: row.is_active !== false,
      notes: row.notes ?? undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      tenantId: row['_tenantId'],
    });
  } catch (error: any) {
    console.error("Error updating currency:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message, code: error.code, detail: error.detail, constraint: error.constraint });
  }
}

// DELETE /api/master-data/currency/:id - Delete a currency
export async function deleteCurrency(req: Request, res: Response) {
  try {
    const pool = ensureActivePool();
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Check if currency exists
    const existingResult = await pool.query(`SELECT * FROM public.currencies WHERE id = $1`, [id]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Currency not found" });
    }

    // Delete currency
    await pool.query(`DELETE FROM public.currencies WHERE id = $1`, [id]);

    // Also deactivate in global_currencies for consistency
    try {
      const codeResult = await pool.query(`SELECT code FROM public.currencies WHERE id = $1`, [id]);
      const currencyCode = codeResult.rows?.[0]?.code;
      if (currencyCode) {
        await pool.query(`
          UPDATE global_currencies
          SET is_active = false, updated_at = CURRENT_TIMESTAMP
          WHERE currency_code = $1
        `, [String(currencyCode).toUpperCase()]);
      }
    } catch (syncErr) {
      console.log('global_currencies sync after delete failed:', (syncErr as any).message);
    }

    return res.status(200).json({ success: true, message: "Currency deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting currency:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message, code: error.code, detail: error.detail, constraint: error.constraint });
  }
}

// POST /api/master-data/currency/bulk-import - Bulk import currencies
export async function bulkImportCurrencies(req: Request, res: Response) {
  try {
    const pool = ensureActivePool();
    const currencies = req.body;

    if (!Array.isArray(currencies)) {
      return res.status(400).json({ error: "Expected an array of currencies" });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Detect columns once
    const colsResult = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'currencies' AND table_schema = 'public'`
    );
    const colSet = new Set(colsResult.rows.map(r => r.column_name));
    const col = {
      code: colSet.has('code') ? 'code' : 'currency_code',
      name: colSet.has('name') ? 'name' : 'currency_name',
      symbol: colSet.has('symbol') ? 'symbol' : 'currency_symbol',
      decimalPlaces: colSet.has('decimal_places') ? 'decimal_places' : (colSet.has('decimalPlaces') ? 'decimalPlaces' : 'decimal_places'),
      conversionRate: colSet.has('conversion_rate') ? 'conversion_rate' : 'conversion_rate',
      baseCurrency: colSet.has('base_currency') ? 'base_currency' : (colSet.has('is_base_currency') ? 'is_base_currency' : 'base_currency'),
      isActive: colSet.has('is_active') ? 'is_active' : (colSet.has('active') ? 'active' : 'is_active'),
      notes: 'notes',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    };

    for (const currencyData of currencies) {
      try {
        const validation = currencySchema.safeParse(currencyData);

        if (!validation.success) {
          results.failed++;
          results.errors.push(`${currencyData.code}: Validation failed - ${validation.error.errors.map(e => e.message).join(", ")}`);
          continue;
        }

        const data = validation.data;

        // Check if currency code already exists
        const existingResult = await pool.query(`SELECT id FROM public.currencies WHERE ${col.code} = $1`, [data.code]);

        if (existingResult.rows.length > 0) {
          results.failed++;
          results.errors.push(`${data.code}: Currency code already exists`);
          continue;
        }

        // Insert currency
        const insertSql = `INSERT INTO public.currencies (
          ${col.code}, ${col.name}, ${col.symbol}, ${col.decimalPlaces}, ${col.conversionRate},
          ${col.baseCurrency}, ${col.isActive}, ${col.notes}, ${col.createdAt}, ${col.updatedAt}
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`;
        await pool.query(insertSql, [
          data.code,
          data.name,
          data.symbol,
          data.decimalPlaces,
          data.conversionRate,
          data.baseCurrency,
          data.isActive,
          data.notes || null,
        ]);

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${currencyData.code}: ${error.message || 'Unknown error'}`);
      }
    }

    return res.status(200).json(results);
  } catch (error: any) {
    console.error("Error bulk importing currencies:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message, code: error.code, detail: error.detail, constraint: error.constraint });
  }
}

// For backward compatibility
export async function getCurrency(req: Request, res: Response) {
  return getCurrencies(req, res);
}

export default getCurrency;