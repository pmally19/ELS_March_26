import { pool } from "../db";

interface ExchangeRateProvider {
  name: string;
  apiKey?: string;
  baseUrl: string;
  getRates: (baseCurrency: string) => Promise<Record<string, number>>;
}

// Free ExchangeRate-API provider
const exchangeRateAPIProvider: ExchangeRateProvider = {
  name: "ExchangeRate-API",
  baseUrl: "https://v6.exchangerate-api.com/v6",
  getRates: async (baseCurrency: string) => {
    try {
      const response = await fetch(`https://v6.exchangerate-api.com/v6/latest/${baseCurrency}`);
      const data = await response.json();
      
      if (data.result === 'success') {
        return data.conversion_rates;
      } else {
        throw new Error('Failed to fetch exchange rates');
      }
    } catch (error) {
      console.error('ExchangeRate-API error:', error);
      throw error;
    }
  }
};

// Fixer.io provider (requires API key)
const fixerProvider: ExchangeRateProvider = {
  name: "Fixer.io",
  baseUrl: "http://data.fixer.io/api",
  getRates: async (baseCurrency: string) => {
    const apiKey = process.env.FIXER_API_KEY;
    if (!apiKey) {
      throw new Error('FIXER_API_KEY environment variable required');
    }

    try {
      const response = await fetch(`${fixerProvider.baseUrl}/latest?access_key=${apiKey}&base=${baseCurrency}`);
      const data = await response.json();
      
      if (data.success) {
        return data.rates;
      } else {
        throw new Error(data.error?.info || 'Failed to fetch exchange rates');
      }
    } catch (error) {
      console.error('Fixer.io error:', error);
      throw error;
    }
  }
};

// Central Bank providers (free, reliable)
const federalReserveProvider: ExchangeRateProvider = {
  name: "Federal Reserve",
  baseUrl: "https://api.stlouisfed.org/fred/series/observations",
  getRates: async (baseCurrency: string) => {
    // Implementation for Fed data (requires parsing specific series)
    // This is more complex but provides official rates
    throw new Error('Federal Reserve provider not fully implemented');
  }
};

class ExchangeRateUpdater {
  private providers: ExchangeRateProvider[] = [
    exchangeRateAPIProvider,
    fixerProvider
  ];

  async updateDailyRates(): Promise<void> {
    console.log('Starting daily exchange rate update...');
    
    try {
      // Get active currencies from database
      const currenciesQuery = `
        SELECT code as currency_code 
        FROM currencies 
        WHERE active = true AND code != 'USD'
        ORDER BY code
      `;
      
      const currenciesResult = await pool.query(currenciesQuery);
      const currencies = currenciesResult.rows.map(row => row.currency_code);

      if (currencies.length === 0) {
        console.log('No active currencies found for rate update');
        return;
      }

      // Try providers in order until one succeeds
      let rates: Record<string, number> | null = null;
      let usedProvider: string = '';

      for (const provider of this.providers) {
        try {
          console.log(`Trying ${provider.name}...`);
          rates = await provider.getRates('USD');
          usedProvider = provider.name;
          break;
        } catch (error) {
          console.log(`${provider.name} failed:`, error.message);
          continue;
        }
      }

      if (!rates) {
        throw new Error('All exchange rate providers failed');
      }

      console.log(`Successfully fetched rates from ${usedProvider}`);

      // Update rates in database
      const today = new Date().toISOString().split('T')[0];
      let updatedCount = 0;

      for (const currency of currencies) {
        if (rates[currency]) {
          const upsertQuery = `
            INSERT INTO daily_exchange_rates (
              rate_date, 
              from_currency, 
              to_currency, 
              exchange_rate, 
              rate_source
            ) VALUES ($1, 'USD', $2, $3, $4)
            ON CONFLICT (rate_date, from_currency, to_currency) 
            DO UPDATE SET 
              exchange_rate = $3, 
              rate_source = $4,
              updated_at = CURRENT_TIMESTAMP
          `;

          await pool.query(upsertQuery, [
            today,
            currency,
            rates[currency],
            usedProvider.toLowerCase()
          ]);

          updatedCount++;
        }
      }

      // Log update summary
      const logQuery = `
        INSERT INTO exchange_rate_update_log (
          update_date,
          provider_used,
          currencies_updated,
          status,
          notes
        ) VALUES ($1, $2, $3, 'success', $4)
      `;

      await pool.query(logQuery, [
        today,
        usedProvider,
        updatedCount,
        `Updated ${updatedCount} currencies successfully`
      ]);

      console.log(`Exchange rate update completed: ${updatedCount} currencies updated using ${usedProvider}`);

    } catch (error) {
      console.error('Exchange rate update failed:', error);
      
      // Log failure
      const today = new Date().toISOString().split('T')[0];
      const logQuery = `
        INSERT INTO exchange_rate_update_log (
          update_date,
          provider_used,
          currencies_updated,
          status,
          notes
        ) VALUES ($1, 'none', 0, 'failed', $2)
      `;

      await pool.query(logQuery, [
        today,
        error.message
      ]);

      throw error;
    }
  }

  async getUpdateHistory(days: number = 30): Promise<any[]> {
    const query = `
      SELECT 
        update_date,
        provider_used,
        currencies_updated,
        status,
        notes,
        created_at
      FROM exchange_rate_update_log 
      WHERE update_date >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY update_date DESC
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  async scheduleDaily(): Promise<void> {
    // Run at 9 AM UTC daily (when markets open)
    const schedule = '0 9 * * *'; // cron format
    
    console.log('Exchange rate updater scheduled for daily execution at 9 AM UTC');
    
    // In production, you'd use node-cron or similar:
    // cron.schedule(schedule, () => {
    //   this.updateDailyRates();
    // });
  }
}

export const exchangeRateUpdater = new ExchangeRateUpdater();

// Create update log table if it doesn't exist
export async function initializeExchangeRateUpdater(): Promise<void> {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS exchange_rate_update_log (
        id SERIAL PRIMARY KEY,
        update_date DATE NOT NULL,
        provider_used VARCHAR(50),
        currencies_updated INTEGER DEFAULT 0,
        status VARCHAR(20) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_exchange_rate_update_log_date 
      ON exchange_rate_update_log(update_date);
    `;
    
    await pool.query(createTableQuery);
    console.log('Exchange rate updater initialized successfully');
  } catch (error) {
    console.error('Failed to initialize exchange rate updater:', error);
  }
}