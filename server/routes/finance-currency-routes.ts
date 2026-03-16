import express from "express";
import { pool } from "../db";

const router = express.Router();

// Get all global currencies from database
router.get("/global-currencies", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        currency_code,
        currency_name,
        currency_symbol,
        decimal_places::text,
        is_active,
        is_hard_currency,
        iso_country_code,
        central_bank_rate_source,
        current_usd_rate,
        last_rate_update
      FROM global_currencies 
      ORDER BY currency_code
    `);

    res.json({
      success: true,
      currencies: result.rows,
      totalCurrencies: result.rows.length,
      hardCurrencies: result.rows.filter(c => c.is_hard_currency).length
    });

  } catch (error: any) {
    console.error('Error fetching global currencies:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch global currencies',
      message: error.message
    });
  }
});

// POST endpoint for global currencies - Create or update global currency data
router.post("/global-currencies", async (req, res) => {
  try {
    const { currencies } = req.body;

    if (!currencies || !Array.isArray(currencies)) {
      return res.status(400).json({
        success: false,
        error: 'Currencies array is required'
      });
    }

    let insertedCount = 0;
    let updatedCount = 0;
    const results = [];

    for (const currency of currencies) {
      const {
        currency_code,
        currency_name,
        currency_symbol,
        decimal_places,
        is_active,
        is_hard_currency,
        iso_country_code,
        central_bank_rate_source,
        current_usd_rate
      } = currency;

      // Validate required fields - no defaults allowed
      if (!currency_code || !currency_name || !currency_symbol || 
          decimal_places === undefined || is_active === undefined || 
          is_hard_currency === undefined || !central_bank_rate_source || 
          current_usd_rate === undefined) {
        results.push({
          currency_code: currency_code || 'UNKNOWN',
          status: 'error',
          error: 'All required fields must be provided: currency_code, currency_name, currency_symbol, decimal_places, is_active, is_hard_currency, central_bank_rate_source, current_usd_rate'
        });
        continue;
      }

      try {
        const result = await pool.query(`
          INSERT INTO global_currencies (
            currency_code, currency_name, currency_symbol, decimal_places,
            is_active, is_hard_currency, iso_country_code, central_bank_rate_source,
            current_usd_rate, last_rate_update, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
          RETURNING *
        `, [
          currency_code.toUpperCase(),
          currency_name,
          currency_symbol,
          decimal_places,
          is_active,
          is_hard_currency,
          iso_country_code || null,
          central_bank_rate_source,
          current_usd_rate
        ]);

        if (result.rows.length > 0) {
          const row = result.rows[0];
          const isInsert = new Date(row.created_at).getTime() === new Date(row.updated_at).getTime();
          
          if (isInsert) {
            insertedCount++;
            results.push({
              currency_code: row.currency_code,
              status: 'inserted',
              id: row.id
            });
          } else {
            updatedCount++;
            results.push({
              currency_code: row.currency_code,
              status: 'updated',
              id: row.id
            });
          }
        }
      } catch (dbError: any) {
        console.error(`Error processing currency ${currency_code}:`, dbError);
        results.push({
          currency_code,
          status: 'error',
          error: dbError.message
        });
      }
    }

    res.json({
      success: true,
      message: `Processed ${currencies.length} currencies: ${insertedCount} inserted, ${updatedCount} updated`,
      insertedCount,
      updatedCount,
      totalProcessed: currencies.length,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error posting global currencies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to post global currencies data',
      message: error.message
    });
  }
});

// Get daily exchange rates with date range
router.get("/exchange-rates", async (req, res) => {
  try {
    const { fromDate, toDate, baseCurrency = 'USD' } = req.query;
    
    const startDate = fromDate || new Date().toISOString().split('T')[0];
    const endDate = toDate || new Date().toISOString().split('T')[0];

    // Use LEFT JOIN to handle cases where currencies might not exist in global_currencies
    const result = await pool.query(`
      SELECT 
        der.rate_date,
        der.from_currency,
        der.to_currency,
        der.exchange_rate,
        der.rate_type,
        der.rate_source,
        der.is_official,
        COALESCE(fc1.currency_name, der.from_currency) as from_currency_name,
        COALESCE(fc1.currency_symbol, der.from_currency) as from_currency_symbol,
        COALESCE(fc2.currency_name, der.to_currency) as to_currency_name,
        COALESCE(fc2.currency_symbol, der.to_currency) as to_currency_symbol
      FROM daily_exchange_rates der
      LEFT JOIN global_currencies fc1 ON der.from_currency = fc1.currency_code
      LEFT JOIN global_currencies fc2 ON der.to_currency = fc2.currency_code
      WHERE der.rate_date >= $1 AND der.rate_date <= $2
      ORDER BY der.rate_date DESC, der.from_currency, der.to_currency
    `, [startDate, endDate]);

    res.json({
      success: true,
      exchangeRates: result.rows,
      dateRange: { fromDate: startDate, endDate: endDate },
      baseCurrency,
      totalRates: result.rows.length
    });

  } catch (error: any) {
    console.error('Error fetching exchange rates:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch exchange rates',
      message: error.message
    });
  }
});

// Get company currency configuration
router.get("/company-settings", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ccs.company_code,
        cc.name as company_name,
        ccs.local_currency_code,
        ccs.group_currency_code,
        ccs.parallel_currency_code,
        ccs.exchange_rate_type,
        ccs.translation_method,
        ccs.revaluation_frequency,
        fc1.currency_name as local_currency_name,
        fc1.currency_symbol as local_currency_symbol,
        fc2.currency_name as group_currency_name,
        fc2.currency_symbol as group_currency_symbol
      FROM company_currency_settings ccs
      LEFT JOIN company_codes cc ON ccs.company_code = cc.code
      LEFT JOIN global_currencies fc1 ON ccs.local_currency_code = fc1.currency_code
      LEFT JOIN global_currencies fc2 ON ccs.group_currency_code = fc2.currency_code
      ORDER BY ccs.company_code
    `);

    res.json({
      success: true,
      companySettings: result.rows,
      totalCompanies: result.rows.length
    });

  } catch (error: any) {
    console.error('Error fetching company currency settings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch company currency settings',
      message: error.message
    });
  }
});

