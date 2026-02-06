import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mallyerp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Mokshith@21',
});

async function insertCompanySettings() {
  const client = await pool.connect();
  try {
    console.log('🔄 Inserting sample company currency settings...\n');
    
    // Get available company codes
    const companyCodesResult = await client.query(`
      SELECT code, name FROM company_codes LIMIT 5
    `);
    
    if (companyCodesResult.rows.length === 0) {
      console.log('⚠️  No company codes found. Please create company codes first.');
      return;
    }
    
    console.log(`📋 Found ${companyCodesResult.rows.length} company codes to configure\n`);
    
    // Sample company currency settings
    const companySettings = [
      {
        companyCode: companyCodesResult.rows[0].code,
        localCurrency: 'USD',
        groupCurrency: 'USD',
        parallelCurrency: 'EUR',
        exchangeRateType: 'Spot Rate',
        translationMethod: 'Average Rate',
        revaluationFrequency: 'Monthly'
      },
      {
        companyCode: companyCodesResult.rows[1]?.code || companyCodesResult.rows[0].code,
        localCurrency: 'EUR',
        groupCurrency: 'USD',
        parallelCurrency: 'GBP',
        exchangeRateType: 'Spot Rate',
        translationMethod: 'Closing Rate',
        revaluationFrequency: 'Quarterly'
      },
      {
        companyCode: companyCodesResult.rows[2]?.code || companyCodesResult.rows[0].code,
        localCurrency: 'INR',
        groupCurrency: 'USD',
        parallelCurrency: null,
        exchangeRateType: 'Spot Rate',
        translationMethod: 'Average Rate',
        revaluationFrequency: 'Monthly'
      },
      {
        companyCode: companyCodesResult.rows[3]?.code || companyCodesResult.rows[0].code,
        localCurrency: 'GBP',
        groupCurrency: 'USD',
        parallelCurrency: 'EUR',
        exchangeRateType: 'Spot Rate',
        translationMethod: 'Closing Rate',
        revaluationFrequency: 'Monthly'
      },
      {
        companyCode: companyCodesResult.rows[4]?.code || companyCodesResult.rows[0].code,
        localCurrency: 'USD',
        groupCurrency: 'USD',
        parallelCurrency: null,
        exchangeRateType: 'Spot Rate',
        translationMethod: 'Average Rate',
        revaluationFrequency: 'Yearly'
      }
    ];
    
    await client.query('BEGIN');
    
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const setting of companySettings) {
      try {
        // Check if setting already exists
        const existing = await client.query(`
          SELECT id FROM company_currency_settings WHERE company_code = $1
        `, [setting.companyCode]);
        
        if (existing.rows.length > 0) {
          // Update existing
          await client.query(`
            UPDATE company_currency_settings SET
              local_currency_code = $1,
              group_currency_code = $2,
              parallel_currency_code = $3,
              exchange_rate_type = $4,
              translation_method = $5,
              revaluation_frequency = $6,
              updated_at = CURRENT_TIMESTAMP
            WHERE company_code = $7
          `, [
            setting.localCurrency,
            setting.groupCurrency,
            setting.parallelCurrency,
            setting.exchangeRateType,
            setting.translationMethod,
            setting.revaluationFrequency,
            setting.companyCode
          ]);
          updatedCount++;
          console.log(`🔄 Updated ${setting.companyCode}: ${setting.localCurrency} / ${setting.groupCurrency}`);
        } else {
          // Insert new
          await client.query(`
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
          `, [
            setting.companyCode,
            setting.localCurrency,
            setting.groupCurrency,
            setting.parallelCurrency,
            setting.exchangeRateType,
            setting.translationMethod,
            setting.revaluationFrequency
          ]);
          insertedCount++;
          console.log(`✅ Inserted ${setting.companyCode}: ${setting.localCurrency} / ${setting.groupCurrency}`);
        }
      } catch (error) {
        if (error.code === '23503') {
          // Foreign key violation - currency doesn't exist
          skippedCount++;
          console.log(`⚠️  Skipped ${setting.companyCode}: Currency not found in global_currencies`);
        } else {
          console.error(`❌ Error processing ${setting.companyCode}:`, error.message);
        }
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`\n✅ Company settings insertion complete!`);
    console.log(`   - Inserted: ${insertedCount} settings`);
    console.log(`   - Updated: ${updatedCount} settings`);
    console.log(`   - Skipped: ${skippedCount} settings`);
    
    // Verify the data
    const verifyResult = await client.query(`
      SELECT 
        ccs.company_code,
        cc.name as company_name,
        ccs.local_currency_code,
        ccs.group_currency_code,
        ccs.parallel_currency_code,
        ccs.exchange_rate_type,
        ccs.revaluation_frequency
      FROM company_currency_settings ccs
      LEFT JOIN company_codes cc ON ccs.company_code = cc.code
      ORDER BY ccs.company_code
    `);
    
    console.log(`\n📊 Total company currency settings: ${verifyResult.rows.length}`);
    console.log('\n📋 Company Settings List:');
    verifyResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.company_code} - ${row.company_name || 'N/A'}`);
      console.log(`      Local: ${row.local_currency_code}, Group: ${row.group_currency_code}, Parallel: ${row.parallel_currency_code || 'None'}`);
      console.log(`      Rate Type: ${row.exchange_rate_type}, Revaluation: ${row.revaluation_frequency}`);
      console.log('');
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Insert failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

insertCompanySettings().catch(console.error);

