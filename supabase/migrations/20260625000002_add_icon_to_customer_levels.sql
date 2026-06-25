-- Add icon column to customer_levels
ALTER TABLE customer_levels ADD COLUMN icon text DEFAULT 'Crown';

-- Update existing levels to have 'Crown' as default if not already set
UPDATE customer_levels SET icon = 'Crown' WHERE icon IS NULL;
