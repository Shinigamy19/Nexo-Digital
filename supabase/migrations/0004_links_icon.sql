-- Rename emoji → icon and expand to VARCHAR(500) for image URLs
ALTER TABLE link_items RENAME COLUMN emoji TO icon;
ALTER TABLE link_items ALTER COLUMN icon TYPE VARCHAR(500);
ALTER TABLE link_items ALTER COLUMN icon SET DEFAULT '';
