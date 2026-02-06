-- Migration: Insert standard global currencies data
-- Purpose: Populate global_currencies table with common currencies

-- Insert standard currencies (all required fields must be provided, no defaults)
INSERT INTO global_currencies (
  currency_code, 
  currency_name, 
  currency_symbol, 
  decimal_places, 
  is_active, 
  is_hard_currency, 
  iso_country_code, 
  central_bank_rate_source, 
  current_usd_rate, 
  last_rate_update, 
  created_at, 
  updated_at
) VALUES
  ('USD', 'US Dollar', '$', 2, true, true, 'US', 'Federal Reserve', 1.0000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('EUR', 'Euro', '€', 2, true, true, 'EU', 'European Central Bank', 0.9200, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('GBP', 'British Pound', '£', 2, true, true, 'GB', 'Bank of England', 0.7900, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('JPY', 'Japanese Yen', '¥', 0, true, true, 'JP', 'Bank of Japan', 150.0000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('CNY', 'Chinese Yuan', '¥', 2, true, true, 'CN', 'People''s Bank of China', 7.2000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('INR', 'Indian Rupee', '₹', 2, true, false, 'IN', 'Reserve Bank of India', 83.0000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('AUD', 'Australian Dollar', 'A$', 2, true, true, 'AU', 'Reserve Bank of Australia', 1.5200, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('CAD', 'Canadian Dollar', 'C$', 2, true, true, 'CA', 'Bank of Canada', 1.3500, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('CHF', 'Swiss Franc', 'CHF', 2, true, true, 'CH', 'Swiss National Bank', 0.8800, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('SGD', 'Singapore Dollar', 'S$', 2, true, true, 'SG', 'Monetary Authority of Singapore', 1.3400, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('HKD', 'Hong Kong Dollar', 'HK$', 2, true, true, 'HK', 'Hong Kong Monetary Authority', 7.8000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('NZD', 'New Zealand Dollar', 'NZ$', 2, true, true, 'NZ', 'Reserve Bank of New Zealand', 1.6200, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('SEK', 'Swedish Krona', 'kr', 2, true, false, 'SE', 'Sveriges Riksbank', 10.5000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('NOK', 'Norwegian Krone', 'kr', 2, true, false, 'NO', 'Norges Bank', 10.8000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('DKK', 'Danish Krone', 'kr', 2, true, false, 'DK', 'Danmarks Nationalbank', 6.8500, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (currency_code) DO NOTHING;

