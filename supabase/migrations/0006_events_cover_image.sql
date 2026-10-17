-- Optional cover banner (data-URI base64, 1200x630 / 16:9 target) for events
ALTER TABLE events ADD COLUMN IF NOT EXISTS cover_image TEXT;