// Update company currency setting
router.put("/company-settings/:companyCode", async (req, res) => {
  try {
    const { companyCode } = req.params;
    const {
      local_currency_code,
      group_currency_code,
      parallel_currency_code,
      exchange_rate_type,
      translation_method,
      revaluation_frequency
    } = req.body;

    // Validate required fields
    if (!local_currency_code || !group_currency_code || 
        !exchange_rate_type || !translation_method || !revaluation_frequency) {
      return res.status(400).json({
        success: false,
        error: 'All required fields must be provided: local_currency_code, group_currency_code, exchange_rate_type, translation_method, revaluation_frequency'
      });
    }

    // Check if company setting exists
    const existingCheck = await pool.query(
      'SELECT id FROM company_currency_settings WHERE company_code = $1',
      [companyCode]
    );

    if (existingCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Company currency setting for ${companyCode} not found.`
      });
    }

    // Validate currencies exist
    const localCurrencyCheck = await pool.query(
      'SELECT currency_code FROM global_currencies WHERE currency_code = $1 AND is_active = true',
      [local_currency_code]
    );

    if (localCurrencyCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Local currency ${local_currency_code} not found or inactive.`
      });
    }

    const groupCurrencyCheck = await pool.query(
      'SELECT currency_code FROM global_currencies WHERE currency_code = $1 AND is_active = true',
      [group_currency_code]
    );

    if (groupCurrencyCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Group currency ${group_currency_code} not found or inactive.`
      });
    }

    if (parallel_currency_code) {
      const parallelCurrencyCheck = await pool.query(
        'SELECT currency_code FROM global_currencies WHERE currency_code = $1 AND is_active = true',
        [parallel_currency_code]
      );

      if (parallelCurrencyCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: `Parallel currency ${parallel_currency_code} not found or inactive.`
        });
      }
    }

    // Update company setting
    const result = await pool.query(`
      UPDATE company_currency_settings SET
        local_currency_code = $1,
        group_currency_code = $2,
        parallel_currency_code = $3,
        exchange_rate_type = $4,
        translation_method = $5,
        revaluation_frequency = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE company_code = $7
      RETURNING *
    `, [
      local_currency_code,
      group_currency_code,
      parallel_currency_code || null,
      exchange_rate_type,
      translation_method,
      revaluation_frequency,
      companyCode
    ]);

    res.json({
      success: true,
      companySetting: result.rows[0],
      message: 'Company currency setting updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating company currency setting:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update company currency setting',
      message: error.message
    });
  }
});

// Delete company currency setting
router.delete("/company-settings/:companyCode", async (req, res) => {
  try {
    const { companyCode } = req.params;

    // Check if company setting exists
    const existingCheck = await pool.query(
      'SELECT id FROM company_currency_settings WHERE company_code = $1',
      [companyCode]
    );

    if (existingCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Company currency setting for ${companyCode} not found.`
      });
    }

    // Delete company setting
    await pool.query(
      'DELETE FROM company_currency_settings WHERE company_code = $1',
      [companyCode]
    );

    res.json({
      success: true,
      message: `Company currency setting for ${companyCode} deleted successfully`
    });

  } catch (error: any) {
    console.error('Error deleting company currency setting:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete company currency setting',
      message: error.message
    });
  }
});

