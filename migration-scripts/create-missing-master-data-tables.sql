-- Create missing master data tables

-- 1. Batch Classes
CREATE TABLE IF NOT EXISTS batch_classes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    batch_number_format VARCHAR(50),
    shelf_life_days INTEGER,
    expiration_required BOOLEAN NOT NULL DEFAULT false,
    lot_tracking_required BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Serial Number Profiles
CREATE TABLE IF NOT EXISTS serial_number_profiles (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    number_format VARCHAR(50),
    check_digit_required BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. Quality Grades
CREATE TABLE IF NOT EXISTS quality_grades (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    quality_level VARCHAR(20) NOT NULL,
    tolerance_percentage DECIMAL(5,2),
    inspection_required BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 4. Reason Codes
CREATE TABLE IF NOT EXISTS reason_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    reason_category VARCHAR(50) NOT NULL,
    movement_type VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 5. Warehouse Types
CREATE TABLE IF NOT EXISTS warehouse_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    storage_type VARCHAR(20) NOT NULL,
    temperature_range VARCHAR(50),
    special_requirements TEXT,
    handling_equipment VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 6. Route Schedules
CREATE TABLE IF NOT EXISTS route_schedules (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    route_type VARCHAR(20) NOT NULL,
    departure_time TIME,
    arrival_time TIME,
    frequency VARCHAR(20),
    transportation_zone_id INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert sample data for Batch Classes
INSERT INTO batch_classes (code, name, description, batch_number_format, shelf_life_days, expiration_required, lot_tracking_required, is_active) VALUES
('BC001', 'Raw Materials', 'Batch class for raw materials and components', 'RM-{YYYY}-{MM}-{DD}-{####}', 365, true, true, true),
('BC002', 'Finished Goods', 'Batch class for finished products', 'FG-{YYYY}-{MM}-{DD}-{####}', 730, true, true, true),
('BC003', 'Chemicals', 'Batch class for chemical products with special handling requirements', 'CH-{YYYY}-{MM}-{DD}-{####}', 180, true, true, true),
('BC004', 'Pharmaceuticals', 'Batch class for pharmaceutical products with strict compliance requirements', 'PH-{YYYY}-{MM}-{DD}-{####}', 1095, true, true, true),
('BC005', 'Food Products', 'Batch class for food and beverage products', 'FD-{YYYY}-{MM}-{DD}-{####}', 90, true, true, true);

-- Insert sample data for Serial Number Profiles
INSERT INTO serial_number_profiles (code, name, description, number_format, check_digit_required, is_active) VALUES
('SNP001', 'Standard Serial', 'Standard serial number profile for general products', 'SN-{YYYY}-{####}', false, true),
('SNP002', 'High Security', 'High security serial number profile with check digits', 'HS-{YYYY}-{####}-{C}', true, true),
('SNP003', 'Electronics', 'Serial number profile for electronic devices', 'EL-{YYYY}-{MM}-{####}', false, true),
('SNP004', 'Automotive', 'Serial number profile for automotive parts', 'AU-{YYYY}-{####}-{VIN}', true, true);

-- Insert sample data for Quality Grades
INSERT INTO quality_grades (code, name, description, quality_level, tolerance_percentage, inspection_required, is_active) VALUES
('QG001', 'Grade A', 'Highest quality grade with strict tolerances', 'A', 0.5, true, true),
('QG002', 'Grade B', 'Good quality grade with standard tolerances', 'B', 1.0, true, true),
('QG003', 'Grade C', 'Acceptable quality grade with relaxed tolerances', 'C', 2.0, false, true),
('QG004', 'Reject', 'Rejected quality grade for non-conforming materials', 'REJECT', 0.0, true, true);

-- Insert sample data for Reason Codes
INSERT INTO reason_codes (code, name, description, reason_category, movement_type, is_active) VALUES
('RC001', 'Production Receipt', 'Receipt from production order', 'PRODUCTION', 'INBOUND', true),
('RC002', 'Purchase Receipt', 'Receipt from purchase order', 'PURCHASING', 'INBOUND', true),
('RC003', 'Sales Issue', 'Issue for sales order', 'SALES', 'OUTBOUND', true),
('RC004', 'Transfer', 'Transfer between locations', 'TRANSFER', 'TRANSFER', true),
('RC005', 'Adjustment', 'Inventory adjustment', 'ADJUSTMENT', 'ADJUSTMENT', true);

-- Insert sample data for Warehouse Types
INSERT INTO warehouse_types (code, name, description, storage_type, temperature_range, special_requirements, handling_equipment, is_active) VALUES
('WT001', 'Ambient Storage', 'Standard ambient temperature storage', 'AMBIENT', '15-25°C', 'None', 'Forklift, Pallet Jack', true),
('WT002', 'Refrigerated', 'Cold storage for temperature-sensitive products', 'REFRIGERATED', '2-8°C', 'Temperature monitoring required', 'Refrigerated Forklift', true),
('WT003', 'Frozen Storage', 'Deep freeze storage for frozen products', 'FROZEN', '-18°C to -25°C', 'Continuous temperature monitoring', 'Freezer Forklift', true),
('WT004', 'Hazmat Storage', 'Storage for hazardous materials', 'HAZMAT', 'Varies', 'Special permits and safety protocols', 'Specialized Handling Equipment', true);

-- Insert sample data for Route Schedules
INSERT INTO route_schedules (code, name, description, route_type, departure_time, arrival_time, frequency, transportation_zone_id, is_active) VALUES
('RS001', 'Daily City Route', 'Daily delivery route within city limits', 'DAILY', '08:00:00', '17:00:00', 'DAILY', 1, true),
('RS002', 'Weekly Regional', 'Weekly delivery to regional locations', 'WEEKLY', '06:00:00', '18:00:00', 'WEEKLY', 2, true),
('RS003', 'Monthly Long Haul', 'Monthly delivery to distant locations', 'MONTHLY', '05:00:00', '20:00:00', 'MONTHLY', 3, true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_batch_classes_code ON batch_classes(code);
CREATE INDEX IF NOT EXISTS idx_batch_classes_is_active ON batch_classes(is_active);

CREATE INDEX IF NOT EXISTS idx_serial_number_profiles_code ON serial_number_profiles(code);
CREATE INDEX IF NOT EXISTS idx_serial_number_profiles_is_active ON serial_number_profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_quality_grades_code ON quality_grades(code);
CREATE INDEX IF NOT EXISTS idx_quality_grades_is_active ON quality_grades(is_active);

CREATE INDEX IF NOT EXISTS idx_reason_codes_code ON reason_codes(code);
CREATE INDEX IF NOT EXISTS idx_reason_codes_is_active ON reason_codes(is_active);

CREATE INDEX IF NOT EXISTS idx_warehouse_types_code ON warehouse_types(code);
CREATE INDEX IF NOT EXISTS idx_warehouse_types_is_active ON warehouse_types(is_active);

CREATE INDEX IF NOT EXISTS idx_route_schedules_code ON route_schedules(code);
CREATE INDEX IF NOT EXISTS idx_route_schedules_is_active ON route_schedules(is_active);
