-- Ensure Routing Tables Exist
-- This script creates routing_master, routing_operations, and routing_operation_components tables
-- Run this if you get "relation routing_master does not exist" error

-- Routing Master (Header Information)
CREATE TABLE IF NOT EXISTS routing_master (
  id SERIAL PRIMARY KEY,
  material_id INTEGER,
  material_code VARCHAR(100) NOT NULL,
  plant_code VARCHAR(20) NOT NULL,
  plant_id INTEGER,
  routing_group_code VARCHAR(50) NOT NULL,
  base_quantity DECIMAL(15, 3) NOT NULL DEFAULT 1.0,
  base_unit VARCHAR(10) NOT NULL DEFAULT 'PC',
  description TEXT,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  valid_from DATE,
  valid_to DATE,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(material_code, plant_code, routing_group_code)
);

-- Routing Operations (Individual Steps)
CREATE TABLE IF NOT EXISTS routing_operations (
  id SERIAL PRIMARY KEY,
  routing_master_id INTEGER NOT NULL REFERENCES routing_master(id) ON DELETE CASCADE,
  operation_number VARCHAR(10) NOT NULL,
  operation_description TEXT NOT NULL,
  work_center_id INTEGER,
  work_center_code VARCHAR(50),
  setup_time_minutes INTEGER DEFAULT 0,
  machine_time_minutes DECIMAL(10, 2) DEFAULT 0,
  labor_time_minutes DECIMAL(10, 2) DEFAULT 0,
  sequence_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(routing_master_id, operation_number)
);

-- Routing Operation Components (Materials consumed per operation)
CREATE TABLE IF NOT EXISTS routing_operation_components (
  id SERIAL PRIMARY KEY,
  routing_operation_id INTEGER NOT NULL REFERENCES routing_operations(id) ON DELETE CASCADE,
  material_id INTEGER,
  material_code VARCHAR(100) NOT NULL,
  quantity DECIMAL(15, 3) NOT NULL DEFAULT 1.0,
  unit VARCHAR(10) NOT NULL DEFAULT 'PC',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_routing_master_material ON routing_master(material_code);
CREATE INDEX IF NOT EXISTS idx_routing_master_plant ON routing_master(plant_code);
CREATE INDEX IF NOT EXISTS idx_routing_master_group ON routing_master(routing_group_code);
CREATE INDEX IF NOT EXISTS idx_routing_operations_master ON routing_operations(routing_master_id);
CREATE INDEX IF NOT EXISTS idx_routing_operations_sequence ON routing_operations(routing_master_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_routing_operation_components_operation ON routing_operation_components(routing_operation_id);
CREATE INDEX IF NOT EXISTS idx_routing_operation_components_material ON routing_operation_components(material_code);

-- Add comments
COMMENT ON TABLE routing_master IS 'Routing master data - defines manufacturing sequence for finished products';
COMMENT ON TABLE routing_operations IS 'Individual operations/steps in a routing sequence';
COMMENT ON TABLE routing_operation_components IS 'Materials/components consumed during each operation';

COMMENT ON COLUMN routing_master.material_id IS 'Reference to finished product material';
COMMENT ON COLUMN routing_master.material_code IS 'Finished product material code';
COMMENT ON COLUMN routing_master.plant_code IS 'Manufacturing plant code';
COMMENT ON COLUMN routing_master.routing_group_code IS 'Unique routing group identifier';
COMMENT ON COLUMN routing_master.base_quantity IS 'Reference quantity for routing (typically 1)';
COMMENT ON COLUMN routing_operations.operation_number IS 'Operation sequence number (e.g., 0010, 0020)';
COMMENT ON COLUMN routing_operations.sequence_order IS 'Order of operations in the routing';
COMMENT ON COLUMN routing_operations.setup_time_minutes IS 'Time to prepare machine/equipment (one-time per batch)';
COMMENT ON COLUMN routing_operations.machine_time_minutes IS 'Machine runtime per unit';
COMMENT ON COLUMN routing_operations.labor_time_minutes IS 'Manual labor time per unit';