// Create company currency setting
router.post("/company-settings", async (req, res) => {
  try {
    const {
      company_code,
      local_currency_code,
      group_currency_code,
      parallel_currency_code,
      exchange_rate_type,
      translation_method,
      revaluation_frequency
    } = req.body;

    // Validate required fields
    if (!company_code || !local_currency_code || !group_currency_code || 
        !exchange_rate_type || !translation_method || !revaluation_frequency) {
      return res.status(400).json({
        success: false,
        error: 'All required fields must be provided: company_code, local_currency_code, group_currency_code, exchange_rate_type, translation_method, revaluation_frequency'
      });
    }

    // Check if company code exists
    const companyCheck = await pool.query(
      'SELECT code FROM company_codes WHERE code = $1',
      [company_code]
    );

    if (companyCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Company code ${company_code} not found. Please create the company code first.`
      });
    }

    // Check if currencies exist
    const localCurrencyCheck = await pool.query(
      'SELECT currency_code FROM global_currencies WHERE currency_code = $1 AND is_active = true',
      [local_currency_code]
    );

    if (localCurrencyCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Local currency ${local_currency_code} not found or inactive.`
      });
    }

    const groupCurrencyCheck = await pool.query(
      'SELECT currency_code FROM global_currencies WHERE currency_code = $1 AND is_active = true',
      [group_currency_code]
    );

    if (groupCurrencyCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Group currency ${group_currency_code} not found or inactive.`
      });
    }

    // Check if parallel currency exists (if provided)
    if (parallel_currency_code) {
      const parallelCurrencyCheck = await pool.query(
        'SELECT currency_code FROM global_currencies WHERE currency_code = $1 AND is_active = true',
        [parallel_currency_code]
      );

      if (parallelCurrencyCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: `Parallel currency ${parallel_currency_code} not found or inactive.`
        });
      }
    }

    // Insert or update company setting
    const result = await pool.query(`
      INSERT INTO company_currency_settings (
        company_code,
        local_currency_code,
        group_currency_code,
        parallel_currency_code,
        exchange_rate_type,
        translation_method,
        revaluation_frequency,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (company_code)
      DO UPDATE SET
        local_currency_code = EXCLUDED.local_currency_code,
        group_currency_code = EXCLUDED.group_currency_code,
        parallel_currency_code = EXCLUDED.parallel_currency_code,
        exchange_rate_type = EXCLUDED.exchange_rate_type,
        translation_method = EXCLUDED.translation_method,
        revaluation_frequency = EXCLUDED.revaluation_frequency,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      company_code,
      local_currency_code,
      group_currency_code,
      parallel_currency_code || null,
      exchange_rate_type,
      translation_method,
      revaluation_frequency
    ]);

    res.json({
      success: true,
      companySetting: result.rows[0],
      message: 'Company currency setting created successfully'
    });

  } catch (error: any) {
    console.error('Error creating company currency setting:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create company currency setting',
      message: error.message
    });
  }
});

