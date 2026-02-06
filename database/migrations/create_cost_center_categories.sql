
CREATE TABLE IF NOT EXISTS cost_center_categories (
  id SERIAL PRIMARY KEY,
  code VARCHAR(2) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
