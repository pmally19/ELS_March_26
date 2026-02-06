import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

async function seedCurrenciesData() {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || '5432';
  const dbName = process.env.DB_NAME || 'mallyerp';
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || 'Mokshith@21';

  const connectionString = `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;

  const pool = new Pool({
    connectionString: connectionString,
  });

  let client;
  try {
    console.log('🔄 Starting seed: Inserting currencies data...');
    client = await pool.connect();

    // Check what columns exist in the currencies table
    const columnsCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'currencies'
      ORDER BY ordinal_position;
    `);
    
    const existingColumns = columnsCheck.rows.map(row => row.column_name);
    console.log('📋 Available columns:', existingColumns.join(', '));

    // Common currencies data with conversion rates (relative to USD = 1.0)
    const currenciesData = [
      {
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        decimalPlaces: 2,
        conversionRate: '1.000000',
        isActive: true,
        isBaseCurrency: true
      },
      {
        code: 'EUR',
        name: 'Euro',
        symbol: '€',
        decimalPlaces: 2,
        conversionRate: '0.920000',
        isActive: true,
        isBaseCurrency: false
      },
      {
        code: 'GBP',
        name: 'British Pound',
        symbol: '£',
        decimalPlaces: 2,
        conversionRate: '0.790000',
        isActive: true,
        isBaseCurrency: false
      },
      {
        code: 'JPY',
        name: 'Japanese Yen',
        symbol: '¥',
        decimalPlaces: 0,
        conversionRate: '150.000000',
        isActive: true,
        isBaseCurrency: false
      },
      {
        code: 'CNY',
        name: 'Chinese Yuan',
        symbol: '¥',
        decimalPlaces: 2,
        conversionRate: '7.250000',
        isActive: true,
        isBaseCurrency: false
      },
      {
        code: 'INR',
        name: 'Indian Rupee',
        symbol: '₹',
        decimalPlaces: 2,
        conversionRate: '83.000000',
        isActive: true,
        isBaseCurrency: false
      },
      {
        code: 'CAD',
        name: 'Canadian Dollar',
        symbol: 'C$',
        decimalPlaces: 2,
        conversionRate: '1.360000',
        isActive: true,
        isBaseCurrency: false
      },
      {
        code: 'AUD',
        name: 'Australian Dollar',
        symbol: 'A$',
        decimalPlaces: 2,
        conversionRate: '1.520000',
        isActive: true,
        isBaseCurrency: false
      },
      {
        code: 'BRL',
        name: 'Brazilian Real',
        symbol: 'R$',
        decimalPlaces: 2,
        conversionRate: '5.000000',
        isActive: true,
        isBaseCurrency: false
      },
      {
        code: 'CHF',
        name: 'Swiss Franc',
        symbol: 'CHF',
        decimalPlaces: 2,
        conversionRate: '0.880000',
        isActive: true,
        isBaseCurrency: false
      },
      {
        code: 'MXN',
        name: 'Mexican Peso',
        symbol: '$',
        decimalPlaces: 2,
        conversionRate: '17.000000',
        isActive: true,
        isBaseCurrency: false
      },
      {
        code: 'SGD',
        name: 'Singapore Dollar',
        symbol: 'S$',
        decimalPlaces: 2,
        conversionRate: '1.340000',
        isActive: true,
        isBaseCurrency: false
      },
      {
        code: 'KRW',
        name: 'South Korean Won',
        symbol: '₩',
        decimalPlaces: 0,
        conversionRate: '1330.000000',
        isActive: true,
        isBaseCurrency: false
      },
      {
        code: 'NZD',
        name: 'New Zealand Dollar',
        symbol: 'NZ$',
        decimalPlaces: 2,
        conversionRate: '1.650000',
        isActive: true,
        isBaseCurrency: false
      },
      {
        code: 'ZAR',
        name: 'South African Rand',
        symbol: 'R',
        decimalPlaces: 2,
        conversionRate: '18.500000',
        isActive: true,
        isBaseCurrency: false
      }
    ];

    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const currency of currenciesData) {
      try {
        // Check if currency already exists
        let checkQuery;
        let checkValue;
        
        // Try different possible column names
        if (existingColumns.includes('currency_code')) {
          checkQuery = 'SELECT id FROM currencies WHERE currency_code = $1';
          checkValue = currency.code;
        } else if (existingColumns.includes('code')) {
          checkQuery = 'SELECT id FROM currencies WHERE code = $1';
          checkValue = currency.code;
        } else {
          console.log('⚠️  Cannot determine currency code column. Skipping checks...');
          checkQuery = null;
        }

        if (checkQuery) {
          const checkResult = await client.query(checkQuery, [checkValue]);
          if (checkResult.rows.length > 0) {
            console.log(`⏭️  Currency ${currency.code} (${currency.name}) already exists. Skipping...`);
            skipped++;
            continue;
          }
        }

        // Build insert query based on available columns
        let insertColumns = [];
        let insertValues = [];
        let valuePlaceholders = [];
        let paramIndex = 1;

        // Map columns based on what exists - using actual column names from database
        if (existingColumns.includes('currency_code')) {
          insertColumns.push('currency_code');
          insertValues.push(currency.code);
          valuePlaceholders.push(`$${paramIndex++}`);
        } else if (existingColumns.includes('code')) {
          insertColumns.push('code');
          insertValues.push(currency.code);
          valuePlaceholders.push(`$${paramIndex++}`);
        }

        if (existingColumns.includes('currency_name')) {
          insertColumns.push('currency_name');
          insertValues.push(currency.name);
          valuePlaceholders.push(`$${paramIndex++}`);
        } else if (existingColumns.includes('name')) {
          insertColumns.push('name');
          insertValues.push(currency.name);
          valuePlaceholders.push(`$${paramIndex++}`);
        }

        if (existingColumns.includes('symbol') || existingColumns.includes('currency_symbol')) {
          const symbolCol = existingColumns.includes('symbol') ? 'symbol' : 'currency_symbol';
          insertColumns.push(symbolCol);
          insertValues.push(currency.symbol);
          valuePlaceholders.push(`$${paramIndex++}`);
        }

        if (existingColumns.includes('decimal_places')) {
          insertColumns.push('decimal_places');
          insertValues.push(currency.decimalPlaces);
          valuePlaceholders.push(`$${paramIndex++}`);
        } else if (existingColumns.includes('decimalPlaces')) {
          insertColumns.push('"decimalPlaces"');
          insertValues.push(currency.decimalPlaces);
          valuePlaceholders.push(`$${paramIndex++}`);
        }

        // Add conversion_rate if column exists (required field)
        if (existingColumns.includes('conversion_rate')) {
          insertColumns.push('conversion_rate');
          insertValues.push(currency.conversionRate);
          valuePlaceholders.push(`$${paramIndex++}`);
        }

        if (existingColumns.includes('is_active')) {
          insertColumns.push('is_active');
          insertValues.push(currency.isActive);
          valuePlaceholders.push(`$${paramIndex++}`);
        } else if (existingColumns.includes('active')) {
          insertColumns.push('active');
          insertValues.push(currency.isActive);
          valuePlaceholders.push(`$${paramIndex++}`);
        }

        if (existingColumns.includes('is_base_currency')) {
          insertColumns.push('is_base_currency');
          insertValues.push(currency.isBaseCurrency);
          valuePlaceholders.push(`$${paramIndex++}`);
        } else if (existingColumns.includes('base_currency')) {
          insertColumns.push('base_currency');
          insertValues.push(currency.isBaseCurrency);
          valuePlaceholders.push(`$${paramIndex++}`);
        }

        // Add timestamps if columns exist
        if (existingColumns.includes('created_at')) {
          insertColumns.push('created_at');
          insertValues.push(new Date());
          valuePlaceholders.push(`$${paramIndex++}`);
        }

        if (existingColumns.includes('updated_at')) {
          insertColumns.push('updated_at');
          insertValues.push(new Date());
          valuePlaceholders.push(`$${paramIndex++}`);
        }

        // Insert currency
        const insertQuery = `
          INSERT INTO currencies (${insertColumns.join(', ')})
          VALUES (${valuePlaceholders.join(', ')})
        `;

        await client.query(insertQuery, insertValues);

        console.log(`✅ Inserted: ${currency.code} - ${currency.name}`);
        inserted++;
      } catch (error) {
        console.error(`❌ Error inserting ${currency.code} (${currency.name}):`, error.message);
        errors++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Inserted: ${inserted} currencies`);
    console.log(`   ⏭️  Skipped: ${skipped} currencies (already exist)`);
    if (errors > 0) {
      console.log(`   ❌ Errors: ${errors} currencies`);
    }
    console.log(`✅ Seed completed successfully`);
  } catch (error) {
    console.error('❌ Error during seed:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

seedCurrenciesData()
  .then(() => {
    console.log('🎉 Seed script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed script failed:', error);
    process.exit(1);
  });

