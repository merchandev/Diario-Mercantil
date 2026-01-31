-- Create superadmin_tokens table for authentication
CREATE TABLE IF NOT EXISTS superadmin_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    superadmin_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (superadmin_id) REFERENCES superadmins(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
