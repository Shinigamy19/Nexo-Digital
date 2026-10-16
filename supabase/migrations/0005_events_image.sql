-- Optional base64 image (data-URI) for event submissions
ALTER TABLE events ADD COLUMN IF NOT EXISTS image TEXT;
