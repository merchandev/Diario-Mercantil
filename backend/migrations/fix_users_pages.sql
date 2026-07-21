-- Fix users table missing columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS state VARCHAR(100) DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS municipality VARCHAR(100) DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;

-- Fix pages table missing columns
ALTER TABLE pages ADD COLUMN IF NOT EXISTS header_html TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS body_json TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS footer_html TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'published';

-- Drop old columns if they exist (safe to ignore if they fail, but usually we just add new ones)
-- We will comment this out to avoid data loss on an existing table, just adding new ones is enough.
-- ALTER TABLE pages DROP COLUMN content;
