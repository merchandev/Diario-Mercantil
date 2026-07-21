-- Fix users table missing columns
ALTER TABLE users ADD COLUMN state VARCHAR(100) DEFAULT '';
ALTER TABLE users ADD COLUMN municipality VARCHAR(100) DEFAULT '';
ALTER TABLE users ADD COLUMN address TEXT;

-- Fix pages table missing columns
ALTER TABLE pages ADD COLUMN header_html TEXT;
ALTER TABLE pages ADD COLUMN body_json TEXT;
ALTER TABLE pages ADD COLUMN footer_html TEXT;
ALTER TABLE pages ADD COLUMN status VARCHAR(50) DEFAULT 'published';

-- Drop old columns if they exist (safe to ignore if they fail, but usually we just add new ones)
-- We will comment this out to avoid data loss on an existing table, just adding new ones is enough.
-- ALTER TABLE pages DROP COLUMN content;