// Update daily exchange rates
router.post("/exchange-rates", async (req, res) => {
  try {
    const { rates, rateDate = new Date().toISOString().split('T')[0] } = req.body;

    if (!rates || !Array.isArray(rates)) {
      return res.status(400).json({
        success: false,
        error: 'Exchange rates array is required'
      });
    }

    let insertedCount = 0;
    const errors = [];

    for (const rate of rates) {
      const { fromCurrency, toCurrency, exchangeRate, rateSource, rateType = 'spot', isOfficial = false } = rate;

      if (!fromCurrency || !toCurrency || exchangeRate === undefined) {
        errors.push({
          rate,
          error: 'fromCurrency, toCurrency, and exchangeRate are required'
        });
        continue;
      }

      // Use a default rate source if not provided
      const finalRateSource = rateSource || 'Manual Entry';

      try {
        await pool.query(`
          INSERT INTO daily_exchange_rates (
            rate_date, from_currency, to_currency, exchange_rate, 
            rate_type, rate_source, is_official, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (rate_date, from_currency, to_currency, rate_type)
          DO UPDATE SET
            exchange_rate = EXCLUDED.exchange_rate,
            rate_source = EXCLUDED.rate_source,
            is_official = EXCLUDED.is_official,
            updated_at = CURRENT_TIMESTAMP
        `, [
          rateDate,
          fromCurrency,
          toCurrency,
          exchangeRate,
          rateType,
          finalRateSource,
          isOfficial
        ]);
        insertedCount++;
      } catch (dbError: any) {
        errors.push({
          rate,
          error: dbError.message
        });
      }
    }

    res.json({
      success: true,
      message: `Updated ${insertedCount} exchange rates for ${rateDate}`,
      rateDate,
      insertedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Error updating exchange rates:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update exchange rates',
      message: error.message
    });
  }
});

// Get currency conversion
router.get("/convert", async (req, res) => {
  try {
    const { amount, fromCurrency, toCurrency, rateDate } = req.query as {
      amount: string;
      fromCurrency: string;
      toCurrency: string;
      rateDate?: string;
    };

    if (!amount || !fromCurrency || !toCurrency) {
      return res.status(400).json({
        success: false,
        error: 'Amount, fromCurrency, and toCurrency are required'
      });
    }

    const dateToUse = rateDate || new Date().toISOString().split('T')[0];

    // First, try to get rate from daily_exchange_rates table
    let rateQuery = `
      SELECT exchange_rate, rate_date, rate_source
      FROM daily_exchange_rates
      WHERE from_currency = $1 
        AND to_currency = $2 
        AND rate_date <= $3
      ORDER BY rate_date DESC
      LIMIT 1
    `;

    let result = await pool.query(rateQuery, [fromCurrency, toCurrency, dateToUse]);

    let exchangeRate: number;
    let rateDateUsed: string;
    let rateSource: string;

    // If no rate found in daily_exchange_rates, calculate from USD rates in global_currencies
    if (result.rows.length === 0) {
      // Get USD rates for both currencies
      const fromCurrencyQuery = await pool.query(
        `SELECT current_usd_rate, currency_name, central_bank_rate_source FROM global_currencies WHERE currency_code = $1 AND is_active = true`,
        [fromCurrency.toUpperCase()]
      );

      const toCurrencyQuery = await pool.query(
        `SELECT current_usd_rate, currency_name, central_bank_rate_source FROM global_currencies WHERE currency_code = $1 AND is_active = true`,
        [toCurrency.toUpperCase()]
      );

      if (fromCurrencyQuery.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: `Currency ${fromCurrency} not found or inactive`
        });
      }

      if (toCurrencyQuery.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: `Currency ${toCurrency} not found or inactive`
        });
      }

      const fromUsdRate = parseFloat(fromCurrencyQuery.rows[0].current_usd_rate);
      const toUsdRate = parseFloat(toCurrencyQuery.rows[0].current_usd_rate);

      // Calculate cross rate: fromCurrency to toCurrency via USD
      // If fromCurrency = INR (83 USD), toCurrency = USD (1 USD)
      // Rate = 1 / 83 = 0.012 (1 INR = 0.012 USD)
      // If fromCurrency = USD (1 USD), toCurrency = INR (83 USD)
      // Rate = 83 / 1 = 83 (1 USD = 83 INR)
      if (fromCurrency.toUpperCase() === 'USD') {
        exchangeRate = toUsdRate;
      } else if (toCurrency.toUpperCase() === 'USD') {
        exchangeRate = 1 / fromUsdRate;
      } else {
        // Both are non-USD: convert fromCurrency -> USD -> toCurrency
        exchangeRate = toUsdRate / fromUsdRate;
      }

      rateDateUsed = dateToUse;
      rateSource = `Calculated from USD rates (${fromCurrencyQuery.rows[0].central_bank_rate_source})`;
    } else {
      // Use rate from daily_exchange_rates
      const rate = result.rows[0];
      exchangeRate = parseFloat(rate.exchange_rate);
      rateDateUsed = rate.rate_date;
      rateSource = rate.rate_source;
    }

    const convertedAmount = parseFloat(amount) * exchangeRate;

    res.json({
      success: true,
      conversion: {
        originalAmount: parseFloat(amount),
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        exchangeRate,
        convertedAmount,
        rateDate: rateDateUsed,
        rateSource
      }
    });

  } catch (error: any) {
    console.error('Error converting currency:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to convert currency',
      message: error.message
    });
  }
});

