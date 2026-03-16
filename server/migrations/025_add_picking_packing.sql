-- Migration: Add Picking, Packing, and Loading functionality to Delivery
-- This adds the necessary tables for transfer orders (picking) and handling units (packing)

BEGIN;

-- 1. Picking Orders (SAP Transfer Order LT01)
CREATE TABLE IF NOT EXISTS picking_orders (
  id               SERIAL PRIMARY KEY,
  picking_number   VARCHAR(20) UNIQUE NOT NULL,  -- e.g. TO2026000001
  delivery_id      INTEGER NOT NULL REFERENCES delivery_documents(id) ON DELETE CASCADE,
  warehouse_number VARCHAR(10),
  status           VARCHAR(20) DEFAULT 'OPEN',   -- OPEN, IN_PROGRESS, COMPLETED
  started_at       TIMESTAMP,
  completed_at     TIMESTAMP,
  created_by       INTEGER,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS picking_order_items (
  id                SERIAL PRIMARY KEY,
  picking_order_id  INTEGER NOT NULL REFERENCES picking_orders(id) ON DELETE CASCADE,
  delivery_item_id  INTEGER NOT NULL REFERENCES delivery_items(id),
  material_id       INTEGER,
  required_qty      DECIMAL(15,3) NOT NULL,
  picked_qty        DECIMAL(15,3) DEFAULT 0,
  unit              VARCHAR(10),
  from_storage_bin  VARCHAR(20),
  batch             VARCHAR(20),
  status            VARCHAR(20) DEFAULT 'OPEN',  -- OPEN, PARTIAL, PICKED
  updated_at        TIMESTAMP DEFAULT NOW()
);

-- 2. Packaging Material Types Master Data (SAP HUMAT)
-- No hardcoded initially populated data, user must set it up or provide API
CREATE TABLE IF NOT EXISTS packaging_material_types (
  id           SERIAL PRIMARY KEY,
  code         VARCHAR(10) UNIQUE NOT NULL,
  name         VARCHAR(50) NOT NULL,
  max_weight   DECIMAL(10,3),
  weight_unit  VARCHAR(5) DEFAULT 'KG',
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMP DEFAULT NOW()
);

-- 3. Handling Units (SAP HU — Packing)
CREATE TABLE IF NOT EXISTS handling_units (
  id                    SERIAL PRIMARY KEY,
  hu_number             VARCHAR(20) UNIQUE NOT NULL,  -- e.g. HU2026000001
  delivery_id           INTEGER NOT NULL REFERENCES delivery_documents(id) ON DELETE CASCADE,
  packaging_material_id INTEGER REFERENCES packaging_material_types(id),
  gross_weight          DECIMAL(10,3),
  net_weight            DECIMAL(10,3),
  weight_unit           VARCHAR(5) DEFAULT 'KG',
  status                VARCHAR(20) DEFAULT 'OPEN',  -- OPEN, PACKED, CLOSED
  created_by            INTEGER,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS handling_unit_items (
  id               SERIAL PRIMARY KEY,
  hu_id            INTEGER NOT NULL REFERENCES handling_units(id) ON DELETE CASCADE,
  delivery_item_id INTEGER NOT NULL REFERENCES delivery_items(id),
  material_id      INTEGER,
  packed_qty       DECIMAL(15,3) NOT NULL,
  unit             VARCHAR(10),
  batch            VARCHAR(20),
  created_at       TIMESTAMP DEFAULT NOW()
);

-- 4. Status Columns on delivery_documents
ALTER TABLE delivery_documents
  ADD COLUMN IF NOT EXISTS picking_status  VARCHAR(20) DEFAULT 'NOT_STARTED',
  ADD COLUMN IF NOT EXISTS packing_status  VARCHAR(20) DEFAULT 'NOT_STARTED',
  ADD COLUMN IF NOT EXISTS loading_status  VARCHAR(20) DEFAULT 'NOT_STARTED',
  ADD COLUMN IF NOT EXISTS hu_count        INTEGER DEFAULT 0;

-- 5. Create default Delivery Document Types
-- The user requested to fix "document type" as well, so we should ensure delivery_types exist
-- If it doesn't exist, we may create a table for 'delivery_document_types' to avoid hardcoded types
CREATE TABLE IF NOT EXISTS delivery_document_types (
  id              SERIAL PRIMARY KEY,
  code            VARCHAR(10) UNIQUE NOT NULL,
  name            VARCHAR(50) NOT NULL,
  description     TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- Let's just create the outline for it. User can add types like LF, LR via an API.

COMMIT;
