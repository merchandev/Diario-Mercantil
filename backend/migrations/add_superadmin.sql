-- DO NOT COMMIT THIS FILE TO GIT
-- Add to .gitignore immediately

-- Manual migration to create superadmin with SECURE password
-- Run this ON THE SERVER after deployment

CREATE TABLE IF NOT EXISTS superadmins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS superadmin_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  superadmin_id INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  FOREIGN KEY(superadmin_id) REFERENCES superadmins(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- !!! GENERATE HASH ON SERVER !!!
-- Run on server: php /var/www/html/scripts/generate_superadmin_hash.php
-- Then manually insert the hash below

-- DELETE FROM superadmins WHERE username = 'merchandev';
-- INSERT INTO superadmins (username, password_hash) VALUES ('merchandev', 'PASTE_GENERATED_HASH_HERE');
