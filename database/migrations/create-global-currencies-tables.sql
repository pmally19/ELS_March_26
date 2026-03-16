-- Migration: Create global currencies, exchange rates, and company currency settings tables
-- Purpose: Fix currency management from codebase to database level without defaults or hardcoded data

-- Drop existing tables if they exist (to recreate without defaults)
DROP TABLE IF EXISTS company_currency_settings CASCADE;
DROP TABLE IF EXISTS daily_exchange_rates CASCADE;
DROP TABLE IF EXISTS global_currencies CASCADE;

-- Create global_currencies table WITHOUT default values
CREATE TABLE global_currencies (
  id SERIAL PRIMARY KEY,
  currency_code VARCHAR(3) UNIQUE NOT NULL,
  currency_name VARCHAR(100) NOT NULL,
  currency_symbol VARCHAR(10) NOT NULL,
  decimal_places INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL,
  is_hard_currency BOOLEAN NOT NULL,
  iso_country_code VARCHAR(2),
  central_bank_rate_source VARCHAR(50) NOT NULL,
  current_usd_rate DECIMAL(15,6) NOT NULL,
  last_rate_update TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Create daily_exchange_rates table WITHOUT default values
CREATE TABLE daily_exchange_rates (
  id SERIAL PRIMARY KEY,
  rate_date DATE NOT NULL,
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  exchange_rate DECIMAL(15,6) NOT NULL,
  rate_type VARCHAR(20) NOT NULL,
  rate_source VARCHAR(50) NOT NULL,
  is_official BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  created_by VARCHAR(100),
  FOREIGN KEY (from_currency) REFERENCES global_currencies(currency_code),
  FOREIGN KEY (to_currency) REFERENCES global_currencies(currency_code),
  UNIQUE(rate_date, from_currency, to_currency, rate_type)
);

-- Create company_currency_settings table WITHOUT default values
CREATE TABLE company_currency_settings (
  id SERIAL PRIMARY KEY,
  company_code VARCHAR(10) NOT NULL,
  local_currency_code VARCHAR(3) NOT NULL,
  group_currency_code VARCHAR(3) NOT NULL,
  parallel_currency_code VARCHAR(3),
  exchange_rate_type VARCHAR(50) NOT NULL,
  translation_method VARCHAR(50) NOT NULL,
  revaluation_frequency VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  FOREIGN KEY (local_currency_code) REFERENCES global_currencies(currency_code),
  FOREIGN KEY (group_currency_code) REFERENCES global_currencies(currency_code),
  FOREIGN KEY (parallel_currency_code) REFERENCES global_currencies(currency_code),
  UNIQUE(company_code)
);

-- Create indexes for performance
CREATE INDEX idx_global_currencies_code ON global_currencies(currency_code);
CREATE INDEX idx_global_currencies_active ON global_currencies(is_active);
CREATE INDEX idx_exchange_rates_date ON daily_exchange_rates(rate_date);
CREATE INDEX idx_exchange_rates_currencies ON daily_exchange_rates(from_currency, to_currency);
CREATE INDEX idx_company_currency_settings_company ON company_currency_settings(company_code);

