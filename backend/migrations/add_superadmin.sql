-- MySQL migration to create superadmins table
-- Run this AFTER init.sql has been executed

-- Create superadmins table (completely separate from users)
CREATE TABLE IF NOT EXISTS superadmins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create superadmin tokens table (separate from auth_tokens)
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

-- Insert the main superadmin: merchandev / G0ku*1896
-- Password hash generated with: password_hash('G0ku*1896', PASSWORD_DEFAULT)
INSERT INTO superadmins (username, password_hash) 
VALUES ('merchandev', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi')
ON DUPLICATE KEY UPDATE username = username;

-- Remove all admin users from the regular users table
-- Superadmin is separate, regular users are only 'solicitante'
DELETE FROM users WHERE role = 'admin';

-- Update any remaining non-solicitante users to solicitante
UPDATE users SET role = 'solicitante' WHERE role != 'solicitante';

-- Verify migration
SELECT 'Superadmins table created' AS status;
SELECT COUNT(*) AS superadmin_count FROM superadmins;
SELECT 'Admin users removed from regular users' AS status;
SELECT COUNT(*) AS regular_user_count FROM users;