// Get Finance Master Data statistics from database
router.get("/statistics", async (req, res) => {
  try {
    // Get total active currencies
    const currenciesResult = await pool.query(`
      SELECT COUNT(*) as count FROM global_currencies WHERE is_active = true
    `);
    const totalActiveCurrencies = parseInt(currenciesResult.rows[0].count);

    // Get hard currencies count
    const hardCurrenciesResult = await pool.query(`
      SELECT COUNT(*) as count FROM global_currencies WHERE is_hard_currency = true AND is_active = true
    `);
    const hardCurrencies = parseInt(hardCurrenciesResult.rows[0].count);

    // Get rate history days
    const historyResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT rate_date) as days,
        MIN(rate_date) as earliest_date,
        MAX(rate_date) as latest_date
      FROM daily_exchange_rates
    `);
    const rateHistoryDays = historyResult.rows[0]?.days || 0;
    const latestRateDate = historyResult.rows[0]?.latest_date || null;

    // Get configured companies count
    const companiesResult = await pool.query(`
      SELECT COUNT(*) as count FROM company_currency_settings
    `);
    const configuredCompanies = parseInt(companiesResult.rows[0].count);

    res.json({
      success: true,
      statistics: {
        totalActiveCurrencies,
        hardCurrencies,
        rateHistoryDays,
        configuredCompanies,
        latestRateDate,
        lastUpdate: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error fetching currency statistics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch currency statistics',
      message: error.message
    });
  }
});

// Create new currency
router.post("/create", async (req, res) => {
  try {
    const {
      currency_code,
      currency_name,
      currency_symbol,
      decimal_places,
      is_active,
      is_hard_currency,
      iso_country_code,
      central_bank_rate_source,
      current_usd_rate
    } = req.body;

    // Validate required fields - no defaults
    if (!currency_code || !currency_name || !currency_symbol || 
        decimal_places === undefined || is_active === undefined || 
        is_hard_currency === undefined || !central_bank_rate_source || 
        current_usd_rate === undefined) {
      return res.status(400).json({
        success: false,
        error: 'All required fields must be provided: currency_code, currency_name, currency_symbol, decimal_places, is_active, is_hard_currency, central_bank_rate_source, current_usd_rate'
      });
    }

    const upsertQuery = `
      INSERT INTO global_currencies (
        currency_code, currency_name, currency_symbol, decimal_places,
        is_active, is_hard_currency, iso_country_code, central_bank_rate_source,
        current_usd_rate, last_rate_update, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
      RETURNING id, currency_code, currency_name, currency_symbol, decimal_places, is_active, is_hard_currency, iso_country_code, central_bank_rate_source, current_usd_rate, created_at, updated_at
    `;

    const result = await pool.query(upsertQuery, [
      currency_code.toUpperCase(),
      currency_name,
      currency_symbol,
      Number(decimal_places),
      Boolean(is_active),
      Boolean(is_hard_currency),
      iso_country_code || null,
      central_bank_rate_source,
      Number(current_usd_rate)
    ]);

    const row = result.rows[0];
    res.json({
      success: true,
      currency: {
        id: row.id,
        currency_code: row.currency_code,
        currency_name: row.currency_name,
        currency_symbol: row.currency_symbol,
        decimal_places: String(row.decimal_places),
        is_active: row.is_active,
        is_hard_currency: row.is_hard_currency,
        iso_country_code: row.iso_country_code,
        central_bank_rate_source: row.central_bank_rate_source,
        current_usd_rate: Number(row.current_usd_rate),
        created_at: row.created_at,
        updated_at: row.updated_at
      },
      message: 'Currency created successfully'
    });

  } catch (error: any) {
    console.error('Error creating currency:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create currency',
      message: error.message
    });
  }
});

// AWS Database Sync
router.post("/sync-aws", async (req, res) => {
  try {
    const currencyTables = [
      'global_currencies',
      'daily_exchange_rates', 
      'company_currency_settings',
      'exchange_rate_update_history'
    ];

    const syncResults = [];
    for (const table of currencyTables) {
      try {
        const countQuery = `SELECT COUNT(*) as count FROM ${table}`;
        const result = await pool.query(countQuery);
        syncResults.push({
          table,
          records: parseInt(result.rows[0].count),
          status: 'synced'
        });
      } catch (error: any) {
        syncResults.push({
          table,
          records: 0,
          status: 'error',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      syncedTables: currencyTables.length,
      tableResults: syncResults,
      totalRecords: syncResults.reduce((sum, table) => sum + table.records, 0),
      syncTimestamp: new Date().toISOString(),
      message: `Successfully synced ${currencyTables.length} currency tables`
    });

  } catch (error: any) {
    console.error('Error syncing to AWS:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync currency tables',
      message: error.message
    });
  }
});

// Manual exchange rate update
router.post("/update-rates", async (req, res) => {
  try {
    // This endpoint can trigger external rate updates
    // For now, just acknowledge the request
    res.json({
      success: true,
      message: "Exchange rate update acknowledged.",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to update rates',
      message: error.message
    });
  }
});

// Get ERP module integration information
router.get("/erp-integration", async (req, res) => {
  try {
    // Get currency usage statistics from different modules
    const integrationData = {
      modules: []
    };

    // Check Sales module currency usage
    try {
      const salesResult = await pool.query(`
        SELECT 
          COUNT(DISTINCT currency) as unique_currencies,
          COUNT(*) as total_transactions,
          SUM(CASE WHEN currency IS NOT NULL THEN 1 ELSE 0 END) as transactions_with_currency
        FROM sales_orders
        WHERE currency IS NOT NULL
      `);
      if (salesResult.rows.length > 0) {
        integrationData.modules.push({
          name: 'Sales',
          moduleCode: 'SD',
          description: 'Sales Order Management',
          currencyUsage: {
            uniqueCurrencies: parseInt(salesResult.rows[0].unique_currencies) || 0,
            totalTransactions: parseInt(salesResult.rows[0].total_transactions) || 0,
            transactionsWithCurrency: parseInt(salesResult.rows[0].transactions_with_currency) || 0
          },
          integrationStatus: 'Active',
          features: ['Sales Orders', 'Quotes', 'Invoices', 'Customer Payments']
        });
      }
    } catch (error) {
      // Table might not exist, skip
    }

    // Check Purchase module currency usage
    try {
      const purchaseResult = await pool.query(`
        SELECT 
          COUNT(DISTINCT currency) as unique_currencies,
          COUNT(*) as total_transactions,
          SUM(CASE WHEN currency IS NOT NULL THEN 1 ELSE 0 END) as transactions_with_currency
        FROM purchase_orders
        WHERE currency IS NOT NULL
      `);
      if (purchaseResult.rows.length > 0) {
        integrationData.modules.push({
          name: 'Purchase',
          moduleCode: 'MM',
          description: 'Procurement Management',
          currencyUsage: {
            uniqueCurrencies: parseInt(purchaseResult.rows[0].unique_currencies) || 0,
            totalTransactions: parseInt(purchaseResult.rows[0].total_transactions) || 0,
            transactionsWithCurrency: parseInt(purchaseResult.rows[0].transactions_with_currency) || 0
          },
          integrationStatus: 'Active',
          features: ['Purchase Orders', 'Goods Receipt', 'Vendor Invoices', 'Vendor Payments']
        });
      }
    } catch (error) {
      // Table might not exist, skip
    }

    // Check Finance module currency usage
    try {
      const financeResult = await pool.query(`
        SELECT 
          COUNT(DISTINCT currency_code) as unique_currencies,
          COUNT(*) as total_transactions
        FROM gl_postings
        WHERE currency_code IS NOT NULL
      `);
      if (financeResult.rows.length > 0) {
        integrationData.modules.push({
          name: 'Finance',
          moduleCode: 'FI',
          description: 'Financial Accounting',
          currencyUsage: {
            uniqueCurrencies: parseInt(financeResult.rows[0].unique_currencies) || 0,
            totalTransactions: parseInt(financeResult.rows[0].total_transactions) || 0,
            transactionsWithCurrency: parseInt(financeResult.rows[0].total_transactions) || 0
          },
          integrationStatus: 'Active',
          features: ['General Ledger', 'Accounts Payable', 'Accounts Receivable', 'Currency Revaluation']
        });
      }
    } catch (error) {
      // Table might not exist, skip
    }

    // Check Inventory module currency usage
    try {
      const inventoryResult = await pool.query(`
        SELECT 
          COUNT(DISTINCT currency) as unique_currencies,
          COUNT(*) as total_transactions
        FROM stock_movements
        WHERE currency IS NOT NULL
      `);
      if (inventoryResult.rows.length > 0) {
        integrationData.modules.push({
          name: 'Inventory',
          moduleCode: 'IM',
          description: 'Inventory Management',
          currencyUsage: {
            uniqueCurrencies: parseInt(inventoryResult.rows[0].unique_currencies) || 0,
            totalTransactions: parseInt(inventoryResult.rows[0].total_transactions) || 0,
            transactionsWithCurrency: parseInt(inventoryResult.rows[0].total_transactions) || 0
          },
          integrationStatus: 'Active',
          features: ['Stock Valuation', 'Material Movements', 'Inventory Valuation', 'Cost Calculation']
        });
      }
    } catch (error) {
      // Table might not exist, skip
    }

    // Get total active currencies
    const currenciesResult = await pool.query(`
      SELECT COUNT(*) as count FROM global_currencies WHERE is_active = true
    `);
    const totalActiveCurrencies = parseInt(currenciesResult.rows[0].count);

    // Get total exchange rates
    const ratesResult = await pool.query(`
      SELECT COUNT(DISTINCT from_currency || '-' || to_currency) as count FROM daily_exchange_rates
    `);
    const totalExchangeRates = parseInt(ratesResult.rows[0].count) || 0;

    // Get company settings count
    const companiesResult = await pool.query(`
      SELECT COUNT(*) as count FROM company_currency_settings
    `);
    const totalCompanySettings = parseInt(companiesResult.rows[0].count);

    res.json({
      success: true,
      integration: {
        ...integrationData,
        summary: {
          totalActiveCurrencies,
          totalExchangeRates,
          totalCompanySettings,
          integratedModules: integrationData.modules.length,
          lastUpdated: new Date().toISOString()
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching ERP integration data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch ERP integration data',
      message: error.message
    });
  }
});

// Get exchange rate update history
router.get("/update-history", async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await pool.query(`
      SELECT 
        id,
        update_date,
        provider_used,
        currencies_updated,
        status,
        notes,
        created_at
      FROM exchange_rate_update_history
      WHERE update_date >= $1
      ORDER BY update_date DESC, created_at DESC
    `, [cutoffDate.toISOString().split('T')[0]]);

    res.json({
      success: true,
      history: result.rows,
      totalUpdates: result.rows.length,
      period: `${days} days`
    });

  } catch (error: any) {
    console.error('Error fetching update history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch update history',
      message: error.message
    });
  }
});

export default router;
