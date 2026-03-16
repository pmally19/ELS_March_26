-- Add item_category_group column to materials table
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS item_category_group VARCHAR(10);

-- Add foreign key constraint to item_category_groups table
-- item_category_groups table has group_code as unique, generally used as the key
ALTER TABLE materials
ADD CONSTRAINT fk_materials_item_category_group
FOREIGN KEY (item_category_group) REFERENCES item_category_groups(group_code);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_materials_item_category_group ON materials(item_category_group);
