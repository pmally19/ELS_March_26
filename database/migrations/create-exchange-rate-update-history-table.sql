-- Migration: Create exchange rate update history table
-- Purpose: Track exchange rate updates without defaults

DROP TABLE IF EXISTS exchange_rate_update_history CASCADE;

CREATE TABLE exchange_rate_update_history (
  id SERIAL PRIMARY KEY,
  update_date DATE NOT NULL,
  provider_used VARCHAR(100) NOT NULL,
  currencies_updated INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_update_history_date ON exchange_rate_update_history(update_date);
CREATE INDEX idx_update_history_status ON exchange_rate_update_history(status);

