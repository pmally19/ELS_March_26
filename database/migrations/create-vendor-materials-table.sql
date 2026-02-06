-- Migration: Create vendor_materials junction table
-- This table stores the relationship between vendors and materials (raw materials only)

CREATE TABLE IF NOT EXISTS vendor_materials (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    vendor_material_code VARCHAR(50), -- Vendor's internal code for this material
    unit_price NUMERIC(15, 2), -- Price per unit from this vendor
    currency VARCHAR(10) DEFAULT 'USD',
    minimum_order_quantity NUMERIC(15, 3), -- Minimum order quantity
    lead_time_days INTEGER, -- Lead time in days for this material from this vendor
    is_preferred BOOLEAN DEFAULT false, -- Is this the preferred vendor for this material
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    created_by INTEGER,
    updated_by INTEGER,
    
    -- Ensure one vendor-material relationship per combination
    UNIQUE(vendor_id, material_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vendor_materials_vendor_id ON vendor_materials(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_materials_material_id ON vendor_materials(material_id);
CREATE INDEX IF NOT EXISTS idx_vendor_materials_active ON vendor_materials(is_active);

-- Add comments
COMMENT ON TABLE vendor_materials IS 'Junction table linking vendors to materials (raw materials) they can supply';
COMMENT ON COLUMN vendor_materials.vendor_material_code IS 'Vendor-specific code for this material';
COMMENT ON COLUMN vendor_materials.unit_price IS 'Price per unit from this vendor';
COMMENT ON COLUMN vendor_materials.is_preferred IS 'Indicates if this is the preferred vendor for this material';

